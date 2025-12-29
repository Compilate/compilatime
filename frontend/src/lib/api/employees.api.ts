import { apiClient } from '../api';

export interface Employee {
    id: string;
    dni: string;
    name: string;
    surname?: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface EmployeesResponse {
    employees: Employee[];
    total: number;
    page: number;
    totalPages: number;
}

export interface CreateEmployeeData {
    dni: string;
    name: string;
    surname?: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string;
    pin?: string;
    password?: string;
    active?: boolean;
}

export interface UpdateEmployeeData {
    name?: string;
    surname?: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string;
    pin?: string;
    password?: string;
    active?: boolean;
}

export const employeesApi = {
    /**
     * Obtener todos los empleados
     */
    async getEmployees(filters?: {
        search?: string;
        department?: string;
        active?: boolean;
        offset?: number;
        limit?: number;
    }): Promise<EmployeesResponse> {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        const response = await apiClient.get(`/api/employees?${params.toString()}`);
        return response.data as EmployeesResponse;
    },

    /**
     * Obtener un empleado por ID
     */
    async getEmployeeById(id: string): Promise<Employee> {
        const response = await apiClient.get(`/api/employees/${id}`);
        return response.data as Employee;
    },

    /**
     * Crear un nuevo empleado
     */
    async createEmployee(data: CreateEmployeeData): Promise<Employee> {
        const response = await apiClient.post('/api/employees', data);
        return response.data as Employee;
    },

    /**
     * Actualizar un empleado
     */
    async updateEmployee(id: string, data: UpdateEmployeeData): Promise<Employee> {
        const response = await apiClient.put(`/api/employees/${id}`, data);
        return response.data as Employee;
    },

    /**
     * Eliminar un empleado (baja lógica)
     */
    async deleteEmployee(id: string): Promise<{ success: boolean }> {
        const response = await apiClient.delete(`/api/employees/${id}`);
        return response.data as { success: boolean; };
    },

    /**
     * Activar un empleado
     */
    async activateEmployee(id: string): Promise<Employee> {
        const response = await apiClient.post(`/api/employees/${id}/activate`);
        return response.data as Employee;
    },

    /**
     * Desactivar un empleado
     */
    async deactivateEmployee(id: string): Promise<Employee> {
        const response = await apiClient.post(`/api/employees/${id}/deactivate`);
        return response.data as Employee;
    },

    /**
     * Resetear PIN de un empleado
     */
    async resetPin(id: string): Promise<{ pin: string }> {
        const response = await apiClient.post(`/api/employees/${id}/reset-pin`);
        return response.data as { pin: string; };
    },

    /**
     * Exportar empleados a CSV
     */
    async exportEmployees(filters?: {
        search?: string;
        department?: string;
        active?: boolean;
    }): Promise<void> {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        const response = await apiClient.get(`/api/employees/export?${params.toString()}`, {
            responseType: 'blob'
        });

        // Crear un enlace temporal para descargar el archivo
        const blob = new Blob([response.data as BlobPart], { type: 'text/csv' });
        const urlObject = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = urlObject;
        link.download = `empleados_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(urlObject);
    },
};