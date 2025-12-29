import { PrismaClient, AbsenceType, AbsenceStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class AbsenceService {
    // ==================== AUSENCIAS ====================

    /**
     * Obtener todas las ausencias de una empresa con filtros
     */
    async getAbsences(companyId: string, filters: any) {
        const validatedFilters = filters;

        // Extraer parámetros de paginación que no van en el where
        const { limit, offset, ...filterParams } = validatedFilters;

        const where: any = {
            companyId,
            ...filterParams,
        };

        // Filtro por rango de fechas
        if (validatedFilters.startDate || validatedFilters.endDate) {
            where.startDate = {};
            if (validatedFilters.startDate) {
                where.startDate.gte = validatedFilters.startDate;
            }
            if (validatedFilters.endDate) {
                where.startDate.lte = validatedFilters.endDate;
            }
        }

        const [absences, total] = await Promise.all([
            prisma.absence.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            dni: true,
                            name: true,
                            surname: true,
                            department: true,
                            position: true,
                        },
                    },
                },
                orderBy: [
                    { startDate: 'desc' },
                    { createdAt: 'desc' },
                ],
                skip: validatedFilters.offset || 0,
                take: validatedFilters.limit || 50,
            }),
            prisma.absence.count({ where }),
        ]);

        return {
            absences,
            total,
            page: Math.floor((validatedFilters.offset || 0) / (validatedFilters.limit || 50)) + 1,
            totalPages: Math.ceil(total / (validatedFilters.limit || 50)),
        };
    }

    /**
     * Obtener una ausencia por ID
     */
    async getAbsenceById(companyId: string, id: string) {
        return await prisma.absence.findFirst({
            where: {
                id,
                companyId,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        dni: true,
                        name: true,
                        surname: true,
                        department: true,
                        position: true,
                    },
                },
            },
        });
    }

    /**
     * Crear una nueva ausencia
     */
    async createAbsence(companyId: string, data: any, createdBy: string) {
        const validatedData = data;

        // Verificar que el empleado existe y pertenece a la empresa
        const employee = await (prisma as any).employee.findFirst({
            where: {
                id: validatedData.employeeId,
                employeeCompanies: {
                    some: {
                        companyId,
                        active: true,
                    },
                },
                active: true,
            },
        });

        if (!employee) {
            throw new Error('Empleado no encontrado o inactivo');
        }

        // Verificar solapamiento con otras ausencias
        const overlappingAbsence = await this.checkOverlappingAbsences(
            validatedData.employeeId,
            new Date(validatedData.startDate),
            new Date(validatedData.endDate)
        );

        if (overlappingAbsence) {
            throw new Error('El empleado ya tiene una ausencia registrada en este período');
        }

        // Calcular días de ausencia
        const days = this.calculateAbsenceDays(
            new Date(validatedData.startDate),
            new Date(validatedData.endDate),
            validatedData.halfDay || false,
            validatedData.startHalfDay,
            validatedData.endHalfDay
        );

        // Crear la ausencia
        const absence = await prisma.absence.create({
            data: {
                companyId,
                employeeId: validatedData.employeeId,
                type: validatedData.type,
                startDate: new Date(validatedData.startDate),
                endDate: new Date(validatedData.endDate),
                halfDay: validatedData.halfDay,
                startHalfDay: validatedData.startHalfDay,
                endHalfDay: validatedData.endHalfDay,
                reason: validatedData.reason,
                notes: validatedData.notes,
                days,
                requestedById: createdBy,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        dni: true,
                        name: true,
                        surname: true,
                        department: true,
                        position: true,
                    },
                },
            },
        });

        // Si requiere aprobación automática (según política), aprobarla
        if (validatedData.status && validatedData.status === AbsenceStatus.APPROVED) {
            await this.approveAbsence(companyId, absence.id, createdBy, 'Aprobación automática');
        }

        return absence;
    }

    /**
     * Actualizar una ausencia
     */
    async updateAbsence(companyId: string, id: string, data: any) {
        const validatedData = data;

        // Verificar que la ausencia existe
        const existingAbsence = await prisma.absence.findFirst({
            where: {
                id,
                companyId,
            },
        });

        if (!existingAbsence) {
            throw new Error('Ausencia no encontrada');
        }

        // Si ya está aprobada, no permitir modificar fechas
        if (existingAbsence.status === AbsenceStatus.APPROVED &&
            (validatedData.startDate || validatedData.endDate)) {
            throw new Error('No se pueden modificar las fechas de una ausencia ya aprobada');
        }

        // Calcular días si se modificaron las fechas
        let days = existingAbsence.days;
        if (validatedData.startDate || validatedData.endDate) {
            const startDate = validatedData.startDate || existingAbsence.startDate;
            const endDate = validatedData.endDate || existingAbsence.endDate;

            days = this.calculateAbsenceDays(
                new Date(startDate),
                new Date(endDate),
                validatedData.halfDay ?? existingAbsence.halfDay,
                (validatedData.startHalfDay ?? existingAbsence.startHalfDay) || undefined,
                (validatedData.endHalfDay ?? existingAbsence.endHalfDay) || undefined
            );

            // Verificar solapamiento con otras ausencias
            const overlappingAbsence = await this.checkOverlappingAbsences(
                existingAbsence.employeeId,
                new Date(startDate),
                new Date(endDate),
                id
            );

            if (overlappingAbsence) {
                throw new Error('El empleado ya tiene una ausencia registrada en este período');
            }
        }

        const absenceUpdated = await prisma.absence.update({
            where: { id },
            data: {
                employeeId: validatedData.employeeId,
                type: validatedData.type,
                startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
                endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
                halfDay: validatedData.halfDay,
                startHalfDay: validatedData.startHalfDay,
                endHalfDay: validatedData.endHalfDay,
                reason: validatedData.reason,
                notes: validatedData.notes,
                days,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        dni: true,
                        name: true,
                        surname: true,
                        department: true,
                        position: true,
                    },
                },
            },
        });

        return absenceUpdated;
    }

    /**
     * Eliminar una ausencia (baja lógica)
     */
    async deleteAbsence(companyId: string, id: string, deletedBy: string) {
        const existingAbsence = await prisma.absence.findFirst({
            where: {
                id,
                companyId,
            },
        });

        if (!existingAbsence) {
            throw new Error('Ausencia no encontrada');
        }

        // No permitir eliminar ausencias ya aprobadas
        if (existingAbsence.status === AbsenceStatus.APPROVED) {
            throw new Error('No se puede eliminar una ausencia ya aprobada');
        }

        await prisma.absence.update({
            where: { id },
            data: {
                status: AbsenceStatus.CANCELLED,
                notes: existingAbsence.notes ?
                    `${existingAbsence.notes}\n\nCancelada por: ${deletedBy}` :
                    `Cancelada por: ${deletedBy}`,
            },
        });

        return { success: true };
    }

    /**
     * Aprobar una ausencia
     */
    async approveAbsence(companyId: string, id: string, approvedBy: string, reason?: string) {
        const absence = await prisma.absence.findFirst({
            where: {
                id,
                companyId,
            },
        });

        if (!absence) {
            throw new Error('Ausencia no encontrada');
        }

        if (absence.status !== AbsenceStatus.PENDING) {
            throw new Error('La ausencia ya ha sido procesada');
        }

        const updatedAbsence = await prisma.absence.update({
            where: { id },
            data: {
                status: AbsenceStatus.APPROVED,
                approvedBy,
                approvedAt: new Date(),
                notes: reason ? `${absence.notes || ''}\n\nMotivo de aprobación: ${reason}` : absence.notes,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        dni: true,
                        name: true,
                        surname: true,
                        email: true,
                    },
                },
            },
        });

        // Actualizar balance de vacaciones si es necesario
        if (absence.type === AbsenceType.VACATION) {
            await this.updateVacationBalance(
                companyId,
                absence.employeeId,
                absence.days,
                'used'
            );
        }

        return updatedAbsence;
    }

    /**
     * Rechazar una ausencia
     */
    async rejectAbsence(companyId: string, id: string, rejectedBy: string, rejectionReason: string) {
        const absence = await prisma.absence.findFirst({
            where: {
                id,
                companyId,
            },
        });

        if (!absence) {
            throw new Error('Ausencia no encontrada');
        }

        if (absence.status !== AbsenceStatus.PENDING) {
            throw new Error('La ausencia ya ha sido procesada');
        }

        const updatedAbsence = await prisma.absence.update({
            where: { id },
            data: {
                status: AbsenceStatus.REJECTED,
                approvedBy: rejectedBy,
                approvedAt: new Date(),
                rejectionReason,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        dni: true,
                        name: true,
                        surname: true,
                        email: true,
                    },
                },
            },
        });

        return updatedAbsence;
    }

    // ==================== SOLICITUDES DE AUSENCIA ====================

    /**
     * Obtener solicitudes de ausencia
     */
    async getAbsenceRequests(companyId: string, filters: any) {
        const validatedFilters = filters;

        const where: any = {
            companyId,
            ...validatedFilters,
        };

        // Filtro por rango de fechas
        if (validatedFilters.startDate || validatedFilters.endDate) {
            where.startDate = {};
            if (validatedFilters.startDate) {
                where.startDate.gte = validatedFilters.startDate;
            }
            if (validatedFilters.endDate) {
                where.startDate.lte = validatedFilters.endDate;
            }
        }

        const [requests, total] = await Promise.all([
            prisma.absenceRequest.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            dni: true,
                            name: true,
                            surname: true,
                            department: true,
                            position: true,
                        },
                    },
                },
                orderBy: [
                    { createdAt: 'desc' },
                ],
                skip: validatedFilters.offset || 0,
                take: validatedFilters.limit || 50,
            }),
            prisma.absenceRequest.count({ where }),
        ]);

        return {
            requests,
            total,
            page: Math.floor((validatedFilters.offset || 0) / (validatedFilters.limit || 50)) + 1,
            totalPages: Math.ceil(total / (validatedFilters.limit || 50)),
        };
    }

    /**
     * Crear una solicitud de ausencia
     */
    async createAbsenceRequest(companyId: string, data: any, requestedBy: string) {
        const validatedData = data;

        // Verificar que el empleado existe y pertenece a la empresa
        const employee = await (prisma as any).employee.findFirst({
            where: {
                id: validatedData.employeeId,
                employeeCompanies: {
                    some: {
                        companyId,
                        active: true,
                    },
                },
                active: true,
            },
        });

        if (!employee) {
            throw new Error('Empleado no encontrado o inactivo');
        }

        // Calcular días de ausencia
        const days = this.calculateAbsenceDays(
            new Date(validatedData.startDate),
            new Date(validatedData.endDate),
            validatedData.halfDay || false,
            validatedData.startHalfDay,
            validatedData.endHalfDay
        );

        // Crear la solicitud
        const request = await prisma.absenceRequest.create({
            data: {
                companyId,
                employeeId: validatedData.employeeId,
                type: validatedData.type,
                startDate: new Date(validatedData.startDate),
                endDate: new Date(validatedData.endDate),
                reason: validatedData.reason,
                days,
                requestedById: requestedBy,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        dni: true,
                        name: true,
                        surname: true,
                        department: true,
                        position: true,
                    },
                },
            },
        });

        return request;
    }

    // ==================== POLÍTICAS DE VACACIONES ====================

    /**
     * Obtener políticas de vacaciones
     */
    async getVacationPolicies(companyId: string) {
        return await prisma.vacationPolicy.findMany({
            where: {
                companyId,
                active: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
    }

    /**
     * Crear una política de vacaciones
     */
    async createVacationPolicy(companyId: string, data: any) {
        const validatedData = data;

        return await prisma.vacationPolicy.create({
            data: {
                companyId,
                ...validatedData,
            },
        });
    }

    /**
     * Actualizar una política de vacaciones
     */
    async updateVacationPolicy(companyId: string, id: string, data: any) {
        const validatedData = data;

        // Verificar que la política existe
        const existingPolicy = await prisma.vacationPolicy.findFirst({
            where: {
                id,
                companyId,
            },
        });

        if (!existingPolicy) {
            throw new Error('Política de vacaciones no encontrada');
        }

        return await prisma.vacationPolicy.update({
            where: { id },
            data: validatedData,
        });
    }

    /**
     * Eliminar una política de vacaciones
     */
    async deleteVacationPolicy(companyId: string, id: string) {
        const existingPolicy = await prisma.vacationPolicy.findFirst({
            where: {
                id,
                companyId,
            },
        });

        if (!existingPolicy) {
            throw new Error('Política de vacaciones no encontrada');
        }

        await prisma.vacationPolicy.update({
            where: { id },
            data: {
                active: false,
            },
        });

        return { success: true };
    }

    // ==================== BALANCE DE VACACIONES ====================

    /**
     * Obtener balance de vacaciones de un empleado
     */
    async getVacationBalance(companyId: string, employeeId: string, year?: number) {
        const currentYear = year || new Date().getFullYear();

        const balance = await prisma.vacationBalance.findFirst({
            where: {
                companyId,
                employeeId,
                year: currentYear,
            },
            include: {
                policy: {
                    select: {
                        id: true,
                        name: true,
                        yearlyDays: true,
                        maxCarryOverDays: true,
                    },
                },
            },
        });

        if (!balance) {
            // Crear balance inicial si no existe
            const policy = await prisma.vacationPolicy.findFirst({
                where: {
                    companyId,
                    active: true,
                },
            });

            if (policy) {
                return await this.initializeVacationBalance(companyId, employeeId, policy.id, currentYear);
            }
        }

        return balance;
    }

    /**
     * Inicializar balance de vacaciones para un empleado
     */
    async initializeVacationBalance(companyId: string, employeeId: string, policyId: string, year: number) {
        const policy = await prisma.vacationPolicy.findFirst({
            where: {
                id: policyId,
                companyId,
            },
        });

        if (!policy) {
            throw new Error('Política de vacaciones no encontrada');
        }

        // Verificar si ya existe un balance para el año anterior para calcular días arrastrados
        let carriedOverDays = 0;
        const previousYearBalance = await prisma.vacationBalance.findFirst({
            where: {
                companyId,
                employeeId,
                year: year - 1,
            },
        });

        if (previousYearBalance && policy.maxCarryOverDays > 0) {
            const availableDays = previousYearBalance.totalDays - previousYearBalance.usedDays;
            carriedOverDays = Math.min(availableDays, policy.maxCarryOverDays);
        }

        return await prisma.vacationBalance.create({
            data: {
                companyId,
                employeeId,
                policyId,
                year,
                totalDays: policy.yearlyDays + carriedOverDays,
                carriedOverDays,
            },
            include: {
                policy: true,
            },
        });
    }

    /**
     * Actualizar balance de vacaciones
     */
    async updateVacationBalance(companyId: string, employeeId: string, days: number, type: 'used' | 'pending' | 'adjusted') {
        const currentYear = new Date().getFullYear();

        let balance = await prisma.vacationBalance.findFirst({
            where: {
                companyId,
                employeeId,
                year: currentYear,
            },
        });

        // Si no existe el balance, crearlo automáticamente
        if (!balance) {
            let policy = await prisma.vacationPolicy.findFirst({
                where: {
                    companyId,
                    active: true,
                },
            });

            // Si no hay política, crear una por defecto
            if (!policy) {
                policy = await prisma.vacationPolicy.create({
                    data: {
                        companyId,
                        name: 'Política por defecto',
                        description: 'Política de vacaciones creada automáticamente',
                        yearlyDays: 22,
                        probationDays: 0,
                        maxCarryOverDays: 5,
                        minNoticeDays: 7,
                        requiresApproval: true,
                        allowHalfDays: true,
                        restrictByDepartment: false,
                        active: true,
                    },
                });
            }

            balance = await this.initializeVacationBalance(companyId, employeeId, policy.id, currentYear);
        }

        const updateData: any = {};

        switch (type) {
            case 'used':
                updateData.usedDays = balance.usedDays + days;
                break;
            case 'pending':
                updateData.pendingDays = balance.pendingDays + days;
                break;
            case 'adjusted':
                updateData.adjustedDays = balance.adjustedDays + days;
                break;
        }

        return await prisma.vacationBalance.update({
            where: {
                id: balance.id,
            },
            data: updateData,
        });
    }

    // ==================== COMENTARIOS DE AUSENCIA ====================

    /**
     * Agregar un comentario a una ausencia
     */
    async addAbsenceComment(companyId: string, absenceId: string, authorId: string, authorType: string, comment: string, isInternal: boolean = false) {
        // Verificar que la ausencia existe
        const absence = await prisma.absence.findFirst({
            where: {
                id: absenceId,
                companyId,
            },
        });

        if (!absence) {
            throw new Error('Ausencia no encontrada');
        }

        return await prisma.absenceComment.create({
            data: {
                absenceId,
                authorId,
                authorType,
                comment,
                isInternal,
            },
        });
    }

    /**
     * Obtener comentarios de una ausencia
     */
    async getAbsenceComments(companyId: string, absenceId: string) {
        // Verificar que la ausencia existe
        const absence = await prisma.absence.findFirst({
            where: {
                id: absenceId,
                companyId,
            },
        });

        if (!absence) {
            throw new Error('Ausencia no encontrada');
        }

        return await prisma.absenceComment.findMany({
            where: {
                absenceId,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
    }

    // ==================== MÉTODOS AUXILIARES ====================

    /**
     * Verificar solapamiento de ausencias
     */
    private async checkOverlappingAbsences(employeeId: string, startDate: Date, endDate: Date, excludeId?: string) {
        const where: any = {
            employeeId,
            status: {
                in: [AbsenceStatus.PENDING, AbsenceStatus.APPROVED],
            },
            OR: [
                {
                    AND: [
                        { startDate: { lte: startDate } },
                        { endDate: { gte: startDate } },
                    ],
                },
                {
                    AND: [
                        { startDate: { lte: endDate } },
                        { endDate: { gte: endDate } },
                    ],
                },
                {
                    AND: [
                        { startDate: { gte: startDate } },
                        { endDate: { lte: endDate } },
                    ],
                },
            ],
        };

        if (excludeId) {
            where.id = { not: excludeId };
        }

        const overlappingAbsence = await prisma.absence.findFirst({
            where,
        });

        return overlappingAbsence;
    }

    /**
     * Calcular días de ausencia
     */
    private calculateAbsenceDays(startDate: Date, endDate: Date, halfDay: boolean, startHalfDay?: string, endHalfDay?: string): number {
        if (halfDay) {
            return 0.5; // Medio día
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Calcular diferencia en días
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Ajustar por mediodías si es necesario
        if (startHalfDay === 'afternoon') {
            // Si empieza por la tarde, contar medio día menos
            return Math.max(0.5, diffDays - 0.5);
        }

        if (endHalfDay === 'morning') {
            // Si termina por la mañana, contar medio día menos
            return Math.max(0.5, diffDays - 0.5);
        }

        return diffDays;
    }

    /**
     * Obtener estadísticas de ausencias
     */
    async getAbsenceStats(companyId: string, filters: any) {
        const where: any = {
            companyId,
            ...filters,
        };

        // Filtro por rango de fechas
        if (filters.startDate || filters.endDate) {
            where.startDate = {};
            if (filters.startDate) {
                where.startDate.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.startDate.lte = filters.endDate;
            }
        }

        const [
            totalAbsences,
            pendingAbsences,
            approvedAbsences,
            rejectedAbsences,
            absencesByType,
            absencesByMonth,
        ] = await Promise.all([
            prisma.absence.count({ where }),
            prisma.absence.count({ where: { ...where, status: AbsenceStatus.PENDING } }),
            prisma.absence.count({ where: { ...where, status: AbsenceStatus.APPROVED } }),
            prisma.absence.count({ where: { ...where, status: AbsenceStatus.REJECTED } }),
            prisma.absence.groupBy({
                by: ['type'],
                where,
                _count: { id: true },
                _sum: { days: true },
            }),
            prisma.$queryRaw`
        SELECT 
          EXTRACT(MONTH FROM start_date) as month,
          EXTRACT(YEAR FROM start_date) as year,
          COUNT(*) as count,
          SUM(days) as total_days
        FROM absences 
        WHERE company_id = ${companyId}
          ${filters.startDate ? `AND start_date >= ${filters.startDate}` : ''}
          ${filters.endDate ? `AND start_date <= ${filters.endDate}` : ''}
        GROUP BY EXTRACT(MONTH FROM start_date), EXTRACT(YEAR FROM start_date)
        ORDER BY year, month
      `,
        ]);

        return {
            total: totalAbsences,
            byStatus: {
                pending: pendingAbsences,
                approved: approvedAbsences,
                rejected: rejectedAbsences,
            },
            byType: absencesByType.reduce((acc: any, item: any) => {
                acc[item.type] = {
                    count: item._count.id,
                    days: item._sum.days || 0,
                };
                return acc;
            }, {}),
            byMonth: absencesByMonth,
        };
    }

    // ==================== FESTIVOS DE LA EMPRESA ====================

    /**
     * Obtener festivos de la empresa
     */
    async getCompanyHolidays(companyId: string, filters: any) {
        // Extraer parámetros de paginación que no van en el where
        const { limit, offset, startDate, endDate, ...filterParams } = filters;

        const where: any = {
            companyId,
            ...filterParams,
        };

        // Filtro por rango de fechas
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = startDate;
            }
            if (endDate) {
                where.date.lte = endDate;
            }
        }

        const [holidays, total] = await Promise.all([
            prisma.companyHoliday.findMany({
                where,
                orderBy: [
                    { date: 'asc' },
                ],
                skip: offset || 0,
                take: limit || 50,
            }),
            prisma.companyHoliday.count({ where }),
        ]);

        return {
            holidays,
            total,
            page: Math.floor((offset || 0) / (limit || 50)) + 1,
            totalPages: Math.ceil(total / (limit || 50)),
        };
    }

    /**
     * Crear un festivo de la empresa
     */
    async createCompanyHoliday(companyId: string, data: any) {
        const validatedData = data;

        // Convertir la fecha a objeto Date si viene como string
        const holidayDate = validatedData.date instanceof Date
            ? validatedData.date
            : new Date(validatedData.date);

        // Verificar si ya existe un festivo para esa fecha
        const existingHoliday = await prisma.companyHoliday.findFirst({
            where: {
                companyId,
                date: holidayDate,
            },
        });

        if (existingHoliday) {
            throw new Error('Ya existe un festivo para esta fecha');
        }

        return await prisma.companyHoliday.create({
            data: {
                companyId,
                ...validatedData,
                date: holidayDate,
            },
        });
    }

    /**
     * Actualizar un festivo de la empresa
     */
    async updateCompanyHoliday(companyId: string, id: string, data: any) {
        const validatedData = data;

        // Verificar que el festivo existe
        const existingHoliday = await prisma.companyHoliday.findFirst({
            where: {
                id,
                companyId,
            },
        });

        if (!existingHoliday) {
            throw new Error('Festivo no encontrado');
        }

        // Convertir la fecha a objeto Date si viene como string
        let holidayDate = existingHoliday.date;
        if (validatedData.date) {
            holidayDate = validatedData.date instanceof Date
                ? validatedData.date
                : new Date(validatedData.date);
        }

        // Si se cambia la fecha, verificar que no haya conflicto
        if (validatedData.date && holidayDate !== existingHoliday.date) {
            const conflictingHoliday = await prisma.companyHoliday.findFirst({
                where: {
                    companyId,
                    date: holidayDate,
                    id: { not: id },
                },
            });

            if (conflictingHoliday) {
                throw new Error('Ya existe un festivo para esta fecha');
            }
        }

        return await prisma.companyHoliday.update({
            where: { id },
            data: {
                ...validatedData,
                date: holidayDate,
            },
        });
    }

    /**
     * Eliminar un festivo de la empresa
     */
    async deleteCompanyHoliday(companyId: string, id: string) {
        const existingHoliday = await prisma.companyHoliday.findFirst({
            where: {
                id,
                companyId,
            },
        });

        if (!existingHoliday) {
            throw new Error('Festivo no encontrado');
        }

        await prisma.companyHoliday.delete({
            where: { id },
        });

        return { success: true };
    }

    /**
     * Actualizar una solicitud de ausencia
     */
    async updateAbsenceRequest(companyId: string, requestId: string, data: any) {
        const existingRequest = await prisma.absenceRequest.findFirst({
            where: {
                id: requestId,
                companyId,
            },
        });

        if (!existingRequest) {
            throw new Error('Solicitud de ausencia no encontrada');
        }

        // No permitir actualizar solicitudes ya aprobadas o rechazadas
        if (existingRequest.status === 'APPROVED' || existingRequest.status === 'REJECTED') {
            throw new Error('No se puede modificar una solicitud ya procesada');
        }

        const updatedRequest = await prisma.absenceRequest.update({
            where: { id: requestId },
            data: {
                ...data,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        dni: true,
                    },
                },
            },
        });

        return updatedRequest;
    }

    /**
     * Aprobar una solicitud de ausencia
     */
    async approveAbsenceRequest(companyId: string, requestId: string, approvedBy: string, reason?: string) {
        const existingRequest = await prisma.absenceRequest.findFirst({
            where: {
                id: requestId,
                companyId,
            },
        });

        if (!existingRequest) {
            throw new Error('Solicitud de ausencia no encontrada');
        }

        if (existingRequest.status !== 'PENDING') {
            throw new Error('La solicitud ya ha sido procesada');
        }

        // Crear la ausencia aprobada
        const absence = await prisma.absence.create({
            data: {
                companyId,
                employeeId: existingRequest.employeeId,
                type: existingRequest.type,
                startDate: new Date(existingRequest.startDate),
                endDate: new Date(existingRequest.endDate),
                days: existingRequest.days,
                status: 'APPROVED',
                approvedBy,
                approvedAt: new Date(),
                notes: reason || existingRequest.reason,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        dni: true,
                    },
                },
            },
        });

        // Actualizar el estado de la solicitud
        const updatedRequest = await prisma.absenceRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                approvedBy,
                approvedAt: new Date(),
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        dni: true,
                    },
                },
            },
        });

        return { absence, request: updatedRequest };
    }

    /**
     * Rechazar una solicitud de ausencia
     */
    async rejectAbsenceRequest(companyId: string, requestId: string, rejectionReason: string) {
        const existingRequest = await prisma.absenceRequest.findFirst({
            where: {
                id: requestId,
                companyId,
            },
        });

        if (!existingRequest) {
            throw new Error('Solicitud de ausencia no encontrada');
        }

        if (existingRequest.status !== 'PENDING') {
            throw new Error('La solicitud ya ha sido procesada');
        }

        const updatedRequest = await prisma.absenceRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                rejectionReason,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        dni: true,
                    },
                },
            },
        });

        return updatedRequest;
    }
}