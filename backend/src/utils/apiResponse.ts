import { Response } from 'express';

export class ApiResponse {
    static success(res: Response, data: any = null, message: string = 'Operación exitosa', statusCode: number = 200) {
        const response = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        console.log('🔍 [ApiResponse.success] Enviando respuesta:', {
            statusCode,
            success: response.success,
            message: response.message,
            dataKeys: data ? Object.keys(data) : null,
            data: data
        });
        return res.status(statusCode).json(response);
    }

    static error(res: Response, message: string = 'Error interno del servidor', statusCode: number = 500, errors: any = null) {
        const response = {
            success: false,
            message,
            errors,
            timestamp: new Date().toISOString()
        };
        console.log('❌ [ApiResponse.error] Enviando respuesta de error:', {
            statusCode,
            success: response.success,
            message: response.message,
            errors: response.errors
        });
        return res.status(statusCode).json(response);
    }

    static badRequest(res: Response, message: string = 'Solicitud inválida', errors: any = null) {
        return this.error(res, message, 400, errors);
    }

    static unauthorized(res: Response, message: string = 'No autorizado') {
        console.log('❌ [ApiResponse.unauthorized] Respuesta no autorizada:', message);
        return this.error(res, message, 401);
    }

    static forbidden(res: Response, message: string = 'Acceso prohibido') {
        console.log('❌ [ApiResponse.forbidden] Respuesta prohibida:', message);
        return this.error(res, message, 403);
    }

    static notFound(res: Response, message: string = 'Recurso no encontrado') {
        return this.error(res, message, 404);
    }

    static conflict(res: Response, message: string = 'Conflicto') {
        return this.error(res, message, 409);
    }

    static validationError(res: Response, errors: any) {
        return this.badRequest(res, 'Error de validación', errors);
    }
}