import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

// Extender Request para incluir información del usuario autenticado
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                type: 'company' | 'employee';
                companyId: string;
                data: any; // Usando any temporalmente hasta que se resuelvan los tipos de Prisma
                company?: any; // Usando any temporalmente hasta que se resuelvan los tipos de Prisma
            };
        }
    }
}

// Tipos para respuestas de la API
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

// Tipos para autenticación
export interface LoginCredentials {
    email?: string;
    dni?: string;
    password?: string;
    pin?: string;
    companySlug?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

// Tipos para filtros de búsqueda
export interface TimeEntryFilters {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    type?: 'IN' | 'OUT' | 'BREAK' | 'RESUME';
    source?: 'WEB' | 'MOBILE' | 'ADMIN' | 'API' | 'KIOSK';
}

export interface EmployeeFilters {
    active?: boolean;
    department?: string;
    position?: string;
    search?: string;
}

export interface ReportFilters {
    type: string;
    startDate: string;
    endDate: string;
    employeeIds?: string[];
    department?: string;
    format?: 'json' | 'csv' | 'pdf';
}

// Tipos para notificaciones
export interface NotificationData {
    title: string;
    message: string;
    type: string;
    recipientId?: string;
    recipientEmail?: string;
    data?: Record<string, any>;
}

// Tipos para cálculos
export interface WorkDayCalculation {
    date: string;
    startTime?: string;
    endTime?: string;
    breakMinutes: number;
    workedMinutes: number;
    overtimeMinutes: number;
    status: string;
}

export interface OvertimeCalculation {
    regularMinutes: number;
    overtimeMinutes: number;
    overtimeRate: number;
    totalOvertimeMinutes: number;
}

// Tipos para archivos
export interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
}

// Tipos para logs
export interface AuditLog {
    action: string;
    resource: string;
    resourceId: string;
    userId: string;
    companyId: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

// Tipos para configuración
export interface CompanySettings {
    timezone: string;
    locale: string;
    workDays: number[]; // 0-6 (Domingo-Sábado)
    defaultSchedule: {
        startTime: string;
        endTime: string;
        breakMinutes: number;
    };
    overtimeRules: {
        enabled: boolean;
        minMinutes: number;
        multiplier: number;
    };
    notifications: {
        emailEnabled: boolean;
        overtimeAlerts: boolean;
        absenceRequests: boolean;
    };
}

// Tipos para validación
export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

// Tipos para caché
export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    key: string;
}

// Tipos para colas
export interface QueueJob {
    id: string;
    type: string;
    data: Record<string, any>;
    priority?: number;
    attempts?: number;
    delay?: number;
    createdAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    error?: string;
}

export default Express;