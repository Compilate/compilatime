import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import ScheduleController from './schedule.controller';
import { authenticateToken, requireCompanyUser } from '../../middlewares/authMiddleware';
import { checkSubscriptionStatus, checkPlanFeature } from '../../middlewares/subscriptionMiddleware';

const router = Router();

// Rate limiting para operaciones sensibles
const sensitiveLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 15, // máximo 15 intentos por minuto
    message: {
        success: false,
        message: 'Demasiados intentos. Por favor, espere un momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para creación de horarios
const createLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 30, // máximo 30 horarios creados por 15 minutos
    message: {
        success: false,
        message: 'Demasiados intentos de creación. Por favor, espere un momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rutas protegidas - requieren autenticación de empresa
router.use(authenticateToken);
router.use(requireCompanyUser);
router.use(checkSubscriptionStatus);

// Gestión de horarios
router.post('/', createLimit, checkPlanFeature('scheduleManagement'), ScheduleController.createSchedule);
router.get('/', ScheduleController.getSchedules);
router.get('/weekly', ScheduleController.getWeeklySchedule);
router.get('/:id', ScheduleController.getSchedule);
router.put('/:id', checkPlanFeature('scheduleManagement'), ScheduleController.updateSchedule);
router.delete('/:id', checkPlanFeature('scheduleManagement'), ScheduleController.deleteSchedule);

// Gestión por día de la semana
router.get('/day/:dayOfWeek', ScheduleController.getSchedulesByDay);

// Gestión de asignaciones a empleados
router.post('/:id/assign', sensitiveLimit, ScheduleController.assignToEmployees);
router.delete('/:scheduleId/employees/:employeeId', sensitiveLimit, ScheduleController.removeAssignment);
router.get('/employees/:employeeId', ScheduleController.getEmployeeSchedules);

// Validación de conflictos
router.post('/validate-conflict', sensitiveLimit, ScheduleController.validateConflict);

export default router;