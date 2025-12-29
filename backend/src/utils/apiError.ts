export class ApiError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends ApiError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class NotFoundError extends ApiError {
    constructor(message: string = 'Recurso no encontrado') {
        super(message, 404);
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'No autorizado') {
        super(message, 401);
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string = 'Acceso prohibido') {
        super(message, 403);
    }
}

export class ConflictError extends ApiError {
    constructor(message: string = 'Conflicto') {
        super(message, 409);
    }
}