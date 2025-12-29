import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticateToken, requireCompanyUser } from '../../middlewares/authMiddleware';

const router = Router();
const dashboardController = new DashboardController();

// GET /api/dashboard/stats - Obtener estadísticas del dashboard
router.get('/stats', authenticateToken, requireCompanyUser, dashboardController.getStats);

// GET /api/dashboard/recent-time-entries - Obtener fichajes recientes
router.get('/recent-time-entries', authenticateToken, requireCompanyUser, dashboardController.getRecentTimeEntries);

export default router;