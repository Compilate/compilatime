import { PrismaClient, Payment, PaymentStatus, PaymentMethod } from '@prisma/client';
import { ApiError } from '../../utils/apiError';

const prisma = new PrismaClient();

export class PaymentService {
    // Obtener todos los pagos
    async getAllPayments(): Promise<Payment[]> {
        try {
            const payments = await prisma.payment.findMany({
                include: {
                    subscription: {
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
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return payments;
        } catch (error) {
            console.error('Error al obtener pagos:', error);
            throw new ApiError('Error al obtener los pagos', 500);
        }
    }

    // Obtener un pago por ID
    async getPaymentById(id: string): Promise<Payment> {
        try {
            const payment = await prisma.payment.findUnique({
                where: { id },
                include: {
                    subscription: {
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
                                    features: true
                                }
                            }
                        }
                    }
                }
            });

            if (!payment) {
                throw new ApiError('Pago no encontrado', 404);
            }

            return payment;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al obtener pago por ID:', error);
            throw new ApiError('Error al obtener el pago', 500);
        }
    }

    // Obtener pagos por suscripción
    async getPaymentsBySubscription(subscriptionId: string): Promise<Payment[]> {
        try {
            const payments = await prisma.payment.findMany({
                where: { subscriptionId },
                include: {
                    subscription: {
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
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return payments;
        } catch (error) {
            console.error('Error al obtener pagos por suscripción:', error);
            throw new ApiError('Error al obtener los pagos de la suscripción', 500);
        }
    }

    // Crear un nuevo pago
    async createPayment(paymentData: {
        subscriptionId: string;
        amount: number;
        currency?: string;
        status?: PaymentStatus;
        method?: PaymentMethod;
        stripePaymentId?: string;
        invoiceUrl?: string;
        failureReason?: string;
    }): Promise<Payment> {
        try {
            // Validar que la suscripción exista
            const subscription = await prisma.subscription.findUnique({
                where: { id: paymentData.subscriptionId }
            });

            if (!subscription) {
                throw new ApiError('Suscripción no encontrada', 404);
            }

            // Validar que el monto sea positivo
            if (paymentData.amount <= 0) {
                throw new ApiError('El monto del pago debe ser mayor que cero', 400);
            }

            const newPayment = await prisma.payment.create({
                data: {
                    subscriptionId: paymentData.subscriptionId,
                    amount: paymentData.amount,
                    currency: paymentData.currency ?? 'EUR',
                    status: paymentData.status ?? PaymentStatus.PENDING,
                    method: paymentData.method ?? PaymentMethod.STRIPE,
                    stripePaymentId: paymentData.stripePaymentId,
                    invoiceUrl: paymentData.invoiceUrl,
                    failureReason: paymentData.failureReason,
                    paidAt: paymentData.status === PaymentStatus.PAID ? new Date() : null
                },
                include: {
                    subscription: {
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
                                    features: true
                                }
                            }
                        }
                    }
                }
            });

            return newPayment;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al crear pago:', error);
            throw new ApiError('Error al crear el pago', 500);
        }
    }

    // Actualizar un pago
    async updatePayment(id: string, paymentData: {
        amount?: number;
        currency?: string;
        status?: PaymentStatus;
        method?: PaymentMethod;
        stripePaymentId?: string;
        invoiceUrl?: string;
        failureReason?: string;
        paidAt?: Date;
    }): Promise<Payment> {
        try {
            // Verificar que el pago exista
            const existingPayment = await prisma.payment.findUnique({
                where: { id }
            });

            if (!existingPayment) {
                throw new ApiError('Pago no encontrado', 404);
            }

            // Validar que el monto sea positivo si se proporciona
            if (paymentData.amount !== undefined && paymentData.amount <= 0) {
                throw new ApiError('El monto del pago debe ser mayor que cero', 400);
            }

            // Si se cambia el estado a PAID, establecer paidAt
            const updateData: any = { ...paymentData };
            if (paymentData.status === PaymentStatus.PAID && !existingPayment.paidAt) {
                updateData.paidAt = new Date();
            } else if (paymentData.status !== PaymentStatus.PAID) {
                updateData.paidAt = null;
            }

            const updatedPayment = await prisma.payment.update({
                where: { id },
                data: updateData,
                include: {
                    subscription: {
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
                                    features: true
                                }
                            }
                        }
                    }
                }
            });

            return updatedPayment;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al actualizar pago:', error);
            throw new ApiError('Error al actualizar el pago', 500);
        }
    }

    // Confirmar un pago (marcar como pagado)
    async confirmPayment(id: string, stripePaymentId?: string): Promise<Payment> {
        try {
            const payment = await prisma.payment.findUnique({
                where: { id }
            });

            if (!payment) {
                throw new ApiError('Pago no encontrado', 404);
            }

            if (payment.status === PaymentStatus.PAID) {
                throw new ApiError('El pago ya está confirmado', 400);
            }

            const updatedPayment = await prisma.payment.update({
                where: { id },
                data: {
                    status: PaymentStatus.PAID,
                    paidAt: new Date(),
                    stripePaymentId: stripePaymentId || payment.stripePaymentId,
                    failureReason: null
                },
                include: {
                    subscription: {
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
                                    features: true
                                }
                            }
                        }
                    }
                }
            });

            return updatedPayment;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al confirmar pago:', error);
            throw new ApiError('Error al confirmar el pago', 500);
        }
    }

    // Marcar un pago como fallido
    async failPayment(id: string, failureReason: string): Promise<Payment> {
        try {
            const payment = await prisma.payment.findUnique({
                where: { id }
            });

            if (!payment) {
                throw new ApiError('Pago no encontrado', 404);
            }

            if (payment.status === PaymentStatus.PAID) {
                throw new ApiError('No se puede marcar como fallido un pago ya confirmado', 400);
            }

            const updatedPayment = await prisma.payment.update({
                where: { id },
                data: {
                    status: PaymentStatus.FAILED,
                    failureReason,
                    paidAt: null
                },
                include: {
                    subscription: {
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
                                    features: true
                                }
                            }
                        }
                    }
                }
            });

            return updatedPayment;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al marcar pago como fallido:', error);
            throw new ApiError('Error al marcar el pago como fallido', 500);
        }
    }

    // Eliminar un pago
    async deletePayment(id: string): Promise<void> {
        try {
            const payment = await prisma.payment.findUnique({
                where: { id }
            });

            if (!payment) {
                throw new ApiError('Pago no encontrado', 404);
            }

            if (payment.status === PaymentStatus.PAID) {
                throw new ApiError('No se puede eliminar un pago ya confirmado', 400);
            }

            await prisma.payment.delete({
                where: { id }
            });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al eliminar pago:', error);
            throw new ApiError('Error al eliminar el pago', 500);
        }
    }

    // Obtener pagos pendientes
    async getPendingPayments(): Promise<Payment[]> {
        try {
            const payments = await prisma.payment.findMany({
                where: {
                    status: PaymentStatus.PENDING
                },
                include: {
                    subscription: {
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
                        }
                    }
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            return payments;
        } catch (error) {
            console.error('Error al obtener pagos pendientes:', error);
            throw new ApiError('Error al obtener los pagos pendientes', 500);
        }
    }

    // Obtener pagos fallidos
    async getFailedPayments(): Promise<Payment[]> {
        try {
            const payments = await prisma.payment.findMany({
                where: {
                    status: PaymentStatus.FAILED
                },
                include: {
                    subscription: {
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
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return payments;
        } catch (error) {
            console.error('Error al obtener pagos fallidos:', error);
            throw new ApiError('Error al obtener los pagos fallidos', 500);
        }
    }

    // Obtener estadísticas de pagos
    async getPaymentStats(): Promise<{
        total: number;
        paid: number;
        pending: number;
        failed: number;
        totalRevenue: number;
        monthlyRevenue: number;
        pendingRevenue: number;
        averagePaymentAmount: number;
    }> {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const [
                total,
                paid,
                pending,
                failed,
                paidPayments,
                pendingPayments
            ] = await Promise.all([
                prisma.payment.count(),
                prisma.payment.count({ where: { status: PaymentStatus.PAID } }),
                prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
                prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
                prisma.payment.findMany({
                    where: { status: PaymentStatus.PAID },
                    select: { amount: true }
                }),
                prisma.payment.findMany({
                    where: { status: PaymentStatus.PENDING },
                    select: { amount: true }
                })
            ]);

            // Calcular ingresos totales
            const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);

            // Calcular ingresos mensuales
            const monthlyRevenue = await prisma.payment.aggregate({
                where: {
                    status: PaymentStatus.PAID,
                    paidAt: {
                        gte: startOfMonth,
                        lt: endOfMonth
                    }
                },
                _sum: {
                    amount: true
                }
            });

            // Calcular ingresos pendientes
            const pendingRevenue = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);

            // Calcular monto promedio
            const averagePaymentAmount = paid > 0 ? totalRevenue / paid : 0;

            return {
                total,
                paid,
                pending,
                failed,
                totalRevenue,
                monthlyRevenue: monthlyRevenue._sum.amount || 0,
                pendingRevenue,
                averagePaymentAmount
            };
        } catch (error) {
            console.error('Error al obtener estadísticas de pagos:', error);
            throw new ApiError('Error al obtener las estadísticas de pagos', 500);
        }
    }
}