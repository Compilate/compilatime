import { Router } from 'express';
import { CompanyController } from './company.controller';
import { requireSuperadmin } from '../../middlewares/superadminAuth';
import { authenticateToken, requireRole } from '../../middlewares/authMiddleware';

const router = Router();
const companyController = new CompanyController();

// Log general para todas las solicitudes a este router
// router.use((req, _res, next) => {
//     console.log('🔍 [company.routes] Router principal - Path:', req.path);
//     console.log('🔍 [company.routes] Router principal - Method:', req.method);
//     console.log('🔍 [company.routes] Router principal - Headers:', req.headers.authorization ? 'Presente' : 'Ausente');
//     next();
// });

// Rutas para configuración de la empresa (requieren autenticación de empresa, pero NO requieren rol SUPER_ADMIN)
const companySettingsRouterForAdmin = Router();
companySettingsRouterForAdmin.use(authenticateToken);
companySettingsRouterForAdmin.use(requireRole(['ADMIN', 'SUPER_ADMIN']));
companySettingsRouterForAdmin.put('/settings', companyController.updateCompanySettings);

// Rutas de superadmin (requieren autenticación de superadmin)
const superadminRouter = Router();
// superadminRouter.use((req, _res, next) => {
//     console.log('🔍 [company.routes] superadminRouter middleware - Iniciando...');
//     console.log('🔍 [company.routes] Path:', req.path);
//     console.log('🔍 [company.routes] Method:', req.method);
//     console.log('🔍 [company.routes] Headers:', req.headers);
//     next();
// });
superadminRouter.use(requireSuperadmin);

// Gestión de empresas (solo superadmin)
superadminRouter.get('/', companyController.getAllCompanies);
superadminRouter.get('/stats/overview', companyController.getCompaniesStats);
superadminRouter.get('/expiring', companyController.getCompaniesWithExpiringSubscription);
superadminRouter.get('/:id', companyController.getCompanyById);
superadminRouter.post('/', companyController.createCompany);
superadminRouter.put('/:id', companyController.updateCompany);
superadminRouter.post('/:id/suspend', companyController.suspendCompany);
superadminRouter.post('/:id/reactivate', companyController.reactivateCompany);
superadminRouter.delete('/:id', companyController.deleteCompany);

// Ruta pública para obtener empresa por slug (para login de empleados)
router.get('/by-slug/:slug', companyController.getCompanyBySlug);

// Combinar rutas - las rutas de superadmin van primero para evitar conflictos
router.use('/', superadminRouter);
router.use('/', companySettingsRouterForAdmin);

export { router as companyRoutes, companySettingsRouterForAdmin };