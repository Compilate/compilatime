import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/apiResponse';
import { SubscriptionStatus } from '@prisma/client';

// Extender el tipo Request para incluir información de la suscripción
declare global {
    namespace Express {
        interface Request {
            subscription?: {
                id: string;
                status: SubscriptionStatus;
                planId: string;
                plan: {
                    maxEmployees: number;
                    maxTimeEntriesPerMonth: number;
                    features: any;
                };
                endDate: Date;
                isExpired: boolean;
            };
        }
    }
}

// Middleware para verificar el estado de la suscripción de la empresa
export const checkSubscriptionStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Si la ruta ya tiene información de suscripción, continuar
        if (req.subscription) {
            return next();
        }

        // Obtener el ID de la empresa del usuario autenticado
        const companyId = req.user?.companyId;

        if (!companyId) {
            ApiResponse.unauthorized(res, 'Se requiere autenticación de empresa');
            return;
        }

        // Primero verificar si la empresa está activa
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                active: true
            }
        });

        if (!company) {
            ApiResponse.forbidden(res, 'Empresa no encontrada');
            return;
        }

        if (!company.active) {
            ApiResponse.forbidden(
                res,
                `La empresa ha sido suspendida.`
            );
            return;
        }

        // Buscar la suscripción activa de la empresa
        const subscription = await prisma.subscription.findFirst({
            where: {
                companyId,
                status: SubscriptionStatus.ACTIVE
            },
            include: {
                plan: {
                    select: {
                        id: true,
                        name: true,
                        maxEmployees: true,
                        maxTimeEntriesPerMonth: true,
                        features: true,
                        priceMonthly: true,
                        priceYearly: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!subscription) {
            ApiResponse.forbidden(res, 'La empresa no tiene una suscripción activa');
            return;
        }

        // Verificar si la suscripción ha expirado
        const now = new Date();
        const isExpired = subscription.endDate < now;

        if (isExpired) {
            ApiResponse.forbidden(res, 'La suscripción de la empresa ha expirado');
            return;
        }

        // Añadir información de la suscripción a la request
        req.subscription = {
            id: subscription.id,
            status: subscription.status,
            planId: subscription.planId,
            plan: subscription.plan,
            endDate: subscription.endDate,
            isExpired
        };

        next();
    } catch (error) {
        console.error('Error en middleware de verificación de suscripción:', error);
        ApiResponse.error(res, 'Error interno del servidor', 500);
    }
};

// Middleware para verificar límites según el plan
export const checkSubscriptionLimits = (limitType: 'employees' | 'timeEntries') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Verificar que ya se ha validado la suscripción
            if (!req.subscription) {
                await checkSubscriptionStatus(req, res, next);
                return;
            }

            const { plan, isExpired } = req.subscription;

            // Si la suscripción está expirada, ya se manejó en el middleware anterior
            if (isExpired) {
                return;
            }

            // Verificar límites según el tipo
            if (limitType === 'employees') {
                await checkEmployeeLimit(req, res, next, plan);
            } else if (limitType === 'timeEntries') {
                await checkTimeEntriesLimit(req, res, next, plan);
            } else {
                next();
            }
        } catch (error) {
            console.error('Error en middleware de verificación de límites:', error);
            ApiResponse.error(res, 'Error interno del servidor', 500);
        }
    };
};

// Función para verificar límite de empleados
async function checkEmployeeLimit(
    req: Request,
    res: Response,
    next: NextFunction,
    plan: any
): Promise<void> {
    try {
        // Contar empleados activos de la empresa
        const employeeCount = await prisma.employeeCompany.count({
            where: {
                companyId: req.user?.companyId,
                employee: {
                    active: true
                },
                active: true
            }
        });

        // Verificar si se excede el límite
        if (employeeCount >= plan.maxEmployees) {
            ApiResponse.forbidden(
                res,
                `Se ha alcanzado el límite de empleados (${plan.maxEmployees}) para el plan actual`
            );
            return;
        }

        // Si es una petición POST para crear un nuevo empleado
        if (req.method === 'POST' && req.path.includes('/employees')) {
            if (employeeCount >= plan.maxEmployees) {
                ApiResponse.forbidden(
                    res,
                    `No se pueden crear más empleados. Límite alcanzado: ${plan.maxEmployees}`
                );
                return;
            }
        }

        next();
    } catch (error) {
        console.error('Error al verificar límite de empleados:', error);
        ApiResponse.error(res, 'Error interno del servidor', 500);
    }
}

// Función para verificar límite de fichajes mensuales
async function checkTimeEntriesLimit(
    req: Request,
    res: Response,
    next: NextFunction,
    plan: any
): Promise<void> {
    try {
        // Si es una petición POST para crear un nuevo fichaje
        if (req.method === 'POST' && req.path.includes('/time-entries')) {
            // Contar fichajes del mes actual
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const timeEntriesCount = await prisma.timeEntry.count({
                where: {
                    companyId: req.user?.companyId,
                    timestamp: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                }
            });

            // Verificar si se excede el límite
            if (timeEntriesCount >= plan.maxTimeEntriesPerMonth) {
                ApiResponse.forbidden(
                    res,
                    `Se ha alcanzado el límite de fichajes mensuales (${plan.maxTimeEntriesPerMonth}) para el plan actual`
                );
                return;
            }
        }

        next();
    } catch (error) {
        console.error('Error al verificar límite de fichajes:', error);
        ApiResponse.error(res, 'Error interno del servidor', 500);
    }
}

// Middleware para verificar características específicas del plan
export const checkPlanFeature = (feature: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Verificar que ya se ha validado la suscripción
            if (!req.subscription) {
                await checkSubscriptionStatus(req, res, next);
                return;
            }

            const { plan, isExpired } = req.subscription;

            // Si la suscripción está expirada, ya se manejó en el middleware anterior
            if (isExpired) {
                return;
            }

            // Verificar si la característica está disponible en el plan
            if (plan.features && typeof plan.features === 'object') {
                const features = plan.features as Record<string, any>;

                if (!features[feature] || features[feature] !== true) {
                    ApiResponse.forbidden(
                        res,
                        `La característica "${feature}" no está disponible en el plan actual`
                    );
                    return;
                }
            }

            next();
        } catch (error) {
            console.error('Error en middleware de verificación de características:', error);
            ApiResponse.error(res, 'Error interno del servidor', 500);
        }
    };
};