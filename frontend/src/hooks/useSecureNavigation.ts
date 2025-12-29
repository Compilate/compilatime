import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateShortCode, getCompanyCodeFromShort, decryptText } from '../lib/routeEncryption';

/**
 * Hook para navegación segura con códigos de empresa encriptados
 */
export const useSecureNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();

    /**
     * Navega a una ruta con código de empresa encriptado
     */
    const navigateToCompany = useCallback((companyCode: string, path: string) => {
        try {
            const shortCode = generateShortCode(companyCode);
            navigate(`/${shortCode}${path}`);
        } catch (error) {
            console.error('Error al navegar a empresa:', error);
            // Fallback a navegación normal sin encriptación
            navigate(`/${companyCode}${path}`);
        }
    }, [navigate]);

    /**
     * Genera una URL segura con código de empresa encriptado
     */
    const getSecureCompanyUrl = useCallback((companyCode: string, path: string): string => {
        try {
            const shortCode = generateShortCode(companyCode);
            // Obtener el dominio actual para construir la URL completa
            const currentDomain = window.location.origin;
            return `${currentDomain}/${shortCode}${path}`;
        } catch (error) {
            console.error('Error al generar URL segura:', error);
            // Fallback a URL normal sin encriptación
            const currentDomain = window.location.origin;
            return `${currentDomain}/${companyCode}${path}`;
        }
    }, []);

    /**
     * Extrae el código de empresa de la URL actual
     */
    const getCurrentCompanyCode = useCallback((): string | null => {
        try {
            console.log('🔍 getCurrentCompanyCode - Analizando URL actual:', location.pathname);
            const pathSegments = location.pathname.split('/').filter(Boolean);
            console.log('📋 Segmentos de ruta:', pathSegments);

            if (pathSegments.length === 0) {
                console.log('❌ No hay segmentos en la ruta');
                return null;
            }

            const firstSegment = pathSegments[0];
            console.log('🎯 Primer segmento a analizar:', firstSegment);

            // Si el primer segmento es 'area', no es un código de empresa
            if (firstSegment === 'area' || firstSegment === 'portal') {
                console.log('❌ La ruta es del área de empleados, no contiene código de empresa');
                return null;
            }

            // Primero intentar con código corto
            try {
                console.log('🔑 Intentando obtener código desde código corto...');
                const companyCode = getCompanyCodeFromShort(firstSegment);
                if (companyCode) {
                    console.log('✅ Código de empresa obtenido desde código corto:', companyCode);
                    return companyCode;
                }
                console.log('❌ No se encontró código en cache para el código corto');
            } catch (shortCodeError) {
                console.log('❌ Error al procesar código corto:', shortCodeError);
            }

            // Fallback: intentar desencriptar el primer segmento (compatibilidad)
            // Solo intentar desencriptar si parece ser texto encriptado (longitud > 10 y caracteres especiales)
            if (firstSegment.length > 10 && /^[a-zA-Z0-9_-]+$/.test(firstSegment)) {
                console.log('🔐 Intentando desencriptar segmento largo...');
                try {
                    const decrypted = decryptText(firstSegment);
                    console.log('✅ Código de empresa desencriptado:', decrypted);
                    return decrypted;
                } catch (decryptError) {
                    console.log('❌ Error al desencriptar:', decryptError);
                }
            }

            // Si no se puede desencriptar, asumir que es un código sin encriptar
            // pero solo si no es una ruta del sistema
            if (!['area', 'portal', 'admin', 'auth'].includes(firstSegment)) {
                console.log('📝 Usando segmento como código de empresa directo:', firstSegment);
                return firstSegment;
            }

            console.log('❌ El primer segmento es una ruta del sistema, no un código de empresa');
            return null;
        } catch (error) {
            console.error('❌ Error general al extraer código de empresa:', error);
            return null;
        }
    }, [location]);

    /**
     * Verifica si la ruta actual contiene un código de empresa
     */
    const hasCompanyCode = useCallback((): boolean => {
        return getCurrentCompanyCode() !== null;
    }, [getCurrentCompanyCode]);

    /**
     * Navega a la página de login con código de empresa
     */
    const navigateToCompanyLogin = useCallback((companyCode: string) => {
        navigateToCompany(companyCode, '/area/login');
    }, [navigateToCompany]);

    /**
     * Navega a la página de fichaje con código de empresa
     */
    const navigateToCompanyPunch = useCallback((companyCode: string) => {
        navigateToCompany(companyCode, '/area/fichar');
    }, [navigateToCompany]);

    /**
     * Navega al portal del empleado con código de empresa
     */
    const navigateToEmployeePortal = useCallback((companyCode: string) => {
        navigateToCompany(companyCode, '/portal/login');
    }, [navigateToCompany]);

    /**
     * Navega al dashboard del empleado con código de empresa
     */
    const navigateToEmployeeDashboard = useCallback((companyCode: string) => {
        navigateToCompany(companyCode, '/portal/dashboard');
    }, [navigateToCompany]);

    /**
     * Genera URLs para diferentes áreas de la aplicación
     */
    const getCompanyUrls = useCallback((companyCode: string) => ({
        login: getSecureCompanyUrl(companyCode, '/area/login'),
        punch: getSecureCompanyUrl(companyCode, '/area/fichar'),
        employeeLogin: getSecureCompanyUrl(companyCode, '/portal/login'),
        employeeDashboard: getSecureCompanyUrl(companyCode, '/portal/dashboard'),
        employeeSchedule: getSecureCompanyUrl(companyCode, '/portal/horario'),
        employeeRecords: getSecureCompanyUrl(companyCode, '/portal/registros'),
        employeeProfile: getSecureCompanyUrl(companyCode, '/portal/perfil'),
        employeeAbsence: getSecureCompanyUrl(companyCode, '/portal/solicitar-ausencia'),
    }), [getSecureCompanyUrl]);

    return {
        navigateToCompany,
        getSecureCompanyUrl,
        getCurrentCompanyCode,
        hasCompanyCode,
        navigateToCompanyLogin,
        navigateToCompanyPunch,
        navigateToEmployeePortal,
        navigateToEmployeeDashboard,
        getCompanyUrls,
    };
};

export default useSecureNavigation;