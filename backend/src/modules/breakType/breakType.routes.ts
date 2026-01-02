import { Router } from 'express';
import { authenticateToken } from '../../middlewares/authMiddleware';
import BreakTypeController from './breakType.controller';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

// Obtener todos los tipos de pausa de la empresa
router.get('/', BreakTypeController.getBreakTypes);

// Obtener estadísticas de tiempo por tipo de pausa
router.get('/stats', BreakTypeController.getBreakTypeStats);

// Obtener un tipo de pausa por ID
router.get('/:id', BreakTypeController.getBreakTypeById);

// Crear un nuevo tipo de pausa
router.post('/', BreakTypeController.createBreakType);

// Crear un tipo de pausa personalizado
router.post('/custom', BreakTypeController.createCustomBreakType);

// Actualizar un tipo de pausa
router.put('/:id', BreakTypeController.updateBreakType);

// Eliminar un tipo de pausa
router.delete('/:id', BreakTypeController.deleteBreakType);

export default router;
