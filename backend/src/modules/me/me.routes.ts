import { Router } from 'express';
import { authenticateToken, requireEmployee } from '../../middlewares/authMiddleware';
import EmployeeController from '../employee/employee.controller';

const router = Router();

// Todas las rutas requieren autenticación de empleado
router.use(authenticateToken);
router.use(requireEmployee);

// Rutas del empleado autenticado
router.get('/time-entries', EmployeeController.getMyTimeEntries);
router.get('/daily-schedule/:date', EmployeeController.getMyDailySchedule);
router.get('/weekly-schedule/:startDate', EmployeeController.getMyWeeklySchedule);
router.put('/password', EmployeeController.changePassword);

export default router;