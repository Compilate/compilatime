import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { config } from '../config/env';
import { ApiResponse } from '../utils/apiResponse';

// Extender el tipo Request para incluir información del superadmin
declare global {
    namespace Express {
        interface Request {
            superadmin?: {
                id: string;
                email: string;
                name: string;
                role: 'SUPERADMIN';
            };
        }
    }
}

// Middleware para verificar token JWT de superadmin
export const authenticateSuperadminToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        console.log('🔍 [authenticateSuperadminToken] Iniciando autenticación...');
        console.log('🔍 [authenticateSuperadminToken] Path:', req.path);
        console.log('🔍 [authenticateSuperadminToken] Method:', req.method);
        console.log('🔍 [authenticateSuperadminToken] Headers:', req.headers);
        console.log('🔍 [authenticateSuperadminToken] Cookies:', req.cookies);

        // Primero intentar obtener el token de la cookie
        let token: string | undefined = req.cookies?.superadmin_token || req.cookies?.['superadmin-token'];
        console.log('🔍 [authenticateSuperadminToken] Token desde cookies:', token ? 'Sí' : 'No');

        // Si no hay cookie, intentar obtenerlo del header Authorization
        if (!token) {
            const authHeader = req.headers.authorization;
            console.log('🔍 [authenticateSuperadminToken] Auth header completo:', authHeader);
            token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
            console.log('🔍 [authenticateSuperadminToken] Token desde header:', token ? 'Sí' : 'No');
        }

        if (!token) {
            console.log('❌ [authenticateSuperadminToken] No se encontró token');
            ApiResponse.unauthorized(res, 'Token de autenticación de superadmin requerido');
            return;
        }

        console.log('🔍 [authenticateSuperadminToken] Token encontrado:', token.substring(0, 20) + '...');
        console.log('🔍 [authenticateSuperadminToken] JWT Secret:', config.jwt.secret.substring(0, 10) + '...');
        console.log('🔍 [authenticateSuperadminToken] Verificando token...');

        // Verificar token
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        console.log('🔍 [authenticateSuperadminToken] Token decodificado:', { id: decoded.id, email: decoded.email, role: decoded.role, exp: decoded.exp, iat: decoded.iat });

        if (!decoded || !decoded.id || !decoded.email || decoded.role !== 'SUPERADMIN') {
            console.log('❌ [authenticateSuperadminToken] Token inválido o sin rol SUPERADMIN');
            console.log('❌ [authenticateSuperadminToken] decoded:', decoded);
            ApiResponse.unauthorized(res, 'Token de superadmin inválido');
            return;
        }

        console.log('🔍 [authenticateSuperadminToken] Buscando superadmin en BD...');
        console.log('🔍 [authenticateSuperadminToken] Búsqueda con:', { id: decoded.id, email: decoded.email, active: true });

        // Buscar superadmin en la base de datos
        const superadmin = await prisma.superadmin.findUnique({
            where: {
                id: decoded.id,
                email: decoded.email,
                active: true
            },
            select: {
                id: true,
                email: true,
                name: true,
                active: true,
                lastLoginAt: true
            }
        });

        console.log('🔍 [authenticateSuperadminToken] Superadmin encontrado:', superadmin);

        if (!superadmin) {
            console.log('❌ [authenticateSuperadminToken] Superadmin no encontrado o inactivo');
            ApiResponse.unauthorized(res, 'Superadmin no encontrado o inactivo');
            return;
        }

        console.log('✅ [authenticateSuperadminToken] Superadmin autenticado:', superadmin.email);
        // Añadir información del superadmin a la request
        req.superadmin = {
            id: superadmin.id,
            email: superadmin.email,
            name: superadmin.name,
            role: 'SUPERADMIN'
        };

        next();
    } catch (error) {
        console.error('❌ [authenticateSuperadminToken] Error en autenticación de superadmin:', error);
        console.error('❌ [authenticateSuperadminToken] Error type:', (error as any).constructor.name);
        console.error('❌ [authenticateSuperadminToken] Error message:', (error as any).message);

        if (error instanceof jwt.TokenExpiredError) {
            console.error('❌ [authenticateSuperadminToken] Token expirado - Detalles:', {
                expiredAt: new Date(error.expiredAt),
                now: new Date()
            });
            ApiResponse.unauthorized(res, 'Token de superadmin expirado');
            return;
        }

        if (error instanceof jwt.JsonWebTokenError) {
            console.error('❌ [authenticateSuperadminToken] Token inválido:', error.message);
            console.error('❌ [authenticateSuperadminToken] Token inválido - stack:', error.stack);
            ApiResponse.unauthorized(res, 'Token de superadmin inválido');
            return;
        }

        console.error('❌ [authenticateSuperadminToken] Error en autenticación de superadmin:', error);
        console.error('❌ [authenticateSuperadminToken] Error stack:', (error as any).stack);
        ApiResponse.error(res, 'Error interno del servidor', 500);
    }
};

// Middleware para verificar que el usuario es superadmin
export const onlySuperadmin = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    console.log('🔍 [onlySuperadmin] Verificando rol de superadmin...');
    console.log('🔍 [onlySuperadmin] req.superadmin:', req.superadmin);

    if (!req.superadmin) {
        console.log('❌ [onlySuperadmin] No hay superadmin en la request');
        ApiResponse.forbidden(res, 'Acceso denegado. Se requiere rol de superadmin.');
        return;
    }

    console.log('✅ [onlySuperadmin] Superadmin verificado correctamente');
    next();
};

// Middleware combinado para autenticación y verificación de rol
export const requireSuperadmin = [
    authenticateSuperadminToken,
    onlySuperadmin
];