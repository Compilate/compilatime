import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { requireSuperadmin } from '../../middlewares/superadminAuth';

const router = Router();
const paymentController = new PaymentController();

// Todas las rutas de pagos requieren autenticación de superadmin
router.use(requireSuperadmin);

// Gestión de pagos
router.get('/', paymentController.getAllPayments);
router.get('/stats/overview', paymentController.getPaymentStats);
router.get('/pending', paymentController.getPendingPayments);
router.get('/failed', paymentController.getFailedPayments);
router.get('/subscription/:subscriptionId', paymentController.getPaymentsBySubscription);
router.get('/:id', paymentController.getPaymentById);
router.post('/', paymentController.createPayment);
router.put('/:id', paymentController.updatePayment);
router.delete('/:id', paymentController.deletePayment);

// Acciones específicas de pagos
router.post('/:id/confirm', paymentController.confirmPayment);
router.post('/:id/fail', paymentController.failPayment);

export { router as paymentRoutes };