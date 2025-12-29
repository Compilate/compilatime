import { z } from 'zod';
import { AbsenceType, AbsenceStatus } from '@prisma/client';

// ==================== AUSENCIAS ====================

export const CreateAbsenceSchema = z.object({
    employeeId: z.string().min(1, 'Debe seleccionar un empleado'),
    type: z.nativeEnum(AbsenceType, {
        errorMap: () => ({ message: 'Tipo de ausencia inválido' }),
    }),
    startDate: z.string().refine((date) => {
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }, 'Fecha de inicio inválida'),
    endDate: z.string().refine((date) => {
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }, 'Fecha de fin inválida'),
    halfDay: z.boolean().optional().default(false),
    startHalfDay: z.enum(['morning', 'afternoon']).optional(),
    endHalfDay: z.enum(['morning', 'afternoon']).optional(),
    reason: z.string().max(500, 'El motivo no puede exceder 500 caracteres').optional(),
    notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional(),
    status: z.nativeEnum(AbsenceStatus).optional(),
    attachments: z.array(z.string()).optional(),
}).refine((data) => {
    if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return start <= end;
    }
    return true;
}, {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
}).refine((data) => {
    if (data.halfDay && (!data.startHalfDay || !data.endHalfDay)) {
        return false;
    }
    return true;
}, {
    message: 'Para ausencias de medio día debe especificar el período (mañana/tarde)',
    path: ['startHalfDay'],
});

export const UpdateAbsenceSchema = z.object({
    type: z.nativeEnum(AbsenceType).optional(),
    startDate: z.string().refine((date) => {
        if (!date) return true;
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }).optional(),
    endDate: z.string().refine((date) => {
        if (!date) return true;
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }).optional(),
    halfDay: z.boolean().optional(),
    startHalfDay: z.enum(['morning', 'afternoon']).optional(),
    endHalfDay: z.enum(['morning', 'afternoon']).optional(),
    reason: z.string().min(1).max(500).optional(),
    notes: z.string().max(1000).optional(),
    attachments: z.array(z.string()).optional(),
}).refine((data) => {
    if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return start <= end;
    }
    return true;
}, {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
});

export const AbsenceFiltersSchema = z.object({
    employeeId: z.string().optional(),
    type: z.string().optional().transform((val) => {
        // Si es string vacío, convertir a undefined
        if (val === '' || val === undefined) return undefined;
        // Validar que sea un valor válido del enum
        if (!Object.values(AbsenceType).includes(val as AbsenceType)) {
            return undefined;
        }
        return val as AbsenceType;
    }),
    status: z.string().optional().transform((val) => {
        // Si es string vacío, convertir a undefined
        if (val === '' || val === undefined) return undefined;
        // Validar que sea un valor válido del enum
        if (!Object.values(AbsenceStatus).includes(val as AbsenceStatus)) {
            return undefined;
        }
        return val as AbsenceStatus;
    }),
    startDate: z.string().optional().transform((val) => {
        // Si es string vacío, convertir a undefined
        if (val === '' || val === undefined) return undefined;
        return val;
    }),
    endDate: z.string().optional().transform((val) => {
        // Si es string vacío, convertir a undefined
        if (val === '' || val === undefined) return undefined;
        return val;
    }),
    limit: z.string().optional().transform((val) => {
        if (!val || val === '') return 50;
        const parsed = parseInt(val);
        return isNaN(parsed) ? 50 : parsed;
    }),
    offset: z.string().optional().transform((val) => {
        if (!val || val === '') return 0;
        const parsed = parseInt(val);
        return isNaN(parsed) ? 0 : parsed;
    }),
});

// ==================== SOLICITUDES DE AUSENCIA ====================

export const CreateAbsenceRequestSchema = z.object({
    employeeId: z.string().min(1, 'Debe seleccionar un empleado'),
    type: z.nativeEnum(AbsenceType, {
        errorMap: () => ({ message: 'Tipo de ausencia inválido' }),
    }),
    startDate: z.string().refine((date) => {
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }, 'Fecha de inicio inválida'),
    endDate: z.string().refine((date) => {
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }, 'Fecha de fin inválida'),
    halfDay: z.boolean().optional().default(false),
    startHalfDay: z.enum(['morning', 'afternoon']).optional(),
    endHalfDay: z.enum(['morning', 'afternoon']).optional(),
    reason: z.string().min(1, 'El motivo es obligatorio').max(500, 'El motivo no puede exceder 500 caracteres'),
    notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional(),
    attachments: z.array(z.string()).optional(),
}).refine((data) => {
    if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return start <= end;
    }
    return true;
}, {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
});

// ==================== POLÍTICAS DE VACACIONES ====================

export const CreateVacationPolicySchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede exceder 100 caracteres'),
    description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
    yearlyDays: z.number().int().min(0, 'Los días anuales deben ser un número no negativo').max(365, 'Los días anuales no pueden exceder 365'),
    maxCarryOverDays: z.number().int().min(0, 'Los días arrastrables deben ser un número no negativo').max(365, 'Los días arrastrables no pueden exceder 365'),
    probationPeriodDays: z.number().int().min(0, 'El período de prueba debe ser un número no negativo').optional(),
    requiresApproval: z.boolean().optional().default(true),
    active: z.boolean().optional().default(true),
});

