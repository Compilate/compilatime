import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        type: "company" | "employee";
        companyId: string;
        data: any;
        company?: any;
    };
}

const prisma = new PrismaClient();

export class DashboardService {
    async getDashboardStats(req: AuthenticatedRequest) {
        const companyId = req.user!.companyId;

        // Obtener fecha actual y de inicio del mes/semana
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Calcular inicio de la semana (lunes)
        const dayOfWeek = now.getDay(); // 0 = domingo, 1 = lunes, etc.
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Ajustar para que lunes sea el primer día
        startOfWeek.setHours(0, 0, 0, 0);

        // Estadísticas de empleados
        const totalEmployees = await (prisma as any).employeeCompany.count({
            where: { companyId, active: true }
        });

        const activeEmployeesToday = await prisma.timeEntry.findMany({
            where: {
                companyId,
                timestamp: {
                    gte: startOfDay
                },
                type: 'IN'
            },
            select: { employeeId: true },
            distinct: ['employeeId']
        });

        // Estadísticas de fichajes del día
        const todayEntries = await prisma.timeEntry.count({
            where: {
                companyId,
                timestamp: {
                    gte: startOfDay
                }
            }
        });

        const todayIns = await prisma.timeEntry.count({
            where: {
                companyId,
                timestamp: {
                    gte: startOfDay
                },
                type: 'IN'
            }
        });

        const todayOuts = await prisma.timeEntry.count({
            where: {
                companyId,
                timestamp: {
                    gte: startOfDay
                },
                type: 'OUT'
            }
        });

        // Estadísticas del mes
        const monthEntries = await prisma.timeEntry.count({
            where: {
                companyId,
                timestamp: {
                    gte: startOfMonth
                }
            }
        });

        // Calcular horas trabajadas esta semana
        const weeklyTimeEntries = await prisma.timeEntry.findMany({
            where: {
                companyId,
                timestamp: {
                    gte: startOfWeek
                }
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        dni: true
                    }
                },
                breakType: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        color: true
                    }
                }
            },
            orderBy: [
                { employeeId: 'asc' },
                { timestamp: 'asc' }
            ]
        });

        // Calcular horas trabajadas este mes
        const monthlyTimeEntries = await prisma.timeEntry.findMany({
            where: {
                companyId,
                timestamp: {
                    gte: startOfMonth
                }
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        dni: true
                    }
                },
                breakType: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        color: true
                    }
                }
            },
            orderBy: [
                { employeeId: 'asc' },
                { timestamp: 'asc' }
            ]
        });

        // Función para calcular horas trabajadas
        const calculateHoursWorked = (entries: any[]) => {
            let totalHours = 0;
            const employeeEntries: { [key: string]: any[] } = {};

            // Agrupar entradas por empleado
            entries.forEach(entry => {
                if (!employeeEntries[entry.employeeId]) {
                    employeeEntries[entry.employeeId] = [];
                }
                employeeEntries[entry.employeeId].push(entry);
            });

            // Calcular horas por empleado
            Object.values(employeeEntries).forEach(empEntries => {
                let lastInTime: Date | null = null;

                empEntries.forEach(entry => {
                    if (entry.type === 'IN') {
                        lastInTime = new Date(entry.timestamp);
                    } else if (entry.type === 'OUT' && lastInTime) {
                        const outTime = new Date(entry.timestamp);
                        const hoursDiff = (outTime.getTime() - lastInTime.getTime()) / (1000 * 60 * 60);
                        totalHours += hoursDiff;
                        lastInTime = null;
                    }
                });
            });

            return totalHours;
        };

        const weeklyHours = calculateHoursWorked(weeklyTimeEntries);
        const monthlyHours = calculateHoursWorked(monthlyTimeEntries);

        // Últimos fichajes
        const recentEntries = await prisma.timeEntry.findMany({
            where: { companyId },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        dni: true
                    }
                },
                breakType: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        color: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' },
            take: 10
        });

        // Empleados que necesitan fichar salida (tienen entrada pero no salida hoy)
        const employeesToCheckOut = await prisma.timeEntry.groupBy({
            by: ['employeeId'],
            where: {
                companyId,
                timestamp: {
                    gte: startOfDay
                },
                type: 'IN'
            }
        });

        const employeesWithOutToday = await prisma.timeEntry.groupBy({
            by: ['employeeId'],
            where: {
                companyId,
                timestamp: {
                    gte: startOfDay
                },
                type: 'OUT'
            }
        });

        const employeesNeedingCheckout = employeesToCheckOut.filter(
            entry => !employeesWithOutToday.some(out => out.employeeId === entry.employeeId)
        );

        const employeesNeedingCheckoutDetails = await (prisma as any).employee.findMany({
            where: {
                id: {
                    in: employeesNeedingCheckout.map(e => e.employeeId)
                }
            },
            select: {
                id: true,
                name: true,
                dni: true
            }
        });

        return {
            employees: {
                total: totalEmployees,
                activeToday: activeEmployeesToday.length,
                needCheckout: employeesNeedingCheckoutDetails.length
            },
            timeEntries: {
                today: {
                    total: todayEntries,
                    ins: todayIns,
                    outs: todayOuts
                },
                month: monthEntries
            },
            hours: {
                weekly: weeklyHours,
                monthly: monthlyHours
            },
            recentEntries: recentEntries.map(entry => ({
                id: entry.id,
                employee: entry.employee,
                type: entry.type,
                timestamp: entry.timestamp,
                source: entry.source,
                createdByEmployee: entry.createdByEmployee
            })),
            employeesNeedingCheckout: employeesNeedingCheckoutDetails
        };
    }

    async getRecentTimeEntries(req: AuthenticatedRequest, limit: number = 10) {
        const companyId = req.user!.companyId;

        const recentEntries = await prisma.timeEntry.findMany({
            where: { companyId },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        surname: true,
                        dni: true
                    }
                },
                breakType: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        color: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' },
            take: limit
        });

        return recentEntries.map(entry => ({
            id: entry.id,
            employee: entry.employee,
            type: entry.type,
            timestamp: entry.timestamp,
            source: entry.source,
            createdByEmployee: entry.createdByEmployee
        }));
    }
}