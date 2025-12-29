import { apiClient } from '../api';

// Tipos para el módulo de ausencias
export interface Absence {
    id: string;
    companyId: string;
    employeeId: string;
    type: AbsenceType;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string;
    status: AbsenceStatus;
    approvedBy?: string;
    approvedAt?: string;
    notes?: string;
    halfDay?: boolean;
    startHalfDay?: 'morning' | 'afternoon';
    endHalfDay?: 'morning' | 'afternoon';
    attachments?: any;
    requestedById?: string;
    rejectionReason?: string;
    emergencyContact?: string;
    backupEmployeeId?: string;
    calendarEventId?: string;
    createdAt: string;
    updatedAt: string;
    employee?: {
        id: string;
        dni: string;
        name: string;
        surname?: string;
        department?: string;
        position?: string;
    };
}

export interface AbsenceRequest {
    id: string;
    companyId: string;
    employeeId: string;
    absenceId?: string;
    type: AbsenceType;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string;
    status: AbsenceStatus;
    requestedById?: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    attachments?: any;
    emergencyContact?: string;
    backupEmployeeId?: string;
    createdAt: string;
    updatedAt: string;
    employee?: {
        id: string;
        dni: string;
        name: string;
        surname?: string;
        department?: string;
        position?: string;
    };
}

