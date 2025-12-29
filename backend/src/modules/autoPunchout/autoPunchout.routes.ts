import { Router } from 'express';
import AutoPunchoutController from './autoPunchout.controller';
import { requireCompanyUser } from '../../middlewares/authMiddleware';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(requireCompanyUser);

// Iniciar el servicio de cierre automático
router.post('/start', AutoPunchoutController.startService);

// Procesar manualmente los fichajes pendientes
router.post('/process', AutoPunchoutController.processPending);

// Obtener estado del servicio
router.get('/status', AutoPunchoutController.getStatus);

export default router;