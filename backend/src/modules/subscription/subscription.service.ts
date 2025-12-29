import { PrismaClient, Subscription, SubscriptionStatus, PaymentMethod } from '@prisma/client';
import { ApiError } from '../../utils/apiError';

const prisma = new PrismaClient();

export class SubscriptionService {
    // Obtener todas las suscripciones
    async getAllSubscriptions(): Promise<Subscription[]> {
        try {
            const subscriptions = await prisma.subscription.findMany({
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            email: true
                        }
                    },
                    plan: {
                        select: {
                            id: true,
                            name: true,
                            priceMonthly: true,
                            priceYearly: true,
                            maxEmployees: true,
                            maxTimeEntriesPerMonth: true
                        }
                    },
                    payments: {
                        select: {
                            id: true,
                            amount: true,
                            status: true,
                            paidAt: true,
                            method: true,
                            createdAt: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return subscriptions;
        } catch (error) {
            console.error('Error al obtener suscripciones:', error);
            throw new ApiError('Error al obtener las suscripciones', 500);
        }
    }

    // Obtener una suscripción por ID
    async getSubscriptionById(id: string): Promise<Subscription> {
        try {
            const subscription = await prisma.subscription.findUnique({
                where: { id },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            email: true
                        }
                    },
                    plan: {
                        select: {
                            id: true,
                            name: true,
                            priceMonthly: true,
                            priceYearly: true,
                            maxEmployees: true,
                            maxTimeEntriesPerMonth: true,
                            features: true
                        }
                    },
                    payments: {
                        select: {
                            id: true,
                            amount: true,
                            status: true,
                            paidAt: true,
                            method: true,
                            createdAt: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            if (!subscription) {
                throw new ApiError('Suscripción no encontrada', 404);
            }

            return subscription;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al obtener suscripción por ID:', error);
            throw new ApiError('Error al obtener la suscripción', 500);
        }
    }

    // Obtener suscripciones por empresa
    async getSubscriptionsByCompany(companyId: string): Promise<Subscription[]> {
        try {
            const subscriptions = await prisma.subscription.findMany({
                where: { companyId },
                include: {
                    plan: {
                        select: {
                            id: true,
                            name: true,
                            priceMonthly: true,
                            priceYearly: true,
                            maxEmployees: true,
                            maxTimeEntriesPerMonth: true,
                            features: true
                        }
                    },
                    payments: {
                        select: {
                            id: true,
                            amount: true,
                            status: true,
                            paidAt: true,
                            method: true,
                            createdAt: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return subscriptions;
        } catch (error) {
            console.error('Error al obtener suscripciones por empresa:', error);
            throw new ApiError('Error al obtener las suscripciones de la empresa', 500);
        }
    }

    // Crear una nueva suscripción
    async createSubscription(subscriptionData: {
        companyId: string;
        planId: string;
        startDate: Date;
        endDate: Date;
        renewsAutomatically?: boolean;
        paymentMethod?: PaymentMethod;
        trialEndsAt?: Date;
    }): Promise<Subscription> {
        try {
            // Validar que la empresa exista
            const company = await prisma.company.findUnique({
                where: { id: subscriptionData.companyId }
            });

            if (!company) {
                throw new ApiError('Empresa no encontrada', 404);
            }

            // Validar que el plan exista y esté activo
            const plan = await prisma.plan.findUnique({
                where: {
                    id: subscriptionData.planId,
                    active: true
                }
            });

            if (!plan) {
                throw new ApiError('Plan no encontrado o inactivo', 404);
            }

            // Verificar si la empresa ya tiene una suscripción activa
            const existingActiveSubscription = await prisma.subscription.findFirst({
                where: {
                    companyId: subscriptionData.companyId,
                    status: SubscriptionStatus.ACTIVE,
                    OR: [
                        {
                            startDate: {
                                lte: subscriptionData.endDate
                            },
                            endDate: {
                                gte: subscriptionData.startDate
                            }
                        }
                    ]
                }
            });

            if (existingActiveSubscription) {
                throw new ApiError('La empresa ya tiene una suscripción activa en este período', 409);
            }

            // Validar fechas
            if (subscriptionData.startDate >= subscriptionData.endDate) {
                throw new ApiError('La fecha de inicio debe ser anterior a la fecha de fin', 400);
            }

            // Calcular el monto según el plan y la duración
            const daysDiff = Math.ceil((subscriptionData.endDate.getTime() - subscriptionData.startDate.getTime()) / (1000 * 60 * 60 * 24));
            const monthsDiff = daysDiff / 30; // Aproximación a meses
            let amount = 0;

            if (monthsDiff >= 12) {
                // Suscripción anual
                amount = plan.priceYearly;
            } else {
                // Suscripción mensual proporcional
                amount = plan.priceMonthly * Math.ceil(monthsDiff);
            }

            // Crear la suscripción
            const newSubscription = await prisma.subscription.create({
                data: {
                    companyId: subscriptionData.companyId,
                    planId: subscriptionData.planId,
                    startDate: subscriptionData.startDate,
                    endDate: subscriptionData.endDate,
                    renewsAutomatically: subscriptionData.renewsAutomatically ?? true,
                    status: SubscriptionStatus.ACTIVE,
                    paymentMethod: subscriptionData.paymentMethod ?? PaymentMethod.STRIPE,
                    trialEndsAt: subscriptionData.trialEndsAt
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            email: true
                        }
                    },
                    plan: {
                        select: {
                            id: true,
                            name: true,
                            priceMonthly: true,
                            priceYearly: true,
                            maxEmployees: true,
                            maxTimeEntriesPerMonth: true,
                            features: true
                        }
                    }
                }
            });

            // Crear el pago inicial
            await prisma.payment.create({
                data: {
                    subscriptionId: newSubscription.id,
                    amount,
                    currency: 'EUR',
                    status: 'PENDING',
                    method: subscriptionData.paymentMethod ?? PaymentMethod.STRIPE,
                    paidAt: new Date()
                }
            });

            return newSubscription;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al crear suscripción:', error);
            throw new ApiError('Error al crear la suscripción', 500);
        }
    }

    // Actualizar una suscripción
    async updateSubscription(id: string, subscriptionData: {
        planId?: string;
        startDate?: Date;
        endDate?: Date;
        renewsAutomatically?: boolean;
        status?: SubscriptionStatus;
        paymentMethod?: PaymentMethod;
        trialEndsAt?: Date;
        cancelledAt?: Date;
        cancellationReason?: string;
    }): Promise<Subscription> {
        try {
            // Verificar que la suscripción exista
            const existingSubscription = await prisma.subscription.findUnique({
                where: { id }
            });

            if (!existingSubscription) {
                throw new ApiError('Suscripción no encontrada', 404);
            }

            // Si se cambia el plan, validar que exista y esté activo
            if (subscriptionData.planId && subscriptionData.planId !== existingSubscription.planId) {
                const plan = await prisma.plan.findUnique({
                    where: {
                        id: subscriptionData.planId,
                        active: true
                    }
                });

                if (!plan) {
                    throw new ApiError('Plan no encontrado o inactivo', 404);
                }
            }

            // Validar fechas si se proporcionan
            if (subscriptionData.startDate && subscriptionData.endDate) {
                if (subscriptionData.startDate >= subscriptionData.endDate) {
                    throw new ApiError('La fecha de inicio debe ser anterior a la fecha de fin', 400);
                }
            }

            // Actualizar la suscripción
            const updatedSubscription = await prisma.subscription.update({
                where: { id },
                data: subscriptionData,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            email: true
                        }
                    },
                    plan: {
                        select: {
                            id: true,
                            name: true,
                            priceMonthly: true,
                            priceYearly: true,
                            maxEmployees: true,
                            maxTimeEntriesPerMonth: true,
                            features: true
                        }
                    },
                    payments: {
                        select: {
                            id: true,
                            amount: true,
                            status: true,
                            paidAt: true,
                            method: true,
                            createdAt: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            return updatedSubscription;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al actualizar suscripción:', error);
            throw new ApiError('Error al actualizar la suscripción', 500);
        }
    }

    // Cancelar una suscripción
    async cancelSubscription(id: string, cancellationReason?: string): Promise<Subscription> {
        try {
            const subscription = await prisma.subscription.findUnique({
                where: { id }
            });

            if (!subscription) {
                throw new ApiError('Suscripción no encontrada', 404);
            }

            if (subscription.status === SubscriptionStatus.CANCELLED) {
                throw new ApiError('La suscripción ya está cancelada', 400);
            }

            const updatedSubscription = await prisma.subscription.update({
                where: { id },
                data: {
                    status: SubscriptionStatus.CANCELLED,
                    cancelledAt: new Date(),
                    cancellationReason,
                    renewsAutomatically: false
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            email: true
                        }
                    },
                    plan: {
                        select: {
                            id: true,
                            name: true,
                            priceMonthly: true,
                            priceYearly: true,
                            maxEmployees: true,
                            maxTimeEntriesPerMonth: true,
                            features: true
                        }
                    }
                }
            });

            return updatedSubscription;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al cancelar suscripción:', error);
            throw new ApiError('Error al cancelar la suscripción', 500);
        }
    }

    // Reactivar una suscripción
    async reactivateSubscription(id: string): Promise<Subscription> {
        try {
            const subscription = await prisma.subscription.findUnique({
                where: { id }
            });

            if (!subscription) {
                throw new ApiError('Suscripción no encontrada', 404);
            }

            if (subscription.status !== SubscriptionStatus.CANCELLED) {
                throw new ApiError('Solo se pueden reactivar suscripciones canceladas', 400);
            }

            // Verificar que la fecha de fin sea futura
            if (subscription.endDate < new Date()) {
                throw new ApiError('No se puede reactivar una suscripción cuya fecha de fin ya pasó', 400);
            }

            const updatedSubscription = await prisma.subscription.update({
                where: { id },
                data: {
                    status: SubscriptionStatus.ACTIVE,
                    cancelledAt: null,
                    cancellationReason: null,
                    renewsAutomatically: true
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            email: true
                        }
                    },
                    plan: {
                        select: {
                            id: true,
                            name: true,
                            priceMonthly: true,
                            priceYearly: true,
                            maxEmployees: true,
                            maxTimeEntriesPerMonth: true,
                            features: true
                        }
                    }
                }
            });

            return updatedSubscription;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al reactivar suscripción:', error);
            throw new ApiError('Error al reactivar la suscripción', 500);
        }
    }

    // Eliminar una suscripción (solo si no tiene pagos asociados)
    async deleteSubscription(id: string): Promise<void> {
        try {
            const subscription = await prisma.subscription.findUnique({
                where: { id },
                include: {
                    payments: true
                }
            });

            if (!subscription) {
                throw new ApiError('Suscripción no encontrada', 404);
            }

            if (subscription.payments.length > 0) {
                throw new ApiError('No se puede eliminar una suscripción con pagos asociados', 400);
            }

            await prisma.subscription.delete({
                where: { id }
            });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al eliminar suscripción:', error);
            throw new ApiError('Error al eliminar la suscripción', 500);
        }
    }

    // Obtener suscripciones que están por expirar (en los próximos 30 días)
    async getExpiringSubscriptions(): Promise<Subscription[]> {
        try {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            const subscriptions = await prisma.subscription.findMany({
                where: {
                    status: SubscriptionStatus.ACTIVE,
                    endDate: {
                        lte: thirtyDaysFromNow,
                        gte: new Date()
                    },
                    renewsAutomatically: false
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            email: true
                        }
                    },
                    plan: {
                        select: {
                            id: true,
                            name: true,
                            priceMonthly: true,
                            priceYearly: true
                        }
                    }
                },
                orderBy: {
                    endDate: 'asc'
                }
            });

            return subscriptions;
        } catch (error) {
            console.error('Error al obtener suscripciones por expirar:', error);
            throw new ApiError('Error al obtener las suscripciones por expirar', 500);
        }
    }

    // Obtener estadísticas de suscripciones
    async getSubscriptionStats(): Promise<{
        total: number;
        active: number;
        cancelled: number;
        expired: number;
        trial: number;
        monthlyRevenue: number;
        yearlyRevenue: number;
        expiringNext30Days: number;
        newThisMonth: number;
    }> {
        try {
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const [
                total,
                active,
                cancelled,
                expired,
                trial,
                expiringNext30Days,
                newThisMonth,
                activeSubscriptions
            ] = await Promise.all([
                prisma.subscription.count(),
                prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
                prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),
                prisma.subscription.count({ where: { status: SubscriptionStatus.EXPIRED } }),
                prisma.subscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
                prisma.subscription.count({
                    where: {
                        status: SubscriptionStatus.ACTIVE,
                        endDate: {
                            lte: thirtyDaysFromNow,
                            gte: now
                        }
                    }
                }),
                prisma.subscription.count({
                    where: {
                        createdAt: {
                            gte: startOfMonth,
                            lte: endOfMonth
                        }
                    }
                }),
                prisma.subscription.findMany({
                    where: { status: SubscriptionStatus.ACTIVE },
                    include: {
                        plan: {
                            select: {
                                priceMonthly: true,
                                priceYearly: true
                            }
                        }
                    }
                })
            ]);

            // Calcular ingresos mensuales y anuales
            let monthlyRevenue = 0;
            let yearlyRevenue = 0;

            activeSubscriptions.forEach(sub => {
                monthlyRevenue += sub.plan.priceMonthly;
                yearlyRevenue += sub.plan.priceYearly;
            });

            return {
                total,
                active,
                cancelled,
                expired,
                trial,
                monthlyRevenue,
                yearlyRevenue,
                expiringNext30Days,
                newThisMonth
            };
        } catch (error) {
            console.error('Error al obtener estadísticas de suscripciones:', error);
            throw new ApiError('Error al obtener las estadísticas de suscripciones', 500);
        }
    }
}