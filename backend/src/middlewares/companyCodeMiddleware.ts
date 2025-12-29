import { Request, Response, NextFunction } from 'express';
import { extractCompanyCodeFromUrl } from '../utils/routeDecryption';

/**
 * Middleware para extraer el código de empresa de la URL
 * y añadirlo al objeto request para uso posterior
 */
export const companyCodeMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    try {
        // Extraer el código de empresa de la URL
        const url = req.originalUrl || req.url;

        console.log('🔍 [CompanyCodeMiddleware] Request:', {
            method: req.method,
            path: req.path,
            url: req.url,
            originalUrl: req.originalUrl
        });

        // Ignorar rutas de superadmin y admin
        if (url.includes('/superadmin') || url.includes('/admin')) {
            console.log('🔒 [CompanyCodeMiddleware] Ignorando middleware de código de empresa para ruta de admin:', url);
            return next();
        }

        const companyCode = extractCompanyCodeFromUrl(url);

        if (companyCode) {
            // Añadir el código de empresa al request para uso en los controladores
            (req as any).companyCode = companyCode;
            console.log('✅ [CompanyCodeMiddleware] Código de empresa detectado:', companyCode);
        } else {
            console.log('⚠️ [CompanyCodeMiddleware] No se detectó código de empresa en la URL:', url);
        }

        next();
    } catch (error) {
        console.error('❌ [CompanyCodeMiddleware] Error en middleware de código de empresa:', error);
        next();
    }
};

/**
 * Middleware para validar que exista un código de empresa
 */
export const requireCompanyCode = (req: Request, res: Response, next: NextFunction) => {
    const companyCode = (req as any).companyCode;

    if (!companyCode) {
        console.log('❌ requireCompanyCode: No se encontró código de empresa en el request');
        return res.status(400).json({
            success: false,
            message: 'Se requiere un código de empresa válido en la URL'
        });
    }

    console.log('✅ requireCompanyCode: Código de empresa válido:', companyCode);
    next();
};