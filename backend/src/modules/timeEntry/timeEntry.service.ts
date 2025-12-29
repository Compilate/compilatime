import { PrismaClient, TimeEntry, TimeEntryType, TimeEntrySource } from '@prisma/client';
import { z } from 'zod';
import { cache } from '../../config/redis';

const prisma = new PrismaClient();

// Esquemas de validación
const createTimeEntrySchema = z.object({
    employeeId: z.string().min(1, 'El ID del empleado es requerido'),
    type: z.nativeEnum(TimeEntryType),
    timestamp: z.string().datetime('Timestamp inválido'),
    source: z.nativeEnum(TimeEntrySource).default(TimeEntrySource.WEB),
    location: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    isRemoteWork: z.boolean().default(false),
    deviceInfo: z.string().optional(),
    notes: z.string().optional(),
    breakTypeId: z.string().optional(),
    breakReason: z.string().optional(),
});

const updateTimeEntrySchema = z.object({
    type: z.nativeEnum(TimeEntryType).optional(),
    timestamp: z.string().datetime('Timestamp inválido').optional(),
    location: z.string().optional(),
    deviceInfo: z.string().optional(),
    notes: z.string().optional(),
});

const timeEntryFiltersSchema = z.object({
    employeeId: z.string().optional(),
    startDate: z.string().datetime('Fecha de inicio inválida').optional(),
    endDate: z.string().datetime('Fecha de fin inválida').optional(),
    type: z.nativeEnum(TimeEntryType).optional(),
    source: z.nativeEnum(TimeEntrySource).optional(),
    page: z.number().min(1, 'La página debe ser mayor a 0').default(1),
    limit: z.number().min(1, 'El límite debe ser mayor a 0').max(100, 'El límite máximo es 100').default(20),
});

const bulkCreateSchema = z.object({
    entries: z.array(createTimeEntrySchema).min(1, 'Debe proporcionar al menos un registro'),
});

// Tipos
type CreateTimeEntryData = z.infer<typeof createTimeEntrySchema>;
type UpdateTimeEntryData = z.infer<typeof updateTimeEntrySchema>;
type TimeEntryFilters = z.infer<typeof timeEntryFiltersSchema>;
type BulkCreateData = z.infer<typeof bulkCreateSchema>;

// Servicio de gestión de registros de tiempo
export class TimeEntryService {
    // Crear nuevo registro de tiempo
    static async createTimeEntry(companyId: string, data: CreateTimeEntryData): Promise<TimeEntry> {
        try {
            // Validar datos
            const validatedData = createTimeEntrySchema.parse(data);

            // Verificar si el empleado existe y está activo a través de EmployeeCompany
            const employeeCompany = await (prisma as any).employeeCompany.findFirst({
                where: {
                    employeeId: validatedData.employeeId,
                    companyId,
                    active: true,
                },
                include: {
                    employee: true,
                },
            });

            const employee = employeeCompany?.employee;

            if (!employee) {
                throw new Error('Empleado no encontrado o no está activo');
            }

            // Validar reglas de fichaje
            await this.validatePunchRules(companyId, validatedData.employeeId, validatedData.type, validatedData.timestamp);

            // Crear registro
            const timeEntry = await prisma.timeEntry.create({
                data: {
                    companyId,
                    employeeId: validatedData.employeeId,
                    type: validatedData.type,
                    timestamp: new Date(validatedData.timestamp),
                    source: validatedData.source,
                    location: validatedData.location,
                    latitude: validatedData.latitude,
                    longitude: validatedData.longitude,
                    isRemoteWork: validatedData.isRemoteWork,
                    deviceInfo: validatedData.deviceInfo,
                    notes: validatedData.notes,
                    createdByEmployee: true,
                    breakTypeId: validatedData.breakTypeId,
                    breakReason: validatedData.breakReason,
                },
            });

            // Actualizar WorkDay si es necesario
            await this.updateWorkDay(companyId, validatedData.employeeId, new Date(validatedData.timestamp));

            // Limpiar caché
            await cache.clearPattern(`time-entries:${companyId}:*`);
            await cache.clearPattern(`work-days:${companyId}:*`);

            console.log(`✅ Registro de tiempo creado: ${employee.name} - ${validatedData.type}`);
            return timeEntry;
        } catch (error) {
            console.error('❌ Error creando registro de tiempo:', error);
            throw error;
        }
    }

