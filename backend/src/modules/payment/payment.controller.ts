import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

const paymentService = new PaymentService();

// Esquemas de validación con Zod
const createPaymentSchema = z.object({
    subscriptionId: z.string().min(1, 'El ID de la suscripción es requerido'),
    amount: z.number().positive('El monto debe ser mayor que cero'),
    currency: z.string().optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
    method: z.nativeEnum(PaymentMethod).optional(),
    stripePaymentId: z.string().optional(),
    invoiceUrl: z.string().optional(),
    failureReason: z.string().optional()
});

const updatePaymentSchema = z.object({
    amount: z.number().positive('El monto debe ser mayor que cero').optional(),
    currency: z.string().optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
    method: z.nativeEnum(PaymentMethod).optional(),
    stripePaymentId: z.string().optional(),
    invoiceUrl: z.string().optional(),
    failureReason: z.string().optional(),
    paidAt: z.string().transform((val) => new Date(val)).optional()
});

const confirmPaymentSchema = z.object({
    stripePaymentId: z.string().optional()
});

const failPaymentSchema = z.object({
    failureReason: z.string().min(1, 'El motivo del fallo es requerido')
});

export class PaymentController {
    // Obtener todos los pagos
    getAllPayments = asyncHandler(async (_req: Request, res: Response) => {
        const payments = await paymentService.getAllPayments();

        ApiResponse.success(res, payments, 'Pagos obtenidos correctamente');
    });

    // Obtener un pago por ID
    getPaymentById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const payment = await paymentService.getPaymentById(id);

        ApiResponse.success(res, payment, 'Pago obtenido correctamente');
    });

    // Obtener pagos por suscripción
    getPaymentsBySubscription = asyncHandler(async (req: Request, res: Response) => {
        const { subscriptionId } = req.params;

        const payments = await paymentService.getPaymentsBySubscription(subscriptionId);

        ApiResponse.success(res, payments, 'Pagos de la suscripción obtenidos correctamente');
    });

    // Crear un nuevo pago
    createPayment = asyncHandler(async (req: Request, res: Response) => {
        const paymentData = createPaymentSchema.parse(req.body);

        const newPayment = await paymentService.createPayment(paymentData);

        ApiResponse.success(res, newPayment, 'Pago creado correctamente', 201);
    });

    // Actualizar un pago
    updatePayment = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const paymentData = updatePaymentSchema.parse(req.body);

        const updatedPayment = await paymentService.updatePayment(id, paymentData);

        ApiResponse.success(res, updatedPayment, 'Pago actualizado correctamente');
    });

    // Confirmar un pago (marcar como pagado)
    confirmPayment = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { stripePaymentId } = confirmPaymentSchema.parse(req.body);

        const confirmedPayment = await paymentService.confirmPayment(id, stripePaymentId);

        ApiResponse.success(res, confirmedPayment, 'Pago confirmado correctamente');
    });

    // Marcar un pago como fallido
    failPayment = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { failureReason } = failPaymentSchema.parse(req.body);

        const failedPayment = await paymentService.failPayment(id, failureReason);

        ApiResponse.success(res, failedPayment, 'Pago marcado como fallido correctamente');
    });

    // Eliminar un pago
    deletePayment = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        await paymentService.deletePayment(id);

        ApiResponse.success(res, null, 'Pago eliminado correctamente');
    });

    // Obtener pagos pendientes
    getPendingPayments = asyncHandler(async (_req: Request, res: Response) => {
        const pendingPayments = await paymentService.getPendingPayments();

        ApiResponse.success(res, pendingPayments, 'Pagos pendientes obtenidos correctamente');
    });

    // Obtener pagos fallidos
    getFailedPayments = asyncHandler(async (_req: Request, res: Response) => {
        const failedPayments = await paymentService.getFailedPayments();

        ApiResponse.success(res, failedPayments, 'Pagos fallidos obtenidos correctamente');
    });

    // Obtener estadísticas de pagos
    getPaymentStats = asyncHandler(async (_req: Request, res: Response) => {
        const stats = await paymentService.getPaymentStats();

        ApiResponse.success(res, stats, 'Estadísticas de pagos obtenidas correctamente');
    });
}