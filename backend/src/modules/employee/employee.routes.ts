import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import EmployeeController from './employee.controller';
import { authenticateToken, requireCompanyUser, requireEmployee } from '../../middlewares/authMiddleware';
import { checkSubscriptionStatus, checkSubscriptionLimits } from '../../middlewares/subscriptionMiddleware';
import { companyCodeMiddleware, requireCompanyCode } from '../../middlewares/companyCodeMiddleware';

const router = Router();

// Rate limiting para operaciones sensibles
const sensitiveLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // máximo 10 intentos por minuto
    message: {
        success: false,
        message: 'Demasiados intentos. Por favor, espere un momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para creación de empleados
const createLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // máximo 20 empleados creados por 15 minutos
    message: {
        success: false,
        message: 'Demasiados intentos de creación. Por favor, espere un momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rutas públicas
router.post('/verify-pin', sensitiveLimit, EmployeeController.verifyPin);

// Rutas para empleados (autenticación de empleado) - deben ir antes que las rutas de empresa
router.use('/me', authenticateToken, requireEmployee);
router.get('/me/daily-schedule/:date', EmployeeController.getMyDailySchedule);
router.get('/me/weekly-schedule/:startDate', EmployeeController.getMyWeeklySchedule);
router.get('/me/time-entries', EmployeeController.getMyTimeEntries);
router.put('/me/password', sensitiveLimit, EmployeeController.changePassword);

// Rutas protegidas - requieren autenticación de empresa
router.use(authenticateToken);
router.use(requireCompanyUser);
router.use(checkSubscriptionStatus);

// Gestión de empleados
router.post('/', createLimit, checkSubscriptionLimits('employees'), EmployeeController.createEmployee);
router.get('/', EmployeeController.getEmployees);
router.get('/:id', EmployeeController.getEmployee);
router.put('/:id', EmployeeController.updateEmployee);
router.delete('/:id', checkSubscriptionLimits('employees'), EmployeeController.deleteEmployee);

// Gestión de horarios de empleados
router.get('/:id/schedules', EmployeeController.getEmployeeSchedules);
router.post('/:id/schedules', EmployeeController.assignSchedules);
router.post('/:id/assign-schedule', EmployeeController.assignSchedule);

// Gestión de asignaciones de horarios individuales
router.delete('/employee-schedules/:id', EmployeeController.removeEmployeeSchedule);

// Horarios diarios y semanales
router.get('/:id/daily-schedule/:date', EmployeeController.getDailySchedule);
router.get('/:id/weekly-schedule/:startDate', EmployeeController.getWeeklySchedule);

// Gestión de PIN y contraseñas
router.post('/reset-pin', sensitiveLimit, EmployeeController.resetPin);

// Estadísticas
router.get('/stats/overview', EmployeeController.getEmployeeStats);

// Rutas para empleados con código de empresa en la URL
// Estas rutas permiten que un empleado pueda acceder a sus datos
// en diferentes empresas usando el código de empresa en la URL
const companyRouter = Router();

// Middleware para extraer el código de empresa de la URL
companyRouter.use(companyCodeMiddleware);

// Rutas para empleados con código de empresa en la URL
// Estas rutas requieren autenticación de empleado
companyRouter.use(authenticateToken);
companyRouter.use(requireEmployee);
companyRouter.use(requireCompanyCode);

// Rutas para información del empleado autenticado
companyRouter.get('/me/daily-schedule/:date', EmployeeController.getMyDailySchedule);
companyRouter.get('/me/weekly-schedule/:startDate', EmployeeController.getMyWeeklySchedule);
companyRouter.get('/me/time-entries', EmployeeController.getMyTimeEntries);
companyRouter.put('/me/password', sensitiveLimit, EmployeeController.changePassword);

// Rutas para fichaje
companyRouter.post('/punch', EmployeeController.punchTime);
companyRouter.get('/last-punch', EmployeeController.getLastPunch);
companyRouter.get('/can-punch', EmployeeController.canPunch);

export default router;
export { companyRouter };