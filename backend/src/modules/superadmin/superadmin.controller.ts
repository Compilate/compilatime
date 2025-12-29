import { Request, Response } from 'express';
import { SuperadminService } from './superadmin.service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

// Esquemas de validación
const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

const createSuperadminSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres')
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
});

const superadminService = new SuperadminService();

export class SuperadminController {
    // Login de superadmin
    login = asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = loginSchema.parse(req.body);

        const result = await superadminService.login(email, password);

        // Establecer cookie HTTPOnly
        res.cookie('superadmin_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        });

        ApiResponse.success(res, result, 'Login exitoso');
    });

    // Obtener página de login (para peticiones GET)
    getLoginPage = asyncHandler(async (_req: Request, res: Response) => {
        ApiResponse.success(res, null, 'Página de login de superadmin');
    });

    // Logout de superadmin
    logout = asyncHandler(async (req: Request, res: Response) => {
        const superadminId = req.superadmin?.id;

        if (superadminId) {
            await superadminService.logout(superadminId);
        }

        // Limpiar cookie
        res.clearCookie('superadmin_token');

        ApiResponse.success(res, null, 'Logout exitoso');
    });

    // Obtener datos del superadmin autenticado
    getMe = asyncHandler(async (req: Request, res: Response) => {
        const superadminId = req.superadmin?.id;

        if (!superadminId) {
            return ApiResponse.unauthorized(res, 'No autenticado');
        }

        const superadmin = await superadminService.getMe(superadminId);
        ApiResponse.success(res, superadmin, 'Datos obtenidos correctamente');
    });

    // Crear nuevo superadmin (solo para superadmin existente)
    createSuperadmin = asyncHandler(async (req: Request, res: Response) => {
        const data = createSuperadminSchema.parse(req.body);

        const superadmin = await superadminService.createSuperadmin(data);

        ApiResponse.success(res, superadmin, 'Superadmin creado correctamente', 201);
    });

    // Cambiar contraseña
    changePassword = asyncHandler(async (req: Request, res: Response) => {
        const superadminId = req.superadmin?.id;

        if (!superadminId) {
            return ApiResponse.unauthorized(res, 'No autenticado');
        }

        const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

        const result = await superadminService.changePassword(
            superadminId,
            currentPassword,
            newPassword
        );

        ApiResponse.success(res, result, 'Contraseña actualizada correctamente');
    });

    // Listar todos los superadmins
    getSuperadmins = asyncHandler(async (_req: Request, res: Response) => {
        const superadmins = await superadminService.getSuperadmins();
        ApiResponse.success(res, superadmins, 'Superadmins obtenidos correctamente');
    });

    // Actualizar superadmin
    updateSuperadmin = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const data = createSuperadminSchema.partial().parse(req.body);

        const superadmin = await superadminService.updateSuperadmin(id, data);
        ApiResponse.success(res, superadmin, 'Superadmin actualizado correctamente');
    });

    // Eliminar superadmin (baja lógica)
    deleteSuperadmin = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const currentSuperadminId = req.superadmin?.id;

        // No permitir eliminarse a sí mismo
        if (id === currentSuperadminId) {
            return ApiResponse.badRequest(res, 'No puedes eliminar tu propia cuenta');
        }

        await superadminService.deleteSuperadmin(id);
        ApiResponse.success(res, null, 'Superadmin eliminado correctamente');
    });
}