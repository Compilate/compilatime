import { Router } from 'express';
import { SuperadminController } from './superadmin.controller';
// import { CompanyController } from '../company/company.controller'; // Movido a company.routes.ts
import { PlanController } from '../plan/plan.controller';
import { PaymentController } from '../payment/payment.controller';
import { SubscriptionController } from '../subscription/subscription.controller';
import { authLimiter } from '../../middlewares/rateLimit';
import { requireSuperadmin } from '../../middlewares/superadminAuth';

const router = Router();
const superadminController = new SuperadminController();
// const companyController = new CompanyController(); // Movido a company.routes.ts
const planController = new PlanController();
const paymentController = new PaymentController();
const subscriptionController = new SubscriptionController();

// Rutas públicas de autenticación de superadmin
router.get('/login',
    superadminController.getLoginPage
);
router.post('/login',
    authLimiter, // 5 intentos en 15 minutos
    superadminController.login
);

// Logout (público)
router.post('/logout', superadminController.logout);

// Rutas protegidas para superadmin
router.use(requireSuperadmin); // Todas las rutas siguientes requieren autenticación de superadmin

// Perfil de superadmin
router.get('/me', superadminController.getMe);
router.put('/change-password', superadminController.changePassword);

// Gestión de superadmins (solo para el superadmin principal)
router.get('/superadmins', superadminController.getSuperadmins);
router.post('/superadmins', superadminController.createSuperadmin);
router.put('/superadmins/:id', superadminController.updateSuperadmin);
router.delete('/superadmins/:id', superadminController.deleteSuperadmin);

// Gestión de empresas - MOVIDAS a company.routes.ts
// router.get('/companies', companyController.getAllCompanies);
// router.get('/companies/:id', companyController.getCompanyById);
// router.post('/companies', companyController.createCompany);
// router.put('/companies/:id', companyController.updateCompany);
// router.delete('/companies/:id', companyController.deleteCompany);
// router.post('/companies/:id/suspend', companyController.suspendCompany);
// router.post('/companies/:id/reactivate', companyController.reactivateCompany);
// router.post('/companies/:id/create-superadmin-employee', companyController.createDefaultSuperadminEmployee);
// router.get('/companies/stats', companyController.getCompaniesStats);
// router.get('/companies/expiring', companyController.getCompaniesWithExpiringSubscription);

// Gestión de planes
router.get('/plans', planController.getAllPlans);
router.get('/plans/:id', planController.getPlanById);
router.post('/plans', planController.createPlan);
router.put('/plans/:id', planController.updatePlan);
router.delete('/plans/:id', planController.deletePlan);
router.patch('/plans/:id/activate', planController.activatePlan);
router.patch('/plans/:id/deactivate', planController.deactivatePlan);

// Gestión de pagos
router.get('/payments', paymentController.getAllPayments);
router.get('/payments/stats/overview', paymentController.getPaymentStats);
router.get('/payments/pending', paymentController.getPendingPayments);
router.get('/payments/failed', paymentController.getFailedPayments);
router.get('/payments/subscription/:subscriptionId', paymentController.getPaymentsBySubscription);
router.get('/payments/:id', paymentController.getPaymentById);
router.post('/payments', paymentController.createPayment);
router.put('/payments/:id', paymentController.updatePayment);
router.delete('/payments/:id', paymentController.deletePayment);

// Acciones específicas de pagos
router.patch('/payments/:id/confirm', paymentController.confirmPayment);
router.patch('/payments/:id/fail', paymentController.failPayment);

// Gestión de suscripciones
router.get('/subscriptions', subscriptionController.getAllSubscriptions);
router.get('/subscriptions/stats/overview', subscriptionController.getSubscriptionStats);
router.get('/subscriptions/expiring', subscriptionController.getExpiringSubscriptions);
router.get('/subscriptions/company/:companyId', subscriptionController.getSubscriptionsByCompany);
router.get('/subscriptions/:id', subscriptionController.getSubscriptionById);
router.post('/subscriptions', subscriptionController.createSubscription);
router.put('/subscriptions/:id', subscriptionController.updateSubscription);
router.delete('/subscriptions/:id', subscriptionController.deleteSubscription);

// Acciones específicas de suscripciones
router.post('/subscriptions/:id/cancel', subscriptionController.cancelSubscription);
router.post('/subscriptions/:id/reactivate', subscriptionController.reactivateSubscription);

export { router as superadminRoutes };