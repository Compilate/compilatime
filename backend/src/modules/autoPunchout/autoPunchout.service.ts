import { TimeEntryType, TimeEntrySource } from '@prisma/client';
import { prisma } from '../../config/db';

interface AutoPunchoutConfig {
    enabled: boolean;
    maxMinutes: number;
    marginBefore: number;
    marginAfter: number;
}

export class AutoPunchoutService {
    // Ejecutar cada 5 minutos para verificar fichajes pendientes
    static async startAutoPunchoutCron() {
        console.log('🕐 Iniciando servicio de cierre automático de fichajes...');

        // Ejecutar cada 5 minutos usando setInterval
        setInterval(async () => {
            try {
                await this.processPendingPunchouts();
            } catch (error) {
                console.error('❌ Error en proceso automático de cierre:', error);
            }
        }, 5 * 60 * 1000); // 5 minutos en milisegundos
    }

    // Procesar todos los fichajes pendientes de cierre
    static async processPendingPunchouts() {
        console.log('🔍 Verificando fichajes pendientes de cierre...');

        // Obtener todas las empresas con auto-punchout habilitado
        const companies = await prisma.company.findMany({
            where: {
                active: true,
            },
        });

        console.log(`🔍 Encontradas ${companies.length} empresas activas`);

        for (const company of companies) {
            // Verificar si tiene auto-punchout habilitado (campos directos en Company)
            if (company.autoPunchoutEnabled) {
                const config: AutoPunchoutConfig = {
                    enabled: true,
                    maxMinutes: company.autoPunchoutMaxMinutes || 480,
                    marginBefore: company.autoPunchoutMarginBefore || 15,
                    marginAfter: company.autoPunchoutMarginAfter || 30,
                };

                console.log(`🔍 Procesando empresa ${company.name} con config:`, config);
                await this.processCompanyAutoPunchout(company.id, config, company.timezone || 'Europe/Madrid');
            } else {
                console.log(`🔍 Empresa ${company.name} tiene auto-punchout deshabilitado`);
            }
        }
    }

    // Procesar cierre automático para una empresa específica
    static async processCompanyAutoPunchout(
        companyId: string,
        config: AutoPunchoutConfig,
        timezone: string = 'Europe/Madrid'
    ) {
        try {
            console.log(`🔍 Procesando empresa ${companyId} con config:`, config);

            // Obtener todos los empleados activos de la empresa
            const employees = await (prisma as any).employeeCompany.findMany({
                where: {
                    companyId: companyId,
                    active: true,
                    employee: {
                        active: true,
                    },
                },
                include: {
                    employee: true,
                },
            });

            console.log(`🔍 ${employees.length} empleados activos en ${companyId}`);

            for (const employeeCompany of employees) {
                await this.processEmployeeAutoPunchout(companyId, employeeCompany.employee, config, timezone);
            }
        } catch (error) {
            console.error(`❌ Error procesando empresa ${companyId}:`, error);
        }
    }

