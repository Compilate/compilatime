import api from '../api';

export interface BreakType {
    id: string;
    companyId: string;
    name: string;
    description?: string;
    color: string;
    active: boolean;
    requiresReason: boolean;
    maxMinutes?: number;
    customName?: string;
    isCustom?: boolean;
    createdAt: string;
    updatedAt: string;
    displayName?: string; // Propiedad computada para mostrar el nombre correcto
}

export interface BreakTypeStats {
    breakType: BreakType;
    totalMinutes: number;
    totalHours: number;
    entryCount: number;
    employeeCount: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export const breakTypesApi = {
    // Obtener todos los tipos de pausa de la empresa
    getBreakTypes: async (): Promise<ApiResponse<{ breakTypes: BreakType[] }>> => {
        const response = await api.get('/api/break-types');
        return response as ApiResponse<{ breakTypes: BreakType[] }>;
    },

    // Obtener un tipo de pausa por ID
    getBreakTypeById: async (id: string): Promise<ApiResponse<{ breakType: BreakType }>> => {
        const response = await api.get(`/api/break-types/${id}`);
        return response as ApiResponse<{ breakType: BreakType }>;
    },

    // Crear un nuevo tipo de pausa
    createBreakType: async (data: {
        name: string;
        description?: string;
        color?: string;
        requiresReason?: boolean;
        maxMinutes?: number;
        customName?: string;
        isCustom?: boolean;
    }): Promise<ApiResponse<{ breakType: BreakType }>> => {
        const response = await api.post('/api/break-types', data);
        return response as ApiResponse<{ breakType: BreakType }>;
    },

    // Crear un tipo de pausa personalizado
    createCustomBreakType: async (data: {
        customName: string;
        description?: string;
        color?: string;
        requiresReason?: boolean;
        maxMinutes?: number;
    }): Promise<ApiResponse<{ breakType: BreakType }>> => {
        const response = await api.post('/api/break-types/custom', data);
        return response as ApiResponse<{ breakType: BreakType }>;
    },

    // Actualizar un tipo de pausa
    updateBreakType: async (id: string, data: {
        name?: string;
        description?: string;
        color?: string;
        active?: boolean;
        requiresReason?: boolean;
        maxMinutes?: number;
        customName?: string;
        isCustom?: boolean;
    }): Promise<ApiResponse<{ breakType: BreakType }>> => {
        const response = await api.put(`/api/break-types/${id}`, data);
        return response as ApiResponse<{ breakType: BreakType }>;
    },

    // Eliminar un tipo de pausa
    deleteBreakType: async (id: string): Promise<ApiResponse<{ message: string }>> => {
        const response = await api.delete(`/api/break-types/${id}`);
        return response as ApiResponse<{ message: string }>;
    },

    // Obtener estadísticas de tiempo por tipo de pausa
    getBreakTypeStats: async (filters?: {
        employeeId?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<ApiResponse<{ stats: BreakTypeStats[] }>> => {
        const params = new URLSearchParams();
        if (filters?.employeeId) params.append('employeeId', filters.employeeId);
        if (filters?.fromDate) params.append('fromDate', filters.fromDate);
        if (filters?.toDate) params.append('toDate', filters.toDate);

        const response = await api.get(`/api/break-types/stats?${params.toString()}`);
        return response as ApiResponse<{ stats: BreakTypeStats[] }>;
    },
};
