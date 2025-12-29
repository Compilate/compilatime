import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../utils/apiError';
import { config } from '../../config/env';

const prisma = new PrismaClient();

export class SuperadminService {
    // Login de superadmin
    async login(email: string, password: string) {
        // Buscar superadmin por email
        const superadmin = await prisma.superadmin.findUnique({
            where: { email }
        });

        if (!superadmin) {
            throw new ApiError('Credenciales inválidas', 401);
        }

        if (!superadmin.active) {
            throw new ApiError('Cuenta de superadmin desactivada', 401);
        }

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(password, superadmin.passwordHash);
        if (!isPasswordValid) {
            throw new ApiError('Credenciales inválidas', 401);
        }

        // Actualizar último login
        await prisma.superadmin.update({
            where: { id: superadmin.id },
            data: { lastLoginAt: new Date() }
        });

        // Generar JWT
        console.log('🔑 [SuperadminService] Generando token con secret:', config.jwt.secret.substring(0, 10) + '...');
        const token = jwt.sign(
            {
                id: superadmin.id,
                email: superadmin.email,
                name: superadmin.name,
                role: 'SUPERADMIN'
            },
            config.jwt.secret,
            { expiresIn: '24h' }
        );
        console.log('🔑 [SuperadminService] Token generado:', token.substring(0, 20) + '...');

        return {
            token,
            superadmin: {
                id: superadmin.id,
                email: superadmin.email,
                name: superadmin.name,
                lastLoginAt: new Date()
            }
        };
    }

    // Obtener información del superadmin autenticado
    async getMe(superadminId: string) {
        const superadmin = await prisma.superadmin.findUnique({
            where: { id: superadminId },
            select: {
                id: true,
                email: true,
                name: true,
                lastLoginAt: true,
                active: true,
                createdAt: true
            }
        });

        if (!superadmin) {
            throw new ApiError('Superadmin no encontrado', 404);
        }

        return superadmin;
    }

    // Crear superadmin (solo para desarrollo/seed)
    async createSuperadmin(data: {
        email: string;
        password: string;
        name: string;
    }) {
        // Verificar si ya existe
        const existingSuperadmin = await prisma.superadmin.findUnique({
            where: { email: data.email }
        });

        if (existingSuperadmin) {
            throw new ApiError('Ya existe un superadmin con ese email', 400);
        }

        // Hashear contraseña
        const passwordHash = await bcrypt.hash(data.password, 10);

        const superadmin = await prisma.superadmin.create({
            data: {
                email: data.email,
                passwordHash,
                name: data.name
            }
        });

        // Retornar sin contraseña
        const { passwordHash: _, ...superadminWithoutPassword } = superadmin;
        return superadminWithoutPassword;
    }

    // Cambiar contraseña
    async changePassword(superadminId: string, currentPassword: string, newPassword: string) {
        const superadmin = await prisma.superadmin.findUnique({
            where: { id: superadminId }
        });

        if (!superadmin) {
            throw new ApiError('Superadmin no encontrado', 404);
        }

        // Verificar contraseña actual
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, superadmin.passwordHash);
        if (!isCurrentPasswordValid) {
            throw new ApiError('Contraseña actual incorrecta', 400);
        }

        // Hashear nueva contraseña
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await prisma.superadmin.update({
            where: { id: superadminId },
            data: { passwordHash: newPasswordHash }
        });

        return { message: 'Contraseña actualizada correctamente' };
    }

    // Logout (marcar en logs si es necesario)
    async logout(_superadminId: string) {
        // Aquí podríamos registrar logs de logout si fuera necesario
        return { message: 'Logout exitoso' };
    }
    // Listar todos los superadmins
    async getSuperadmins() {
        const superadmins = await prisma.superadmin.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                active: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return superadmins;
    }

    // Actualizar superadmin
    async updateSuperadmin(id: string, data: Partial<{ email: string; name: string; active: boolean }>) {
        const superadmin = await prisma.superadmin.findUnique({
            where: { id }
        });

        if (!superadmin) {
            throw new ApiError('Superadmin no encontrado', 404);
        }

        // Si se actualiza el email, verificar que no exista
        if (data.email && data.email !== superadmin.email) {
            const existingSuperadmin = await prisma.superadmin.findUnique({
                where: { email: data.email }
            });

            if (existingSuperadmin) {
                throw new ApiError('El email ya está en uso', 409);
            }
        }

        const updatedSuperadmin = await prisma.superadmin.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            },
            select: {
                id: true,
                email: true,
                name: true,
                active: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return updatedSuperadmin;
    }

    // Eliminar superadmin (baja lógica)
    async deleteSuperadmin(id: string) {
        const superadmin = await prisma.superadmin.findUnique({
            where: { id }
        });

        if (!superadmin) {
            throw new ApiError('Superadmin no encontrado', 404);
        }

        // Baja lógica: desactivar en lugar de eliminar
        await prisma.superadmin.update({
            where: { id },
            data: {
                active: false,
                updatedAt: new Date()
            }
        });

        return { message: 'Superadmin eliminado correctamente' };
    }
}