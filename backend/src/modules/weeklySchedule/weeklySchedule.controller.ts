import type { Request, Response } from 'express';
import { z } from 'zod';
import { weeklyScheduleService } from './weeklySchedule.service';


// Esquemas de validación
const weeklyScheduleSchema = z.object({
    employeeId: z.string().min(1, 'ID de empleado requerido'),
    weekStart: z.string().refine((date) => {
        // Intentar parsear como fecha ISO completa
        if (z.string().datetime().safeParse(date).success) {
            return true;
        }
        // Intentar parsear como fecha simple YYYY-MM-DD
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime());
    }, 'Fecha de inicio de semana inválida'),
    dayOfWeek: z.number().min(0).max(6, 'Día de la semana debe estar entre 0 y 6'),
    scheduleId: z.string().nullable().optional(), // Permitir null para días de descanso
    notes: z.string().optional(),
});

const copyWeekSchema = z.object({
    fromWeekStart: z.string().refine((date) => {
        // Intentar parsear como fecha ISO completa
        if (z.string().datetime().safeParse(date).success) {
            return true;
        }
        // Intentar parsear como fecha simple YYYY-MM-DD
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime());
    }, 'Fecha de inicio de semana origen inválida'),
    toWeekStart: z.string().refine((date) => {
        // Intentar parsear como fecha ISO completa
        if (z.string().datetime().safeParse(date).success) {
            return true;
        }
        // Intentar parsear como fecha simple YYYY-MM-DD
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime());
    }, 'Fecha de inicio de semana destino inválida'),
    employeeIds: z.array(z.string()).optional(),
});

const weeklyTemplateSchema = z.object({
    name: z.string().min(1, 'Nombre de plantilla requerido'),
    description: z.string().optional(),
    weekData: z.record(z.array(z.object({
        scheduleId: z.string().min(1, 'ID de horario requerido'),
        notes: z.string().optional(),
    }))),
});

const applyTemplateSchema = z.object({
    templateId: z.string().min(1, 'ID de plantilla requerido'),
    weekStart: z.string().refine((date) => {
        // Intentar parsear como fecha ISO completa
        if (z.string().datetime().safeParse(date).success) {
            return true;
        }
        // Intentar parsear como fecha simple YYYY-MM-DD
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime());
    }, 'Fecha de inicio de semana inválida'),
    employeeIds: z.array(z.string()).min(1, 'Se debe seleccionar al menos un empleado'),
});

class WeeklyScheduleController {
    // Obtener asignaciones semanales de un empleado
    async getEmployeeWeeklySchedules(req: Request, res: Response) {
        try {
            const { employeeId } = req.params;
            const { weekStart } = req.query;

            if (!employeeId) {
                return res.status(400).json({
                    success: false,
                    error: 'ID de empleado requerido',
                });
            }

            if (!weekStart || typeof weekStart !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Fecha de inicio de semana requerida',
                });
            }

            const weekStartDate = new Date(weekStart);
            const schedules = await weeklyScheduleService.getWeeklySchedules(employeeId, weekStartDate);

