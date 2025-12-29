import { Router } from 'express';
import { AbsenceController } from './absence.controller';
import { authenticateToken } from '../../middlewares/authMiddleware';
import { validateRequest, validateQuery, validateParams } from '../../middlewares/validationMiddleware';
import { checkSubscriptionStatus, checkPlanFeature } from '../../middlewares/subscriptionMiddleware';
import {
    CreateAbsenceSchema,
    UpdateAbsenceSchema,
    CreateAbsenceRequestSchema,
    UpdateAbsenceRequestSchema,
    AbsenceFiltersSchema,
    CreateVacationPolicySchema,
    UpdateVacationPolicySchema,
    CreateAbsenceCommentSchema,
    CreateCompanyHolidaySchema,
    UpdateCompanyHolidaySchema,
    UpdateVacationBalanceSchema,
    ApproveAbsenceSchema,
    RejectAbsenceSchema,
    ApproveRejectAbsenceSchema,
    VacationBalanceFiltersSchema,
    HolidayFiltersSchema
} from './absence.validation';
import { z } from 'zod';

const router = Router();
const absenceController = new AbsenceController();

// ==================== AUSENCIAS ====================

// Obtener ausencias con filtros
router.get(
    '/',
    authenticateToken,
    checkSubscriptionStatus,
    validateQuery(AbsenceFiltersSchema),
    (req, res) => absenceController.getAbsences(req, res)
);

// Crear una nueva ausencia
router.post(
    '/',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateRequest(CreateAbsenceSchema),
    (req, res) => absenceController.createAbsence(req, res)
);

// Actualizar una ausencia
router.put(
    '/:id',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    validateRequest(UpdateAbsenceSchema),
    (req, res) => absenceController.updateAbsence(req, res)
);

// Eliminar una ausencia
router.delete(
    '/:id',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    (req, res) => absenceController.deleteAbsence(req, res)
);

// Aprobar una ausencia
router.post(
    '/:id/approve',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    validateRequest(ApproveAbsenceSchema),
    (req, res) => absenceController.approveAbsence(req, res)
);

// Rechazar una ausencia
router.post(
    '/:id/reject',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    validateRequest(RejectAbsenceSchema),
    (req, res) => absenceController.rejectAbsence(req, res)
);

// ==================== SOLICITUDES DE AUSENCIA ====================

// Obtener solicitudes de ausencia
router.get(
    '/requests',
    authenticateToken,
    checkSubscriptionStatus,
    validateQuery(AbsenceFiltersSchema),
    (req, res) => absenceController.getAbsenceRequests(req, res)
);

// Crear una solicitud de ausencia
router.post(
    '/requests',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateRequest(CreateAbsenceRequestSchema),
    (req, res) => absenceController.createAbsenceRequest(req, res)
);

// Actualizar una solicitud de ausencia
router.put(
    '/requests/:id',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    validateRequest(UpdateAbsenceRequestSchema),
    (req, res) => absenceController.updateAbsenceRequest(req, res)
);

// Aprobar una solicitud de ausencia
router.post(
    '/requests/:id/approve',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    validateRequest(ApproveRejectAbsenceSchema),
    (req, res) => absenceController.approveAbsenceRequest(req, res)
);

// Rechazar una solicitud de ausencia
router.post(
    '/requests/:id/reject',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    validateRequest(ApproveRejectAbsenceSchema),
    (req, res) => absenceController.rejectAbsenceRequest(req, res)
);

// ==================== POLÍTICAS DE VACACIONES ====================

// Obtener políticas de vacaciones
router.get(
    '/policies',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    (req, res) => absenceController.getVacationPolicies(req, res)
);

// Crear una política de vacaciones
router.post(
    '/policies',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateRequest(CreateVacationPolicySchema),
    (req, res) => absenceController.createVacationPolicy(req, res)
);

// Actualizar una política de vacaciones
router.put(
    '/policies/:id',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    validateRequest(UpdateVacationPolicySchema),
    (req, res) => absenceController.updateVacationPolicy(req, res)
);

// Eliminar una política de vacaciones
router.delete(
    '/policies/:id',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    (req, res) => absenceController.deleteVacationPolicy(req, res)
);

// ==================== BALANCE DE VACACIONES ====================

// Obtener balance de vacaciones de un empleado
router.get(
    '/balance/:employeeId',
    authenticateToken,
    checkSubscriptionStatus,
    validateParams(z.object({ employeeId: z.string().min(1, 'ID de empleado inválido') })),
    validateQuery(VacationBalanceFiltersSchema),
    (req, res) => absenceController.getVacationBalance(req, res)
);

// Actualizar balance de vacaciones de un empleado
router.put(
    '/balance/:employeeId',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ employeeId: z.string().min(1, 'ID de empleado inválido') })),
    validateRequest(UpdateVacationBalanceSchema),
    (req, res) => absenceController.updateVacationBalance(req, res)
);

// Inicializar balance de vacaciones para un empleado
router.post(
    '/balance/:employeeId/initialize',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ employeeId: z.string().min(1, 'ID de empleado inválido') })),
    validateRequest(z.object({
        policyId: z.string().uuid(),
        year: z.number().int().min(2000).max(2100)
    })),
    (req, res) => absenceController.initializeVacationBalance(req, res)
);

// ==================== COMENTARIOS DE AUSENCIA ====================

// Agregar un comentario a una ausencia
router.post(
    '/:id/comments',
    authenticateToken,
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    validateRequest(CreateAbsenceCommentSchema),
    (req, res) => absenceController.addAbsenceComment(req, res)
);

// Obtener comentarios de una ausencia
router.get(
    '/:id/comments',
    authenticateToken,
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    (req, res) => absenceController.getAbsenceComments(req, res)
);

// ==================== FESTIVOS DE LA EMPRESA ====================

// Obtener festivos de la empresa
router.get(
    '/holidays',
    authenticateToken,
    checkSubscriptionStatus,
    validateQuery(HolidayFiltersSchema),
    (req, res) => absenceController.getCompanyHolidays(req, res)
);

// Crear un festivo de la empresa
router.post(
    '/holidays',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateRequest(CreateCompanyHolidaySchema),
    (req, res) => absenceController.createCompanyHoliday(req, res)
);

// Actualizar un festivo de la empresa
router.put(
    '/holidays/:id',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    validateRequest(UpdateCompanyHolidaySchema),
    (req, res) => absenceController.updateCompanyHoliday(req, res)
);

// Eliminar un festivo de la empresa
router.delete(
    '/holidays/:id',
    authenticateToken,
    checkSubscriptionStatus,
    checkPlanFeature('absenceManagement'),
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    (req, res) => absenceController.deleteCompanyHoliday(req, res)
);

// ==================== ESTADÍSTICAS ====================

// Obtener estadísticas de ausencias
router.get(
    '/stats',
    authenticateToken,
    validateQuery(AbsenceFiltersSchema),
    (req, res) => absenceController.getAbsenceStats(req, res)
);

// Obtener una ausencia por ID (después de las rutas específicas)
router.get(
    '/:id',
    authenticateToken,
    validateParams(z.object({ id: z.string().min(1, 'ID inválido') })),
    (req, res) => absenceController.getAbsenceById(req, res)
);

export default router;