import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import TimeEntryController from './timeEntry.controller';
import { authenticateToken, requireCompanyUser, requireEmployee } from '../../middlewares/authMiddleware';
import { checkSubscriptionStatus, checkSubscriptionLimits } from '../../middlewares/subscriptionMiddleware';

const router = Router();

// Rate limiting para operaciones sensibles
const sensitiveLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 30, // máximo 30 intentos por minuto
    message: {
        success: false,
        message: 'Demasiados intentos. Por favor, espere un momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para creación de registros
const createLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 50, // máximo 50 registros creados por minuto
    message: {
        success: false,
        message: 'Demasiados intentos de creación. Por favor, espere un momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para operaciones masivas
const bulkLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 5, // máximo 5 operaciones masivas por 5 minutos
    message: {
        success: false,
        message: 'Demasiadas operaciones masivas. Por favor, espere un momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rutas públicas (fichaje rápido)
router.post('/punch', sensitiveLimit, TimeEntryController.punchTime);

// Rutas protegidas - requieren autenticación de empresa
router.use(authenticateToken);
router.use(requireCompanyUser);
router.use(checkSubscriptionStatus);

// Gestión de registros de tiempo
router.post('/', createLimit, checkSubscriptionLimits('timeEntries'), TimeEntryController.createTimeEntry);
router.get('/', TimeEntryController.getTimeEntries);
router.get('/:id', TimeEntryController.getTimeEntry);
router.put('/:id', TimeEntryController.updateTimeEntry);
router.delete('/:id', TimeEntryController.deleteTimeEntry);
router.post('/continue-break', createLimit, checkSubscriptionLimits('timeEntries'), TimeEntryController.continueBreak);

// Operaciones masivas
router.post('/bulk', bulkLimit, checkSubscriptionLimits('timeEntries'), TimeEntryController.bulkCreateTimeEntries);

// Exportación
router.get('/export', TimeEntryController.exportTimeEntries);

// Estadísticas
router.get('/stats', TimeEntryController.getTimeEntryStats);
router.get('/daily/:date', TimeEntryController.getDailySummary);

// Rutas para empleados (autenticación de empleado)
router.use('/me', requireEmployee);
router.get('/me', TimeEntryController.getMyTimeEntries);
router.get('/me/state', TimeEntryController.getCurrentPunchState);

export default router;