import { Router } from 'express';
import { versionController } from './version.controller';

const router = Router();

/**
 * @route   GET /api/version
 * @desc    Obtiene la versión actual de la aplicación
 * @access  Public
 */
router.get('/', versionController.getVersion.bind(versionController));

/**
 * @route   GET /api/version/info
 * @desc    Obtiene información detallada del sistema
 * @access  Public
 */
router.get('/info', versionController.getSystemInfo.bind(versionController));

export default router;