    // Procesar cierre automático para un empleado específico
    static async processEmployeeAutoPunchout(
        companyId: string,
        employee: any,
        config: AutoPunchoutConfig,
        timezone: string = 'Europe/Madrid'
    ) {
        try {
            const now = new Date();
            const employeeId = employee.id;

            // Obtener el último fichaje del empleado
            const lastEntry = await prisma.timeEntry.findFirst({
                where: {
                    employeeId: employeeId,
                    companyId: companyId,
                },
                orderBy: {
                    timestamp: 'desc',
                },
            });

            if (!lastEntry) {
                return; // No hay fichajes para procesar
            }

            // Solo procesar si el último fichaje es de entrada (IN) o reanudar (RESUME)
            if (lastEntry.type !== TimeEntryType.IN && lastEntry.type !== TimeEntryType.RESUME) {
                return;
            }

            const entryTime = new Date(lastEntry.timestamp);
            const minutesSinceEntry = Math.floor((now.getTime() - entryTime.getTime()) / (1000 * 60));

            console.log(`🔍 Empleado ${employee.name}: último fichaje ${lastEntry.type} hace ${minutesSinceEntry} minutos`);

            // Si ha pasado más tiempo del configurado, verificar si necesita cierre automático
            if (minutesSinceEntry > config.maxMinutes) {
                console.log(`🔍 Empleado ${employee.name}: excedió tiempo máximo (${minutesSinceEntry} > ${config.maxMinutes})`);

                // Obtener horario del empleado para el día actual
                const today = now.toISOString().split('T')[0];
                const employeeSchedule = await this.getEmployeeSchedule(companyId, employeeId, today);

                if (employeeSchedule && employeeSchedule.schedules.length > 0) {
                    // Verificar cada turno del día
                    for (const schedule of employeeSchedule.schedules) {
                        await this.processScheduleAutoPunchout(
                            companyId,
                            employee,
                            schedule,
                            lastEntry,
                            config,
                            timezone
                        );
                    }
                } else {
                    // Si no tiene horario, cerrar después del tiempo máximo
                    if (minutesSinceEntry > config.maxMinutes + config.marginAfter) {
                        await this.createAutoPunchout(
                            companyId,
                            employeeId,
                            lastEntry,
                            now,
                            'Tiempo máximo excedido sin horario asignado'
                        );
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Error procesando empleado ${employee.name}:`, error);
        }
    }

    // Procesar cierre automático para un horario específico
    static async processScheduleAutoPunchout(
        companyId: string,
        employee: any,
        schedule: any,
        lastEntry: any,
        config: AutoPunchoutConfig,
        _timezone: string
    ) {
        try {
            const now = new Date();
            const entryTime = new Date(lastEntry.timestamp);

            // Convertir horas del horario a minutos desde medianoche
            const [scheduleStartHour, scheduleStartMinute] = schedule.startTime.split(':').map(Number);
            const [scheduleEndHour, scheduleEndMinute] = schedule.endTime.split(':').map(Number);

            const scheduleStartMinutes = scheduleStartHour * 60 + scheduleStartMinute;
            let scheduleEndMinutes = scheduleEndHour * 60 + scheduleEndMinute;

            // Si el turno cruza medianoche, añadir 24 horas
            if (scheduleEndMinutes < scheduleStartMinutes) {
                scheduleEndMinutes += 24 * 60;
            }

            // Crear fechas para el turno de hoy
            const today = new Date();
            const scheduleStartDate = new Date(today);
            scheduleStartDate.setHours(scheduleStartHour, scheduleStartMinute, 0, 0);

            const scheduleEndDate = new Date(today);
            if (scheduleEndHour < scheduleStartHour) {
                // Si cruza medianoche, es el día siguiente
                scheduleEndDate.setDate(scheduleEndDate.getDate() + 1);
            }
            scheduleEndDate.setHours(scheduleEndHour, scheduleEndMinute, 0, 0);

            console.log(`🔍 Turno ${schedule.name}: ${schedule.startTime} - ${schedule.endTime}`);

            // Caso 1: Entrada antes del inicio del turno y ya pasó el tiempo de margen antes
            if (entryTime < scheduleStartDate && now > scheduleStartDate) {
                const minutesAfterStart = Math.floor((now.getTime() - scheduleStartDate.getTime()) / (1000 * 60));
                if (minutesAfterStart > config.marginBefore) {
                    await this.createAutoPunchout(
                        companyId,
                        employee.id,
                        lastEntry,
                        scheduleStartDate,
                        `Cierre automático: entrada antes del turno y margen de ${config.marginBefore}min excedido`
                    );
                    return;
                }
            }

            // Caso 2: Entrada durante el turno y ya pasó el fin del turno + margen
            if (entryTime >= scheduleStartDate && entryTime <= scheduleEndDate && now > scheduleEndDate) {
                const minutesAfterEnd = Math.floor((now.getTime() - scheduleEndDate.getTime()) / (1000 * 60));
                if (minutesAfterEnd > config.marginAfter) {
                    await this.createAutoPunchout(
                        companyId,
                        employee.id,
                        lastEntry,
                        scheduleEndDate,
                        `Cierre automático: fin de turno excedido por ${minutesAfterEnd}min (margen: ${config.marginAfter}min)`
                    );
                    return;
                }
            }

            // Caso 3: Entrada después del fin del turno (caso especial)
            if (entryTime > scheduleEndDate) {
                const minutesAfterEnd = Math.floor((now.getTime() - scheduleEndDate.getTime()) / (1000 * 60));
                if (minutesAfterEnd > config.marginAfter) {
                    await this.createAutoPunchout(
                        companyId,
                        employee.id,
                        lastEntry,
                        new Date(entryTime.getTime() + (config.maxMinutes * 60 * 1000)),
                        `Cierre automático: entrada después del turno, tiempo máximo excedido`
                    );
                    return;
                }
            }
        } catch (error) {
            console.error(`❌ Error procesando turno ${schedule.name}:`, error);
        }
    }

    // Crear fichaje de salida automático
    static async createAutoPunchout(
        companyId: string,
        employeeId: string,
        lastEntry: any,
        punchoutTime: Date,
        reason: string
    ) {
        try {
            // Verificar que no exista ya una salida después de la última entrada
            const existingOut = await prisma.timeEntry.findFirst({
                where: {
                    employeeId: employeeId,
                    companyId: companyId,
                    type: TimeEntryType.OUT,
                    timestamp: {
                        gte: lastEntry.timestamp,
                    },
                },
            });

            if (existingOut) {
                console.log(`🔍 Ya existe una salida para el empleado ${employeeId} después de la última entrada`);
                return;
            }

            // Crear fichaje de salida automático
            const autoPunchout = await prisma.timeEntry.create({
                data: {
                    companyId: companyId,
                    employeeId: employeeId,
                    type: TimeEntryType.OUT,
                    timestamp: punchoutTime,
                    source: TimeEntrySource.ADMIN,
                    notes: `Cierre automático: ${reason}`,
                    createdByEmployee: false,
                },
            });

            console.log(`✅ Cierre automático creado para empleado ${employeeId}:`, {
                id: autoPunchout.id,
                timestamp: autoPunchout.timestamp,
                reason,
            });

            // Actualizar WorkDay
            await this.updateWorkDay(companyId, employeeId, punchoutTime);

            // Enviar notificación (opcional)
            await this.sendAutoPunchoutNotification(companyId, employeeId, reason);

        } catch (error) {
            console.error(`❌ Error creando cierre automático para empleado ${employeeId}:`, error);
        }
    }

    // Obtener horario del empleado (similar a EmployeeService pero simplificado)
    static async getEmployeeSchedule(companyId: string, employeeId: string, date: string) {
        try {
            const targetDate = new Date(date);
            const dayOfWeek = targetDate.getDay();

            // Obtener horarios asignados al empleado
            const employeeSchedules = await prisma.employeeSchedule.findMany({
                where: {
                    employeeId: employeeId,
                    schedule: {
                        companyId: companyId,
                        active: true,
                        scheduleDays: {
                            some: {
                                dayOfWeek: dayOfWeek
                            }
                        }
                    },
                    active: true,
                    startDate: {
                        lte: targetDate,
                    },
                    OR: [
                        { endDate: null },
                        { endDate: { gte: targetDate } },
                    ],
                },
                include: {
                    schedule: true,
                },
                distinct: ['scheduleId'],
            });

            if (employeeSchedules.length > 0) {
                return {
                    schedules: employeeSchedules.map((es: any) => ({
                        id: es.schedule.id,
                        name: es.schedule.name,
                        startTime: es.schedule.startTime,
                        endTime: es.schedule.endTime,
                        color: es.schedule.color,
                        isReference: false,
                    })),
                };
            }

            // Si no hay asignaciones, obtener horarios de la empresa como referencia
            const companySchedules = await prisma.schedule.findMany({
                where: {
                    companyId: companyId,
                    active: true,
                },
                orderBy: {
                    startTime: 'asc',
                },
            });

            return {
                schedules: companySchedules.map((schedule: any) => ({
                    id: schedule.id,
                    name: schedule.name,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    color: schedule.color,
                    isReference: true,
                })),
            };
        } catch (error) {
            console.error(`❌ Error obteniendo horario del empleado ${employeeId}:`, error);
            return null;
        }
    }

    // Actualizar WorkDay (similar a TimeEntryService)
    static async updateWorkDay(companyId: string, employeeId: string, date: Date) {
        try {
            const workDayDate = date.toISOString().split('T')[0];

            const entries = await prisma.timeEntry.findMany({
                where: {
                    employeeId: employeeId,
                    companyId: companyId,
                    timestamp: {
                        gte: new Date(workDayDate),
                        lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
                orderBy: { timestamp: 'asc' },
                include: {
                    breakType: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            color: true
                        }
                    }
                }
            });

            if (entries.length === 0) return;

            // Calcular horas trabajadas
            let totalMinutes = 0;
            let inTime: Date | null = null;

            for (const entry of entries) {
                const entryTime = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);

                if (entry.type === TimeEntryType.IN) {
                    inTime = entryTime;
                } else if (entry.type === TimeEntryType.OUT && inTime) {
                    totalMinutes += (entryTime.getTime() - inTime.getTime()) / (1000 * 60);
                    inTime = null;
                }
            }

            const regularMinutes = 8 * 60;
            const overtimeMinutes = Math.max(0, totalMinutes - regularMinutes);

            // Actualizar o crear WorkDay
            const existingWorkDay = await prisma.workDay.findFirst({
                where: {
                    companyId: companyId,
                    employeeId: employeeId,
                    date: new Date(workDayDate),
                },
            });

            const workDayData = {
                startTime: entries[0]?.timestamp,
                endTime: entries[entries.length - 1]?.timestamp,
                workedMinutes: Math.round(totalMinutes),
                overtimeMinutes: Math.round(overtimeMinutes),
            };

            if (existingWorkDay) {
                await prisma.workDay.update({
                    where: { id: existingWorkDay.id },
                    data: workDayData,
                });
            } else {
                await prisma.workDay.create({
                    data: {
                        companyId: companyId,
                        employeeId: employeeId,
                        date: new Date(workDayDate),
                        ...workDayData,
                        status: 'PENDING',
                    },
                });
            }
        } catch (error) {
            console.error(`❌ Error actualizando WorkDay:`, error);
        }
    }

    // Enviar notificación de cierre automático
    static async sendAutoPunchoutNotification(companyId: string, employeeId: string, reason: string) {
        try {
            // Aquí se podría integrar con el sistema de notificaciones
            console.log(`📧 Notificación de cierre automático para empleado ${employeeId}: ${reason}`);

            // Opcional: crear notificación en la base de datos
            try {
                await prisma.notification.create({
                    data: {
                        companyId: companyId,
                        recipientId: employeeId,
                        title: 'Cierre Automático de Fichaje',
                        message: `Se ha registrado automáticamente tu salida: ${reason}`,
                        type: 'TIME_ENTRY' as any,
                        status: 'SENT' as any,
                    },
                });
            } catch (notifError) {
                console.error('❌ Error creando notificación:', notifError);
            }
        } catch (error) {
            console.error(`❌ Error enviando notificación:`, error);
        }
    }
}

export default AutoPunchoutService;