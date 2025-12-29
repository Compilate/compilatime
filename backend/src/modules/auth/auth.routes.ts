import { Router } from 'express';
import authController from './auth.controller';
import { authLimiter, generalLimiter } from '../../middlewares/rateLimit';
import { authenticateToken } from '../../middlewares/authMiddleware';
import { requireBody } from '../../middlewares/errorHandler';

const router = Router();

// Rutas públicas de autenticación
router.post('/company/login',
    authLimiter,
    requireBody,
    authController.loginCompany
);

router.post('/company/login-without-slug',
    authLimiter,
    requireBody,
    authController.loginCompanyWithoutSlug
);

router.post('/employee/login',
    authLimiter,
    requireBody,
    authController.loginEmployee
);

router.post('/employee/login-multi-company',
    authLimiter,
    requireBody,
    authController.loginEmployeeMultiCompany
);

router.post('/quick-punch',
    authLimiter,
    requireBody,
    authController.quickPunchAuth
);

router.post('/refresh-token',
    generalLimiter,
    authController.refreshToken
);

router.post('/logout',
    generalLimiter,
    authController.logout
);

router.post('/verify-token',
    generalLimiter,
    requireBody,
    authController.verifyToken
);

// Ruta para obtener las empresas de un empleado
router.post('/employee/companies',
    authLimiter,
    requireBody,
    authController.getEmployeeCompanies
);

// Rutas protegidas (requieren autenticación)
router.post('/change-password',
    generalLimiter,
    authenticateToken,
    requireBody,
    authController.changePassword
);

router.post('/change-pin',
    generalLimiter,
    authenticateToken,
    requireBody,
    authController.changePin
);

router.get('/me',
    generalLimiter,
    authenticateToken,
    authController.getCurrentUser
);

// Rutas de recuperación de contraseña
router.post('/request-password-reset',
    authLimiter,
    requireBody,
    authController.requestPasswordReset
);

router.post('/confirm-password-reset',
    authLimiter,
    requireBody,
    authController.confirmPasswordReset
);

export default router;