import { Request, Response } from 'express';
import { z } from 'zod';
import ScheduleService from './schedule.service';

// Esquemas de validación para las peticiones
const createScheduleSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de inicio inválida (formato HH:MM)'),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de fin inválida (formato HH:MM)'),
    breakTime: z.number().min(0, 'El tiempo de descanso debe ser positivo').optional(),
    flexible: z.boolean().default(false),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido (formato HEX #RRGGBB)').default('#3B82F6'),
});

const updateScheduleSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de inicio inválida (formato HH:MM)').optional(),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de fin inválida (formato HH:MM)').optional(),
    breakTime: z.number().min(0, 'El tiempo de descanso debe ser positivo').optional(),
    flexible: z.boolean().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido (formato HEX #RRGGBB)').optional(),
});

const assignToEmployeesSchema = z.object({
    employeeIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un empleado'),
    startDate: z.string().datetime('Fecha de inicio inválida'),
    endDate: z.string().datetime().optional(),
});

const validateConflictSchema = z.object({
    employeeId: z.string().min(1, 'El ID del empleado es requerido'),
    scheduleId: z.string().min(1, 'El ID del horario es requerido'),
});

class ScheduleController {
    // Crear nuevo horario
    static async createSchedule(req: Request & { user?: any }, res: Response) {
        try {
            const validatedData = createScheduleSchema.parse(req.body);
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const schedule = await ScheduleService.createSchedule(companyId, validatedData);

            res.status(201).json({
                success: true,
                message: 'Horario creado exitosamente',
                data: schedule,
            });
        } catch (error: any) {
            console.error('❌ Error en createSchedule:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al crear el horario',
            });
        }
    }

    // Obtener horario por ID
    static async getSchedule(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const schedule = await ScheduleService.getScheduleById(companyId, id);

            if (!schedule) {
                return res.status(404).json({
                    success: false,
                    message: 'Horario no encontrado',
                });
            }

            res.json({
                success: true,
                data: schedule,
            });
        } catch (error: any) {
            console.error('❌ Error en getSchedule:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el horario',
            });
        }
    }

    // Obtener lista de horarios
    static async getSchedules(req: Request & { user?: any }, res: Response) {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const filters = {
                active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
                dayOfWeek: req.query.dayOfWeek ? parseInt(req.query.dayOfWeek as string) : undefined,
                search: req.query.search as string,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 50,
            };

            const result = await ScheduleService.getSchedules(companyId, filters);

            res.json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            console.error('❌ Error en getSchedules:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener los horarios',
            });
        }
    }

    // Obtener horarios por día de la semana
    static async getSchedulesByDay(req: Request & { user?: any }, res: Response) {
        try {
            const { dayOfWeek } = req.params;
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const day = parseInt(dayOfWeek);
            if (isNaN(day) || day < 0 || day > 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Día de la semana inválido',
                });
            }

            const schedules = await ScheduleService.getSchedulesByDay(companyId, day);

            res.json({
                success: true,
                data: schedules,
            });
        } catch (error: any) {
            console.error('❌ Error en getSchedulesByDay:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener los horarios del día',
            });
        }
    }

    // Actualizar horario
    static async updateSchedule(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            const validatedData = updateScheduleSchema.parse(req.body);
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const schedule = await ScheduleService.updateSchedule(companyId, id, validatedData);

            res.json({
                success: true,
                message: 'Horario actualizado exitosamente',
                data: schedule,
            });
        } catch (error: any) {
            console.error('❌ Error en updateSchedule:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al actualizar el horario',
            });
        }
    }

    // Eliminar horario
    static async deleteSchedule(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            const { force } = req.query; // Parámetro para forzar eliminación
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            await ScheduleService.deleteSchedule(companyId, id, force === 'true');

            res.json({
                success: true,
                message: 'Horario eliminado exitosamente',
            });
        } catch (error: any) {
            console.error('❌ Error en deleteSchedule:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al eliminar el horario',
            });
        }
    }

    // Asignar horario a múltiples empleados
    static async assignToEmployees(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            const validatedData = assignToEmployeesSchema.parse(req.body);
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            await ScheduleService.assignToEmployees(companyId, id, validatedData);

            res.json({
                success: true,
                message: 'Horario asignado exitosamente a los empleados',
            });
        } catch (error: any) {
            console.error('❌ Error en assignToEmployees:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al asignar el horario a los empleados',
            });
        }
    }

    // Eliminar asignación de horario a empleado
    static async removeAssignment(req: Request & { user?: any }, res: Response) {
        try {
            const { scheduleId, employeeId } = req.params;
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            await ScheduleService.removeAssignment(companyId, scheduleId, employeeId);

            res.json({
                success: true,
                message: 'Asignación eliminada exitosamente',
            });
        } catch (error: any) {
            console.error('❌ Error en removeAssignment:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al eliminar la asignación',
            });
        }
    }

    // Obtener horarios de un empleado
    static async getEmployeeSchedules(req: Request & { user?: any }, res: Response) {
        try {
            const { employeeId } = req.params;
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const schedules = await ScheduleService.getEmployeeSchedules(companyId, employeeId);

            res.json({
                success: true,
                data: schedules,
            });
        } catch (error: any) {
            console.error('❌ Error en getEmployeeSchedules:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener los horarios del empleado',
            });
        }
    }

    // Obtener horario semanal completo
    static async getWeeklySchedule(req: Request & { user?: any }, res: Response) {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const weeklySchedule = await ScheduleService.getWeeklySchedule(companyId);

            res.json({
                success: true,
                data: weeklySchedule,
            });
        } catch (error: any) {
            console.error('❌ Error en getWeeklySchedule:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el horario semanal',
            });
        }
    }

    // Validar conflicto de horarios
    static async validateConflict(req: Request & { user?: any }, res: Response) {
        try {
            const validatedData = validateConflictSchema.parse(req.body);
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const hasConflict = await ScheduleService.validateScheduleConflict(
                companyId,
                validatedData.employeeId,
                validatedData.scheduleId
            );

            res.json({
                success: true,
                data: {
                    hasConflict,
                    message: hasConflict ? 'El horario se solapa con horarios existentes del empleado' : 'No hay conflictos de horario',
                },
            });
        } catch (error: any) {
            console.error('❌ Error en validateConflict:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al validar conflicto de horarios',
            });
        }
    }
}

export default ScheduleController;