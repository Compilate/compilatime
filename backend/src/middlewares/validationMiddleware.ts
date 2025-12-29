import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware para validar el cuerpo de la solicitud usando un esquema Zod
 */
export const validateRequest = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validar el cuerpo de la solicitud
            const validatedData = schema.parse(req.body);

            // Reemplazar el cuerpo con los datos validados
            req.body = validatedData;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Formatear errores de Zod para una respuesta más clara
                const formattedErrors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Error de validación',
                    errors: formattedErrors
                });
            }

            // Para otros tipos de errores
            return res.status(400).json({
                success: false,
                message: 'Error al procesar la solicitud',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };
};

/**
 * Middleware para validar múltiples esquemas (body, query, params)
 */
export const validateMultiple = (schemas: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validar cuerpo si se proporciona
            if (schemas.body) {
                const validatedBody = schemas.body.parse(req.body);
                req.body = validatedBody;
            }

            // Validar query si se proporciona
            if (schemas.query) {
                const validatedQuery = schemas.query.parse(req.query);
                req.query = validatedQuery;
            }

            // Validar params si se proporciona
            if (schemas.params) {
                const validatedParams = schemas.params.parse(req.params);
                req.params = validatedParams;
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Error de validación',
                    errors: formattedErrors
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Error al procesar la solicitud',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };
};

/**
 * Middleware para validar archivos subidos
 */
export const validateFiles = (options: {
    required?: boolean;
    maxFiles?: number;
    maxSize?: number; // en bytes
    allowedTypes?: string[];
}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const files = req.files as Express.Multer.File[] || [];

            // Verificar si se requieren archivos
            if (options.required && files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere al menos un archivo'
                });
            }

            // Verificar límite de archivos
            if (options.maxFiles && files.length > options.maxFiles) {
                return res.status(400).json({
                    success: false,
                    message: `Se permite un máximo de ${options.maxFiles} archivos`
                });
            }

            // Verificar tamaño y tipo de cada archivo
            for (const file of files) {
                // Verificar tamaño
                if (options.maxSize && file.size > options.maxSize) {
                    return res.status(400).json({
                        success: false,
                        message: `El archivo ${file.originalname} excede el tamaño máximo permitido`
                    });
                }

                // Verificar tipo
                if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
                    return res.status(400).json({
                        success: false,
                        message: `El archivo ${file.originalname} tiene un tipo no permitido`
                    });
                }
            }

            next();
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Error al validar archivos',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };
};

/**
 * Middleware para validar parámetros de consulta específicos
 */
export const validateQuery = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const validatedQuery = schema.parse(req.query);
            req.query = validatedQuery;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Error de validación en parámetros de consulta',
                    errors: formattedErrors
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Error al procesar parámetros de consulta',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };
};

/**
 * Middleware para validar parámetros de ruta
 */
export const validateParams = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const validatedParams = schema.parse(req.params);
            req.params = validatedParams;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Error de validación en parámetros de ruta',
                    errors: formattedErrors
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Error al procesar parámetros de ruta',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    };
};