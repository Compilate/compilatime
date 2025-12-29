import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError, PrismaClientInitializationError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { ApiResponse } from '../types/express';

// Clase personalizada para errores de la aplicación
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public code?: string;

    constructor(message: string, statusCode: number = 500, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Manejo centralizado de errores
export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    let statusCode = 500;
    let message = 'Error interno del servidor';
    let code: string | undefined;
    let details: any = undefined;

    // Errores de validación de Zod
    if (error instanceof ZodError) {
        statusCode = 400;
        message = 'Error de validación';
        code = 'VALIDATION_ERROR';
        details = error.errors.reduce((acc, err) => {
            const path = err.path.join('.');
            if (!acc[path]) {
                acc[path] = [];
            }
            acc[path].push(err.message);
            return acc;
        }, {} as Record<string, string[]>);
    }
    // Errores de Prisma
    else if (error instanceof PrismaClientKnownRequestError) {
        switch ((error as any).code) {
            case 'P2002':
                statusCode = 409;
                message = 'Registro duplicado. El valor ya existe en la base de datos.';
                code = 'DUPLICATE_RECORD';
                break;
            case 'P2025':
                statusCode = 404;
                message = 'Registro no encontrado.';
                code = 'RECORD_NOT_FOUND';
                break;
            case 'P2003':
                statusCode = 400;
                message = 'Violación de restricción de clave foránea.';
                code = 'FOREIGN_KEY_VIOLATION';
                break;
            default:
                statusCode = 400;
                message = 'Error en la base de datos.';
                code = 'DATABASE_ERROR';
        }
    }
    // Errores de Prisma desconocidos
    else if (error instanceof PrismaClientUnknownRequestError) {
        statusCode = 500;
        message = 'Error desconocido en la base de datos.';
        code = 'UNKNOWN_DATABASE_ERROR';
    }
    // Error de conexión a Prisma
    else if (error instanceof PrismaClientInitializationError) {
        statusCode = 503;
        message = 'Error de conexión con la base de datos.';
        code = 'DATABASE_CONNECTION_ERROR';
    }
    // Error de validación de Prisma
    else if (error instanceof PrismaClientValidationError) {
        statusCode = 400;
        message = 'Error de validación en la consulta.';
        code = 'QUERY_VALIDATION_ERROR';
    }
    // Errores personalizados de la aplicación
    else if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
        code = error.code;
    }
    // Error de sintaxis JSON
    else if (error instanceof SyntaxError && 'body' in error) {
        statusCode = 400;
        message = 'JSON malformado en el cuerpo de la solicitud.';
        code = 'INVALID_JSON';
    }

    // Log del error para debugging
    if (statusCode >= 500) {
        console.error('❌ Error del servidor:', {
            message: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            user: req.user?.id,
            companyId: req.user?.companyId,
        });
    } else {
        console.warn('⚠️ Error del cliente:', {
            message: error.message,
            url: req.url,
            method: req.method,
            ip: req.ip,
            user: req.user?.id,
            companyId: req.user?.companyId,
        });
    }

    // Construir respuesta de error
    const errorResponse: ApiResponse = {
        success: false,
        error: message,
    };

    if (code) {
        errorResponse.error = `${code}: ${message}`;
    }

    if (details && Object.keys(details).length > 0) {
        (errorResponse as any).errors = details;
    }

    // En desarrollo, incluir más detalles
    if (process.env.NODE_ENV === 'development') {
        (errorResponse as any).stack = error.stack;
        (errorResponse as any).originalError = error.message;
    }

    res.status(statusCode).json(errorResponse);
};

// Middleware para manejar rutas no encontradas (404)
export const notFoundHandler = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    const error = new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
    next(error);
};

// Middleware para manejar errores asíncronos
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Middleware para validar que el cuerpo de la solicitud no esté vacío
export const requireBody = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    if (!req.body || Object.keys(req.body).length === 0) {
        const error = new AppError('El cuerpo de la solicitud es requerido', 400, 'EMPTY_BODY');
        next(error);
        return;
    }
    next();
};

// Middleware para validar headers específicos
export const requireHeaders = (headers: string[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const missingHeaders = headers.filter(header => !req.headers[header]);

        if (missingHeaders.length > 0) {
            const error = new AppError(
                `Headers requeridos faltantes: ${missingHeaders.join(', ')}`,
                400,
                'MISSING_HEADERS'
            );
            next(error);
            return;
        }

        next();
    };
};

// Middleware para limitar el tamaño del payload
export const limitPayloadSize = (maxSize: number = 10 * 1024 * 1024) => { // 10MB por defecto
    return (req: Request, _res: Response, next: NextFunction): void => {
        const contentLength = parseInt(req.headers['content-length'] || '0');

        if (contentLength > maxSize) {
            const error = new AppError(
                `Payload demasiado grande. Máximo permitido: ${maxSize / 1024 / 1024}MB`,
                413,
                'PAYLOAD_TOO_LARGE'
            );
            next(error);
            return;
        }

        next();
    };
};

export default {
    AppError,
    errorHandler,
    notFoundHandler,
    asyncHandler,
    requireBody,
    requireHeaders,
    limitPayloadSize,
};