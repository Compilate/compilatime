import { Request, Response } from 'express';
import { z } from 'zod';
import TimeEntryService from './timeEntry.service';

// Esquemas de validación para las peticiones
const createTimeEntrySchema = z.object({
    employeeId: z.string().min(1, 'El ID del empleado es requerido'),
    type: z.enum(['IN', 'OUT', 'BREAK', 'RESUME']),
    timestamp: z.string().datetime('Timestamp inválido'),
    source: z.enum(['WEB', 'MOBILE', 'ADMIN', 'API', 'KIOSK']).default('WEB'),
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
    type: z.enum(['IN', 'OUT', 'BREAK', 'RESUME']).optional(),
    timestamp: z.string().datetime('Timestamp inválido').optional(),
    location: z.string().optional(),
    deviceInfo: z.string().optional(),
    notes: z.string().optional(),
});

const timeEntryFiltersSchema = z.object({
    employeeId: z.string().optional(),
    startDate: z.string().datetime('Fecha de inicio inválida').optional(),
    endDate: z.string().datetime('Fecha de fin inválida').optional(),
    type: z.enum(['IN', 'OUT', 'BREAK', 'RESUME']).optional(),
    source: z.enum(['WEB', 'MOBILE', 'ADMIN', 'API', 'KIOSK']).optional(),
    page: z.number().min(1, 'La página debe ser mayor a 0').default(1),
    limit: z.number().min(1, 'El límite debe ser mayor a 0').max(100, 'El límite máximo es 100').default(20),
});

const bulkCreateSchema = z.object({
    entries: z.array(createTimeEntrySchema).min(1, 'Debe proporcionar al menos un registro'),
});


