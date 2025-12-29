import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import api, { authApi } from '../lib/api';
import { initializeSession } from '../lib/routeEncryption';

// Tipos para el contexto
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

// Tipos para empleados multi-empresa
export interface EmployeeCompanies {
    employeeId: string;
    companies: Array<{
        id: string;
        name: string;
        slug: string;
        employeeCode: string;
        department: string;
        position: string;
        active: boolean;
    }>;
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
    latitude?: number | null;
    longitude?: number | null;
    geofenceRadius?: number | null;
    requireGeolocation?: boolean;
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

// Estado de autenticación
interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    company: Company | null;
    token: string | null;
    refreshToken: string | null;
    employee: Employee | null;
    employeeCompanies: EmployeeCompanies | null;
    loading: boolean;
    error: string | null;
    userRole: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'HR' | null;
}

// Acciones
type AuthAction =
    | { type: 'LOGIN_START' }
    | { type: 'LOGIN_SUCCESS'; payload: { user: User; company: Company | null; token: string; refreshToken: string } }
    | { type: 'LOGIN_FAILURE'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'CLEAR_ERROR' }
    | { type: 'SET_EMPLOYEE'; payload: Employee }
    | { type: 'UPDATE_EMPLOYEE'; payload: Partial<Employee> }
    | { type: 'UPDATE_TOKEN'; payload: string }
    | { type: 'UPDATE_USER'; payload: Partial<User> }
    | { type: 'HYDRATE_FROM_STORAGE'; payload: Partial<AuthState> }
    | { type: 'SET_EMPLOYEE_COMPANIES'; payload: EmployeeCompanies }
    | { type: 'FORCE_LOGOUT' }; // Forzar logout por error 401

// Estado inicial
const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    company: null,
    token: null,
    refreshToken: null,
    employee: null,
    employeeCompanies: null,
    loading: false,
    error: null,
    userRole: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'LOGIN_START':
            return {
                ...state,
                loading: true,
                error: null,
            };

        case 'LOGIN_SUCCESS':
            return {
                ...state,
                isAuthenticated: true,
                user: action.payload.user,
                company: action.payload.company,
                token: action.payload.token,
                refreshToken: action.payload.refreshToken,
                loading: false,
                error: null,
                userRole: action.payload.user.role || null,
            };

        case 'LOGIN_FAILURE':
            return {
                ...state,
                loading: false,
                error: action.payload,
            };

        case 'LOGOUT':
        case 'FORCE_LOGOUT':
            return {
                ...initialState,
            };

        case 'SET_LOADING':
            return {
                ...state,
                loading: action.payload,
            };

        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
            };

        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null,
            };

        case 'SET_EMPLOYEE':
            return {
                ...state,
                employee: action.payload,
            };

        case 'UPDATE_EMPLOYEE':
            return {
                ...state,
                employee: state.employee ? { ...state.employee, ...action.payload } : null,
            };

        case 'UPDATE_TOKEN':
            return {
                ...state,
                token: action.payload,
            };

        case 'UPDATE_USER':
            return {
                ...state,
                user: state.user ? { ...state.user, ...action.payload } : null,
            };

        case 'HYDRATE_FROM_STORAGE':
            return {
                ...state,
                ...action.payload,
            };

        default:
            return state;
    }
};

