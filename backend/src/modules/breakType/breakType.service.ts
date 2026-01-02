import { PrismaClient } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';

const prisma = new PrismaClient();

export class BreakTypeService {
    // Obtener todos los tipos de pausa de una empresa
    static async getBreakTypes(companyId: string) {
        return await prisma.breakType.findMany({
            where: {
                companyId,
            },
            orderBy: {
                name: 'asc',
            },
        });
    }

    // Obtener un tipo de pausa por ID
    static async getBreakTypeById(id: string, companyId: string) {
        const breakType = await prisma.breakType.findFirst({
            where: {
                id,
                companyId,
            },
        });

        if (!breakType) {
            throw new AppError('Tipo de pausa no encontrado', 404, 'BREAK_TYPE_NOT_FOUND');
        }

        return breakType;
    }

    // Crear un nuevo tipo de pausa
    static async createBreakType(companyId: string, data: {
        name: string;
        description?: string;
        color?: string;
        requiresReason?: boolean;
        maxMinutes?: number;
        customName?: string;
        isCustom?: boolean;
    }) {
        // Verificar si ya existe un tipo de pausa con el mismo nombre
        const existing = await prisma.breakType.findFirst({
            where: {
                companyId,
                name: data.name,
            },
        });

        if (existing) {
            throw new AppError('Ya existe un tipo de pausa con este nombre', 400, 'DUPLICATE_BREAK_TYPE');
        }

        return await prisma.breakType.create({
            data: {
                companyId,
                name: data.name,
                description: data.description,
                color: data.color || '#F59E0B',
                requiresReason: data.requiresReason ?? false,
                maxMinutes: data.maxMinutes,
                customName: data.customName,
                isCustom: data.isCustom ?? false,
            },
        });
    }

    // Crear un tipo de pausa personalizado para un empleado
    static async createCustomBreakType(companyId: string, data: {
        customName: string;
        description?: string;
        color?: string;
        requiresReason?: boolean;
        maxMinutes?: number;
    }) {
        // Verificar si ya existe un tipo de pausa personalizado con el mismo nombre
        const existing = await prisma.breakType.findFirst({
            where: {
                companyId,
                customName: data.customName,
                isCustom: true,
            },
        });

        if (existing) {
            throw new AppError('Ya existe un tipo de pausa personalizado con este nombre', 400, 'DUPLICATE_CUSTOM_BREAK_TYPE');
        }

        return await prisma.breakType.create({
            data: {
                companyId,
                name: 'Personalizado',
                description: data.description,
                color: data.color || '#F59E0B',
                requiresReason: data.requiresReason ?? false,
                maxMinutes: data.maxMinutes,
                customName: data.customName,
                isCustom: true,
            },
        });
    }