class TimeEntryController {
    // Crear nuevo registro de tiempo
    static async createTimeEntry(req: Request & { user?: any }, res: Response) {
        try {
            const validatedData = createTimeEntrySchema.parse(req.body);
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const timeEntry = await TimeEntryService.createTimeEntry(companyId, validatedData);

            res.status(201).json({
                success: true,
                message: 'Registro de tiempo creado exitosamente',
                data: timeEntry,
            });
        } catch (error: any) {
            console.error('❌ Error en createTimeEntry:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al crear el registro de tiempo',
            });
        }
    }

    // Fichaje rápido (para empleados)
    static async punchTime(req: Request, res: Response) {
        try {
            const { dni, pin, type, timestamp, source, location, latitude, longitude, isRemoteWork, deviceInfo, breakTypeId, breakReason } = req.body;
            const { companySlug } = req.body;

            if (!dni || !pin || !type) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos',
                });
            }

            // Obtener companyId y employeeId a partir del DNI
            const { prisma } = await import('../../config/db');

            let employee;
            let company;

            if (companySlug) {
                // Si se proporciona companySlug, usar la lógica original
                // Verificar empresa
                company = await prisma.company.findFirst({
                    where: {
                        slug: companySlug,
                        active: true,
                    },
                });

                if (!company) {
                    return res.status(404).json({
                        success: false,
                        message: 'Empresa no encontrada',
                    });
                }

                // Verificar empleado y obtener su ID a través de la relación EmployeeCompany
                const employeeCompany = await (prisma as any).employeeCompany.findFirst({
                    where: {
                        employee: {
                            dni: dni,
                            active: true,
                        },
                        companyId: company.id,
                        active: true,
                    },
                    include: {
                        employee: true,
                    },
                });

                employee = employeeCompany?.employee;
            } else {
                // Si no se proporciona companySlug, buscar al empleado por DNI en todas las empresas activas
                const employeeCompany = await (prisma as any).employeeCompany.findFirst({
                    where: {
                        employee: {
                            dni: dni,
                            active: true,
                        },
                        company: {
                            active: true,
                        },
                        active: true,
                    },
                    include: {
                        employee: true,
                        company: true,
                    },
                });

                if (!employeeCompany) {
                    return res.status(404).json({
                        success: false,
                        message: 'Empleado no encontrado',
                    });
                }

                employee = employeeCompany.employee;
                company = employeeCompany.company;
            }

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: 'Empleado no encontrado',
                });
            }

            // Verificar PIN
            const bcrypt = await import('bcryptjs');
            const isPinValid = await bcrypt.compare(pin, employee.pin);

            if (!isPinValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas',
                });
            }

            const timeEntry = await TimeEntryService.punchTime(
                company.id,
                employee.id,
                type,
                timestamp,
                source,
                location,
                latitude,
                longitude,
                isRemoteWork,
                deviceInfo,
                breakTypeId,
                breakReason
            );

            // Incluir información de geolocalización de la empresa en la respuesta
            const companyGeolocation = await TimeEntryService.getCompanyGeolocation(company.id);

            res.status(201).json({
                success: true,
                message: 'Fichaje registrado exitosamente',
                data: timeEntry,
                companyGeolocation,
            });
        } catch (error: any) {
            console.error('❌ Error en punchTime:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al registrar el fichaje',
            });
        }
    }

    // Obtener registro por ID
    static async getTimeEntry(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const timeEntry = await TimeEntryService.getTimeEntryById(companyId, id);

            if (!timeEntry) {
                return res.status(404).json({
                    success: false,
                    message: 'Registro no encontrado',
                });
            }

            res.json({
                success: true,
                data: timeEntry,
            });
        } catch (error: any) {
            console.error('❌ Error en getTimeEntry:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el registro',
            });
        }
    }

    // Obtener lista de registros
    static async getTimeEntries(req: Request & { user?: any }, res: Response) {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const filters = {
                employeeId: req.query.employeeId as string || undefined,
                startDate: req.query.startDate as string || undefined,
                endDate: req.query.endDate as string || undefined,
                type: req.query.type as string || undefined,
                source: req.query.source as string || undefined,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
            };

            // Filtrar valores vacíos antes de la validación
            const cleanedFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, value]) =>
                    value !== undefined && value !== '' && value !== null
                )
            );

            const validatedFilters = timeEntryFiltersSchema.parse(cleanedFilters);
            const result = await TimeEntryService.getTimeEntries(companyId, validatedFilters);

            res.json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            console.error('❌ Error en getTimeEntries:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener los registros',
            });
        }
    }

    // Actualizar registro de tiempo
    static async updateTimeEntry(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            const validatedData = updateTimeEntrySchema.parse(req.body);
            const { reason } = req.body;
            const companyId = req.user?.companyId;
            const companyUserId = req.user?.id;

            if (!companyId || !companyUserId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            if (!reason || typeof reason !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'El motivo de la modificación es requerido',
                });
            }

            const timeEntry = await TimeEntryService.updateTimeEntry(
                companyId,
                id,
                companyUserId,
                validatedData,
                reason
            );

            res.json({
                success: true,
                message: 'Registro actualizado exitosamente',
                data: timeEntry,
            });
        } catch (error: any) {
            console.error('❌ Error en updateTimeEntry:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al actualizar el registro',
            });
        }
    }

    // Eliminar registro de tiempo
    static async deleteTimeEntry(req: Request & { user?: any }, res: Response) {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;
            const companyUserId = req.user?.id;

            if (!companyId || !companyUserId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            // Obtener el motivo del cuerpo o de los parámetros de consulta
            let reason = req.body.reason;
            if (!reason) {
                reason = req.query.reason as string;
            }

            if (!reason || typeof reason !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'El motivo de eliminación es requerido',
                });
            }

            await TimeEntryService.deleteTimeEntry(companyId, id, companyUserId, reason);

            res.json({
                success: true,
                message: 'Registro eliminado exitosamente',
            });
        } catch (error: any) {
            console.error('❌ Error en deleteTimeEntry:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al eliminar el registro',
            });
        }
    }

    // Creación masiva de registros
    static async bulkCreateTimeEntries(req: Request & { user?: any }, res: Response) {
        try {
            const validatedData = bulkCreateSchema.parse(req.body);
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const timeEntries = await TimeEntryService.bulkCreateTimeEntries(companyId, validatedData);

            res.status(201).json({
                success: true,
                message: `${validatedData.entries.length} registros creados exitosamente`,
                data: timeEntries,
            });
        } catch (error: any) {
            console.error('❌ Error en bulkCreateTimeEntries:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos inválidos',
                    errors: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error al crear los registros',
            });
        }
    }

    // Obtener registros de un empleado
    static async getEmployeeTimeEntries(req: Request & { user?: any }, res: Response) {
        try {
            const { employeeId } = req.params;
            const companyId = req.user?.companyId;

            if (!companyId) {
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

            const result = await TimeEntryService.getEmployeeTimeEntries(companyId, employeeId, cleanedFilters);

            res.json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            console.error('❌ Error en getEmployeeTimeEntries:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener los registros del empleado',
            });
        }
    }

    // Obtener registros del empleado autenticado
    static async getMyTimeEntries(req: Request & { user?: any }, res: Response) {
        try {
            const employeeId = req.user?.employeeId;
            const companyId = req.user?.companyId;

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

            const result = await TimeEntryService.getEmployeeTimeEntries(companyId, employeeId, cleanedFilters);

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

    // Obtener resumen diario
    static async getDailySummary(req: Request & { user?: any }, res: Response) {
        try {
            const { date } = req.params;
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha es requerida',
                });
            }

            const summary = await TimeEntryService.getDailySummary(companyId, date);

            res.json({
                success: true,
                data: summary,
            });
        } catch (error: any) {
            console.error('❌ Error en getDailySummary:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el resumen diario',
            });
        }
    }

    // Obtener estado actual del fichaje del empleado
    static async getCurrentPunchState(req: Request & { user?: any }, res: Response) {
        try {
            const employeeId = req.user?.employeeId;
            const companyId = req.user?.companyId;

            if (!employeeId || !companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const punchState = await TimeEntryService.getCurrentPunchState(companyId, employeeId);

            res.json({
                success: true,
                data: punchState,
            });
        } catch (error: any) {
            console.error('❌ Error en getCurrentPunchState:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener el estado de fichaje',
            });
        }
    }

    // Obtener estadísticas de fichajes
    static async getTimeEntryStats(req: Request & { user?: any }, res: Response) {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
            };

            const stats = await TimeEntryService.getTimeEntryStats(companyId, filters);

            res.json({
                success: true,
                data: stats,
            });
        } catch (error: any) {
            console.error('❌ Error en getTimeEntryStats:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener las estadísticas',
            });
        }
    }

    // Exportar registros a CSV
    static async exportTimeEntries(req: Request & { user?: any }, res: Response) {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado',
                });
            }

            const filters = {
                employeeId: req.query.employeeId as string,
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                type: req.query.type as string,
            };

            const result = await TimeEntryService.getTimeEntries(companyId, {
                ...filters,
                page: 1,
                limit: 10000, // Límite alto para exportación
                type: filters.type as any, // Cast para evitar error de tipos en exportación
            });

            // Generar CSV
            const csv = this.generateTimeEntriesCSV(result.timeEntries);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=time-entries-${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csv);
        } catch (error: any) {
            console.error('❌ Error en exportTimeEntries:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al exportar los registros',
            });
        }
    }

    // Métodos auxiliares
    private static generateTimeEntriesCSV(timeEntries: any[]): string {
        const headers = [
            'ID',
            'Empleado',
            'DNI',
            'Tipo',
            'Fecha/Hora',
            'Origen',
            'Ubicación',
            'Latitud',
            'Longitud',
            'Teletrabajo',
            'Validación Geovalla',
            'Notas',
            'Creado por empleado'
        ];

        const rows = timeEntries.map(entry => [
            entry.id,
            `${entry.employee?.name || ''} ${entry.employee?.surname || ''}`,
            entry.employee?.dni || '',
            entry.type,
            entry.timestamp.toISOString(),
            entry.source,
            entry.location || '',
            entry.latitude || '',
            entry.longitude || '',
            entry.isRemoteWork ? 'Sí' : 'No',
            entry.geofenceValid !== undefined ? (entry.geofenceValid ? 'Sí' : 'No') : '',
            entry.notes || '',
            entry.createdByEmployee ? 'Sí' : 'No'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    }
}

export default TimeEntryController;