            res.json({
                success: true,
                data: schedules,
            });
        } catch (error) {
            console.error('Error al obtener asignaciones semanales del empleado:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener asignaciones semanales del empleado',
            });
        }
    }

    // Obtener asignaciones semanales de toda la empresa
    async getCompanyWeeklySchedules(req: Request, res: Response) {
        try {
            const { weekStart } = req.query;

            if (!weekStart || typeof weekStart !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Fecha de inicio de semana requerida',
                });
            }

            const weekStartDate = new Date(weekStart);
            const schedules = await weeklyScheduleService.getCompanyWeeklySchedules(req.user!.companyId, weekStartDate);

            res.json({
                success: true,
                data: schedules,
            });
        } catch (error) {
            console.error('Error al obtener asignaciones semanales de la empresa:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener asignaciones semanales de la empresa',
            });
        }
    }

    // Crear o actualizar asignación semanal
    async upsertWeeklySchedule(req: Request, res: Response) {
        try {
            const validatedData = weeklyScheduleSchema.parse(req.body);

            // Convertir undefined a null para scheduleId
            const scheduleData = {
                ...validatedData,
                weekStart: new Date(validatedData.weekStart),
                scheduleId: validatedData.scheduleId || null, // Convertir undefined a null
            };

            const schedule = await weeklyScheduleService.upsertWeeklySchedule(
                scheduleData,
                req.user!.companyId
            );

            res.json({
                success: true,
                data: schedule,
                message: 'Asignación semanal guardada correctamente',
            });
        } catch (error) {
            console.error('Error al guardar asignación semanal:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Datos inválidos',
                    details: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Error al guardar asignación semanal',
            });
        }
    }

    // Eliminar asignación semanal
    async deleteWeeklySchedule(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID de asignación requerido',
                });
            }

            await weeklyScheduleService.deleteWeeklySchedule(id, req.user!.companyId);

            res.json({
                success: true,
                message: 'Asignación semanal eliminada correctamente',
            });
        } catch (error) {
            console.error('Error al eliminar asignación semanal:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Error al eliminar asignación semanal',
            });
        }
    }

    // Copiar configuración semanal a otra semana
    async copyWeekToWeek(req: Request, res: Response) {
        try {
            const validatedData = copyWeekSchema.parse(req.body);

            const schedules = await weeklyScheduleService.copyWeekToWeek(
                {
                    ...validatedData,
                    fromWeekStart: new Date(validatedData.fromWeekStart),
                    toWeekStart: new Date(validatedData.toWeekStart),
                },
                req.user!.companyId
            );

            res.json({
                success: true,
                data: schedules,
                message: 'Configuración semanal copiada correctamente',
            });
        } catch (error) {
            console.error('Error al copiar semana:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Datos inválidos',
                    details: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Error al copiar configuración semanal',
            });
        }
    }

    // Crear plantilla semanal
    async createWeeklyTemplate(req: Request, res: Response) {
        try {
            const validatedData = weeklyTemplateSchema.parse(req.body);

            const template = await weeklyScheduleService.createWeeklyTemplate(
                validatedData,
                req.user!.companyId
            );

            res.json({
                success: true,
                data: template,
                message: 'Plantilla semanal creada correctamente',
            });
        } catch (error) {
            console.error('Error al crear plantilla semanal:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Datos inválidos',
                    details: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Error al crear plantilla semanal',
            });
        }
    }

    // Aplicar plantilla semanal
    async applyWeeklyTemplate(req: Request, res: Response) {
        try {
            const validatedData = applyTemplateSchema.parse(req.body);

            const schedules = await weeklyScheduleService.applyWeeklyTemplate(
                validatedData.templateId,
                new Date(validatedData.weekStart),
                validatedData.employeeIds,
                req.user!.companyId
            );

            res.json({
                success: true,
                data: schedules,
                message: 'Plantilla semanal aplicada correctamente',
            });
        } catch (error) {
            console.error('Error al aplicar plantilla semanal:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Datos inválidos',
                    details: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Error al aplicar plantilla semanal',
            });
        }
    }

    // Obtener plantillas semanales
    async getWeeklyTemplates(req: Request, res: Response) {
        try {
            const templates = await weeklyScheduleService.getWeeklyTemplates(req.user!.companyId);

            res.json({
                success: true,
                data: templates,
            });
        } catch (error) {
            console.error('Error al obtener plantillas semanales:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener plantillas semanales',
            });
        }
    }

    // Obtener resumen de horas semanales
    async getWeeklyHoursSummary(req: Request, res: Response) {
        try {
            const { weekStart } = req.query;

            if (!weekStart || typeof weekStart !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Fecha de inicio de semana requerida',
                });
            }

            const weekStartDate = new Date(weekStart);
            const summary = await weeklyScheduleService.getWeeklyHoursSummary(
                req.user!.companyId,
                weekStartDate
            );

            res.json({
                success: true,
                data: summary,
            });
        } catch (error) {
            console.error('Error al obtener resumen de horas semanales:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener resumen de horas semanales',
            });
        }
    }

    /**
     * Exportar calendario semanal a CSV
     */
    async exportWeeklySchedule(req: Request, res: Response) {
        try {
            const { weekStart } = req.query;

            if (!weekStart || typeof weekStart !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere el parámetro weekStart'
                });
            }

            const weekStartDate = new Date(weekStart);

            // Verificar que sea lunes
            if (weekStartDate.getDay() !== 1) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha debe ser un lunes'
                });
            }

            // Obtener las asignaciones semanales para generar el CSV
            const schedules = await weeklyScheduleService.getCompanyWeeklySchedules(
                req.user!.companyId,
                weekStartDate
            );

            // Agrupar por empleado
            const employeeSchedules: { [key: string]: any } = {};

            schedules.forEach((ws: any) => {
                if (!employeeSchedules[ws.employeeId]) {
                    employeeSchedules[ws.employeeId] = {
                        employeeId: ws.employeeId,
                        employeeName: ws.employee?.name || 'Desconocido',
                        employeeDni: ws.employee?.dni || 'N/A',
                        schedules: Array(7).fill(null)
                    };
                }

                employeeSchedules[ws.employeeId].schedules[ws.dayOfWeek] = ws;
            });

            const employeeSummaries = Object.values(employeeSchedules);

            // Generar CSV
            const csvHeaders = [
                'Empleado',
                'DNI',
                'Lunes',
                'Martes',
                'Miércoles',
                'Jueves',
                'Viernes',
                'Sábado',
                'Domingo',
                'Total Horas'
            ];

            const csvRows = employeeSummaries.map((emp: any) => [
                emp.employeeName,
                emp.employeeDni,
                emp.schedules[0]?.schedule?.name || '', // Lunes
                emp.schedules[1]?.schedule?.name || '', // Martes
                emp.schedules[2]?.schedule?.name || '', // Miércoles
                emp.schedules[3]?.schedule?.name || '', // Jueves
                emp.schedules[4]?.schedule?.name || '', // Viernes
                emp.schedules[5]?.schedule?.name || '', // Sábado
                emp.schedules[6]?.schedule?.name || '', // Domingo
                '0' // Placeholder para total de horas
            ]);

            // Convertir a CSV
            const csvContent = [
                csvHeaders.join(','),
                ...csvRows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))
            ].join('\n');

            // Configurar headers para descarga
            const fileName = `calendario-semanal-${weekStart}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            return res.send(csvContent);
        } catch (error) {
            console.error('Error al exportar calendario semanal:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al exportar calendario semanal'
            });
        }
    }
}

export const weeklyScheduleController = new WeeklyScheduleController();