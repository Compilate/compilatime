import { PrismaClient, Plan } from '@prisma/client';
import { ApiError } from '../../utils/apiError';

const prisma = new PrismaClient();

// Tipo extendido para incluir _count
type PlanWithCount = Plan & {
    _count: {
        subscriptions: number;
    };
};

export class PlanService {
    // Obtener todos los planes
    async getAllPlans(): Promise<PlanWithCount[]> {
        try {
            const plans = await prisma.plan.findMany({
                orderBy: {
                    priceMonthly: 'asc'
                }
            });

            // Obtener el conteo de suscripciones para cada plan
            const plansWithCount = await Promise.all(
                plans.map(async (plan) => {
                    const subscriptionCount = await prisma.subscription.count({
                        where: {
                            planId: plan.id,
                            status: 'ACTIVE'
                        }
                    });

                    return {
                        ...plan,
                        _count: {
                            subscriptions: subscriptionCount
                        }
                    };
                })
            );

            return plansWithCount;
        } catch (error) {
            console.error('Error al obtener planes:', error);
            throw new ApiError('Error al obtener los planes', 500);
        }
    }

    // Obtener un plan por ID
    async getPlanById(id: string): Promise<PlanWithCount> {
        try {
            const plan = await prisma.plan.findUnique({
                where: { id }
            });

            if (!plan) {
                throw new ApiError('Plan no encontrado', 404);
            }

            // Obtener el conteo de suscripciones
            const subscriptionCount = await prisma.subscription.count({
                where: {
                    planId: id,
                    status: 'ACTIVE'
                }
            });

            return {
                ...plan,
                _count: {
                    subscriptions: subscriptionCount
                }
            };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al obtener plan por ID:', error);
            throw new ApiError('Error al obtener el plan', 500);
        }
    }

    // Crear un nuevo plan
    async createPlan(planData: {
        name: string;
        description?: string;
        priceMonthly: number;
        priceYearly: number;
        durationMonths: number;
        maxEmployees: number;
        maxTimeEntriesPerMonth: number;
        features: any;
    }): Promise<Plan> {
        try {
            // Validar que el nombre del plan no exista
            const existingPlan = await prisma.plan.findUnique({
                where: { name: planData.name }
            });

            if (existingPlan) {
                throw new ApiError('Ya existe un plan con ese nombre', 409);
            }

            // Validar precios
            if (planData.priceMonthly <= 0 || planData.priceYearly <= 0) {
                throw new ApiError('Los precios deben ser mayores que cero', 400);
            }

            // Validar duración
            if (planData.durationMonths <= 0) {
                throw new ApiError('La duración debe ser mayor que cero', 400);
            }

            // Validar límites
            if (planData.maxEmployees <= 0 || planData.maxTimeEntriesPerMonth <= 0) {
                throw new ApiError('Los límites deben ser mayores que cero', 400);
            }

            // Validar que el precio anual sea razonable (debe ser menor que 12 veces el mensual)
            if (planData.priceYearly >= planData.priceMonthly * 12) {
                throw new ApiError('El precio anual debe ser menor que 12 veces el precio mensual', 400);
            }

            const newPlan = await prisma.plan.create({
                data: {
                    ...planData,
                    features: planData.features || {}
                }
            });

            return newPlan;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al crear plan:', error);
            throw new ApiError('Error al crear el plan', 500);
        }
    }

    // Actualizar un plan
    async updatePlan(id: string, planData: {
        name?: string;
        description?: string;
        priceMonthly?: number;
        priceYearly?: number;
        durationMonths?: number;
        maxEmployees?: number;
        maxTimeEntriesPerMonth?: number;
        features?: any;
        active?: boolean;
    }): Promise<Plan> {
        try {
            // Verificar que el plan existe
            const existingPlan = await prisma.plan.findUnique({
                where: { id }
            });

            if (!existingPlan) {
                throw new ApiError('Plan no encontrado', 404);
            }

            // Si se va a actualizar el nombre, verificar que no exista otro plan con ese nombre
            if (planData.name && planData.name !== existingPlan.name) {
                const planWithName = await prisma.plan.findUnique({
                    where: { name: planData.name }
                });

                if (planWithName) {
                    throw new ApiError('Ya existe un plan con ese nombre', 409);
                }
            }

            // Validar precios si se proporcionan
            if (planData.priceMonthly !== undefined && planData.priceMonthly <= 0) {
                throw new ApiError('El precio mensual debe ser mayor que cero', 400);
            }

            if (planData.priceYearly !== undefined && planData.priceYearly <= 0) {
                throw new ApiError('El precio anual debe ser mayor que cero', 400);
            }

            // Validar precios si se proporcionan ambos
            if (planData.priceMonthly !== undefined && planData.priceYearly !== undefined) {
                if (planData.priceYearly >= planData.priceMonthly * 12) {
                    throw new ApiError('El precio anual debe ser menor que 12 veces el precio mensual', 400);
                }
            }

            // Validar límites si se proporcionan
            if (planData.maxEmployees !== undefined && planData.maxEmployees <= 0) {
                throw new ApiError('El límite de empleados debe ser mayor que cero', 400);
            }

            if (planData.maxTimeEntriesPerMonth !== undefined && planData.maxTimeEntriesPerMonth <= 0) {
                throw new ApiError('El límite de fichajes mensuales debe ser mayor que cero', 400);
            }

            // Validar duración si se proporciona
            if (planData.durationMonths !== undefined && planData.durationMonths <= 0) {
                throw new ApiError('La duración debe ser mayor que cero', 400);
            }

            const updatedPlan = await prisma.plan.update({
                where: { id },
                data: {
                    ...planData,
                    updatedAt: new Date()
                }
            });

            return updatedPlan;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al actualizar plan:', error);
            throw new ApiError('Error al actualizar el plan', 500);
        }
    }

