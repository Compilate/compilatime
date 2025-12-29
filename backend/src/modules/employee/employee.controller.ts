import { Request, Response } from 'express';
import { z } from 'zod';
import EmployeeService from './employee.service';

// Esquemas de validación para las peticiones
const createEmployeeSchema = z.object({
    dni: z.string().min(1, 'El DNI es requerido'),
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    surname: z.string().optional(),
    email: z.string().email('Email inválido').optional(),
    phone: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    contractType: z.string().optional(),
    hireDate: z.string().optional(),
    salary: z.number().optional(),
    pin: z.string().min(4, 'El PIN debe tener al menos 4 caracteres'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
    scheduleIds: z.array(z.string()).optional(),
});

const updateEmployeeSchema = z.object({
    dni: z.string().min(1, 'El DNI debe tener al menos 1 carácter').optional().or(z.literal(null)),
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional().or(z.literal(null)),
    surname: z.string().optional().or(z.literal(null)),
    email: z.string().email('Email inválido').optional().or(z.literal(null)),
    phone: z.string().optional().or(z.literal(null)),
    department: z.string().optional().or(z.literal(null)),
    position: z.string().optional().or(z.literal(null)),
    contractType: z.string().optional().or(z.literal(null)),
    hireDate: z.string().optional().or(z.literal(null)),
    salary: z.number().optional().or(z.literal(null)),
    pin: z.string().min(4, 'El PIN debe tener al menos 4 caracteres').optional().or(z.literal('')),
    active: z.boolean().optional(),
    scheduleIds: z.array(z.string()).optional(),
});

const assignScheduleSchema = z.object({
    scheduleIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un horario'),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

const resetPinSchema = z.object({
    employeeId: z.string().min(1, 'El ID del empleado es requerido'),
});

class EmployeeController {
    // Crear nuevo empleado
    static async createEmployee(req: Request & { user?: any }, res: Response) {
        try {
            const validatedData = createEmployeeSchema.parse(req.body);
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const employee = await EmployeeService.createEmployee(companyId, validatedData);

            res.status(201).json({
                success: true,
                message: 'Empleado creado exitosamente',
                data: employee,
            });
        } catch (error: any) {
            console.error('❌ Error en createEmployee:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al crear el empleado',
            });
        }
    }

    // Obtener empleado por ID
    static async getEmployee(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const employee = await EmployeeService.getEmployeeById(companyId, id);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: 'Empleado no encontrado',
                });
            }

            res.json({
                success: true,
                data: employee,
            });
        } catch (error: any) {
            console.error('❌ Error en getEmployee:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el empleado',
            });
        }
    }

    // Obtener lista de empleados
    static async getEmployees(req: Request & { user?: any }, res: Response) {
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
                department: req.query.department as string,
                position: req.query.position as string,
                search: req.query.search as string,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
            };

            const result = await EmployeeService.getEmployees(companyId, filters);

            res.json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            console.error('❌ Error en getEmployees:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener los empleados',
            });
        }
    }

    // Actualizar empleado
    static async updateEmployee(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            console.log('🔍 updateEmployee - ID del empleado:', id);
            console.log('🔍 updateEmployee - Body recibido:', req.body);

            const validatedData = updateEmployeeSchema.parse(req.body);
            console.log('🔍 updateEmployee - Datos validados:', validatedData);

            const companyId = req.user?.companyId;
            console.log('🔍 updateEmployee - CompanyId:', companyId);

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            // Filtrar valores null y cadenas vacías para que coincidan con el tipo esperado por el servicio
            const filteredData = Object.fromEntries(
                Object.entries(validatedData).filter(([_, value]) => value !== null && value !== '')
            );
            console.log('🔍 updateEmployee - Datos filtrados (sin null ni cadenas vacías):', filteredData);

            const employee = await EmployeeService.updateEmployee(companyId, id, filteredData);

            res.json({
                success: true,
                message: 'Empleado actualizado exitosamente',
                data: employee,
            });
        } catch (error: any) {
            console.error('❌ Error en updateEmployee:', error);

            if (error instanceof z.ZodError) {
                console.error('❌ Errores de validación Zod:', error.errors);
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al actualizar el empleado',
            });
        }
    }

    // Eliminar empleado (baja lógica)
    static async deleteEmployee(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const employee = await EmployeeService.deleteEmployee(companyId, id);

            res.json({
                success: true,
                message: 'Empleado dado de baja exitosamente',
                data: employee,
            });
        } catch (error: any) {
            console.error('❌ Error en deleteEmployee:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al dar de baja al empleado',
            });
        }
    }

    // Asignar horarios a empleado
    static async assignSchedules(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            const validatedData = assignScheduleSchema.parse(req.body);
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            await EmployeeService.assignSchedulesToEmployee(id, validatedData.scheduleIds);

            res.json({
                success: true,
                message: 'Horarios asignados exitosamente',
            });
        } catch (error: any) {
            console.error('❌ Error en assignSchedules:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al asignar horarios',
            });
        }
    }

    // Asignar un solo horario a empleado (para la página individual)
    static async assignSchedule(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params; // employeeId
            const { scheduleId } = req.body;
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            await EmployeeService.assignScheduleToEmployee(id, scheduleId);

            res.json({
                success: true,
                message: 'Horario asignado exitosamente',
            });
        } catch (error: any) {
            console.error('❌ Error en assignSchedule:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al asignar el horario',
            });
        }
    }

    // Obtener horarios de un empleado
    static async getEmployeeSchedules(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const schedules = await EmployeeService.getEmployeeSchedules(companyId, id);

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

    // Eliminar asignación de horario específica
    static async removeEmployeeSchedule(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params; // Este es el ID de EmployeeSchedule
            const companyId = req.user?.companyId;

            console.log('🔍 removeEmployeeSchedule - ID recibido:', id);
            console.log('🔍 removeEmployeeSchedule - CompanyId:', companyId);

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            await EmployeeService.removeEmployeeSchedule(companyId, id);

            res.json({
                success: true,
                message: 'Asignación de horario eliminada exitosamente',
            });
        } catch (error: any) {
            console.error('❌ Error en removeEmployeeSchedule:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al eliminar la asignación de horario',
            });
        }
    }

    // Resetear PIN de empleado
    static async resetPin(req: Request & { user?: any }, res: Response) {
        try {
            const validatedData = resetPinSchema.parse(req.body);
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const result = await EmployeeService.resetEmployeePin(companyId, validatedData.employeeId);

            res.json({
                success: true,
                message: 'PIN reseteado exitosamente',
                data: result,
            });
        } catch (error: any) {
            console.error('❌ Error en resetPin:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al resetear el PIN',
            });
        }
    }

    // Cambiar contraseña de empleado (desde zona personal)
    static async changePassword(req: Request & { user?: any }, res: Response) {
        try {
            const validatedData = changePasswordSchema.parse(req.body);
            const employeeId = req.user?.id;
            const companyId = req.user?.companyId;

            if (!employeeId || !companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            await EmployeeService.changeEmployeePassword(
                companyId,
                employeeId,
                validatedData.currentPassword,
                validatedData.newPassword
            );

            res.json({
                success: true,
                message: 'Contraseña cambiada exitosamente',
            });
        } catch (error: any) {
            console.error('❌ Error en changePassword:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al cambiar la contraseña',
            });
        }
    }

    // Obtener estadísticas de empleados
    static async getEmployeeStats(req: Request & { user?: any }, res: Response) {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const stats = await EmployeeService.getEmployeeStats(companyId);

            res.json({
                success: true,
                data: stats,
            });
        } catch (error: any) {
            console.error('❌ Error en getEmployeeStats:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener las estadísticas',
            });
        }
    }

    // Verificar PIN de empleado (para fichaje)
    static async verifyPin(req: Request, res: Response) {
        try {
            const { companySlug, dni, pin } = req.body;

            if (!companySlug || !dni || !pin) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos',
                });
            }

            // Obtener companyId a partir del slug (necesitaríamos CompanyService)
            // Por ahora, asumimos que tenemos el companyId
            const employee = await EmployeeService.verifyEmployeePin('temp-company-id', dni, pin);

            if (!employee) {
                return res.status(401).json({
                    success: false,
                    message: 'DNI o PIN incorrectos',
                });
            }

            res.json({
                success: true,
                message: 'PIN verificado correctamente',
                data: {
                    employeeId: employee.id,
                    name: employee.name,
                },
            });
        } catch (error: any) {
            console.error('❌ Error en verifyPin:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al verificar el PIN',
            });
        }
    }

    // Obtener horario diario de un empleado
    static async getDailySchedule(req: Request & { user?: any }, res: Response) {
        try {
            const { id: employeeId, date } = req.params;
            console.log(`🔍 DEBUG getDailySchedule controller - employeeId: ${employeeId}, date: ${date}`);

            // Usar el código de empresa del middleware o del usuario autenticado
            const companyId = (req as any).companyCode || req.user?.companyId;
            console.log(`🔍 DEBUG getDailySchedule controller - companyId: ${companyId}`);

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const schedule = await EmployeeService.getDailySchedule(companyId, employeeId, date);
            console.log(`🔍 DEBUG getDailySchedule controller - schedule result:`, schedule);

            const response = {
                success: true,
                data: schedule,
            };
            console.log(`🔍 DEBUG getDailySchedule controller - response:`, response);

            res.json(response);
        } catch (error: any) {
            console.error('❌ Error en getDailySchedule:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el horario diario',
            });
        }
    }

    // Obtener horario semanal de un empleado
    static async getWeeklySchedule(req: Request & { user?: any }, res: Response) {
        try {
            const { id: employeeId, startDate } = req.params;
            // Usar el código de empresa del middleware o del usuario autenticado
            const companyId = (req as any).companyCode || req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const schedule = await EmployeeService.getWeeklySchedule(companyId, employeeId, startDate);

            res.json({
                success: true,
                data: schedule,
            });
        } catch (error: any) {
            console.error('❌ Error en getWeeklySchedule:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el horario semanal',
            });
        }
    }

    // Obtener horario diario del empleado autenticado (zona personal)
    static async getMyDailySchedule(req: Request & { user?: any }, res: Response) {
        try {
            const { date } = req.params;
            const employeeId = req.user?.id;
            // Usar el código de empresa del middleware o del usuario autenticado
            const companyId = (req as any).companyCode || req.user?.companyId;

            if (!employeeId || !companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const schedule = await EmployeeService.getDailySchedule(companyId, employeeId, date);

            res.json({
                success: true,
                data: schedule,
            });
        } catch (error: any) {
            console.error('❌ Error en getMyDailySchedule:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el horario diario',
            });
        }
    }

    // Obtener horario semanal del empleado autenticado (zona personal)
    static async getMyWeeklySchedule(req: Request & { user?: any }, res: Response) {
        try {
            const { startDate } = req.params;
            const employeeId = req.user?.id;
            const companyId = req.user?.companyId;


            if (!employeeId || !companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const schedule = await EmployeeService.getWeeklySchedule(companyId, employeeId, startDate);


            res.json({
                success: true,
                data: schedule,
            });
        } catch (error: any) {
            console.error('❌ Error en getMyWeeklySchedule:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el horario semanal',
            });
        }
    }

    // Obtener registros de fichaje del empleado autenticado
    static async getMyTimeEntries(req: Request & { user?: any }, res: Response) {
        try {
            const employeeId = req.user?.id;
            // Usar el código de empresa del middleware o del usuario autenticado
            const companyId = (req as any).companyCode || req.user?.companyId;

            if (!employeeId || !companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const filters = {
                startDate: req.query.startDate as string || undefined,
                endDate: req.query.endDate as string || undefined,
                type: req.query.type as any || undefined,
                source: req.query.source as any || undefined,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
            };

            // Filtrar solo valores vacíos para los campos opcionales, manteniendo page y limit
            const cleanedFilters = {
                ...filters,
                startDate: filters.startDate || undefined,
                endDate: filters.endDate || undefined,
                type: filters.type || undefined,
                source: filters.source || undefined,
            };

            // Importar TimeEntryService dinámicamente para evitar dependencia circular
            const { default: TimeEntryService } = await import('../timeEntry/timeEntry.service');
            const result = await TimeEntryService.getEmployeeTimeEntries(companyId, employeeId, cleanedFilters);

            console.log('📊 Resultado de getEmployeeTimeEntries:', result);

            res.json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            console.error('❌ Error en getMyTimeEntries:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener los registros del empleado',
            });
        }
    }

    // Fichar tiempo (para empleados)
    static async punchTime(req: Request & { user?: any }, res: Response) {
        try {
            const employeeId = req.user?.id;
            // Usar el código de empresa del middleware o del usuario autenticado
            const companyId = (req as any).companyCode || req.user?.companyId;
            const { type, timestamp, source, location, latitude, longitude, isRemoteWork, deviceInfo } = req.body;

            if (!employeeId || !companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            // Importar TimeEntryService dinámicamente para evitar dependencia circular
            const { default: TimeEntryService } = await import('../timeEntry/timeEntry.service');

            const timeEntry = await TimeEntryService.punchTime(
                companyId,
                employeeId,
                type,
                timestamp,
                source,
                location,
                latitude,
                longitude,
                isRemoteWork,
                deviceInfo
            );

            res.status(201).json({
                success: true,
                message: 'Fichaje registrado exitosamente',
                data: timeEntry,
            });
        } catch (error: any) {
            console.error('❌ Error en punchTime:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al registrar el fichaje',
            });
        }
    }

    // Obtener último fichaje del empleado
    static async getLastPunch(req: Request & { user?: any }, res: Response) {
        try {
            const employeeId = req.user?.id;
            // Usar el código de empresa del middleware o del usuario autenticado
            const companyId = (req as any).companyCode || req.user?.companyId;

            if (!employeeId || !companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            // Importar TimeEntryService dinámicamente para evitar dependencia circular
            const { default: TimeEntryService } = await import('../timeEntry/timeEntry.service');

            const lastEntry = await TimeEntryService.getEmployeeTimeEntries(companyId, employeeId, { page: 1, limit: 1 });

            res.json({
                success: true,
                data: lastEntry,
            });
        } catch (error: any) {
            console.error('❌ Error en getLastPunch:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el último fichaje',
            });
        }
    }

    // Verificar si el empleado puede fichar
    static async canPunch(req: Request & { user?: any }, res: Response) {
        try {
            const employeeId = req.user?.id;
            // Usar el código de empresa del middleware o del usuario autenticado
            const companyId = (req as any).companyCode || req.user?.companyId;

            if (!employeeId || !companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            // Importar TimeEntryService dinámicamente para evitar dependencia circular
            const { default: TimeEntryService } = await import('../timeEntry/timeEntry.service');

            const canPunch = await TimeEntryService.getTimeEntries(companyId, { page: 1, limit: 1 }).then(result => result.timeEntries.length === 0);

            res.json({
                success: true,
                data: { canPunch },
            });
        } catch (error: any) {
            console.error('❌ Error en canPunch:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al verificar si puede fichar',
            });
        }
    }
}

export default EmployeeController;