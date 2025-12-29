import { Router } from 'express';
import { PlanController } from './plan.controller';
import { requireSuperadmin } from '../../middlewares/superadminAuth';

const router = Router();
const planController = new PlanController();

// Todas las rutas de planes requieren autenticación de superadmin
router.use(requireSuperadmin);

// Estadísticas de planes (debe ir antes de /:id para evitar conflictos)
router.get('/stats/overview', planController.getPlansStats);

// Gestión de planes
router.get('/', planController.getAllPlans);
router.get('/:id', planController.getPlanById);
router.post('/', planController.createPlan);
router.put('/:id', planController.updatePlan);
router.delete('/:id', planController.deletePlan);

// Activar/Desactivar plan
router.patch('/:id/activate', planController.activatePlan);
router.patch('/:id/deactivate', planController.activatePlan);

export { router as planRoutes };