// Context
interface AuthContextType extends AuthState {
    login: (user: User, company: Company | null, token: string, refreshToken: string) => void;
    logout: () => void;
    forceLogout: () => void; // Forzar logout por error 401
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    setEmployee: (employee: Employee) => void;
    updateEmployee: (employee: Partial<Employee>) => void;
    updateToken: (token: string) => void;
    updateUser: (user: Partial<User>) => void;
    setEmployeeCompanies: (companies: EmployeeCompanies) => void;
    loginEmployeeMultiCompany: (credentials: { dni: string; pin: string; companyId: string }) => Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }>;
    getEmployeeCompanies: (dni: string) => Promise<EmployeeCompanies>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);
    const isInitialized = useRef(false);

    // Función para guardar en localStorage
    const saveToStorage = (authState: AuthState) => {
        try {
            const dataToSave = {
                isAuthenticated: authState.isAuthenticated,
                user: authState.user,
                company: authState.company,
                token: authState.token,
                refreshToken: authState.refreshToken,
                employee: authState.employee,
                userRole: authState.userRole,
            };
            localStorage.setItem('compilatime-auth', JSON.stringify(dataToSave));
            console.log('AuthContext: Estado guardado en localStorage');
        } catch (error) {
            console.error('AuthContext: Error al guardar en localStorage:', error);
        }
    };

    // Efecto para inicializar desde localStorage (solo una vez)
    useEffect(() => {
        if (isInitialized.current) return;

        // No inicializar si estamos en rutas de admin
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/')) {
            isInitialized.current = true;
            return;
        }

        console.log('AuthContext: Inicializando desde localStorage...');

        try {
            const stored = localStorage.getItem('compilatime-auth');
            if (stored) {
                const parsedData = JSON.parse(stored);
                console.log('AuthContext: Datos cargados desde localStorage:', parsedData);

                // Validar consistencia de los datos
                if (parsedData.token && !parsedData.isAuthenticated) {
                    console.warn('AuthContext: Corrigiendo inconsistencia - hay token pero isAuthenticated=false');
                    parsedData.isAuthenticated = true;
                }

                if (!parsedData.token && parsedData.isAuthenticated) {
                    console.warn('AuthContext: Corrigiendo inconsistencia - no hay token pero isAuthenticated=true');
                    parsedData.isAuthenticated = false;
                    parsedData.user = null;
                    parsedData.company = null;
                    parsedData.userRole = null;
                }

                dispatch({ type: 'HYDRATE_FROM_STORAGE', payload: parsedData });
                console.log('AuthContext: Estado hidratado desde localStorage');
            } else {
                console.log('AuthContext: No hay datos en localStorage');
            }
        } catch (error) {
            console.error('AuthContext: Error al cargar desde localStorage:', error);
        }

        isInitialized.current = true;
    }, []); // Sin dependencias para que se ejecute solo una vez

    // Efecto para manejar errores de autenticación (401)
    useEffect(() => {
        const handleAuthError = () => {
            console.log('AuthContext: Evento AUTH_ERROR recibido, haciendo force logout');
            forceLogout();
        };

        // Agregar listener para el evento AUTH_ERROR
        window.addEventListener('AUTH_ERROR', handleAuthError);

        // Limpiar listener al desmontar
        return () => {
            window.removeEventListener('AUTH_ERROR', handleAuthError);
        };
    }, []); // Sin dependencias para que se ejecute solo una vez

    // Efecto para guardar en localStorage cuando el estado cambia (excepto durante inicialización)
    useEffect(() => {
        if (!isInitialized.current) return;

        // Solo guardar si no es el estado inicial vacío y hay cambios reales
        if (state.isAuthenticated || state.token || state.user) {
            saveToStorage(state);
        }
    }, [state.isAuthenticated, state.token, state.user, state.company, state.employee, state.userRole]); // Mantener las dependencias pero controlar con isInitialized

    // Acciones
    const login = (user: User, company: Company | null, token: string, refreshToken: string) => {
        console.log('AuthContext: Login llamado con:', {
            user: user.name,
            company: company?.name,
            hasToken: !!token,
            tokenLength: token?.length,
            refreshTokenLength: refreshToken?.length
        });

        if (!token) {
            console.error('AuthContext: ERROR - Token vacío recibido en login()');
            return;
        }

        // Inicializar sesión para SecureRoute
        initializeSession();
        console.log('AuthContext: Sesión inicializada con initializeSession()');

        dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, company, token, refreshToken }
        });

        console.log('AuthContext: Login dispatch completado');
    };

    const logout = () => {
        console.log('AuthContext: Logout llamado');
        dispatch({ type: 'LOGOUT' });
        try {
            localStorage.removeItem('compilatime-auth');
            console.log('AuthContext: Datos eliminados de localStorage');
        } catch (error) {
            console.error('AuthContext: Error al eliminar de localStorage:', error);
        }
    };

    const forceLogout = () => {
        console.log('AuthContext: Force logout llamado por error 401');
        dispatch({ type: 'FORCE_LOGOUT' });
        try {
            localStorage.removeItem('compilatime-auth');
            console.log('AuthContext: Datos eliminados de localStorage por force logout');
        } catch (error) {
            console.error('AuthContext: Error al eliminar de localStorage:', error);
        }
    };

    const setLoading = (loading: boolean) => {
        dispatch({ type: 'SET_LOADING', payload: loading });
    };

    const setError = (error: string | null) => {
        dispatch({ type: 'SET_ERROR', payload: error });
    };

    const clearError = () => {
        dispatch({ type: 'CLEAR_ERROR' });
    };

    const setEmployee = (employee: Employee) => {
        dispatch({ type: 'SET_EMPLOYEE', payload: employee });
    };

    const updateEmployee = (employee: Partial<Employee>) => {
        dispatch({ type: 'UPDATE_EMPLOYEE', payload: employee });
    };

    const setEmployeeCompanies = (companies: EmployeeCompanies) => {
        dispatch({ type: 'SET_EMPLOYEE_COMPANIES', payload: companies });
    };

    const updateToken = (token: string) => {
        dispatch({ type: 'UPDATE_TOKEN', payload: token });
    };

    const updateUser = (userData: Partial<User>) => {
        dispatch({ type: 'UPDATE_USER', payload: userData });
    };

    // Login para empleados multi-empresa
    const loginEmployeeMultiCompany = async (credentials: { dni: string; pin: string; companyId: string }) => {
        try {
            dispatch({ type: 'LOGIN_START' });

            const response = await authApi.employeeLoginMultiCompany({
                dni: credentials.dni.toUpperCase(),
                pin: credentials.pin,
                companyId: credentials.companyId,
            });

            const { user, tokens } = response.data as { user: any; tokens: { accessToken: string; refreshToken: string } };

            // Inicializar sesión para SecureRoute
            initializeSession();
            console.log('AuthContext: Sesión inicializada con initializeSession() en loginEmployeeMultiCompany');

            // Guardar en el estado
            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                    user,
                    company: user.company,
                    token: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                }
            });

            return { user, tokens };
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error al iniciar sesión';
            dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
            throw error;
        }
    };

    // Obtener empresas de un empleado
    const getEmployeeCompanies = async (dni: string): Promise<EmployeeCompanies> => {
        try {
            const response = await api.get(`/auth/employee/companies/${dni.toUpperCase()}`);
            const companies = response.data as EmployeeCompanies;

            // Guardar en el estado
            dispatch({ type: 'SET_EMPLOYEE_COMPANIES', payload: companies });

            return companies;
        } catch (error: any) {
            console.error('Error al obtener empresas del empleado:', error);
            throw error;
        }
    };

    const value: AuthContextType = {
        ...state,
        login,
        logout,
        forceLogout,
        setLoading,
        setError,
        clearError,
        setEmployee,
        updateEmployee,
        updateToken,
        updateUser,
        setEmployeeCompanies,
        loginEmployeeMultiCompany,
        getEmployeeCompanies,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook para usar el contexto
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

export default AuthContext;