import { Router } from 'express';
import { weeklyScheduleController } from './weeklySchedule.controller';
import { authenticateToken, requireCompanyUser } from '../../middlewares/authMiddleware';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);
router.use(requireCompanyUser);

// Rutas para asignaciones semanales de empleados
router.get('/employee/:employeeId', weeklyScheduleController.getEmployeeWeeklySchedules.bind(weeklyScheduleController));
router.get('/company', weeklyScheduleController.getCompanyWeeklySchedules.bind(weeklyScheduleController));
router.post('/', weeklyScheduleController.upsertWeeklySchedule.bind(weeklyScheduleController));
router.delete('/:id', weeklyScheduleController.deleteWeeklySchedule.bind(weeklyScheduleController));

// Rutas para copiar y plantillas
router.post('/copy-week', weeklyScheduleController.copyWeekToWeek.bind(weeklyScheduleController));
router.post('/templates', weeklyScheduleController.createWeeklyTemplate.bind(weeklyScheduleController));
router.post('/templates/apply', weeklyScheduleController.applyWeeklyTemplate.bind(weeklyScheduleController));
router.get('/templates', weeklyScheduleController.getWeeklyTemplates.bind(weeklyScheduleController));

// Rutas para estadísticas
router.get('/summary', weeklyScheduleController.getWeeklyHoursSummary.bind(weeklyScheduleController));

// Exportar calendario semanal a CSV
router.get('/export', weeklyScheduleController.exportWeeklySchedule.bind(weeklyScheduleController));

export { router as weeklyScheduleRoutes };