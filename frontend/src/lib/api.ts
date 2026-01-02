// import { useAuth } from '../contexts/AuthContext';

// Configuración de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Tipos para las respuestas de la API
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Tipo específico para respuesta de empleados
export interface EmployeesResponse {
    employees: Array<{
        id: string;
        dni: string;
        name: string;
        surname?: string;
        email?: string;
        phone?: string;
        department?: string;
        position?: string;
        contractType?: string;
        hireDate?: string;
        salary?: number;
        active: boolean;
        createdAt: string;
        updatedAt: string;
        employeeSchedules: Array<{
            id: string;
            employeeId: string;
            scheduleId: string;
            schedule: {
                id: string;
                name: string;
                startTime: string;
                endTime: string;
                dayOfWeek?: number; // Para compatibilidad con datos antiguos
                daysOfWeek?: number[]; // Nuevo formato para múltiples días
                active: boolean;
            };
        }>;
    }>;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// Cliente API base
class ApiClient {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    // Obtener el token de autenticación del localStorage directamente
    private getAuthToken(): string | null {
        try {
            const stored = localStorage.getItem('compilatime-auth');
            if (stored) {
                const parsedData = JSON.parse(stored);
                console.log('API Client - Token desde localStorage:', !!parsedData.token);
                return parsedData.token || null;
            }
        } catch (error) {
            console.error('API Client - Error al leer token desde localStorage:', error);
        }
        console.log('API Client - No hay token en localStorage');
        return null;
    }

    // Obtener headers de autenticación
    private getAuthHeaders(): Record<string, string> {
        const token = this.getAuthToken();

        console.log('API Client - Token disponible:', !!token);
        console.log('API Client - Estado localStorage:', !!localStorage.getItem('compilatime-auth'));

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Añadir token si existe
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('API Client - Headers con token:', { ...headers, Authorization: 'Bearer [TOKEN]' });
        } else {
            console.log('API Client - Headers sin token:', headers);
            console.log('API Client - Razón: No hay token o no está autenticado');
        }

        return headers;
    }

    // Emitir evento de error de autenticación
    private emitAuthError() {
        console.log('API Client - Emitiendo evento AUTH_ERROR');
        const event = new CustomEvent('AUTH_ERROR', { detail: 'AUTH_ERROR' });
        window.dispatchEvent(event);
    }