export interface VacationPolicy {
    id: string;
    companyId: string;
    name: string;
    description?: string;
    yearlyDays: number;
    probationDays: number;
    maxCarryOverDays: number;
    minNoticeDays: number;
    requiresApproval: boolean;
    allowHalfDays: boolean;
    restrictByDepartment: boolean;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface VacationBalance {
    id: string;
    companyId: string;
    employeeId: string;
    policyId: string;
    year: number;
    totalDays: number;
    usedDays: number;
    pendingDays: number;
    carriedOverDays: number;
    adjustedDays: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    policy?: {
        id: string;
        name: string;
        yearlyDays: number;
        maxCarryOverDays: number;
    };
}

export interface CompanyHoliday {
    id: string;
    companyId: string;
    name: string;
    date: string;
    type: HolidayType;
    recurring: boolean;
    active: boolean;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AbsenceComment {
    id: string;
    absenceId: string;
    authorId: string;
    authorType: 'employee' | 'manager';
    comment: string;
    isInternal: boolean;
    createdAt: string;
}

export interface AbsenceStats {
    total: number;
    byStatus: {
        pending: number;
        approved: number;
        rejected: number;
    };
    byType: Record<string, {
        count: number;
        days: number;
    }>;
    byMonth: Array<{
        month: number;
        year: number;
        count: number;
        total_days: number;
    }>;
}

export interface AbsenceFilters {
    employeeId?: string;
    type?: AbsenceType | string;
    status?: AbsenceStatus | string;
    startDate?: string;
    endDate?: string;
    offset?: number;
    limit?: number;
}

export interface CreateAbsenceData {
    employeeId: string;
    type: AbsenceType;
    startDate: string;
    endDate: string;
    reason?: string;
    halfDay?: boolean;
    startHalfDay?: 'morning' | 'afternoon';
    endHalfDay?: 'morning' | 'afternoon';
    notes?: string;
    emergencyContact?: string;
    backupEmployeeId?: string;
}

export interface UpdateAbsenceData {
    type?: AbsenceType;
    startDate?: string;
    endDate?: string;
    reason?: string;
    halfDay?: boolean;
    startHalfDay?: 'morning' | 'afternoon';
    endHalfDay?: 'morning' | 'afternoon';
    notes?: string;
    emergencyContact?: string;
    backupEmployeeId?: string;
}

export interface CreateAbsenceRequestData {
    employeeId: string;
    type: AbsenceType;
    startDate: string;
    endDate: string;
    reason?: string;
    halfDay?: boolean;
    startHalfDay?: 'morning' | 'afternoon';
    endHalfDay?: 'morning' | 'afternoon';
    notes?: string;
    emergencyContact?: string;
    backupEmployeeId?: string;
}

export interface CreateVacationPolicyData {
    name: string;
    description?: string;
    yearlyDays: number;
    probationDays: number;
    maxCarryOverDays: number;
    minNoticeDays: number;
    requiresApproval: boolean;
    allowHalfDays: boolean;
    restrictByDepartment: boolean;
}

export interface UpdateVacationPolicyData {
    name?: string;
    description?: string;
    yearlyDays?: number;
    probationDays?: number;
    maxCarryOverDays?: number;
    minNoticeDays?: number;
    requiresApproval?: boolean;
    allowHalfDays?: boolean;
    restrictByDepartment?: boolean;
    active?: boolean;
}

export interface CreateCompanyHolidayData {
    name: string;
    date: string;
    type: HolidayType;
    recurring: boolean;
    description?: string;
}

export interface UpdateCompanyHolidayData {
    name?: string;
    date?: string;
    type?: HolidayType;
    recurring?: boolean;
    active?: boolean;
    description?: string;
}

export interface CreateAbsenceCommentData {
    comment: string;
    isInternal?: boolean;
}

export interface AbsencesResponse {
    absences: Absence[];
    total: number;
    page: number;
    totalPages: number;
}

export interface AbsenceRequestsResponse {
    requests: AbsenceRequest[];
    total: number;
    page: number;
    totalPages: number;
}

export interface CompanyHolidaysResponse {
    holidays: CompanyHoliday[];
    total: number;
    page: number;
    totalPages: number;
}

// Enums
export enum AbsenceType {
    VACATION = 'VACATION',
    SICK_LEAVE = 'SICK_LEAVE',
    PERSONAL = 'PERSONAL',
    MATERNITY = 'MATERNITY',
    PATERNITY = 'PATERNITY',
    BEREAVEMENT = 'BEREAVEMENT',
    UNPAID = 'UNPAID',
    TRAINING = 'TRAINING',
}

export enum AbsenceStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
}

export enum HolidayType {
    PUBLIC = 'PUBLIC',
    COMPANY = 'COMPANY',
    RELIGIOUS = 'RELIGIOUS',
}

// API Client para ausencias
export const absencesApi = {
    // ==================== AUSENCIAS ====================

    /**
     * Obtener ausencias con filtros
     */
    async getAbsences(filters?: AbsenceFilters): Promise<AbsencesResponse> {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        const response = await apiClient.get(`/api/absences?${params.toString()}`);
        return response.data as AbsencesResponse;
    },

    /**
     * Obtener una ausencia por ID
     */
    async getAbsenceById(id: string): Promise<Absence> {
        const response = await apiClient.get(`/api/absences/${id}`);
        return response.data as Absence;
    },

    /**
     * Obtener ausencias del empleado autenticado
     */
    async getMyAbsences(): Promise<Absence[]> {
        const response = await apiClient.get('/api/absences/my');
        return response.data as Absence[];
    },

    /**
     * Crear una nueva ausencia
     */
    async createAbsence(data: CreateAbsenceData): Promise<Absence> {
        const response = await apiClient.post('/api/absences', data);
        return response.data as Absence;
    },

    /**
     * Actualizar una ausencia
     */
    async updateAbsence(id: string, data: UpdateAbsenceData): Promise<Absence> {
        const response = await apiClient.put(`/api/absences/${id}`, data);
        return response.data as Absence;
    },

    /**
     * Eliminar una ausencia
     */
    async deleteAbsence(id: string): Promise<{ success: boolean }> {
        const response = await apiClient.delete(`/api/absences/${id}`);
        return response.data as { success: boolean; };
    },

    /**
     * Aprobar una ausencia
     */
    async approveAbsence(id: string, reason?: string): Promise<Absence> {
        const response = await apiClient.post(`/api/absences/${id}/approve`, { reason });
        return response.data as Absence;
    },

    /**
     * Rechazar una ausencia
     */
    async rejectAbsence(id: string, rejectionReason: string): Promise<Absence> {
        const response = await apiClient.post(`/api/absences/${id}/reject`, { rejectionReason });
        return response.data as Absence;
    },

    // ==================== SOLICITUDES DE AUSENCIA ====================

    /**
     * Obtener solicitudes de ausencia
     */
    async getAbsenceRequests(filters?: AbsenceFilters): Promise<AbsenceRequestsResponse> {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        const response = await apiClient.get(`/api/absences/requests?${params.toString()}`);
        return response.data as AbsenceRequestsResponse;
    },

    /**
     * Crear una solicitud de ausencia
     */
    async createAbsenceRequest(data: CreateAbsenceRequestData): Promise<AbsenceRequest> {
        const response = await apiClient.post('/api/absences/requests', data);
        return response.data as AbsenceRequest;
    },

    /**
     * Actualizar una solicitud de ausencia
     */
    async updateAbsenceRequest(id: string, data: Partial<CreateAbsenceRequestData>): Promise<AbsenceRequest> {
        const response = await apiClient.put(`/api/absences/requests/${id}`, data);
        return response.data as AbsenceRequest;
    },

    /**
     * Aprobar una solicitud de ausencia
     */
    async approveAbsenceRequest(id: string, reason?: string): Promise<{ absence: Absence; request: AbsenceRequest }> {
        const response = await apiClient.post(`/api/absences/requests/${id}/approve`, { reason });
        return response.data as { absence: Absence; request: AbsenceRequest; };
    },

    /**
     * Rechazar una solicitud de ausencia
     */
    async rejectAbsenceRequest(id: string, rejectionReason: string): Promise<AbsenceRequest> {
        const response = await apiClient.post(`/api/absences/requests/${id}/reject`, { rejectionReason });
        return response.data as AbsenceRequest;
    },

    // ==================== POLÍTICAS DE VACACIONES ====================

    /**
     * Obtener políticas de vacaciones
     */
    async getVacationPolicies(): Promise<VacationPolicy[]> {
        const response = await apiClient.get('/api/absences/policies');
        return response.data as VacationPolicy[];
    },

    /**
     * Crear una política de vacaciones
     */
    async createVacationPolicy(data: CreateVacationPolicyData): Promise<VacationPolicy> {
        const response = await apiClient.post('/api/absences/policies', data);
        return response.data as VacationPolicy;
    },

    /**
     * Actualizar una política de vacaciones
     */
    async updateVacationPolicy(id: string, data: UpdateVacationPolicyData): Promise<VacationPolicy> {
        const response = await apiClient.put(`/api/absences/policies/${id}`, data);
        return response.data as VacationPolicy;
    },

    /**
     * Eliminar una política de vacaciones
     */
    async deleteVacationPolicy(id: string): Promise<{ success: boolean }> {
        const response = await apiClient.delete(`/api/absences/policies/${id}`);
        return response.data as { success: boolean; };
    },

    // ==================== BALANCE DE VACACIONES ====================

    /**
     * Obtener balances de vacaciones de múltiples empleados
     */
    async getVacationBalances(filters?: {
        employeeId?: string;
        year?: number;
    }): Promise<VacationBalance[]> {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        const response = await apiClient.get(`/api/absences/balances?${params.toString()}`);
        return response.data as VacationBalance[];
    },

    /**
     * Obtener balance de vacaciones de un empleado
     */
    async getVacationBalance(employeeId: string, year?: number): Promise<VacationBalance> {
        const params = year ? `?year=${year}` : '';
        const response = await apiClient.get(`/api/absences/balance/${employeeId}${params}`);
        return response.data as VacationBalance;
    },

    /**
     * Inicializar balance de vacaciones para un empleado
     */
    async initializeVacationBalance(employeeId: string, year: number, policyId?: string): Promise<VacationBalance> {
        const response = await apiClient.post(`/api/absences/balance/${employeeId}/initialize`, {
            year,
            policyId,
        });
        return response.data as VacationBalance;
    },

    /**
     * Actualizar balance de vacaciones
     */
    async updateVacationBalance(balanceId: string, year: number, data: {
        totalDays?: number;
        carriedOverDays?: number;
        usedDays?: number;
        pendingDays?: number;
        adjustedDays?: number;
        notes?: string;
    }): Promise<VacationBalance> {
        const response = await apiClient.put(`/api/absences/balance/${balanceId}`, {
            year,
            ...data,
        });
        return response.data as VacationBalance;
    },

    // ==================== FESTIVOS DE LA EMPRESA ====================

    /**
     * Obtener festivos de la empresa
     */
    async getCompanyHolidays(filters?: {
        startDate?: string;
        endDate?: string;
        offset?: number;
        limit?: number;
    }): Promise<CompanyHolidaysResponse> {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        const response = await apiClient.get(`/api/absences/holidays?${params.toString()}`);
        return response.data as CompanyHolidaysResponse;
    },

    /**
     * Crear un festivo de la empresa
     */
    async createCompanyHoliday(data: CreateCompanyHolidayData): Promise<CompanyHoliday> {
        const response = await apiClient.post('/api/absences/holidays', data);
        return response.data as CompanyHoliday;
    },

    /**
     * Actualizar un festivo de la empresa
     */
    async updateCompanyHoliday(id: string, data: UpdateCompanyHolidayData): Promise<CompanyHoliday> {
        const response = await apiClient.put(`/api/absences/holidays/${id}`, data);
        return response.data as CompanyHoliday;
    },

    /**
     * Eliminar un festivo de la empresa
     */
    async deleteCompanyHoliday(id: string): Promise<{ success: boolean }> {
        const response = await apiClient.delete(`/api/absences/holidays/${id}`);
        return response.data as { success: boolean; };
    },

    // ==================== COMENTARIOS DE AUSENCIA ====================

    /**
     * Agregar un comentario a una ausencia
     */
    async addAbsenceComment(absenceId: string, data: CreateAbsenceCommentData): Promise<AbsenceComment> {
        const response = await apiClient.post(`/api/absences/${absenceId}/comments`, data);
        return response.data as AbsenceComment;
    },

    /**
     * Obtener comentarios de una ausencia
     */
    async getAbsenceComments(absenceId: string): Promise<AbsenceComment[]> {
        const response = await apiClient.get(`/api/absences/${absenceId}/comments`);
        return response.data as AbsenceComment[];
    },

    // ==================== ESTADÍSTICAS ====================

    /**
     * Obtener estadísticas de ausencias
     */
    async getAbsenceStats(filters?: AbsenceFilters): Promise<AbsenceStats> {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        const response = await apiClient.get(`/api/absences/stats?${params.toString()}`);
        return response.data as AbsenceStats;
    },

    /**
     * Exportar ausencias a CSV
     */
    async exportAbsences(filters?: string): Promise<void> {
        const url = filters ? `/api/absences/export?${filters}` : '/api/absences/export';
        const response = await apiClient.get(url, { responseType: 'blob' });

        // Crear un enlace temporal para descargar el archivo
        const blob = new Blob([response.data as BlobPart], { type: 'text/csv' });
        const urlObject = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = urlObject;
        link.download = `ausencias_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(urlObject);
    },
};