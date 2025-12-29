import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middlewares/errorHandler';
import { ApiResponse } from '../../types/express';
import authService from './auth.service';

// Esquemas de validación con Zod
const loginCompanySchema = z.object({
    companySlug: z.string().min(1, 'El código de empresa es requerido'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const loginCompanyWithoutSlugSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const loginEmployeeSchema = z.object({
    companySlug: z.string().min(1, 'El código de empresa es requerido'),
    dni: z.string().min(1, 'El DNI es requerido'),
    pin: z.string().min(4, 'El PIN debe tener al menos 4 caracteres'),
});

const quickPunchSchema = z.object({
    companySlug: z.string().min(1, 'El código de empresa es requerido'),
    dni: z.string().min(1, 'El DNI es requerido'),
    pin: z.string().min(4, 'El PIN debe tener al menos 4 caracteres'),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

const changePinSchema = z.object({
    currentPin: z.string().min(4, 'El PIN actual debe tener al menos 4 caracteres'),
    newPin: z.string().min(4, 'El nuevo PIN debe tener al menos 4 caracteres'),
});

const resetPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
});

const confirmPasswordResetSchema = z.object({
    token: z.string().min(1, 'El token es requerido'),
    newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

const getEmployeeCompaniesSchema = z.object({
    dni: z.string().min(1, 'El DNI es requerido'),
});

const loginEmployeeMultiCompanySchema = z.object({
    dni: z.string().min(1, 'El DNI es requerido'),
    pin: z.string().min(4, 'El PIN debe tener al menos 4 caracteres'),
    companyId: z.string().min(1, 'El ID de la empresa es requerido'),
});

// Controlador para login de empresa
export const loginCompany = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = loginCompanySchema.parse(req.body);

    // Autenticar usuario
    const result = await authService.loginCompanyUser(validatedData);

    // Establecer cookie HTTPOnly con el refresh token
    res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        path: '/',
    });

    // Responder con datos del usuario, empresa y access token
    res.status(200).json({
        success: true,
        data: {
            user: result.user,
            company: result.user.company,
            accessToken: result.tokens.accessToken,
            expiresIn: result.tokens.expiresIn,
        },
        message: 'Inicio de sesión exitoso',
    } as ApiResponse);
});

// Controlador para login de empresa sin código de empresa
export const loginCompanyWithoutSlug = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = loginCompanyWithoutSlugSchema.parse(req.body);

    // Autenticar usuario
    const result = await authService.loginCompanyUserWithoutSlug(validatedData);

    // Establecer cookie HTTPOnly con el refresh token
    res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        path: '/',
    });

    // Responder con datos del usuario, empresa y access token
    res.status(200).json({
        success: true,
        data: {
            user: result.user,
            company: result.company,
            accessToken: result.tokens.accessToken,
            expiresIn: result.tokens.expiresIn,
        },
        message: 'Inicio de sesión exitoso',
    } as ApiResponse);
});

// Controlador para login de empleado
export const loginEmployee = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = loginEmployeeSchema.parse(req.body);

    // Autenticar empleado
    const result = await authService.loginEmployee(validatedData);

    // Establecer cookie HTTPOnly con el refresh token
    res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        path: '/',
    });

    // Responder con datos del empleado, empresa y access token
    res.status(200).json({
        success: true,
        data: {
            user: result.user,
            company: result.user.company,
            accessToken: result.tokens.accessToken,
            expiresIn: result.tokens.expiresIn,
        },
        message: 'Inicio de sesión exitoso',
    } as ApiResponse);
});

// Controlador para autenticación rápida de fichaje
export const quickPunchAuth = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = quickPunchSchema.parse(req.body);

    // Autenticar para fichaje
    const result = await authService.quickPunchAuth(validatedData);

    // Responder con datos básicos del empleado
    res.status(200).json({
        success: true,
        data: {
            employee: result.employee,
        },
        message: 'Autenticación exitosa para fichaje',
    } as ApiResponse);
});

// Controlador para refrescar token
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
    // Obtener refresh token de la cookie o del body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        res.status(401).json({
            success: false,
            error: 'Token de refresh no proporcionado',
        } as ApiResponse);
        return;
    }

    // Refrescar token
    const tokens = await authService.refreshAccessToken(refreshToken);

    // Actualizar cookie con nuevo refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        path: '/',
    });

    // Responder con nuevo access token
    res.status(200).json({
        success: true,
        data: {
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn,
        },
        message: 'Token refrescado exitosamente',
    } as ApiResponse);
});