    // Actualizar un tipo de pausa
    static async updateBreakType(id: string, companyId: string, data: {
        name?: string;
        description?: string;
        color?: string;
        active?: boolean;
        requiresReason?: boolean;
        maxMinutes?: number;
        customName?: string;
        isCustom?: boolean;
    }) {
        // Verificar si existe el tipo de pausa
        const existing = await prisma.breakType.findFirst({
            where: {
                id,
                companyId,
            },
        });

        if (!existing) {
            throw new AppError('Tipo de pausa no encontrado', 404, 'BREAK_TYPE_NOT_FOUND');
        }

        // Si se está actualizando el nombre, verificar que no exista otro con el mismo nombre
        if (data.name && data.name !== existing.name) {
            const nameExists = await prisma.breakType.findFirst({
                where: {
                    companyId,
                    name: data.name,
                    id: { not: id },
                },
            });

            if (nameExists) {
                throw new AppError('Ya existe un tipo de pausa con este nombre', 400, 'DUPLICATE_BREAK_TYPE');
            }
        }

        // Si se está actualizando el nombre personalizado, verificar que no exista otro con el mismo nombre
        if (data.customName && data.customName !== existing.customName) {
            const customNameExists = await prisma.breakType.findFirst({
                where: {
                    companyId,
                    customName: data.customName,
                    isCustom: true,
                    id: { not: id },
                },
            });

            if (customNameExists) {
                throw new AppError('Ya existe un tipo de pausa personalizado con este nombre', 400, 'DUPLICATE_CUSTOM_BREAK_TYPE');
            }
        }

        return await prisma.breakType.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                color: data.color,
                active: data.active,
                requiresReason: data.requiresReason,
                maxMinutes: data.maxMinutes,
                customName: data.customName,
                isCustom: data.isCustom,
            },
        });
    }

    // Eliminar un tipo de pausa
    static async deleteBreakType(id: string, companyId: string) {
        // Verificar si existe el tipo de pausa
        const existing = await prisma.breakType.findFirst({
            where: {
                id,
                companyId,
            },
        });

        if (!existing) {
            throw new AppError('Tipo de pausa no encontrado', 404, 'BREAK_TYPE_NOT_FOUND');
        }

        // Verificar si hay fichajes asociados
        const timeEntriesCount = await prisma.timeEntry.count({
            where: {
                breakTypeId: id,
            },
        });

        if (timeEntriesCount > 0) {
            throw new AppError('No se puede eliminar el tipo de pausa porque tiene fichajes asociados', 400, 'BREAK_TYPE_HAS_ENTRIES');
        }

        await prisma.breakType.delete({
            where: { id },
        });

        return { message: 'Tipo de pausa eliminado correctamente' };
    }

    // Obtener estadísticas de tiempo por tipo de pausa
    static async getBreakTypeStats(companyId: string, filters: {
        employeeId?: string;
        fromDate?: string;
        toDate?: string;
    } = {}) {
        const where: any = {
            companyId,
            type: 'BREAK',
            breakTypeId: { not: null },
        };

        if (filters.employeeId) {
            where.employeeId = filters.employeeId;
        }

        if (filters.fromDate || filters.toDate) {
            where.timestamp = {};
            if (filters.fromDate) {
                where.timestamp.gte = new Date(filters.fromDate);
            }
            if (filters.toDate) {
                where.timestamp.lte = new Date(filters.toDate);
            }
        }

        // Obtener todos los fichajes de pausa
        const breakEntries = await prisma.timeEntry.findMany({
            where,
            include: {
                breakType: true,
                employee: true,
            },
            orderBy: {
                timestamp: 'desc',
            },
        });

        // Agrupar por tipo de pausa y calcular tiempo total
        const statsByType: { [key: string]: any } = {};

        for (const entry of breakEntries) {
            if (!entry.breakType) continue;

            const typeId = entry.breakType.id;
            if (!statsByType[typeId]) {
                statsByType[typeId] = {
                    breakType: entry.breakType,
                    totalMinutes: 0,
                    entryCount: 0,
                    employees: new Set<string>(),
                };
            }

            // Buscar el fichaje RESUME correspondiente para calcular la duración
            const resumeEntry = await prisma.timeEntry.findFirst({
                where: {
                    employeeId: entry.employeeId,
                    companyId: entry.companyId,
                    type: 'RESUME',
                    timestamp: {
                        gt: entry.timestamp,
                    },
                },
                orderBy: {
                    timestamp: 'asc',
                },
            });

            if (resumeEntry) {
                const duration = Math.round(
                    (new Date(resumeEntry.timestamp).getTime() - new Date(entry.timestamp).getTime()) / (1000 * 60)
                );
                statsByType[typeId].totalMinutes += duration;
            }

            statsByType[typeId].entryCount++;
            statsByType[typeId].employees.add(entry.employeeId);
        }

        // Convertir a array y formatear
        return Object.values(statsByType).map((stat: any) => ({
            breakType: {
                ...stat.breakType,
                displayName: stat.breakType.isCustom ? stat.breakType.customName : stat.breakType.name,
            },
            totalMinutes: stat.totalMinutes,
            totalHours: Math.round(stat.totalMinutes / 60 * 100) / 100,
            entryCount: stat.entryCount,
            employeeCount: stat.employees.size,
        }));
    }
}

export default BreakTypeService;
