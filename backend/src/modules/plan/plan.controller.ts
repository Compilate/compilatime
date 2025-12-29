import { Request, Response } from 'express';
import { PlanService } from './plan.service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const planService = new PlanService();

// Esquemas de validación con Zod
const createPlanSchema = z.object({
    name: z.string().min(1, 'El nombre del plan es requerido'),
    description: z.string().optional(),
    priceMonthly: z.number().positive('El precio mensual debe ser mayor que cero'),
    priceYearly: z.number().positive('El precio anual debe ser mayor que cero'),
    durationMonths: z.number().positive('La duración debe ser mayor que cero'),
    maxEmployees: z.number().positive('El número máximo de empleados debe ser mayor que cero'),
    maxTimeEntriesPerMonth: z.number().positive('El número máximo de fichajes mensuales debe ser mayor que cero'),
    features: z.any().optional().nullable()
});

const updatePlanSchema = z.object({
    name: z.string().min(1, 'El nombre del plan es requerido').optional(),
    description: z.string().optional(),
    priceMonthly: z.number().positive('El precio mensual debe ser mayor que cero').optional(),
    priceYearly: z.number().positive('El precio anual debe ser mayor que cero').optional(),
    durationMonths: z.number().positive('La duración debe ser mayor que cero').optional(),
    maxEmployees: z.number().positive('El número máximo de empleados debe ser mayor que cero').optional(),
    maxTimeEntriesPerMonth: z.number().positive('El número máximo de fichajes mensuales debe ser mayor que cero').optional(),
    features: z.any().optional(),
    active: z.boolean().optional()
});

export class PlanController {
    // Obtener todos los planes
    getAllPlans = asyncHandler(async (_req: Request, res: Response) => {
        const plans = await planService.getAllPlans();

        ApiResponse.success(res, plans, 'Planes obtenidos correctamente');
    });

    // Obtener un plan por ID
    getPlanById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const plan = await planService.getPlanById(id);

        ApiResponse.success(res, plan, 'Plan obtenido correctamente');
    });

    // Crear un nuevo plan
    createPlan = asyncHandler(async (req: Request, res: Response) => {
        const planData = createPlanSchema.parse(req.body);

        const newPlan = await planService.createPlan({
            ...planData,
            features: planData.features || {}
        });

        ApiResponse.success(res, newPlan, 'Plan creado correctamente', 201);
    });

    // Actualizar un plan
    updatePlan = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const planData = updatePlanSchema.parse(req.body);

        const updatedPlan = await planService.updatePlan(id, planData);

        ApiResponse.success(res, updatedPlan, 'Plan actualizado correctamente');
    });

    // Eliminar un plan (baja lógica)
    deletePlan = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        await planService.deletePlan(id);

        ApiResponse.success(res, null, 'Plan eliminado correctamente');
    });

    // Activar un plan
    activatePlan = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const activatedPlan = await planService.activatePlan(id);

        ApiResponse.success(res, activatedPlan, 'Plan activado correctamente');
    });

    // Desactivar un plan
    deactivatePlan = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const deactivatedPlan = await planService.deactivatePlan(id);

        ApiResponse.success(res, deactivatedPlan, 'Plan desactivado correctamente');
    });

    // Obtener estadísticas de planes
    getPlansStats = asyncHandler(async (_req: Request, res: Response) => {
        const stats = await planService.getPlansStats();

        ApiResponse.success(res, stats, 'Estadísticas de planes obtenidas correctamente');
    });

    // Obtener planes activos para selección
    getActivePlansForSelection = asyncHandler(async (_req: Request, res: Response) => {
        const plans = await planService.getActivePlansForSelection();

        ApiResponse.success(res, plans, 'Planes activos obtenidos correctamente');
    });
}