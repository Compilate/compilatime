import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import { cache } from '../../config/redis';

const prisma = new PrismaClient();

export interface WeeklyScheduleData {
    employeeId: string;
    weekStart: Date;
    dayOfWeek: number;
    scheduleId: string | null | undefined;
    notes?: string;
}

export interface WeeklyTemplateData {
    name: string;
    description?: string;
    weekData: {
        [dayOfWeek: number]: Array<{
            scheduleId: string | null;
            notes?: string;
        }>;
    };
}

export interface CopyWeekData {
    fromWeekStart: Date;
    toWeekStart: Date;
    employeeIds?: string[];
}

class WeeklyScheduleService {
    // Obtener asignaciones semanales para un empleado y semana específica
    async getWeeklySchedules(employeeId: string, weekStart: Date): Promise<any[]> {
        try {
            const cacheKey = `weekly_schedules:${employeeId}:${format(weekStart, 'yyyy-MM-dd')}`;

            // Intentar obtener desde caché
            const cached = await cache.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            const schedules = await prisma.weeklySchedule.findMany({
                where: {
                    employeeId,
                    weekStart,
                    active: true,
                },
                include: {
                    schedule: true,
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            dni: true,
                        },
                    },
                },
                orderBy: {
                    dayOfWeek: 'asc',
                },
            });

            // Cachear por 5 minutos
            await cache.set(cacheKey, JSON.stringify(schedules), 300);