export const UpdateVacationPolicySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    yearlyDays: z.number().int().min(0).max(365).optional(),
    maxCarryOverDays: z.number().int().min(0).max(365).optional(),
    probationPeriodDays: z.number().int().min(0).optional(),
    requiresApproval: z.boolean().optional(),
    active: z.boolean().optional(),
});

// ==================== COMENTARIOS DE AUSENCIA ====================

export const CreateAbsenceCommentSchema = z.object({
    comment: z.string().min(1, 'El comentario es obligatorio').max(1000, 'El comentario no puede exceder 1000 caracteres'),
    isInternal: z.boolean().optional().default(false),
});

// ==================== FESTIVOS DE LA EMPRESA ====================

export const CreateCompanyHolidaySchema = z.object({
    date: z.string().refine((date) => {
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }, 'Fecha inválida'),
    name: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede exceder 100 caracteres'),
    description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
    recurring: z.boolean().optional().default(false),
});

export const UpdateCompanyHolidaySchema = z.object({
    date: z.string().refine((date) => {
        if (!date) return true;
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }).optional(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    recurring: z.boolean().optional(),
});

// ==================== BALANCE DE VACACIONES ====================

export const UpdateVacationBalanceSchema = z.object({
    adjustedDays: z.number().int().min(-365, 'Los días ajustados no pueden ser menores a -365').max(365, 'Los días ajustados no pueden ser mayores a 365'),
    reason: z.string().min(1, 'El motivo del ajuste es obligatorio').max(500, 'El motivo no puede exceder 500 caracteres'),
});

// ==================== APROBACIÓN/RECHAZO ====================

export const ApproveAbsenceSchema = z.object({
    reason: z.string().max(500, 'El motivo no puede exceder 500 caracteres').optional(),
});

export const RejectAbsenceSchema = z.object({
    rejectionReason: z.string().min(1, 'El motivo de rechazo es obligatorio').max(500, 'El motivo de rechazo no puede exceder 500 caracteres'),
});

// ==================== ESQUEMAS ADICIONALES ====================

export const UpdateAbsenceRequestSchema = z.object({
    type: z.nativeEnum(AbsenceType).optional(),
    startDate: z.string().refine((date) => {
        if (!date) return true;
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }).optional(),
    endDate: z.string().refine((date) => {
        if (!date) return true;
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }).optional(),
    halfDay: z.boolean().optional(),
    startHalfDay: z.enum(['morning', 'afternoon']).optional(),
    endHalfDay: z.enum(['morning', 'afternoon']).optional(),
    reason: z.string().min(1).max(500).optional(),
    notes: z.string().max(1000).optional(),
    attachments: z.array(z.string()).optional(),
}).refine((data) => {
    if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return start <= end;
    }
    return true;
}, {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
});

export const ApproveRejectAbsenceSchema = z.object({
    reason: z.string().max(500, 'El motivo no puede exceder 500 caracteres').optional(),
});

export const VacationBalanceFiltersSchema = z.object({
    employeeId: z.string().optional(),
    year: z.number().int().min(2000).max(2100).optional(),
    policyId: z.string().optional(),
});

export const HolidayFiltersSchema = z.object({
    startDate: z.string().refine((date) => {
        if (!date) return true;
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }).optional(),
    endDate: z.string().refine((date) => {
        if (!date) return true;
        // Aceptar tanto formato date como datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        return dateRegex.test(date) || datetimeRegex.test(date);
    }).optional(),
    recurring: z.boolean().optional(),
    limit: z.number().int().positive().max(100).optional().default(50),
    offset: z.number().int().nonnegative().optional().default(0),
});

// ==================== TIPOS ====================

export type CreateAbsenceInput = z.infer<typeof CreateAbsenceSchema>;
export type UpdateAbsenceInput = z.infer<typeof UpdateAbsenceSchema>;
export type AbsenceFilters = z.infer<typeof AbsenceFiltersSchema>;
export type CreateAbsenceRequestInput = z.infer<typeof CreateAbsenceRequestSchema>;
export type UpdateAbsenceRequestInput = z.infer<typeof UpdateAbsenceRequestSchema>;
export type CreateVacationPolicyInput = z.infer<typeof CreateVacationPolicySchema>;
export type UpdateVacationPolicyInput = z.infer<typeof UpdateVacationPolicySchema>;
export type CreateAbsenceCommentInput = z.infer<typeof CreateAbsenceCommentSchema>;
export type CreateCompanyHolidayInput = z.infer<typeof CreateCompanyHolidaySchema>;
export type UpdateCompanyHolidayInput = z.infer<typeof UpdateCompanyHolidaySchema>;
export type UpdateVacationBalanceInput = z.infer<typeof UpdateVacationBalanceSchema>;
export type ApproveAbsenceInput = z.infer<typeof ApproveAbsenceSchema>;
export type RejectAbsenceInput = z.infer<typeof RejectAbsenceSchema>;
export type ApproveRejectAbsenceInput = z.infer<typeof ApproveRejectAbsenceSchema>;
export type VacationBalanceFilters = z.infer<typeof VacationBalanceFiltersSchema>;
export type HolidayFilters = z.infer<typeof HolidayFiltersSchema>;