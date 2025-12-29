import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { config } from '../config/env';
import { ApiResponse } from '../types/express';

// Extender el tipo Request para incluir información del usuario
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                type: 'company' | 'employee';
                companyId: string;
                data: any;
                company?: {
                    id: string;
                    name: string;
                    email: string;
                    active: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    phone: string | null;
                    slug: string;
                    address: string | null;
                    logo: string | null;
                    timezone: string;
                    settings: any;
                    currentSubscriptionId: string | null;
                } | null;
            };
        }
    }
}

// Middleware para verificar token JWT
export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        console.log('🔐 [AuthMiddleware] Request:', {
            method: req.method,
            path: req.path,
            url: req.url,
            hasAuthHeader: !!authHeader,
            hasToken: !!token,
            tokenLength: token?.length
        });

        if (!token) {
            console.log('❌ [AuthMiddleware] Token no encontrado');
            res.status(401).json({
                success: false,
                error: 'Token de autenticación requerido',
            } as ApiResponse);
            return;
        }

        console.log('✅ [AuthMiddleware] Token encontrado:', token.substring(0, 20) + '...');

        // Verificar token
        const decoded = jwt.verify(token, config.jwt.secret) as any;

        if (!decoded || !decoded.id || !decoded.type || !decoded.companyId) {
            res.status(401).json({
                success: false,
                error: 'Token inválido',
            } as ApiResponse);
            return;
        }

        // Obtener información del usuario según el tipo
        let userData;
        if (decoded.type === 'company') {
            userData = await prisma.companyUser.findFirst({
                where: {
                    id: decoded.id,
                    companyId: decoded.companyId,
                    active: true,
                },
                include: {
                    company: true,
                },
            });
        } else if (decoded.type === 'employee') {
            // Para empleados, verificamos que exista y esté activo
            // La relación con la empresa se verificará en el middleware específico
            userData = await prisma.employee.findFirst({
                where: {
                    id: decoded.id,
                    active: true,
                },
            });
        }

        if (!userData) {
            res.status(401).json({
                success: false,
                error: 'Usuario no encontrado o inactivo',
            } as ApiResponse);
            return;
        }

        // Añadir información del usuario a la request
        req.user = {
            id: decoded.id,
            type: decoded.type,
            companyId: decoded.companyId,
            data: userData,
            company: (userData as any).company || null,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Token expirado',
            } as ApiResponse);
            return;
        }

        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Token inválido',
            } as ApiResponse);
            return;
        }

        console.error('Error en autenticación:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
        } as ApiResponse);
    }
};

// Middleware para verificar que el usuario es de tipo empresa
export const requireCompanyUser = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user || req.user.type !== 'company') {
        res.status(403).json({
            success: false,
            error: 'Acceso denegado. Se requiere usuario de empresa.',
        } as ApiResponse);
        return;
    }

    next();
};

// Middleware para verificar que el usuario es de tipo empleado
export const requireEmployee = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user || req.user.type !== 'employee') {
        res.status(403).json({
            success: false,
            error: 'Acceso denegado. Se requiere usuario empleado.',
        } as ApiResponse);
        return;
    }

    next();
};

// Middleware para verificar rol específico (solo para usuarios de empresa)
export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        console.log('🔐 [requireRole] Verificando rol:', {
            path: req.path,
            method: req.method,
            hasUser: !!req.user,
            userType: req.user?.type,
            userRole: req.user?.data?.role,
            requiredRoles: roles
        });

        if (!req.user || req.user.type !== 'company') {
            console.log('❌ [requireRole] Usuario no encontrado o no es de tipo empresa');
            res.status(403).json({
                success: false,
                error: 'Acceso denegado. Se requiere usuario de empresa.',
            } as ApiResponse);
            return;
        }

        const userRole = req.user.data.role;
        console.log('🔐 [requireRole] Rol del usuario:', userRole);
        console.log('🔐 [requireRole] Roles requeridos:', roles);
        console.log('🔐 [requireRole] Rol permitido:', roles.includes(userRole));

        if (!roles.includes(userRole)) {
            console.log('❌ [requireRole] Rol no permitido');
            res.status(403).json({
                success: false,
                error: 'Acceso denegado. Permisos insuficientes.',
            } as ApiResponse);
            return;
        }

        console.log('✅ [requireRole] Rol permitido, continuando...');
        next();
    };
};

// Middleware para verificar permisos específicos
export const requirePermission = (resource: string, action: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user || req.user.type !== 'company') {
                res.status(403).json({
                    success: false,
                    error: 'Acceso denegado. Se requiere usuario de empresa.',
                } as ApiResponse);
                return;
            }

            // Los administradores tienen todos los permisos
            if (req.user.data.role === 'SUPER_ADMIN' || req.user.data.role === 'ADMIN') {
                next();
                return;
            }

            // Verificar permisos específicos
            const permission = await prisma.permission.findFirst({
                where: {
                    resource,
                    action,
                    roles: {
                        some: {
                            companyUsers: {
                                some: {
                                    id: req.user.id,
                                },
                            },
                        },
                    },
                },
            });

            if (!permission) {
                res.status(403).json({
                    success: false,
                    error: 'Acceso denegado. Permiso no encontrado.',
                } as ApiResponse);
                return;
            }

            next();
        } catch (error) {
            console.error('Error en verificación de permisos:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
            } as ApiResponse);
        }
    };
};

// Middleware opcional (no lanza error si no hay token)
export const optionalAuth = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            next();
            return;
        }

        const decoded = jwt.verify(token, config.jwt.secret) as any;

        if (decoded && decoded.id && decoded.type && decoded.companyId) {
            let userData;
            if (decoded.type === 'company') {
                userData = await prisma.companyUser.findFirst({
                    where: {
                        id: decoded.id,
                        companyId: decoded.companyId,
                        active: true,
                    },
                    include: {
                        company: true,
                    },
                });
            } else if (decoded.type === 'employee') {
                // Para empleados, verificamos que exista y esté activo
                userData = await prisma.employee.findFirst({
                    where: {
                        id: decoded.id,
                        active: true,
                    },
                });
            }

            if (userData) {
                req.user = {
                    id: decoded.id,
                    type: decoded.type,
                    companyId: decoded.companyId,
                    data: userData,
                    company: (userData as any).company || null,
                };
            }
        }

        next();
    } catch (error) {
        // En autenticación opcional, no lanzamos error
        next();
    }
};

export default {
    authenticateToken,
    requireCompanyUser,
    requireEmployee,
    requireRole,
    requirePermission,
    optionalAuth,
};