    // Eliminar un plan (baja lógica)
    async deletePlan(id: string): Promise<void> {
        try {
            // Verificar que el plan existe
            const existingPlan = await prisma.plan.findUnique({
                where: { id }
            });

            if (!existingPlan) {
                throw new ApiError('Plan no encontrado', 404);
            }

            // Verificar que no haya empresas suscritas a este plan
            const activeSubscriptions = await prisma.subscription.findMany({
                where: {
                    planId: id,
                    status: 'ACTIVE'
                }
            });

            if (activeSubscriptions.length > 0) {
                throw new ApiError('No se puede eliminar un plan con suscripciones activas', 400);
            }

            // Baja lógica: desactivar el plan
            await prisma.plan.update({
                where: { id },
                data: {
                    active: false,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al eliminar plan:', error);
            throw new ApiError('Error al eliminar el plan', 500);
        }
    }

    // Activar un plan
    async activatePlan(id: string): Promise<Plan> {
        try {
            const plan = await prisma.plan.findUnique({
                where: { id }
            });

            if (!plan) {
                throw new ApiError('Plan no encontrado', 404);
            }

            const updatedPlan = await prisma.plan.update({
                where: { id },
                data: {
                    active: true,
                    updatedAt: new Date()
                }
            });

            return updatedPlan;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al activar plan:', error);
            throw new ApiError('Error al activar el plan', 500);
        }
    }

    // Desactivar un plan
    async deactivatePlan(id: string): Promise<Plan> {
        try {
            const plan = await prisma.plan.findUnique({
                where: { id }
            });

            if (!plan) {
                throw new ApiError('Plan no encontrado', 404);
            }

            // Verificar que no haya empresas suscritas a este plan
            const activeSubscriptions = await prisma.subscription.findMany({
                where: {
                    planId: id,
                    status: 'ACTIVE'
                }
            });

            if (activeSubscriptions.length > 0) {
                throw new ApiError('No se puede desactivar un plan con suscripciones activas', 400);
            }

            const updatedPlan = await prisma.plan.update({
                where: { id },
                data: {
                    active: false,
                    updatedAt: new Date()
                }
            });

            return updatedPlan;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al desactivar plan:', error);
            throw new ApiError('Error al desactivar el plan', 500);
        }
    }

    // Obtener estadísticas de planes
    async getPlansStats(): Promise<{
        totalPlans: number;
        activePlans: number;
        inactivePlans: number;
        plansByPriceRange: {
            basic: number;
            pro: number;
            premium: number;
            enterprise: number;
        };
    }> {
        try {
            const [totalPlans, activePlans, inactivePlans] = await Promise.all([
                prisma.plan.count(),
                prisma.plan.count({ where: { active: true } }),
                prisma.plan.count({ where: { active: false } })
            ]);

            // Clasificar planes por rango de precios
            const allPlans = await prisma.plan.findMany({
                select: { priceMonthly: true }
            });

            const plansByPriceRange = {
                basic: allPlans.filter(p => p.priceMonthly <= 10).length,
                pro: allPlans.filter(p => p.priceMonthly > 10 && p.priceMonthly <= 30).length,
                premium: allPlans.filter(p => p.priceMonthly > 30 && p.priceMonthly <= 100).length,
                enterprise: allPlans.filter(p => p.priceMonthly > 100).length
            };

            return {
                totalPlans,
                activePlans,
                inactivePlans,
                plansByPriceRange
            };
        } catch (error) {
            console.error('Error al obtener estadísticas de planes:', error);
            throw new ApiError('Error al obtener estadísticas de planes', 500);
        }
    }

    // Obtener planes activos para selección
    async getActivePlansForSelection(): Promise<Plan[]> {
        try {
            const plans = await prisma.plan.findMany({
                where: { active: true },
                orderBy: {
                    priceMonthly: 'asc'
                }
            });

            return plans;
        } catch (error) {
            console.error('Error al obtener planes activos para selección:', error);
            throw new ApiError('Error al obtener planes activos', 500);
        }
    }
}