            return schedules;
        } catch (error) {
            console.error('Error al obtener asignaciones semanales:', error);
            throw new Error('Error al obtener asignaciones semanales');
        }
    }

    // Obtener asignaciones semanales para toda la empresa en una semana
    async getCompanyWeeklySchedules(companyId: string, weekStart: Date): Promise<any[]> {
        try {
            const cacheKey = `company_weekly_schedules:${companyId}:${format(weekStart, 'yyyy-MM-dd')}`;

            // Intentar obtener desde caché
            const cached = await cache.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            const schedules = await prisma.weeklySchedule.findMany({
                where: {
                    employee: {
                        employeeCompanies: {
                            some: {
                                companyId,
                                active: true,
                            },
                        },
                    },
                    weekStart,
                    active: true,
                },
                include: {
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            dni: true,
                            department: true,
                        },
                    },
                },
                orderBy: [
                    {
                        employee: {
                            name: 'asc',
                        },
                    },
                    {
                        dayOfWeek: 'asc',
                    },
                ],
            });

            // Para cada schedule, intentar incluir el schedule relacionado si no es null
            const schedulesWithSchedule = await Promise.all(
                schedules.map(async (ws: any) => {
                    if (ws.scheduleId === null) {
                        // Para días de descanso, no incluir schedule
                        return {
                            ...ws,
                            schedule: null,
                        };
                    } else {
                        // Para horarios normales, incluir el schedule relacionado
                        const schedule = ws.scheduleId ? await prisma.schedule.findUnique({
                            where: { id: ws.scheduleId },
                        }) : null;
                        return {
                            ...ws,
                            schedule,
                        };
                    }
                })
            );


            // Cachear por 5 minutos
            await cache.set(cacheKey, JSON.stringify(schedulesWithSchedule), 300);

            return schedulesWithSchedule;
        } catch (error) {
            console.error('Error al obtener asignaciones semanales de la empresa:', error);
            throw new Error('Error al obtener asignaciones semanales de la empresa');
        }
    }

    // Crear o actualizar asignación semanal
    async upsertWeeklySchedule(data: WeeklyScheduleData, companyId: string): Promise<any> {
        try {

            // Verificar que el empleado pertenece a la empresa
            const employee = await (prisma as any).employee.findFirst({
                where: {
                    id: data.employeeId,
                    employeeCompanies: {
                        some: {
                            companyId,
                            active: true,
                        },
                    },
                },
            });

            if (!employee) {
                throw new Error('El empleado no pertenece a esta empresa');
            }

            // Caso especial para días de descanso
            if (data.scheduleId === null) {

                // Eliminar asignaciones existentes para este día
                const existingSchedules = await prisma.weeklySchedule.findMany({
                    where: {
                        employeeId: data.employeeId,
                        weekStart: data.weekStart,
                        dayOfWeek: data.dayOfWeek,
                        active: true,
                    },
                });

                if (existingSchedules.length > 0) {
                    await prisma.weeklySchedule.deleteMany({
                        where: {
                            employeeId: data.employeeId,
                            weekStart: data.weekStart,
                            dayOfWeek: data.dayOfWeek,
                        },
                    });
                }

                // Crear asignación especial de descanso
                const result = await prisma.weeklySchedule.create({
                    data: {
                        companyId,
                        employeeId: data.employeeId,
                        weekStart: data.weekStart,
                        dayOfWeek: data.dayOfWeek,
                        scheduleId: null, // Usar null para días de descanso
                        notes: data.notes || 'Día de descanso',
                        active: true,
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
                    },
                });


                // Limpiar caché
                await this.clearWeeklyScheduleCache(data.employeeId, data.weekStart, companyId);

                return result;
            }

            // Verificar que el horario pertenece a la empresa (solo si no es un día de descanso)
            if (data.scheduleId !== null) {
                const schedule = await prisma.schedule.findFirst({
                    where: {
                        id: data.scheduleId,
                        companyId,
                    },
                });

                if (!schedule) {
                    throw new Error('El horario no pertenece a esta empresa');
                }
            }

            // Verificar solapamientos de horarios (permitir múltiples turnos si no se solapan)
            const existingSchedules = await prisma.weeklySchedule.findMany({
                where: {
                    employeeId: data.employeeId,
                    weekStart: data.weekStart,
                    dayOfWeek: data.dayOfWeek,
                    active: true,
                    NOT: {
                        scheduleId: data.scheduleId,
                    },
                },
                include: {
                    schedule: true,
                },
            });

            // Obtener el horario que se quiere asignar
            const newSchedule = data.scheduleId ? await prisma.schedule.findUnique({
                where: { id: data.scheduleId },
            }) : null;

            if (newSchedule && existingSchedules.length > 0) {
                // Convertir horas a minutos para comparar
                const [newStartHour, newStartMinute] = newSchedule.startTime.split(':').map(Number);
                const [newEndHour, newEndMinute] = newSchedule.endTime.split(':').map(Number);
                const newStartMinutes = newStartHour * 60 + newStartMinute;
                const newEndMinutes = newEndHour * 60 + newEndMinute;

                // Verificar si hay solapamiento con algún horario existente
                for (const existing of existingSchedules) {
                    const [existStartHour, existStartMinute] = existing.schedule?.startTime.split(':').map(Number) || [0, 0];
                    const [existEndHour, existEndMinute] = existing.schedule?.endTime.split(':').map(Number) || [0, 0];
                    const existStartMinutes = existStartHour * 60 + existStartMinute;
                    const existEndMinutes = existEndHour * 60 + existEndMinute;

                    // Hay solapamiento si:
                    // - El nuevo horario empieza antes de que termine el existente Y
                    // - El nuevo horario termina después de que empieza el existente
                    if (newStartMinutes < existEndMinutes && newEndMinutes > existStartMinutes) {
                        throw new Error('El horario se solapa con un turno existente');
                    }
                }
            }

            // Para múltiples turnos por día, siempre crear una nueva asignación
            // No verificamos si ya existe una asignación exacta para permitir múltiples turnos
            const result = await prisma.weeklySchedule.create({
                data: {
                    companyId,
                    employeeId: data.employeeId,
                    weekStart: data.weekStart,
                    dayOfWeek: data.dayOfWeek,
                    scheduleId: data.scheduleId,
                    notes: data.notes,
                },
                include: {
                    schedule: true,
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            dni: true,
                        },
                    },
                },
            });

            // Limpiar caché
            await this.clearWeeklyScheduleCache(data.employeeId, data.weekStart, companyId);

            return result;
        } catch (error) {
            console.error('Error al crear/actualizar asignación semanal:', error);
            throw error;
        }
    }

    // Eliminar asignación semanal
    async deleteWeeklySchedule(id: string, companyId: string): Promise<void> {
        try {
            const schedule = await prisma.weeklySchedule.findFirst({
                where: {
                    id,
                    employee: {
                        // companyId se maneja a través de la relación employee
                    },
                },
            });

            if (!schedule) {
                throw new Error('Asignación semanal no encontrada');
            }

            await prisma.weeklySchedule.delete({
                where: { id },
            });

            // Limpiar caché
            await this.clearWeeklyScheduleCache(schedule.employeeId, schedule.weekStart, companyId);
        } catch (error) {
            console.error('Error al eliminar asignación semanal:', error);
            throw error;
        }
    }

    // Copiar configuración semanal a otra semana
    async copyWeekToWeek(data: CopyWeekData, companyId: string): Promise<any[]> {
        try {
            const { fromWeekStart, toWeekStart, employeeIds } = data;

            // Obtener las asignaciones de la semana origen
            const whereClause: any = {
                weekStart: fromWeekStart,
                active: true,
                employee: {
                    employeeCompanies: {
                        some: {
                            companyId,
                            active: true,
                        },
                    },
                },
            };

            if (employeeIds && employeeIds.length > 0) {
                whereClause.employeeId = {
                    in: employeeIds,
                };
            }

            const sourceSchedules = await prisma.weeklySchedule.findMany({
                where: whereClause,
            });

            if (sourceSchedules.length === 0) {
                throw new Error('No hay asignaciones para copiar en la semana origen');
            }

            // NO eliminar asignaciones existentes en la semana destino
            // Ahora permitimos múltiples turnos, así que acumulamos en lugar de reemplazar
            // Comentado para permitir acumulación de turnos
            /*
            await prisma.weeklySchedule.deleteMany({
                where: {
                    weekStart: toWeekStart,
                    employee: {
                        employeeCompanies: {
                            some: {
                                companyId,
                                active: true,
                            },
                        },
                    },
                    ...(employeeIds && employeeIds.length > 0 && {
                        employeeId: {
                            in: employeeIds,
                        },
                    }),
                },
            });
            */

            // Crear nuevas asignaciones verificando solapamientos
            const newSchedules = [];

            for (const sourceSchedule of sourceSchedules) {
                // Verificar si ya existe una asignación igual
                const existingAssignment = await prisma.weeklySchedule.findFirst({
                    where: {
                        companyId,
                        employeeId: sourceSchedule.employeeId,
                        weekStart: toWeekStart,
                        dayOfWeek: sourceSchedule.dayOfWeek,
                        scheduleId: sourceSchedule.scheduleId,
                    },
                });

                if (!existingAssignment) {
                    // Verificar solapamientos con horarios existentes
                    const existingSchedules = await prisma.weeklySchedule.findMany({
                        where: {
                            employeeId: sourceSchedule.employeeId,
                            weekStart: toWeekStart,
                            dayOfWeek: sourceSchedule.dayOfWeek,
                            active: true,
                            NOT: {
                                scheduleId: sourceSchedule.scheduleId,
                            },
                        },
                        include: {
                            schedule: true,
                        },
                    });

                    // Obtener el horario que se quiere asignar
                    const newSchedule = sourceSchedule.scheduleId ? await prisma.schedule.findUnique({
                        where: { id: sourceSchedule.scheduleId },
                    }) : null;

                    let hasOverlap = false;
                    if (newSchedule && existingSchedules.length > 0) {
                        // Convertir horas a minutos para comparar
                        const [newStartHour, newStartMinute] = newSchedule?.startTime.split(':').map(Number) || [0, 0];
                        const [newEndHour, newEndMinute] = newSchedule?.endTime.split(':').map(Number) || [0, 0];
                        const newStartMinutes = newStartHour * 60 + newStartMinute;
                        const newEndMinutes = newEndHour * 60 + newEndMinute;

                        // Verificar si hay solapamiento con algún horario existente
                        for (const existing of existingSchedules) {
                            const [existStartHour, existStartMinute] = existing.schedule?.startTime.split(':').map(Number) || [0, 0];
                            const [existEndHour, existEndMinute] = existing.schedule?.endTime.split(':').map(Number) || [0, 0];
                            const existStartMinutes = existStartHour * 60 + existStartMinute;
                            const existEndMinutes = existEndHour * 60 + existEndMinute;

                            // Hay solapamiento si:
                            // - El nuevo horario empieza antes de que termine el existente Y
                            // - El nuevo horario termina después de que empieza el existente
                            if (newStartMinutes < existEndMinutes && newEndMinutes > existStartMinutes) {
                                hasOverlap = true;
                                break;
                            }
                        }
                    }

                    if (!hasOverlap) {
                        newSchedules.push({
                            companyId,
                            employeeId: sourceSchedule.employeeId,
                            weekStart: toWeekStart,
                            dayOfWeek: sourceSchedule.dayOfWeek,
                            scheduleId: sourceSchedule.scheduleId,
                            notes: sourceSchedule.notes,
                        });
                    }
                }
            }

            if (newSchedules.length > 0) {
                await prisma.weeklySchedule.createMany({
                    data: newSchedules,
                });
            }

            // Limpiar caché
            await this.clearWeeklyScheduleCache(null, toWeekStart, companyId);

            // Obtener las asignaciones creadas para devolverlas
            const createdSchedules = await prisma.weeklySchedule.findMany({
                where: {
                    weekStart: toWeekStart,
                    employee: {
                        employeeCompanies: {
                            some: {
                                companyId,
                                active: true,
                            },
                        },
                    },
                    ...(employeeIds && employeeIds.length > 0 && {
                        employeeId: {
                            in: employeeIds,
                        },
                    }),
                },
                include: {
                    schedule: true,
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            dni: true,
                        },
                    },
                },
                orderBy: [
                    {
                        employee: {
                            name: 'asc',
                        },
                    },
                    {
                        dayOfWeek: 'asc',
                    },
                ],
            });

            return createdSchedules;
        } catch (error) {
            console.error('Error al copiar semana:', error);
            throw error;
        }
    }

    // Crear plantilla semanal
    async createWeeklyTemplate(data: WeeklyTemplateData, companyId: string): Promise<any> {
        try {
            const result = await prisma.weeklyTemplate.create({
                data: {
                    companyId,
                    name: data.name,
                    description: data.description,
                    weekData: data.weekData,
                },
            });

            return result;
        } catch (error) {
            console.error('Error al crear plantilla semanal:', error);
            throw new Error('Error al crear plantilla semanal');
        }
    }

    // Aplicar plantilla semanal a una semana específica
    async applyWeeklyTemplate(
        templateId: string,
        weekStart: Date,
        employeeIds: string[],
        companyId: string
    ): Promise<any[]> {
        try {
            // Obtener la plantilla
            const template = await prisma.weeklyTemplate.findFirst({
                where: {
                    id: templateId,
                    companyId,
                },
            });

            if (!template) {
                throw new Error('Plantilla no encontrada');
            }

            // NO eliminar asignaciones existentes
            // Ahora permitimos múltiples turnos, así que acumulamos en lugar de reemplazar
            // Comentado para permitir acumulación de turnos
            /*
            await prisma.weeklySchedule.deleteMany({
                where: {
                    weekStart,
                    employeeId: {
                        in: employeeIds,
                    },
                },
            });
            */

            // Crear nuevas asignaciones basadas en la plantilla
            const newSchedules: any[] = [];

            for (const employeeId of employeeIds) {
                for (const [dayOfWeek, schedules] of Object.entries(template.weekData as any)) {
                    for (const scheduleData of schedules as any[]) {
                        // Verificar si ya existe una asignación igual
                        const existingAssignment = await prisma.weeklySchedule.findFirst({
                            where: {
                                companyId,
                                employeeId,
                                weekStart,
                                dayOfWeek: parseInt(dayOfWeek),
                                scheduleId: scheduleData.scheduleId,
                            },
                        });

                        if (!existingAssignment) {
                            // Verificar solapamientos con horarios existentes
                            const existingSchedules = await prisma.weeklySchedule.findMany({
                                where: {
                                    employeeId,
                                    weekStart,
                                    dayOfWeek: parseInt(dayOfWeek),
                                    active: true,
                                    NOT: {
                                        scheduleId: scheduleData.scheduleId,
                                    },
                                },
                                include: {
                                    schedule: true,
                                },
                            });

                            // Obtener el horario que se quiere asignar
                            const newSchedule = scheduleData.scheduleId ? await prisma.schedule.findUnique({
                                where: { id: scheduleData.scheduleId },
                            }) : null;

                            let hasOverlap = false;
                            if (newSchedule && existingSchedules.length > 0) {
                                // Convertir horas a minutos para comparar
                                const [newStartHour, newStartMinute] = newSchedule?.startTime.split(':').map(Number) || [0, 0];
                                const [newEndHour, newEndMinute] = newSchedule?.endTime.split(':').map(Number) || [0, 0];
                                const newStartMinutes = newStartHour * 60 + newStartMinute;
                                const newEndMinutes = newEndHour * 60 + newEndMinute;

                                // Verificar si hay solapamiento con algún horario existente
                                for (const existing of existingSchedules) {
                                    const [existStartHour, existStartMinute] = existing.schedule?.startTime.split(':').map(Number) || [0, 0];
                                    const [existEndHour, existEndMinute] = existing.schedule?.endTime.split(':').map(Number) || [0, 0];
                                    const existStartMinutes = existStartHour * 60 + existStartMinute;
                                    const existEndMinutes = existEndHour * 60 + existEndMinute;

                                    // Hay solapamiento si:
                                    // - El nuevo horario empieza antes de que termine el existente Y
                                    // - El nuevo horario termina después de que empieza el existente
                                    if (newStartMinutes < existEndMinutes && newEndMinutes > existStartMinutes) {
                                        hasOverlap = true;
                                        break;
                                    }
                                }
                            }

                            if (!hasOverlap) {
                                newSchedules.push({
                                    companyId,
                                    employeeId,
                                    weekStart,
                                    dayOfWeek: parseInt(dayOfWeek),
                                    scheduleId: scheduleData.scheduleId,
                                    notes: scheduleData.notes,
                                });
                            }
                        }
                    }
                }
            }

            if (newSchedules.length > 0) {
                await prisma.weeklySchedule.createMany({
                    data: newSchedules,
                });
            }

            // Limpiar caché
            await this.clearWeeklyScheduleCache(null, weekStart, companyId);

            // Obtener las asignaciones creadas
            const createdSchedules = await prisma.weeklySchedule.findMany({
                where: {
                    weekStart,
                    employeeId: {
                        in: employeeIds,
                    },
                },
                include: {
                    schedule: true,
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            dni: true,
                        },
                    },
                },
                orderBy: [
                    {
                        employee: {
                            name: 'asc',
                        },
                    },
                    {
                        dayOfWeek: 'asc',
                    },
                ],
            });

            return createdSchedules;
        } catch (error) {
            console.error('Error al aplicar plantilla semanal:', error);
            throw error;
        }
    }

    // Obtener plantillas semanales de la empresa
    async getWeeklyTemplates(companyId: string): Promise<any[]> {
        try {
            const templates = await prisma.weeklyTemplate.findMany({
                where: {
                    companyId,
                    active: true,
                },
                orderBy: {
                    name: 'asc',
                },
            });

            return templates;
        } catch (error) {
            console.error('Error al obtener plantillas semanales:', error);
            throw new Error('Error al obtener plantillas semanales');
        }
    }

    // Limpiar caché de asignaciones semanales
    private async clearWeeklyScheduleCache(
        employeeId: string | null,
        weekStart: Date,
        companyId: string
    ): Promise<void> {
        try {
            const weekKey = format(weekStart, 'yyyy-MM-dd');

            if (employeeId) {
                await cache.del(`weekly_schedules:${employeeId}:${weekKey}`);
            }

            await cache.del(`company_weekly_schedules:${companyId}:${weekKey}`);
        } catch (error) {
            console.error('Error al limpiar caché de asignaciones semanales:', error);
            // No lanzar error para no interrumpir el flujo principal
        }
    }

    // Obtener resumen de horas asignadas por semana
    async getWeeklyHoursSummary(
        companyId: string,
        weekStart: Date
    ): Promise<{
        totalEmployees: number;
        totalAssignedHours: number;
        employeesWithSchedule: number;
        dailyBreakdown: Array<{
            dayOfWeek: number;
            dayName: string;
            totalHours: number;
            employeeCount: number;
        }>;
    }> {
        try {
            const schedules = await this.getCompanyWeeklySchedules(companyId, weekStart);

            const dailyBreakdown = Array.from({ length: 7 }, (_, i) => ({
                dayOfWeek: i,
                dayName: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][i],
                totalHours: 0,
                employeeCount: 0,
            }));

            let totalAssignedHours = 0;
            const employeeIds = new Set<string>();

            for (const schedule of schedules) {
                employeeIds.add(schedule.employeeId);

                const [startHour, startMinute] = schedule.schedule?.startTime.split(':').map(Number) || [0, 0];
                const [endHour, endMinute] = schedule.schedule?.endTime.split(':').map(Number) || [0, 0];

                const startMinutes = startHour * 60 + startMinute;
                const endMinutes = endHour * 60 + endMinute;
                const durationMinutes = endMinutes - startMinutes;
                const durationHours = durationMinutes / 60;

                dailyBreakdown[schedule.dayOfWeek].totalHours += durationHours;
                dailyBreakdown[schedule.dayOfWeek].employeeCount += 1;
                totalAssignedHours += durationHours;
            }

            // Obtener total de empleados activos
            const totalEmployees = await (prisma as any).employee.count({
                where: {
                    employeeCompanies: {
                        some: {
                            companyId,
                            active: true,
                        },
                    },
                    active: true,
                },
            });

            return {
                totalEmployees,
                totalAssignedHours,
                employeesWithSchedule: employeeIds.size,
                dailyBreakdown,
            };
        } catch (error) {
            console.error('Error al obtener resumen de horas semanales:', error);
            throw new Error('Error al obtener resumen de horas semanales');
        }
    }
}

export const weeklyScheduleService = new WeeklyScheduleService();