import rateLimit from 'express-rate-limit';
import { config } from '../config/env';
import { Request, Response, NextFunction } from 'express';

// Configuración base para rate limiting
const baseOptions = {
    windowMs: config.rateLimit.windowMs, // 15 minutos por defecto
    message: {
        success: false,
        error: 'Demasiadas solicitudes. Por favor, intenta nuevamente más tarde.',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    },
    standardHeaders: true, // Devuelve info de rate limit en headers
    legacyHeaders: false, // Deshabilita headers legacy
    skip: (req: Request) => {
        // Omitir rate limiting en desarrollo
        if (config.isDevelopment) {
            return true;
        }

        // Omitir para rutas de salud del sistema
        if (req.path === '/health' || req.path === '/api/health') {
            return true;
        }

        return false;
    },
};

// Rate limiting general para todas las APIs
export const generalLimiter = rateLimit({
    ...baseOptions,
    max: config.rateLimit.maxRequests, // 100 solicitudes por ventana
    keyGenerator: (req: Request): string => {
        // Usar IP + user ID si está autenticado
        if (req.user) {
            return `${req.ip || 'unknown'}:${req.user.companyId}:${req.user.id}`;
        }
        return req.ip || 'unknown';
    },
});

// Rate limiting estricto para endpoints de autenticación
export const authLimiter = rateLimit({
    ...baseOptions,
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 intentos por ventana
    skipSuccessfulRequests: true, // No contar solicitudes exitosas
    keyGenerator: (req: Request) => {
        // Usar IP + email/DNI para prevenir ataques a cuentas específicas
        const identifier = req.body?.email || req.body?.dni || 'unknown';
        return `auth:${req.ip}:${identifier}`;
    },
    handler: (_req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            error: 'Demasiados intentos de autenticación. Por favor, espera 15 minutos antes de intentar nuevamente.',
            retryAfter: 900, // 15 minutos
        });
    },
});

// Rate limiting para fichajes (prevenir spam)
export const punchLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // Máximo 10 fichajes por minuto
    keyGenerator: (req: Request) => {
        // Usar employee ID si está autenticado, sino IP + DNI
        if (req.user?.type === 'employee') {
            return `punch:${req.user.companyId}:${req.user.id}`;
        }
        const dni = req.body?.dni || 'unknown';
        return `punch:${req.ip}:${dni}`;
    },
    handler: (_req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            error: 'Demasiados fichajes en poco tiempo. Por favor, espera antes de continuar.',
            retryAfter: 60,
        });
    },
});

// Rate limiting para creación de recursos
export const createLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 1000, // 1 minuto
    max: 20, // Máximo 20 creaciones por minuto
    keyGenerator: (req: Request) => {
        if (req.user) {
            return `create:${req.user.companyId}:${req.user.id}`;
        }
        return `create:${req.ip}`;
    },
});

// Rate limiting para endpoints de reportes (costosos computacionalmente)
export const reportLimiter = rateLimit({
    ...baseOptions,
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 3, // Máximo 3 reportes por 5 minutos
    keyGenerator: (req: Request) => {
        if (req.user) {
            return `report:${req.user.companyId}:${req.user.id}`;
        }
        return `report:${req.ip}`;
    },
    handler: (_req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            error: 'Demasiadas solicitudes de reportes. Por favor, espera antes de generar otro.',
            retryAfter: 300, // 5 minutos
        });
    },
});

// Rate limiting para envío de notificaciones
export const notificationLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 1000, // 1 minuto
    max: 50, // Máximo 50 notificaciones por minuto
    keyGenerator: (req: Request) => {
        if (req.user) {
            return `notification:${req.user.companyId}:${req.user.id}`;
        }
        return `notification:${req.ip}`;
    },
});

// Rate limiting para uploads de archivos
export const uploadLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 1000, // 1 minuto
    max: 5, // Máximo 5 uploads por minuto
    keyGenerator: (req: Request) => {
        if (req.user) {
            return `upload:${req.user.companyId}:${req.user.id}`;
        }
        return `upload:${req.ip}`;
    },
    handler: (_req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            error: 'Demasiados archivos subidos. Por favor, espera antes de continuar.',
            retryAfter: 60,
        });
    },
});

// Rate limiting para endpoints de administración (más restrictivo)
export const adminLimiter = rateLimit({
    ...baseOptions,
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 50, // Máximo 50 solicitudes administrativas por 5 minutos
    keyGenerator: (req: Request) => {
        if (req.user?.type === 'company') {
            return `admin:${req.user.companyId}:${req.user.id}`;
        }
        return `admin:${req.ip}`;
    },
});

// Función para determinar qué limitador usar según el rol del usuario
const getLimiterForRole = (req: Request) => {
    // Si no hay usuario, aplicar límite general
    if (!req.user) {
        return generalLimiter;
    }

    // Aplicar límites según el tipo de usuario
    switch (req.user.type) {
        case 'company':
            // Para usuarios de empresa, verificar rol específico de forma segura
            const userRole = req.user.data?.role;
            if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
                return adminLimiter;
            } else {
                return generalLimiter;
            }
        case 'employee':
            return punchLimiter;
        default:
            return generalLimiter;
    }
};

// Middleware dinámico que aplica diferentes límites según el rol
export const roleBasedLimiter = (req: Request, res: Response, next: NextFunction) => {
    const limiter = getLimiterForRole(req);
    return limiter(req, res, next);
};

export default {
    generalLimiter,
    authLimiter,
    punchLimiter,
    createLimiter,
    reportLimiter,
    notificationLimiter,
    uploadLimiter,
    adminLimiter,
    roleBasedLimiter,
};