    // Fichaje rápido (para empleados)
    static async punchTime(
        companyId: string,
        employeeId: string,
        type: TimeEntryType,
        timestamp?: string,
        source: TimeEntrySource = TimeEntrySource.WEB,
        location?: string,
        latitude?: number,
        longitude?: number,
        isRemoteWork?: boolean,
        deviceInfo?: string,
        breakTypeId?: string,
        breakReason?: string
    ): Promise<TimeEntry> {
        try {
            const punchData: CreateTimeEntryData = {
                employeeId,
                type,
                timestamp: timestamp || new Date().toISOString(),
                source,
                location,
                latitude,
                longitude,
                isRemoteWork: isRemoteWork || false,
                deviceInfo,
                breakTypeId,
                breakReason,
            };

            // Validar geolocalización si no es teletrabajo
            if (!isRemoteWork && latitude && longitude) {
                await this.validateGeolocation(companyId, employeeId, latitude, longitude);
            }

            return await this.createTimeEntry(companyId, punchData);
        } catch (error) {
            console.error('❌ Error en punchTime:', error);
            throw error;
        }
    }

    // Obtener registro por ID
    static async getTimeEntryById(companyId: string, entryId: string): Promise<TimeEntry | null> {
        try {
            const timeEntry = await prisma.timeEntry.findFirst({
                where: {
                    id: entryId,
                    companyId,
                },
                include: {
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            dni: true,
                        },
                    },
                    breakType: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            color: true,
                        },
                    },
                    editLogs: {
                        include: {
                            companyUser: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });

            // Serializar timestamps correctamente - devolver como objeto plano con strings
            if (timeEntry) {
                const serialized = {
                    ...timeEntry,
                    timestamp: timeEntry.timestamp ? timeEntry.timestamp.toISOString() : null,
                    createdAt: timeEntry.createdAt ? timeEntry.createdAt.toISOString() : null,
                    updatedAt: timeEntry.updatedAt ? timeEntry.updatedAt.toISOString() : null,
                };
                return serialized as any; // Convertir a any para evitar conflictos de tipos
            }

            return timeEntry;
        } catch (error) {
            console.error(`❌ Error obteniendo registro ${entryId}:`, error);
            throw error;
        }
    }

    // Obtener registros con filtros
    static async getTimeEntries(companyId: string, filters: TimeEntryFilters) {
        try {
            const {
                employeeId,
                startDate,
                endDate,
                type,
                source,
                page = 1,
                limit = 20,
            } = filters;

            const skip = (page - 1) * limit;

            // Construir filtro where
            const where: any = { companyId };

            if (employeeId) {
                where.employeeId = employeeId;
            }

            if (startDate || endDate) {
                where.timestamp = {};
                if (startDate) {
                    where.timestamp.gte = new Date(startDate);
                }
                if (endDate) {
                    where.timestamp.lte = new Date(endDate);
                }
            }

            if (type) {
                where.type = type;
            }

            if (source) {
                where.source = source;
            }

            const [timeEntries, total] = await Promise.all([
                prisma.timeEntry.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { timestamp: 'desc' },
                    include: {
                        employee: {
                            select: {
                                id: true,
                                name: true,
                                surname: true,
                                dni: true,
                            },
                        },
                        breakType: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                color: true,
                            },
                        },
                    },
                }),
                prisma.timeEntry.count({ where }),
            ]);

            // Asegurar que los timestamps se serialicen correctamente
            const serializedEntries = timeEntries.map(entry => ({
                ...entry,
                timestamp: entry.timestamp ? entry.timestamp.toISOString() : null,
                createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
                updatedAt: entry.updatedAt ? entry.updatedAt.toISOString() : null,
            }));

            return {
                timeEntries: serializedEntries,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            console.error(`❌ Error obteniendo registros de empresa ${companyId}:`, error);
            throw error;
        }
    }

    // Actualizar registro de tiempo
    static async updateTimeEntry(
        companyId: string,
        entryId: string,
        companyUserId: string,
        data: UpdateTimeEntryData,
        reason: string
    ): Promise<TimeEntry> {
        try {
            // Validar datos
            const validatedData = updateTimeEntrySchema.parse(data);

            // Obtener registro actual
            const existingEntry = await prisma.timeEntry.findFirst({
                where: {
                    id: entryId,
                    companyId,
                },
            });

            if (!existingEntry) {
                throw new Error('Registro no encontrado');
            }

            // Guardar log de auditoría
            await prisma.timeEntryEditLog.create({
                data: {
                    timeEntryId: entryId,
                    companyUserId,
                    oldTimestamp: existingEntry.timestamp,
                    newTimestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : existingEntry.timestamp,
                    reason,
                },
            });

            // Actualizar registro
            const updatedEntry = await prisma.timeEntry.update({
                where: {
                    id: entryId,
                    companyId,
                },
                data: {
                    ...validatedData,
                    approvedBy: companyUserId,
                    approvedAt: new Date(),
                },
            });

            // Actualizar WorkDay si cambió el timestamp
            if (validatedData.timestamp) {
                await this.updateWorkDay(companyId, existingEntry.employeeId, new Date(validatedData.timestamp));
            }

            // Limpiar caché
            await cache.clearPattern(`time-entry:${entryId}*`);
            await cache.clearPattern(`time-entries:${companyId}:*`);

            console.log(`✅ Registro de tiempo actualizado: ${entryId}`);
            return updatedEntry;
        } catch (error) {
            console.error(`❌ Error actualizando registro ${entryId}:`, error);
            throw error;
        }
    }

    // Eliminar registro de tiempo
    static async deleteTimeEntry(companyId: string, entryId: string, companyUserId: string, reason: string): Promise<void> {
        try {
            // Obtener registro actual
            const existingEntry = await prisma.timeEntry.findFirst({
                where: {
                    id: entryId,
                    companyId,
                },
            });

            if (!existingEntry) {
                throw new Error('Registro no encontrado');
            }

            // Guardar log de auditoría
            await prisma.timeEntryEditLog.create({
                data: {
                    timeEntryId: entryId,
                    companyUserId,
                    oldTimestamp: existingEntry.timestamp,
                    newTimestamp: new Date(), // Timestamp de eliminación
                    reason: `Registro eliminado: ${reason}`,
                },
            });

            await prisma.timeEntry.delete({
                where: {
                    id: entryId,
                    companyId,
                },
            });

            // Actualizar WorkDay
            await this.updateWorkDay(companyId, existingEntry.employeeId, new Date());

            // Limpiar caché
            await cache.clearPattern(`time-entry:${entryId}*`);
            await cache.clearPattern(`time-entries:${companyId}:*`);

            console.log(`✅ Registro de tiempo eliminado: ${entryId}`);
        } catch (error) {
            console.error(`❌ Error eliminando registro ${entryId}:`, error);
            throw error;
        }
    }

    // Creación masiva de registros
    static async bulkCreateTimeEntries(companyId: string, data: BulkCreateData): Promise<TimeEntry[]> {
        try {
            const validatedData = bulkCreateSchema.parse(data);

            // Verificar que todos los empleados existen a través de EmployeeCompany
            const employeeIds = validatedData.entries.map(e => e.employeeId);
            const employeeCompanies = await (prisma as any).employeeCompany.findMany({
                where: {
                    employeeId: { in: employeeIds },
                    companyId,
                    active: true,
                },
                include: {
                    employee: true,
                },
            });

            const employees = employeeCompanies.map((ec: any) => ec.employee);

            if (employees.length !== employeeIds.length) {
                throw new Error('Algunos empleados no existen o no están activos');
            }

            // Crear registros en lote
            const timeEntries = await prisma.timeEntry.createMany({
                data: validatedData.entries.map(entry => ({
                    companyId,
                    employeeId: entry.employeeId,
                    type: entry.type,
                    timestamp: new Date(entry.timestamp),
                    source: entry.source || TimeEntrySource.ADMIN,
                    location: entry.location,
                    deviceInfo: entry.deviceInfo,
                    notes: entry.notes,
                    createdByEmployee: false,
                })),
            });

            // Actualizar WorkDays para cada empleado
            const employeeGroups = validatedData.entries.reduce((groups, entry) => {
                if (!groups[entry.employeeId]) {
                    groups[entry.employeeId] = [];
                }
                groups[entry.employeeId].push(new Date(entry.timestamp));
                return groups;
            }, {} as Record<string, Date[]>);

            for (const [employeeId, dates] of Object.entries(employeeGroups)) {
                for (const date of dates) {
                    await this.updateWorkDay(companyId, employeeId, date);
                }
            }

            // Limpiar caché
            await cache.clearPattern(`time-entries:${companyId}:*`);
            await cache.clearPattern(`work-days:${companyId}:*`);

            console.log(`✅ ${validatedData.entries.length} registros creados en lote`);
            return timeEntries as any;
        } catch (error) {
            console.error('❌ Error en creación masiva de registros:', error);
            throw error;
        }
    }

    // Obtener registros de un empleado
    static async getEmployeeTimeEntries(companyId: string, employeeId: string, filters: Omit<TimeEntryFilters, 'employeeId'>) {
        try {
            return await this.getTimeEntries(companyId, {
                ...filters,
                employeeId,
            });
        } catch (error) {
            console.error(`❌ Error obteniendo registros del empleado ${employeeId}:`, error);
            throw error;
        }
    }

    // Obtener resumen diario
    static async getDailySummary(companyId: string, date: string): Promise<any> {
        try {
            const cacheKey = `daily-summary:${companyId}:${date}`;
            const cached = await cache.get(cacheKey);

            if (cached) {
                return JSON.parse(cached);
            }

            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

            const [entries, totalEntries] = await Promise.all([
                prisma.timeEntry.findMany({
                    where: {
                        companyId,
                        timestamp: {
                            gte: startOfDay,
                            lte: endOfDay,
                        },
                    },
                    include: {
                        employee: {
                            select: {
                                id: true,
                                name: true,
                                surname: true,
                                dni: true,
                            },
                        },
                        breakType: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                color: true,
                            },
                        },
                    },
                    orderBy: { timestamp: 'asc' },
                }),
                prisma.timeEntry.count({
                    where: {
                        companyId,
                        timestamp: {
                            gte: startOfDay,
                            lte: endOfDay,
                        },
                    },
                }),
            ]);

            // Serializar timestamps correctamente
            const serializedEntries = entries.map(entry => ({
                ...entry,
                timestamp: entry.timestamp ? entry.timestamp.toISOString() : null,
                createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
                updatedAt: entry.updatedAt ? entry.updatedAt.toISOString() : null,
            }));

            // Agrupar por empleado
            const employeeSummaries = serializedEntries.reduce((summaries, entry) => {
                const empId = entry.employeeId;
                if (!summaries[empId]) {
                    summaries[empId] = {
                        employee: entry.employee,
                        entries: [],
                        totalMinutes: 0,
                        firstEntry: null,
                        lastEntry: null,
                    };
                }

                summaries[empId].entries.push(entry);

                if (entry.timestamp && (!summaries[empId].firstEntry || entry.timestamp < summaries[empId].firstEntry.timestamp)) {
                    summaries[empId].firstEntry = entry;
                }
                if (entry.timestamp && (!summaries[empId].lastEntry || entry.timestamp > summaries[empId].lastEntry.timestamp)) {
                    summaries[empId].lastEntry = entry;
                }

                return summaries;
            }, {} as Record<string, any>);

            // Calcular minutos trabajados para cada empleado
            for (const empId of Object.keys(employeeSummaries)) {
                const { workedMinutes } = this.calculateMinutesWorked(employeeSummaries[empId].entries);
                employeeSummaries[empId].totalMinutes = workedMinutes;
            }

            const summary = {
                date,
                totalEntries,
                employees: Object.values(employeeSummaries),
            };

            // Guardar en caché por 5 minutos
            await cache.set(cacheKey, JSON.stringify(summary), 300);

            return summary;
        } catch (error) {
            console.error(`❌ Error obteniendo resumen diario ${date}:`, error);
            throw error;
        }
    }

    // Obtener estadísticas de fichajes
    static async getTimeEntryStats(companyId: string, filters: { startDate?: string; endDate?: string } = {}): Promise<any> {
        try {
            const cacheKey = `time-stats:${companyId}:${JSON.stringify(filters)}`;
            const cached = await cache.get(cacheKey);

            if (cached) {
                return JSON.parse(cached);
            }

            const where: any = { companyId };

            if (filters.startDate || filters.endDate) {
                where.timestamp = {};
                if (filters.startDate) {
                    where.timestamp.gte = new Date(filters.startDate);
                }
                if (filters.endDate) {
                    where.timestamp.lte = new Date(filters.endDate);
                }
            }

            const [
                totalEntries,
                entriesByType,
                entriesBySource,
                recentEntries,
            ] = await Promise.all([
                prisma.timeEntry.count({ where }),
                prisma.timeEntry.groupBy({
                    by: ['type'],
                    where,
                    _count: true,
                }),
                prisma.timeEntry.groupBy({
                    by: ['source'],
                    where,
                    _count: true,
                }),
                prisma.timeEntry.findMany({
                    where,
                    orderBy: { timestamp: 'desc' },
                    take: 10,
                    include: {
                        employee: {
                            select: {
                                name: true,
                                surname: true,
                            },
                        },
                        breakType: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                color: true,
                            },
                        },
                    },
                }),
            ]);

            // Serializar timestamps correctamente en recentEntries
            const serializedRecentEntries = recentEntries.map(entry => ({
                ...entry,
                timestamp: entry.timestamp ? entry.timestamp.toISOString() : null,
                createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
                updatedAt: entry.updatedAt ? entry.updatedAt.toISOString() : null,
            }));

            const stats = {
                total: totalEntries,
                byType: entriesByType.reduce((acc: any, item: any) => {
                    acc[item.type] = item._count;
                    return acc;
                }, {}),
                bySource: entriesBySource.reduce((acc: any, item: any) => {
                    acc[item.source] = item._count;
                    return acc;
                }, {}),
                recent: serializedRecentEntries,
            };

            // Guardar en caché por 10 minutos
            await cache.set(cacheKey, JSON.stringify(stats), 600);

            return stats;
        } catch (error) {
            console.error(`❌ Error obteniendo estadísticas de fichajes ${companyId}:`, error);
            throw error;
        }
    }

    // Métodos auxiliares
    private static async validatePunchRules(companyId: string, employeeId: string, type: TimeEntryType, timestamp: string): Promise<void> {
        try {
            const now = new Date(timestamp);
            const workDayStart = this.getWorkDayStart(now);

            console.log(`🔍 Validando fichaje: ${type} a las ${now.toISOString()}, día de trabajo: ${workDayStart.toISOString()}`);

            // Obtener todos los registros del empleado en el día de trabajo actual
            const todayEntries = await prisma.timeEntry.findMany({
                where: {
                    employeeId,
                    companyId,
                    timestamp: {
                        gte: workDayStart,
                    },
                },
                orderBy: { timestamp: 'desc' },
                include: {
                    breakType: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            color: true,
                        },
                    },
                },
            });

            const lastEntry = todayEntries[0]; // El más reciente

            console.log(`🔍 Validando fichaje: ${type}, último registro: ${lastEntry?.type}, total hoy: ${todayEntries.length}`);

            // Validar reglas de fichaje
            if (lastEntry) {
                // No permitir dos entradas seguidas
                if (lastEntry.type === TimeEntryType.IN && type === TimeEntryType.IN) {
                    throw new Error('Ya tienes una entrada registrada. Debes registrar una salida o una pausa primero.');
                }

                // No permitir dos salidas seguidas
                if (lastEntry.type === TimeEntryType.OUT && type === TimeEntryType.OUT) {
                    throw new Error('Ya tienes una salida registrada. Debes registrar una entrada primero.');
                }

                // No permitir dos pausas seguidas
                if (lastEntry.type === TimeEntryType.BREAK && type === TimeEntryType.BREAK) {
                    throw new Error('Ya tienes una pausa activa. Debes reanudar antes de iniciar otra pausa.');
                }

                // No permitir dos reanudaciones seguidas
                if (lastEntry.type === TimeEntryType.RESUME && type === TimeEntryType.RESUME) {
                    throw new Error('Ya has reanudado el trabajo. Debes iniciar una pausa antes de reanudar nuevamente.');
                }

                // No permitir BREAK sin IN previo o después de OUT
                if (type === TimeEntryType.BREAK && lastEntry.type !== TimeEntryType.IN && lastEntry.type !== TimeEntryType.RESUME) {
                    throw new Error('Debes tener una sesión de trabajo activa para iniciar una pausa.');
                }

                // No permitir RESUME sin BREAK previo
                if (type === TimeEntryType.RESUME && lastEntry.type !== TimeEntryType.BREAK) {
                    throw new Error('Debes registrar una pausa antes de reanudar el trabajo.');
                }

                // No permitir OUT después de BREAK (debe ser RESUME primero)
                if (type === TimeEntryType.OUT && lastEntry.type === TimeEntryType.BREAK) {
                    throw new Error('Tienes una pausa activa. Debes reanudar el trabajo antes de registrar la salida.');
                }
            } else {
                // Si no hay registros hoy, solo permitir IN
                if (type !== TimeEntryType.IN) {
                    throw new Error('Debes registrar una entrada primero.');
                }
            }

            // Validaciones adicionales basadas en el historial completo del día
            const hasActiveBreak = todayEntries.some(entry => entry.type === TimeEntryType.BREAK) &&
                !todayEntries.some(entry => entry.type === TimeEntryType.RESUME &&
                    todayEntries.findIndex(e => e.id === entry.id) > todayEntries.findIndex(e => e.type === TimeEntryType.BREAK));

            if (hasActiveBreak && type !== TimeEntryType.RESUME) {
                throw new Error('Tienes una pausa activa. Debes reanudar el trabajo antes de continuar.');
            }

            console.log(`✅ Validación de fichaje exitosa para: ${type}`);
        } catch (error) {
            console.error('❌ Error validando reglas de fichaje:', error);
            throw error;
        }
    }

    // Método para determinar el inicio del día de trabajo (manejo de turnos nocturnos)
    private static getWorkDayStart(timestamp: Date): Date {
        const workDayStart = new Date(timestamp);

        // Si es antes de las 5:00 AM, considerarlo parte del día anterior
        if (workDayStart.getHours() < 5) {
            workDayStart.setDate(workDayStart.getDate() - 1);
        }

        // Establecer a las 00:00:00 del día de trabajo
        workDayStart.setHours(0, 0, 0, 0);

        return workDayStart;
    }

    private static async updateWorkDay(companyId: string, employeeId: string, date: Date): Promise<void> {
        try {
            const workDayStart = this.getWorkDayStart(date);
            const workDayDate = workDayStart.toISOString().split('T')[0]; // YYYY-MM-DD

            console.log(`📅 Actualizando WorkDay para ${employeeId}, fecha: ${workDayDate}`);

            // Obtener o crear WorkDay
            let workDay = await prisma.workDay.findFirst({
                where: {
                    companyId,
                    employeeId,
                    date: new Date(workDayDate),
                },
            });

            const entries = await prisma.timeEntry.findMany({
                where: {
                    employeeId,
                    companyId,
                    timestamp: {
                        gte: workDayStart,
                        lt: new Date(workDayStart.getTime() + 24 * 60 * 60 * 1000), // Siguiente día
                    },
                },
                orderBy: { timestamp: 'asc' },
                include: {
                    breakType: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            color: true,
                        },
                    },
                },
            });

            if (entries.length === 0) return;

            // Calcular horas trabajadas y pausas
            const { workedMinutes, overtimeMinutes } = this.calculateMinutesWorked(entries);
            const breakMinutes = this.calculateBreakMinutes(entries);

            if (!workDay) {
                workDay = await prisma.workDay.create({
                    data: {
                        companyId,
                        employeeId,
                        date: new Date(workDayDate),
                        startTime: entries[0]?.timestamp,
                        endTime: entries[entries.length - 1]?.timestamp,
                        workedMinutes,
                        breakMinutes,
                        overtimeMinutes,
                        status: 'PENDING',
                    },
                });
            } else {
                workDay = await prisma.workDay.update({
                    where: { id: workDay.id },
                    data: {
                        startTime: entries[0]?.timestamp,
                        endTime: entries[entries.length - 1]?.timestamp,
                        workedMinutes,
                        breakMinutes,
                        overtimeMinutes,
                    },
                });
            }

            console.log(`✅ WorkDay actualizado: ${employeeId} - ${workDayDate}, trabajados: ${workedMinutes}min, pausas: ${breakMinutes}min`);
        } catch (error) {
            console.error(`❌ Error actualizando WorkDay:`, error);
            throw error;
        }
    }

    private static calculateBreakMinutes(entries: any[]): number {
        let totalBreakMinutes = 0;
        let breakStartTime: Date | null = null;

        // Ordenar entradas por timestamp
        const sortedEntries = [...entries].sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
            const timeB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
            return timeA.getTime() - timeB.getTime();
        });

        for (const entry of sortedEntries) {
            const entryTime = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);

            if (entry.type === TimeEntryType.BREAK) {
                breakStartTime = entryTime;
            } else if (entry.type === TimeEntryType.RESUME && breakStartTime) {
                // Calcular duración de la pausa
                const breakDuration = (entryTime.getTime() - breakStartTime.getTime()) / (1000 * 60);
                totalBreakMinutes += breakDuration;
                breakStartTime = null;
            }
        }

        // Si hay una pausa sin cerrar, calcular hasta el final del día
        if (breakStartTime) {
            const endOfDay = new Date(breakStartTime);
            endOfDay.setHours(23, 59, 59, 999);
            const breakDuration = (endOfDay.getTime() - breakStartTime.getTime()) / (1000 * 60);
            totalBreakMinutes += breakDuration;
        }

        return totalBreakMinutes;
    }

    private static calculateMinutesWorked(entries: any[]): { workedMinutes: number; overtimeMinutes: number } {
        let totalMinutes = 0;
        let inTime: Date | null = null;
        let breakStartTime: Date | null = null;
        let totalBreakMinutes = 0;

        // Ordenar entradas por timestamp para asegurar procesamiento correcto
        const sortedEntries = [...entries].sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
            const timeB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
            return timeA.getTime() - timeB.getTime();
        });

        console.log('🕐 Procesando entradas para calcular minutos trabajados:', sortedEntries.map(e => ({
            type: e.type,
            timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp
        })));

        for (const entry of sortedEntries) {
            // Asegurarse de que el timestamp sea un objeto Date
            const entryTime = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);

            if (entry.type === TimeEntryType.IN) {
                inTime = entryTime;
                console.log(`🟢 IN: ${entryTime.toISOString()}`);
            } else if (entry.type === TimeEntryType.OUT && inTime) {
                // Calcular minutos trabajados desde la última IN o RESUME
                const workedMinutes = (entryTime.getTime() - inTime.getTime()) / (1000 * 60);
                totalMinutes += workedMinutes;
                console.log(`🔴 OUT: ${entryTime.toISOString()}, minutos trabajados: ${workedMinutes}`);
                inTime = null;
            } else if (entry.type === TimeEntryType.BREAK) {
                if (breakStartTime) {
                    // Si ya había una pausa en curso, calcularla primero
                    const breakDuration = (entryTime.getTime() - breakStartTime.getTime()) / (1000 * 60);
                    totalBreakMinutes += breakDuration;
                    console.log(`⏸️ BREAK (fin): ${entryTime.toISOString()}, duración pausa: ${breakDuration} minutos`);
                }
                breakStartTime = entryTime;
                console.log(`⏸️ BREAK (inicio): ${entryTime.toISOString()}`);
            } else if (entry.type === TimeEntryType.RESUME) {
                if (breakStartTime) {
                    // Calcular duración de la pausa
                    const breakDuration = (entryTime.getTime() - breakStartTime.getTime()) / (1000 * 60);
                    totalBreakMinutes += breakDuration;
                    console.log(`▶️ RESUME: ${entryTime.toISOString()}, duración pausa: ${breakDuration} minutos`);
                    breakStartTime = null;
                }
                // Reanudar el tiempo de trabajo
                inTime = entryTime;
                console.log(`▶️ RESUME: reanudando trabajo en ${entryTime.toISOString()}`);
            }
        }

        // Si hay una pausa sin cerrar, calcular hasta el final del día
        if (breakStartTime) {
            const endOfDay = new Date(breakStartTime);
            endOfDay.setHours(23, 59, 59, 999);
            const breakDuration = (endOfDay.getTime() - breakStartTime.getTime()) / (1000 * 60);
            totalBreakMinutes += breakDuration;
            console.log(`⏸️ BREAK (sin cerrar): añadiendo ${breakDuration} minutos hasta fin de día`);
        }

        // Restar minutos de pausa del total
        totalMinutes -= totalBreakMinutes;

        // Calcular horas extras (más de 8 horas diarias)
        const regularMinutes = 8 * 60; // 8 horas = 480 minutos
        const overtimeMinutes = Math.max(0, totalMinutes - regularMinutes);

        console.log(`📊 Resumen cálculo: Total trabajado: ${totalMinutes} min, Pausas: ${totalBreakMinutes} min, Extras: ${overtimeMinutes} min`);

        return { workedMinutes: Math.max(0, totalMinutes), overtimeMinutes };
    }

    // Validar geolocalización
    private static async validateGeolocation(
        companyId: string,
        _employeeId: string, // Prefijo con _ para indicar que no se usa pero se mantiene por consistencia
        userLatitude: number,
        userLongitude: number
    ): Promise<void> {
        try {
            // Obtener datos de la empresa
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: {
                    latitude: true,
                    longitude: true,
                    geofenceRadius: true,
                    requireGeolocation: true,
                },
            });

            // Si la empresa no requiere geolocalización, no validar
            if (!company?.requireGeolocation || !company.latitude || !company.longitude) {
                return;
            }

            // Calcular distancia entre la ubicación del usuario y la empresa
            const distance = this.calculateDistance(
                userLatitude,
                userLongitude,
                company.latitude,
                company.longitude
            );

            const radius = company.geofenceRadius || 100; // 100 metros por defecto

            // Si está fuera del radio permitido, lanzar error
            if (distance > radius) {
                throw new Error(
                    `Estás demasiado lejos de la oficina para fichar. ` +
                    `Distancia: ${Math.round(distance)}m, ` +
                    `Radio permitido: ${radius}m. ` +
                    `Por favor, acércate a la ubicación de la empresa o marca teletrabajo.`
                );
            }

            console.log(`✅ Geolocalización validada: ${Math.round(distance)}m dentro del radio permitido`);
        } catch (error) {
            console.error('❌ Error validando geolocalización:', error);
            throw error;
        }
    }

    // Calcular distancia entre dos puntos (fórmula de Haversine)
    private static calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371e3; // Radio de la Tierra en metros
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // en metros
    }

    // Obtener información de la empresa para el frontend
    static async getCompanyGeolocation(companyId: string): Promise<{
        latitude?: number;
        longitude?: number;
        geofenceRadius?: number;
        requireGeolocation?: boolean;
    } | null> {
        try {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: {
                    latitude: true,
                    longitude: true,
                    geofenceRadius: true,
                    requireGeolocation: true,
                },
            });

            if (!company) {
                return null;
            }

            return {
                latitude: company.latitude || undefined,
                longitude: company.longitude || undefined,
                geofenceRadius: company.geofenceRadius || undefined,
                requireGeolocation: company.requireGeolocation || false,
            };
        } catch (error) {
            console.error('❌ Error obteniendo geolocalización de la empresa:', error);
            return null;
        }
    }

    // Obtener estado actual del fichaje del empleado
    static async getCurrentPunchState(companyId: string, employeeId: string): Promise<{
        canPunchIn: boolean;
        canPunchOut: boolean;
        canStartBreak: boolean;
        canResumeBreak: boolean;
        currentState: TimeEntryType | null;
        lastEntry: any | null;
        todayEntries: any[];
    }> {
        try {
            const now = new Date();
            const workDayStart = this.getWorkDayStart(now);

            console.log(`📊 Obteniendo estado de fichaje para ${employeeId}, día de trabajo: ${workDayStart.toISOString()}`);

            // Obtener todos los registros del empleado en el día de trabajo actual ordenados
            const todayEntries = await prisma.timeEntry.findMany({
                where: {
                    employeeId,
                    companyId,
                    timestamp: {
                        gte: workDayStart,
                    },
                },
                orderBy: { timestamp: 'desc' },
                include: {
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            dni: true,
                        },
                    },
                    breakType: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            color: true,
                        },
                    },
                },
            });

            // Serializar timestamps
            const serializedEntries = todayEntries.map(entry => ({
                ...entry,
                timestamp: entry.timestamp ? entry.timestamp.toISOString() : null,
                createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
                updatedAt: entry.updatedAt ? entry.updatedAt.toISOString() : null,
            }));

            const lastEntry = serializedEntries[0] || null;
            const currentState = lastEntry?.type || null;

            // Determinar qué acciones están disponibles
            let canPunchIn = false;
            let canPunchOut = false;
            let canStartBreak = false;
            let canResumeBreak = false;

            if (!lastEntry) {
                // Primer fichaje del día
                canPunchIn = true;
            } else {
                switch (currentState) {
                    case TimeEntryType.IN:
                    case TimeEntryType.RESUME:
                        // Está trabajando, puede salir o pausar
                        canPunchOut = true;
                        canStartBreak = true;
                        break;
                    case TimeEntryType.OUT:
                        // Salió, puede volver a entrar
                        canPunchIn = true;
                        break;
                    case TimeEntryType.BREAK:
                        // Está en pausa, solo puede reanudar
                        canResumeBreak = true;
                        break;
                }
            }

            console.log(`📊 Estado fichaje empleado ${employeeId}: ${currentState}, IN:${canPunchIn}, OUT:${canPunchOut}, BREAK:${canStartBreak}, RESUME:${canResumeBreak}`);

            return {
                canPunchIn,
                canPunchOut,
                canStartBreak,
                canResumeBreak,
                currentState,
                lastEntry,
                todayEntries: serializedEntries,
            };
        } catch (error) {
            console.error(`❌ Error obteniendo estado de fichaje del empleado ${employeeId}:`, error);
            throw error;
        }
    }
}

export default TimeEntryService;