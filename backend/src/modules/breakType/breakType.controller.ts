import { Request, Response } from 'express';
import { z } from 'zod';
import BreakTypeService from './breakType.service';
import { asyncHandler } from '../../utils/asyncHandler';

// Validación para crear tipo de pausa
const createBreakTypeSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un código HEX válido').optional(),
    requiresReason: z.boolean().optional(),
    maxMinutes: z.number().int().positive().optional(),
});

// Validación para actualizar tipo de pausa
const updateBreakTypeSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').optional(),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un código HEX válido').optional(),
    active: z.boolean().optional(),
    requiresReason: z.boolean().optional(),
    maxMinutes: z.number().int().positive().optional(),
});

export class BreakTypeController {
    // Obtener todos los tipos de pausa de la empresa
    static getBreakTypes = asyncHandler(async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;

        const breakTypes = await BreakTypeService.getBreakTypes(companyId);

        res.json({
            success: true,
            data: {
                breakTypes,
            },
        });
    });

    // Obtener un tipo de pausa por ID
    static getBreakTypeById = asyncHandler(async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const { id } = req.params;

        const breakType = await BreakTypeService.getBreakTypeById(id, companyId);

        res.json({
            success: true,
            data: {
                breakType,
            },
        });
    });

    // Crear un nuevo tipo de pausa
    static createBreakType = asyncHandler(async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;

        const validatedData = createBreakTypeSchema.parse(req.body);

        const breakType = await BreakTypeService.createBreakType(companyId, validatedData);

        res.status(201).json({
            success: true,
            data: {
                breakType,
            },
            message: 'Tipo de pausa creado correctamente',
        });
    });

    // Actualizar un tipo de pausa
    static updateBreakType = asyncHandler(async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const { id } = req.params;

        const validatedData = updateBreakTypeSchema.parse(req.body);

        const breakType = await BreakTypeService.updateBreakType(id, companyId, validatedData);

        res.json({
            success: true,
            data: {
                breakType,
            },
            message: 'Tipo de pausa actualizado correctamente',
        });
    });

    // Eliminar un tipo de pausa
    static deleteBreakType = asyncHandler(async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;
        const { id } = req.params;

        const result = await BreakTypeService.deleteBreakType(id, companyId);

        res.json({
            success: true,
            data: result,
            message: 'Tipo de pausa eliminado correctamente',
        });
    });

    // Obtener estadísticas de tiempo por tipo de pausa
    static getBreakTypeStats = asyncHandler(async (req: Request, res: Response) => {
        const companyId = req.user!.companyId;

        const filters = {
            employeeId: req.query.employeeId as string | undefined,
            fromDate: req.query.fromDate as string | undefined,
            toDate: req.query.toDate as string | undefined,
        };

        const stats = await BreakTypeService.getBreakTypeStats(companyId, filters);

        res.json({
            success: true,
            data: {
                stats,
            },
        });
    });
}

export default BreakTypeController;
