import { Request, Response } from 'express';
import { SubscriptionService } from './subscription.service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';
import { PaymentMethod, SubscriptionStatus } from '@prisma/client';

const subscriptionService = new SubscriptionService();

// Esquemas de validación con Zod
const createSubscriptionSchema = z.object({
    companyId: z.string().min(1, 'El ID de la empresa es requerido'),
    planId: z.string().min(1, 'El ID del plan es requerido'),
    startDate: z.string().transform((val) => new Date(val)),
    endDate: z.string().transform((val) => new Date(val)),
    renewsAutomatically: z.boolean().optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    trialEndsAt: z.string().transform((val) => new Date(val)).optional()
});

const updateSubscriptionSchema = z.object({
    planId: z.string().min(1, 'El ID del plan es requerido').optional(),
    startDate: z.string().transform((val) => new Date(val)).optional(),
    endDate: z.string().transform((val) => new Date(val)).optional(),
    renewsAutomatically: z.boolean().optional(),
    status: z.nativeEnum(SubscriptionStatus).optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    trialEndsAt: z.string().transform((val) => new Date(val)).optional(),
    cancelledAt: z.string().transform((val) => new Date(val)).optional(),
    cancellationReason: z.string().optional()
});

const cancelSubscriptionSchema = z.object({
    cancellationReason: z.string().optional()
});

export class SubscriptionController {
    // Obtener todas las suscripciones
    getAllSubscriptions = asyncHandler(async (_req: Request, res: Response) => {
        const subscriptions = await subscriptionService.getAllSubscriptions();

        ApiResponse.success(res, subscriptions, 'Suscripciones obtenidas correctamente');
    });

    // Obtener una suscripción por ID
    getSubscriptionById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const subscription = await subscriptionService.getSubscriptionById(id);

        ApiResponse.success(res, subscription, 'Suscripción obtenida correctamente');
    });

    // Obtener suscripciones por empresa
    getSubscriptionsByCompany = asyncHandler(async (req: Request, res: Response) => {
        const { companyId } = req.params;

        const subscriptions = await subscriptionService.getSubscriptionsByCompany(companyId);

        ApiResponse.success(res, subscriptions, 'Suscripciones de la empresa obtenidas correctamente');
    });

    // Crear una nueva suscripción
    createSubscription = asyncHandler(async (req: Request, res: Response) => {
        const subscriptionData = createSubscriptionSchema.parse(req.body);

        const newSubscription = await subscriptionService.createSubscription(subscriptionData);

        ApiResponse.success(res, newSubscription, 'Suscripción creada correctamente', 201);
    });

    // Actualizar una suscripción
    updateSubscription = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const subscriptionData = updateSubscriptionSchema.parse(req.body);

        const updatedSubscription = await subscriptionService.updateSubscription(id, subscriptionData);

        ApiResponse.success(res, updatedSubscription, 'Suscripción actualizada correctamente');
    });

    // Cancelar una suscripción
    cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { cancellationReason } = cancelSubscriptionSchema.parse(req.body);

        const cancelledSubscription = await subscriptionService.cancelSubscription(id, cancellationReason);

        ApiResponse.success(res, cancelledSubscription, 'Suscripción cancelada correctamente');
    });

    // Reactivar una suscripción
    reactivateSubscription = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const reactivatedSubscription = await subscriptionService.reactivateSubscription(id);

        ApiResponse.success(res, reactivatedSubscription, 'Suscripción reactivada correctamente');
    });

    // Eliminar una suscripción
    deleteSubscription = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        await subscriptionService.deleteSubscription(id);

        ApiResponse.success(res, null, 'Suscripción eliminada correctamente');
    });

    // Obtener suscripciones que están por expirar
    getExpiringSubscriptions = asyncHandler(async (_req: Request, res: Response) => {
        const expiringSubscriptions = await subscriptionService.getExpiringSubscriptions();

        ApiResponse.success(res, expiringSubscriptions, 'Suscripciones por expirar obtenidas correctamente');
    });

    // Obtener estadísticas de suscripciones
    getSubscriptionStats = asyncHandler(async (_req: Request, res: Response) => {
        const stats = await subscriptionService.getSubscriptionStats();

        ApiResponse.success(res, stats, 'Estadísticas de suscripciones obtenidas correctamente');
    });
}