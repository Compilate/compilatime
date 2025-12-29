import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tipos para el store
export interface User {
    id: string;
    companyId: string;
    name: string;
    email: string;
    role?: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'HR';
    avatar?: string | null;
    lastLoginAt?: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Company {
    id: string;
    name: string;
    slug: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    logo?: string | null;
    timezone: string;
    locale: string;
    settings?: any;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Employee {
    id: string;
    companyId: string;
    dni: string;
    name: string;
    surname: string;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
    department?: string | null;
    position?: string | null;
    contractType?: string | null;
    hireDate?: string | null;
    salary?: number | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TimeEntry {
    id: string;
    companyId: string;
    employeeId: string;
    type: 'IN' | 'OUT' | 'BREAK' | 'RESUME';
    timestamp: string;
    source: 'WEB' | 'MOBILE' | 'ADMIN' | 'API' | 'KIOSK';
    location?: string | null;
    deviceInfo?: string | null;
    notes?: string | null;
    createdByEmployee: boolean;
    approvedBy?: string | null;
    approvedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    employee?: {
        id: string;
        name: string;
        surname: string;
        dni: string;
    };
}

export interface AuthState {
    // Estado de autenticación
    isAuthenticated: boolean;
    user: User | null;
    company: Company | null | undefined;
    token: string | null;
    refreshToken: string | null;

    // Estado del empleado (si está logueado como empleado)
    employee: Employee | null;

    // UI State
    loading: boolean;
    error: string | null;

    // Datos del usuario
    userRole: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'HR' | null;
}

export interface AuthActions {
    // Acciones de autenticación
    login: (user: User, company: Company | null | undefined, token: string, refreshToken: string) => void;
    logout: () => void;
    updateRefreshToken: (newToken: string) => void;
    setUser: (user: User) => void;

    // Acciones de empleado
    setEmployee: (employee: Employee) => void;

    // UI Actions
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
}

// Store de autenticación
export const useAuthStore = create<AuthState & AuthActions>()(
    persist(
        (set, _get) => ({
            // Estado inicial
            isAuthenticated: false,
            user: null,
            company: null,
            token: null,
            refreshToken: null,
            employee: null,
            loading: false,
            error: null,
            userRole: null,

            // Acciones
            login: (user, company, token, refreshToken) => {
                console.log('Login action called with:', { user: user.name, company: company?.name, hasToken: !!token });
                set({
                    isAuthenticated: true,
                    user,
                    company,
                    token,
                    refreshToken,
                    error: null,
                    userRole: user.role || null,
                });
                console.log('State after login:', useAuthStore.getState());
            },

            logout: () => {
                set({
                    isAuthenticated: false,
                    user: null,
                    company: null,
                    token: null,
                    refreshToken: null,
                    employee: null,
                    error: null,
                    userRole: null,
                });
            },

            updateRefreshToken: (newToken) => {
                set({ token: newToken });
            },

            setUser: (user) => {
                set({
                    user,
                    userRole: user?.role || null
                });
            },

            setEmployee: (employee) => {
                set({ employee });
            },

            setLoading: (loading) => {
                set({ loading });
            },

            setError: (error) => {
                set({ error });
            },

            clearError: () => {
                set({ error: null });
            },
        }),
        {
            name: 'auth-storage',
            storage: typeof window !== 'undefined' ? {
                getItem: (name) => {
                    console.log('Storage getItem:', name);
                    const item = localStorage.getItem(name);
                    const parsed = item ? JSON.parse(item) : null;
                    console.log('Storage parsed:', parsed);
                    return parsed;
                },
                setItem: (name, value) => {
                    console.log('Storage setItem:', name, value);
                    localStorage.setItem(name, JSON.stringify(value));
                },
                removeItem: (name) => {
                    console.log('Storage removeItem:', name);
                    localStorage.removeItem(name);
                },
            } : undefined,
            onRehydrateStorage: () => (state) => {
                console.log('Store rehydrated:', state);
                // Asegurar consistencia del estado después de la hidratación
                if (state) {
                    // Si hay token pero isAuthenticated es false, corregirlo
                    if (state.token && !state.isAuthenticated) {
                        state.isAuthenticated = true;
                    }
                    // Si no hay token pero isAuthenticated es true, corregirlo
                    if (!state.token && state.isAuthenticated) {
                        state.isAuthenticated = false;
                        state.user = null;
                        state.company = null;
                        state.userRole = null;
                    }
                }
                return state;
            },
            // Agregar versión para forzar rehidratación si hay problemas
            version: 1,
        }
    ),
);

// Selectores para facilitar el acceso
export const useAuth = () => useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    company: state.company,
    token: state.token,
    refreshToken: state.refreshToken,
    employee: state.employee,
    loading: state.loading,
    error: state.error,
    userRole: state.userRole,
}));

export const useAuthActions = () => useAuthStore((state) => ({
    login: state.login,
    logout: state.logout,
    updateRefreshToken: state.updateRefreshToken,
    setUser: state.setUser,
    setEmployee: state.setEmployee,
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError,
}));

export default useAuthStore;