    // Método genérico para hacer peticiones JSON
    private async requestJson<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseURL}${endpoint}`;

        // Obtener headers de autenticación
        const headers = {
            ...this.getAuthHeaders(),
            ...options.headers,
        };

        console.log(`🔄 [API Client] Request: ${options.method || 'GET'} ${url}`);
        console.log('🔄 [API Client] Request headers:', headers);
        console.log('🔄 [API Client] Request body:', options.body);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            const data = await response.json();

            console.log('🔄 [API Client] Response:', response.status, data);

            // Manejar errores de autenticación
            if (response.status === 401) {
                console.warn('API Client - Error 401: Token inválido o expirado');

                // Limpiar datos de autenticación
                try {
                    localStorage.removeItem('compilatime-auth');
                    console.log('API Client - Datos de autenticación eliminados por 401');
                } catch (error) {
                    console.error('API Client - Error al limpiar localStorage:', error);
                }

                // Emitir evento para que los componentes puedan manejar el error
                this.emitAuthError();

                throw new Error(data.error || data.message || 'Token de autenticación requerido');
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Método genérico para hacer peticiones Blob
    private async requestBlob(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<Blob> {
        const url = `${this.baseURL}${endpoint}`;

        // Obtener headers de autenticación
        const headers = {
            ...this.getAuthHeaders(),
            ...options.headers,
        };

        console.log(`🔄 [API Client] Request: ${options.method || 'GET'} ${url}`);
        console.log('🔄 [API Client] Request headers:', headers);
        console.log('🔄 [API Client] Request body:', options.body);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            if (!response.ok) {
                // Intentar leer el error como JSON
                const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
                throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.blob();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Métodos HTTP
    async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
        const url = new URL(`${this.baseURL}${endpoint}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }

        return this.requestJson<T>(url.pathname + url.search, {
            method: 'GET',
        });
    }

    // Método para obtener un blob (archivo)
    async getBlob(endpoint: string, params?: Record<string, any>): Promise<Blob> {
        const url = new URL(`${this.baseURL}${endpoint}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }

        return this.requestBlob(url.pathname + url.search, {
            method: 'GET',
        });
    }

    async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
        return this.requestJson<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
        return this.requestJson<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
        return this.requestJson<T>(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        console.log('🔄 [API Client] DELETE request a:', endpoint);
        return this.requestJson<T>(endpoint, {
            method: 'DELETE',
        });
    }

    // Método para subir archivos
    async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
        const formData = new FormData();
        formData.append('file', file);

        if (additionalData) {
            Object.entries(additionalData).forEach(([key, value]) => {
                formData.append(key, String(value));
            });
        }

        const headers = this.getAuthHeaders();
        // Eliminar Content-Type para que el navegador lo establezca automáticamente con boundary
        delete headers['Content-Type'];

        return this.requestJson<T>(endpoint, {
            method: 'POST',
            body: formData,
            headers,
        });
    }

    // Método para descargar archivos
    async download(endpoint: string, filename?: string): Promise<void> {
        const url = `${this.baseURL}${endpoint}`;
        const headers = this.getAuthHeaders();

        try {
            const response = await fetch(url, {
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download Error:', error);
            throw error;
        }
    }
}

// Crear instancia del cliente API
export const apiClient = new ApiClient(API_BASE_URL);

// Servicios de API específicos
export const authApi = {
    // Autenticación de empresa
    companyLogin: (data: { companySlug: string; email: string; password: string }) =>
        apiClient.post('/api/auth/company/login', data),

    companyLoginWithoutSlug: (data: { email: string; password: string }) =>
        apiClient.post('/api/auth/company/login-without-slug', data),

    companyLogout: () =>
        apiClient.post('/api/auth/company/logout'),

    getCompanyMe: () =>
        apiClient.get('/api/auth/company/me'),

    // Autenticación de empleado
    employeeLogin: (data: { companySlug: string; dni: string; pin: string }) =>
        apiClient.post('/api/auth/employee/login', data),

    employeeLoginMultiCompany: (data: { companyId: string; dni: string; pin: string }) =>
        apiClient.post('/api/auth/employee/login-multi-company', data),

    employeeLogout: () =>
        apiClient.post('/api/auth/employee/logout'),

    getEmployeeMe: () =>
        apiClient.get('/api/auth/employee/me'),

    // Obtener empresas de un empleado
    getEmployeeCompanies: (dni: string) =>
        apiClient.post('/api/auth/employee/companies', { dni }),
};

export const companyApi = {
    getCompanies: (params?: { page?: number; limit?: number; search?: string }) =>
        apiClient.get<PaginatedResponse<any>>('/api/companies', params),

    getCompany: (id: string) =>
        apiClient.get(`/api/companies/${id}`),

    getCompanyBySlug: (slug: string) =>
        apiClient.get(`/api/companies/by-slug/${slug}`),

    createCompany: (data: any) =>
        apiClient.post('/api/companies', data),

    updateCompany: (id: string, data: any) =>
        apiClient.put(`/api/companies/${id}`, data),

    deleteCompany: (id: string) =>
        apiClient.delete(`/api/companies/${id}`),
};

export const employeeApi = {
    getEmployees: (params?: {
        page?: number;
        limit?: number;
        search?: string;
        department?: string;
        active?: boolean;
    }) =>
        apiClient.get<EmployeesResponse>('/api/employees', params),

    getEmployee: (id: string) =>
        apiClient.get<{ employee: any }>(`/api/employees/${id}`),

    createEmployee: (data: any) =>
        apiClient.post('/api/employees', data),

    updateEmployee: (id: string, data: any) => {
        console.log('API Client - updateEmployee llamado con ID:', id);
        console.log('API Client - updateEmployee datos:', data);
        return apiClient.put(`/api/employees/${id}`, data);
    },

    deleteEmployee: (id: string) =>
        apiClient.delete(`/api/employees/${id}`),

    assignSchedule: (employeeId: string, scheduleId: string) =>
        apiClient.post(`/api/employees/${employeeId}/schedules`, { scheduleId }),

    removeSchedule: (employeeId: string, scheduleId: string) =>
        apiClient.delete(`/api/employees/${employeeId}/schedules/${scheduleId}`),

    // Métodos para gestión de horarios de empleados
    getEmployeeSchedules: (employeeId: string) =>
        apiClient.get<any[]>(`/api/employees/${employeeId}/schedules`),

    assignScheduleToEmployee: (employeeId: string, scheduleId: string) =>
        apiClient.post(`/api/employees/${employeeId}/assign-schedule`, { scheduleId }),

    removeScheduleFromEmployee: (employeeScheduleId: string) => {
        console.log('API Client - removeScheduleFromEmployee llamado con ID:', employeeScheduleId);
        return apiClient.delete(`/api/employee-schedules/${employeeScheduleId}`);
    },

    // Horarios diarios y semanales
    getDailySchedule: (employeeId: string, date: string) => {
        // Validar que employeeId no sea undefined ni una cadena vacía
        if (!employeeId || employeeId.trim() === '') {
            console.warn('⚠️ getDailySchedule - employeeId es undefined o vacío, no se hará la petición');
            return Promise.reject(new Error('employeeId es requerido'));
        }
        return apiClient.get(`/api/employees/${employeeId}/daily-schedule/${date}`);
    },

    getWeeklySchedule: (employeeId: string, startDate: string) =>
        apiClient.get(`/api/employees/${employeeId}/weekly-schedule/${startDate}`),

    // Horarios propios del empleado autenticado
    getMyDailySchedule: (date: string) =>
        apiClient.get(`/api/employees/me/daily-schedule/${date}`),

    getMyWeeklySchedule: (startDate: string) => {
        return apiClient.get(`/api/employees/me/weekly-schedule/${startDate}`);
    },

    // Actualizar datos personales
    updateMyProfile: (data: {
        name?: string;
        surname?: string;
        email?: string;
        phone?: string;
    }) =>
        apiClient.put('/api/employees/me/profile', data),

    // Cambiar PIN
    changeMyPin: (data: { currentPin: string; newPin: string }) =>
        apiClient.post('/api/employees/me/change-pin', data),
};

export const scheduleApi = {
    getSchedules: (params?: { page?: number; limit?: number; dayOfWeek?: number }) =>
        apiClient.get<{ schedules: any[], pagination: any }>('/api/schedules', params),

    getSchedule: (id: string) =>
        apiClient.get(`/api/schedules/${id}`),

    createSchedule: (data: any) =>
        apiClient.post('/api/schedules', data),

    updateSchedule: (id: string, data: any) =>
        apiClient.put(`/api/schedules/${id}`, data),

    deleteSchedule: (id: string, force: boolean = false) => {
        const url = force ? `/api/schedules/${id}?force=true` : `/api/schedules/${id}`;
        return apiClient.delete(url);
    },
};

export const timeEntryApi = {
    // Fichaje rápido (público)
    punch: (data: {
        companySlug?: string;
        dni?: string;
        pin?: string;
        type: 'IN' | 'OUT' | 'BREAK' | 'RESUME';
        breakTypeId?: string;
        breakReason?: string;
        isRemoteWork?: boolean;
        latitude?: number;
        longitude?: number;
    }) =>
        apiClient.post('/api/time-entries/punch', data),

    // Gestión de registros (admin)
    getTimeEntries: (params?: {
        page?: number;
        limit?: number;
        employeeId?: string;
        from?: string;
        to?: string;
        type?: string;
    }) =>
        apiClient.get<{
            timeEntries: Array<{
                id: string;
                employee: {
                    id: string;
                    name: string;
                    surname?: string;
                    dni: string;
                };
                type: 'IN' | 'OUT' | 'BREAK' | 'RESUME';
                timestamp: string;
                source: string;
                location?: string;
                deviceInfo?: string;
                notes?: string;
                createdByEmployee: boolean;
                createdAt: string;
                updatedAt: string;
                breakTypeId?: string;
                breakType?: {
                    id: string;
                    name: string;
                    color: string;
                    description?: string;
                };
                breakReason?: string;
            }>;
            pagination: {
                page: number;
                limit: number;
                total: number;
                pages: number;
            };
        }>('/api/time-entries', params),

    getTimeEntry: (id: string) =>
        apiClient.get(`/api/time-entries/${id}`),

    createTimeEntry: (data: any) =>
        apiClient.post('/api/time-entries', data),

    updateTimeEntry: (id: string, data: any) => {
        // Extraer el motivo del objeto data para enviarlo por separado
        const { reason, ...updateData } = data;

        // El backend espera el motivo como un campo separado en el cuerpo
        return apiClient.put(`/api/time-entries/${id}`, {
            ...updateData,
            reason
        });
    },

    deleteTimeEntry: (id: string, reason?: string) => {
        const url = reason ? `/api/time-entries/${id}?reason=${encodeURIComponent(reason)}` : `/api/time-entries/${id}`;
        return apiClient.delete(url);
    },

    // Continuar una pausa existente
    continueBreak: (data: {
        employeeId: string;
        timestamp?: string;
        source?: string;
        location?: string;
        latitude?: number;
        longitude?: number;
        isRemoteWork?: boolean;
        deviceInfo?: string;
        notes?: string;
    }) =>
        apiClient.post('/api/time-entries/continue-break', data),

    // Exportación
    exportTimeEntries: (_params: any) =>
        apiClient.download('/api/time-entries/export', 'time-entries.csv'),

    // Estadísticas
    getTimeEntriesStats: (params?: { from?: string; to?: string }) =>
        apiClient.get('/api/time-entries/stats', params),

    getDailyTimeEntries: (date: string) =>
        apiClient.get(`/api/time-entries/daily/${date}`),

    // Mis registros (empleado)
    getMyTimeEntries: (params?: { from?: string; to?: string }) =>
        apiClient.get<{
            timeEntries: Array<{
                id: string;
                employee: {
                    id: string;
                    name: string;
                    surname?: string;
                    dni: string;
                };
                type: 'IN' | 'OUT' | 'BREAK' | 'RESUME';
                timestamp: string;
                source: string;
                location?: string;
                deviceInfo?: string;
                notes?: string;
                createdByEmployee: boolean;
                createdAt: string;
                updatedAt: string;
            }>;
            pagination: {
                page: number;
                limit: number;
                total: number;
                pages: number;
            };
        }>('/api/me/time-entries', params),

    // Obtener estado actual del fichaje
    getMyPunchState: () =>
        apiClient.get<{
            canPunchIn: boolean;
            canPunchOut: boolean;
            canStartBreak: boolean;
            canResumeBreak: boolean;
            currentState: 'IN' | 'OUT' | 'BREAK' | 'RESUME' | null;
            lastEntry: any | null;
            todayEntries: any[];
        }>('/api/me/time-entries/state'),
};

export const dashboardApi = {
    getDashboardStats: () =>
        apiClient.get('/api/dashboard/stats'),

    getRecentTimeEntries: (limit?: number) =>
        apiClient.get('/api/dashboard/recent-time-entries', { limit }),

    getActiveEmployees: () =>
        apiClient.get('/api/dashboard/active-employees'),
};

export const weeklyScheduleApi = {
    // Obtener asignaciones semanales de un empleado
    getEmployeeWeeklySchedules: (employeeId: string, weekStart: string) =>
        apiClient.get(`/api/weekly-schedules/employee/${employeeId}`, { weekStart }),

    // Obtener asignaciones semanales de toda la empresa
    getCompanyWeeklySchedules: (weekStart: string) =>
        apiClient.get('/api/weekly-schedules/company', { weekStart }),

    // Crear o actualizar asignación semanal
    upsertWeeklySchedule: (data: {
        employeeId: string;
        weekStart: string;
        dayOfWeek: number;
        scheduleId: string | null;
        notes?: string;
        active?: boolean;
    }) =>
        apiClient.post('/api/weekly-schedules', data),

    // Eliminar asignación semanal
    deleteWeeklySchedule: (id: string) => {
        console.log('🔄 [API Client] deleteWeeklySchedule llamado con ID:', id);
        return apiClient.delete(`/api/weekly-schedules/${id}`);
    },

    // Copiar configuración de una semana a otra
    copyWeekToWeek: (data: {
        sourceWeekStart: string;
        targetWeekStart: string;
        employeeIds?: string[];
    }) => {
        // Convertir los nombres de campos para que coincidan con el backend
        const backendData = {
            fromWeekStart: data.sourceWeekStart,
            toWeekStart: data.targetWeekStart,
            employeeIds: data.employeeIds
        };
        return apiClient.post('/api/weekly-schedules/copy-week', backendData);
    },

    // Crear plantilla semanal
    createWeeklyTemplate: (data: {
        name: string;
        description?: string;
    }) =>
        apiClient.post('/api/weekly-schedules/templates', data),

    // Obtener plantillas semanales
    getWeeklyTemplates: () =>
        apiClient.get('/api/weekly-schedules/templates'),

    // Aplicar plantilla a una semana
    applyWeeklyTemplate: (data: {
        templateId: string;
        weekStart: string;
        employeeIds?: string[];
    }) =>
        apiClient.post('/api/weekly-schedules/apply-template', data),

    // Obtener resumen de horas semanales
    getWeeklyHoursSummary: (weekStart: string, employeeIds?: string[]) =>
        apiClient.get('/api/weekly-schedules/hours-summary', { weekStart, employeeIds }),

    // Exportar calendario semanal a CSV
    exportWeeklySchedule: (weekStart: string) => {
        // Para exportación, necesitamos usar window.location o crear un link de descarga
        const token = localStorage.getItem('compilatime-auth');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

        return fetch(`${apiUrl}/api/weekly-schedules/export?weekStart=${weekStart}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al exportar calendario');
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `calendario-semanal-${weekStart}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            });
    },
};

export const reportsApi = {
    // Reporte de horas trabajadas
    getTimeReport: (filters: {
        companyId?: string;
        employeeIds?: string[];
        startDate: string;
        endDate: string;
        groupBy?: 'day' | 'week' | 'month';
    }) =>
        apiClient.get('/api/reports/time', filters),

    // Reporte de asistencia
    getAttendanceReport: (filters: {
        companyId?: string;
        employeeIds?: string[];
        startDate: string;
        endDate: string;
    }) =>
        apiClient.get('/api/reports/attendance', filters),

    // Reporte resumido por empleado
    getEmployeeSummaryReport: (filters: {
        companyId?: string;
        employeeIds?: string[];
        startDate: string;
        endDate: string;
    }) =>
        apiClient.get('/api/reports/employee-summary', filters),

    // Reporte mensual consolidado
    getMonthlyReport: (filters: {
        companyId?: string;
        employeeIds?: string[];
        startDate: string;
        endDate: string;
    }) =>
        apiClient.get('/api/reports/monthly', filters),

    // Exportación de reportes
    exportReport: (reportType: string, filters: any, format: 'csv' | 'pdf' | 'excel') => {
        const token = localStorage.getItem('compilatime-auth');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

        const params = new URLSearchParams();
        params.append('format', format);
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, v));
                } else {
                    params.append(key, String(value));
                }
            }
        });

        return fetch(`${apiUrl}/api/reports/${reportType}/export?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al exportar reporte');
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `reporte-${reportType}-${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            });
    },
};

export default apiClient;