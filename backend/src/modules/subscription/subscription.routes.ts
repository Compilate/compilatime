import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { requireSuperadmin } from '../../middlewares/superadminAuth';

const router = Router();
const subscriptionController = new SubscriptionController();

// Todas las rutas de suscripciones requieren autenticación de superadmin
router.use(requireSuperadmin);

// Gestión de suscripciones
router.get('/', subscriptionController.getAllSubscriptions);
router.get('/stats/overview', subscriptionController.getSubscriptionStats);
router.get('/expiring', subscriptionController.getExpiringSubscriptions);
router.get('/company/:companyId', subscriptionController.getSubscriptionsByCompany);
router.get('/:id', subscriptionController.getSubscriptionById);
router.post('/', subscriptionController.createSubscription);
router.put('/:id', subscriptionController.updateSubscription);
router.delete('/:id', subscriptionController.deleteSubscription);

// Acciones específicas de suscripciones
router.post('/:id/cancel', subscriptionController.cancelSubscription);
router.post('/:id/reactivate', subscriptionController.reactivateSubscription);

export { router as subscriptionRoutes };