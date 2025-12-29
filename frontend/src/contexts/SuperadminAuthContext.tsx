import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { superadminApi, Superadmin } from '../lib/superadminApi';
import { initializeSession } from '../lib/routeEncryption';

interface SuperadminAuthContextType {
    superadmin: Superadmin | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const SuperadminAuthContext = createContext<SuperadminAuthContextType | undefined>(undefined);

export const useSuperadminAuth = () => {
    const context = useContext(SuperadminAuthContext);
    if (context === undefined) {
        throw new Error('useSuperadminAuth debe ser usado dentro de un SuperadminAuthProvider');
    }
    return context;
};

interface SuperadminAuthProviderProps {
    children: ReactNode;
}

export const SuperadminAuthProvider: React.FC<SuperadminAuthProviderProps> = ({ children }) => {
    const [superadmin, setSuperadmin] = useState<Superadmin | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const isAuthenticated = !!superadmin;

    console.log('SuperadminAuthProvider renderizado con:', { superadmin, isLoading, isAuthenticated });

    // Guardar estado en localStorage y cookies
    const saveToStorage = (superadminData: Superadmin | null, token?: string) => {
        console.log('🔍 [saveToStorage] Iniciando guardado...');
        console.log('🔍 [saveToStorage] superadminData:', superadminData);
        console.log('🔍 [saveToStorage] token:', token ? 'Sí' : 'No');

        try {
            if (superadminData && token) {
                const dataToStore = {
                    superadmin: superadminData,
                    token: token,
                    isAuthenticated: true,
                    timestamp: new Date().toISOString()
                };
                console.log('🔍 [saveToStorage] Guardando en localStorage:', dataToStore);
                localStorage.setItem('superadmin-auth', JSON.stringify(dataToStore));

                // También guardar en cookies para que el backend pueda leerlo
                console.log('🔍 [saveToStorage] Guardando token en cookies:', token);
                const expires = new Date();
                expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 horas

                // Para localhost, no especificar dominio (el navegador lo maneja automáticamente)
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const secure = process.env.NODE_ENV === 'production';

                let cookieString;
                if (isLocalhost) {
                    // Para localhost, omitir dominio y usar SameSite=Lax
                    cookieString = `superadmin_token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax;`;
                } else {
                    // Para producción, incluir dominio y Secure
                    cookieString = `superadmin_token=${token}; expires=${expires.toUTCString()}; path=/; domain=${window.location.hostname}; SameSite=Strict;${secure ? ' Secure;' : ''}`;
                }

                console.log('🔍 [saveToStorage] Cookie string a establecer:', cookieString);
                console.log('🔍 [saveToStorage] Es localhost:', isLocalhost);
                console.log('🔍 [saveToStorage] Antes de establecer cookie - document.cookie actual:', document.cookie);

                document.cookie = cookieString;

                // Pequeña espera para que el navegador procese la cookie
                setTimeout(() => {
                    console.log('🔍 [saveToStorage] Después de establecer cookie - document.cookie:', document.cookie);
                }, 100);
            } else {
                console.log('🔍 [saveToStorage] Eliminando de localStorage y cookies');
                localStorage.removeItem('superadmin-auth');
                // Eliminar cookie con los mismos parámetros
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocalhost) {
                    document.cookie = `superadmin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                } else {
                    document.cookie = `superadmin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
                }
            }
        } catch (error) {
            console.error('❌ [saveToStorage] Error guardando en storage:', error);
        }
    };

    // Cargar estado desde localStorage
    const loadFromStorage = () => {
        try {
            const stored = localStorage.getItem('superadmin-auth');
            console.log('Cargando desde localStorage:', stored);
            if (stored) {
                const parsedData = JSON.parse(stored);
                console.log('Datos parseados:', parsedData);
                if (parsedData.isAuthenticated && parsedData.superadmin) {
                    console.log('Estableciendo superadmin desde localStorage:', parsedData.superadmin);
                    setSuperadmin(parsedData.superadmin);
                }
            }
        } catch (error) {
            console.error('Error cargando desde localStorage:', error);
        }
    };

    // Verificar autenticación al cargar
    const checkAuth = async () => {
        try {
            console.log('Verificando autenticación de superadmin...');
            setIsLoading(true);
            const response = await superadminApi.getMe();
            console.log('Respuesta de getMe:', response);

            if (response.success && response.data) {
                console.log('Superadmin autenticado:', response.data);
                setSuperadmin(response.data);
                saveToStorage(response.data);
            } else {
                console.log('Error en autenticación:', response.message);
                setSuperadmin(null);
                saveToStorage(null);
            }
        } catch (error) {
            console.error('Error verificando autenticación de superadmin:', error);
            setSuperadmin(null);
            saveToStorage(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Login
    const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
        try {
            console.log('Intentando login de superadmin:', email);
            const response = await superadminApi.login({ email, password });
            console.log('Respuesta de login:', response);

            if (response.success && response.data) {
                console.log('🔍 [login] Login exitoso, guardando datos:', response.data.superadmin);
                console.log('🔍 [login] Token recibido (primeros 50 chars):', response.data.token.substring(0, 50) + '...');
                console.log('🔍 [login] Token completo:', response.data.token);

                // Inicializar sesión para SecureRoute
                initializeSession();
                console.log('SuperadminAuthContext: Sesión inicializada con initializeSession()');

                setSuperadmin(response.data.superadmin);
                saveToStorage(response.data.superadmin, response.data.token);
                return { success: true, message: response.message || 'Login exitoso' };
            } else {
                console.log('Error en login:', response.message);
                return { success: false, message: response.message || 'Error en el login' };
            }
        } catch (error) {
            console.error('Error en login de superadmin:', error);
            return { success: false, message: 'Error de conexión' };
        }
    };

    // Logout
    const logout = async () => {
        try {
            console.log('Cerrando sesión de superadmin...');
            await superadminApi.logout();
        } catch (error) {
            console.error('Error en logout de superadmin:', error);
        } finally {
            console.log('Limpiando estado de superadmin...');
            setSuperadmin(null);
            saveToStorage(null);
            // Eliminar cookie manualmente con los mismos parámetros
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocalhost) {
                document.cookie = `superadmin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            } else {
                document.cookie = `superadmin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            }
        }
    };

    useEffect(() => {
        // Cargar estado desde localStorage al iniciar
        loadFromStorage();

        // Verificar autenticación si estamos en una ruta protegida de admin
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/') &&
            !window.location.pathname.includes('/admin/login')) {
            console.log('Verificando autenticación para ruta:', window.location.pathname);
            checkAuth();
        } else {
            console.log('No es necesario verificar autenticación para ruta:', window.location.pathname);
            setIsLoading(false);
        }
    }, []);

    const value: SuperadminAuthContextType = {
        superadmin,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth
    };

    console.log('Estado del SuperadminAuthContext:', {
        superadmin,
        isAuthenticated,
        isLoading
    });

    console.log('Renderizando SuperadminAuthProvider con value:', value);
    return (
        <SuperadminAuthContext.Provider value={value}>
            {children}
        </SuperadminAuthContext.Provider>
    );
};