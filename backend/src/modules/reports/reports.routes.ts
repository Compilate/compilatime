import { Router } from 'express';
import { reportsController } from './reports.controller';
import { authenticateToken, requireRole } from '../../middlewares/authMiddleware';
import { reportLimiter } from '../../middlewares/rateLimit';

const router = Router();

// Todas las rutas de reportes requieren autenticación de empresa
router.use(authenticateToken);
// Permitir acceso a todos los roles de empresa para reportes básicos
router.use(requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR', 'USER']));

// Generar diferentes tipos de reportes
router.get('/hours-worked',
    reportLimiter,
    reportsController.getTimeReport
);

router.get('/attendance',
    reportLimiter,
    reportsController.getAttendanceReport
);

router.get('/employee-summary',
    reportLimiter,
    reportsController.getEmployeeSummaryReport
);

router.get('/monthly-consolidated',
    reportLimiter,
    reportsController.getMonthlyReport
);

router.get('/break-types',
    reportLimiter,
    reportsController.getBreakTypeReport
);

router.get('/delays',
    reportLimiter,
    reportsController.getDelayReport
);

// Exportar reportes
router.get('/export/:reportType/:format',
    reportLimiter,
    (req, res) => reportsController.exportReport(req, res)
);

// Endpoint para obtener opciones disponibles para filtros
router.get('/options',
    reportLimiter,
    reportsController.getReportTypes
);

export default router;