// Controlador para logout
export const logout = asyncHandler(async (_req: Request, res: Response) => {
    // Limpiar cookie de refresh token
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
    });

    res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente',
    } as ApiResponse);
});

// Controlador para obtener usuario actual
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    // El middleware de autenticación ya añadió el usuario a req.user
    const user = req.user;

    if (!user) {
        res.status(401).json({
            success: false,
            error: 'Usuario no autenticado',
        } as ApiResponse);
        return;
    }

    // Responder con datos del usuario (sin información sensible)
    const { passwordHash, pin, ...userWithoutSensitiveData } = user.data;

    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user.id,
                type: user.type,
                companyId: user.companyId,
                ...userWithoutSensitiveData,
            },
        },
        message: 'Usuario obtenido exitosamente',
    } as ApiResponse);
});

// Controlador para cambiar contraseña de usuario de empresa
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = changePasswordSchema.parse(req.body);

    // Cambiar contraseña
    await authService.changeCompanyUserPassword(
        req.user!.id,
        req.user!.companyId,
        validatedData.currentPassword,
        validatedData.newPassword
    );

    res.status(200).json({
        success: true,
        message: 'Contraseña cambiada exitosamente',
    } as ApiResponse);
});

// Controlador para cambiar PIN de empleado
export const changePin = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = changePinSchema.parse(req.body);

    // Cambiar PIN
    await authService.changeEmployeePin(
        req.user!.id,
        req.user!.companyId,
        validatedData.currentPin,
        validatedData.newPin
    );

    res.status(200).json({
        success: true,
        message: 'PIN cambiado exitosamente',
    } as ApiResponse);
});

// Controlador para solicitar restablecimiento de contraseña
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = resetPasswordSchema.parse(req.body);

    // Solicitar restablecimiento
    await authService.resetCompanyUserPassword(req.user!.companyId, validatedData.email);

    res.status(200).json({
        success: true,
        message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña',
    } as ApiResponse);
});

// Controlador para confirmar restablecimiento de contraseña
export const confirmPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = confirmPasswordResetSchema.parse(req.body);

    // Confirmar restablecimiento
    await authService.confirmPasswordReset(validatedData.token, validatedData.newPassword);

    res.status(200).json({
        success: true,
        message: 'Contraseña restablecida exitosamente',
    } as ApiResponse);
});

// Controlador para verificar token
export const verifyToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
        res.status(400).json({
            success: false,
            error: 'Token no proporcionado',
        } as ApiResponse);
        return;
    }

    // Verificar token
    const decoded = authService.verifyToken(token);

    if (!decoded) {
        res.status(401).json({
            success: false,
            error: 'Token inválido o expirado',
        } as ApiResponse);
        return;
    }

    res.status(200).json({
        success: true,
        data: {
            valid: true,
            decoded,
        },
        message: 'Token válido',
    } as ApiResponse);
});

// Controlador para obtener las empresas de un empleado
export const getEmployeeCompanies = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = getEmployeeCompaniesSchema.parse(req.body);

    // Obtener empresas del empleado
    const companies = await authService.getEmployeeCompanies(validatedData.dni);

    res.status(200).json({
        success: true,
        data: {
            companies,
        },
        message: 'Empresas obtenidas exitosamente',
    } as ApiResponse);
});

// Controlador para login de empleado multi-empresa
export const loginEmployeeMultiCompany = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = loginEmployeeMultiCompanySchema.parse(req.body);

    // Autenticar empleado en la empresa específica
    const result = await authService.loginEmployeeMultiCompany(validatedData);

    // Establecer cookie HTTPOnly con el refresh token
    res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        path: '/',
    });

    // Responder con datos del empleado, empresa y access token
    res.status(200).json({
        success: true,
        data: {
            user: result.user,
            company: result.user.company,
            accessToken: result.tokens.accessToken,
            expiresIn: result.tokens.expiresIn,
        },
        message: 'Inicio de sesión exitoso',
    } as ApiResponse);
});

export default {
    loginCompany,
    loginCompanyWithoutSlug,
    loginEmployee,
    loginEmployeeMultiCompany,
    quickPunchAuth,
    refreshToken,
    logout,
    getCurrentUser,
    changePassword,
    changePin,
    requestPasswordReset,
    confirmPasswordReset,
    verifyToken,
    getEmployeeCompanies,
};