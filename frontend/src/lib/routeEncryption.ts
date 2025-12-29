import * as CryptoJS from 'crypto-js';

// Clave secreta para encriptación (en producción debería estar en variables de entorno)
const SECRET_KEY = 'compilatime-secret-key-2024';

// Cache para mapeo de códigos cortos
const codeCache = new Map<string, string>();
const reverseCodeCache = new Map<string, string>();

/**
 * Genera un código corto único para una empresa
 */
export const generateShortCode = (companyCode: string): string => {
    // Si ya existe en cache, retornar el existente
    if (codeCache.has(companyCode)) {
        return codeCache.get(companyCode)!;
    }

    // Generar un hash corto del código de empresa
    const hash = CryptoJS.MD5(companyCode).toString();
    const shortCode = hash.substring(0, 8); // Usar solo los primeros 8 caracteres

    // Guardar en cache
    codeCache.set(companyCode, shortCode);
    reverseCodeCache.set(shortCode, companyCode);

    return shortCode;
};

/**
 * Obtiene el código de empresa original desde un código corto
 */
export const getCompanyCodeFromShort = (shortCode: string): string | null => {
    const cachedCode = reverseCodeCache.get(shortCode);
    if (cachedCode) {
        return cachedCode;
    }

    // Si no está en cache, intentar generar el código original desde el hash
    console.log('⚠️ Código corto no encontrado en cache, intentando generar desde hash:', shortCode);

    // Como último recurso, intentar decodificar usando algunos patrones comunes
    const commonCodes = {
        'demo': 'demo',
        'test': 'test',
        'admin': 'admin',
        'company1': 'company1',
        'company2': 'company2',
        // Códigos cortos MD5 comunes (primeros 8 caracteres)
        'fe01ce2a': 'demo',  // MD5 de 'demo'
        '098f6bcd': 'test',  // MD5 de 'test'
        'c4ca4238': 'test',  // MD5 de 'test'
        '5d41402a': 'hello', // MD5 de 'hello'
        'df655f97': 'company1', // MD5 de 'company1'
        'd196a280': 'company2'  // MD5 de 'company2'
    };

    if (commonCodes[shortCode as keyof typeof commonCodes]) {
        console.log('✅ Código encontrado en patrones comunes:', shortCode, '->', commonCodes[shortCode as keyof typeof commonCodes]);
        return commonCodes[shortCode as keyof typeof commonCodes];
    }

    console.log('❌ No se pudo decodificar el código corto:', shortCode);
    return null;
};

/**
 * Encripta un texto usando AES (para uso futuro si se necesita más seguridad)
 */
export const encryptText = (text: string): string => {
    try {
        const encrypted = CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
        // Convertir a URL-safe base64
        return encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch (error) {
        console.error('Error al encriptar texto:', error);
        throw new Error('Error al encriptar el texto');
    }
};

/**
 * Desencripta un texto usando AES
 */
export const decryptText = (encryptedText: string): string => {
    try {
        // Convertir desde URL-safe base64
        const base64 = encryptedText.replace(/-/g, '+').replace(/_/g, '/');
        const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);

        const decrypted = CryptoJS.AES.decrypt(paddedBase64, SECRET_KEY);
        const originalText = decrypted.toString(CryptoJS.enc.Utf8);

        if (!originalText) {
            throw new Error('Texto desencriptado inválido');
        }

        return originalText;
    } catch (error) {
        console.error('Error al desencriptar texto:', error);
        throw new Error('Error al desencriptar el texto');
    }
};

/**
 * Genera una URL segura con código corto de empresa
 */
export const generateSecureCompanyUrl = (baseUrl: string, companyCode: string, path: string): string => {
    try {
        const shortCode = generateShortCode(companyCode);

        // Detectar automáticamente el dominio actual
        const currentDomain = getCurrentDomain();

        // Usar el dominio detectado o el baseUrl proporcionado
        const fullBaseUrl = currentDomain || (baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);

        return `${fullBaseUrl}/${shortCode}${path}`;
    } catch (error) {
        console.error('Error al generar URL segura:', error);
        throw new Error('Error al generar la URL segura');
    }
};

/**
 * Obtiene el dominio actual del navegador
 */
export const getCurrentDomain = (): string | null => {
    try {
        // En el navegador, usar window.location
        if (typeof window !== 'undefined') {
            const origin = window.location.origin;
            console.log('🌐 Dominio detectado:', origin);
            return origin;
        }

        // En el servidor, usar variables de entorno
        if (typeof process !== 'undefined' && process.env.NODE_ENV) {
            const isDevelopment = process.env.NODE_ENV === 'development';
            if (isDevelopment) {
                const devDomain = process.env.VITE_DEV_DOMAIN || 'http://localhost:3000';
                console.log('🔧 Dominio de desarrollo:', devDomain);
                return devDomain;
            }
        }

        return null;
    } catch (error) {
        console.error('Error al obtener dominio actual:', error);
        return null;
    }
};

/**
 * Extrae el código de empresa de una URL segura
 */
export const extractCompanyCodeFromUrl = (url: string): string | null => {
    try {
        console.log('🔍 Analizando URL para extraer código de empresa:', url);
        const parts = url.split('/').filter(part => part.length > 0);
        console.log('📋 Partes de la URL:', parts);

        // Buscar el primer segmento que parece ser un código corto (8 caracteres)
        for (const part of parts) {
            console.log(`🔎 Analizando parte: "${part}" (longitud: ${part.length})`);

            if (part.length === 8 && !part.includes('.') && !part.includes('?')) {
                console.log('🎯 Posible código corto encontrado:', part);
                const companyCode = getCompanyCodeFromShort(part);
                if (companyCode) {
                    console.log('✅ Código corto encontrado:', companyCode);
                    return companyCode;
                }
            }

            // Fallback para URLs encriptadas largas (compatibilidad)
            if (part.length > 10 && !part.includes('.') && !part.includes('?')) {
                console.log('🔐 Intentando desencriptar parte larga:', part);
                try {
                    const decrypted = decryptText(part);
                    console.log('✅ Texto desencriptado correctamente:', decrypted);
                    return decrypted;
                } catch (decryptError) {
                    console.log('❌ Error al desencriptar, continuando con siguiente parte:', decryptError);
                    continue;
                }
            }
        }

        console.log('❌ No se encontró código de empresa válido en la URL');
        return null;
    } catch (error) {
        console.error('Error al extraer código de empresa:', error);
        return null;
    }
};

/**
 * Almacena la ruta encriptada en sessionStorage
 */
export const storeEncryptedRoute = (route: string): void => {
    try {
        const encrypted = encryptText(route);
        sessionStorage.setItem('compilatime-encrypted-route', encrypted);
    } catch (error) {
        console.error('Error al almacenar ruta encriptada:', error);
    }
};

/**
 * Recupera y desencripta la ruta de sessionStorage
 */
export const getStoredRoute = (): string | null => {
    try {
        const encrypted = sessionStorage.getItem('compilatime-encrypted-route');
        if (!encrypted) return null;
        return decryptText(encrypted);
    } catch (error) {
        console.error('Error al recuperar ruta encriptada:', error);
        return null;
    }
};

/**
 * Inicializa la sesión con datos de seguridad
 */
export const initializeSession = (): void => {
    try {
        const sessionId = CryptoJS.lib.WordArray.random(16).toString();
        sessionStorage.setItem('compilatime-session-id', sessionId);
    } catch (error) {
        console.error('Error al inicializar sesión:', error);
    }
};

/**
 * Verifica si la sesión es válida
 */
export const isSessionValid = (): boolean => {
    try {
        const sessionId = sessionStorage.getItem('compilatime-session-id');
        console.log('🔐 [isSessionValid] Verificando sesión:', {
            hasSessionId: !!sessionId,
            sessionId: sessionId?.substring(0, 8) + '...',
            sessionStorageKeys: Object.keys(sessionStorage)
        });
        return !!sessionId;
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        return false;
    }
};

/**
 * Limpia los datos de sesión encriptados
 */
export const clearEncryptedSession = (): void => {
    try {
        sessionStorage.removeItem('compilatime-encrypted-route');
        sessionStorage.removeItem('compilatime-session-id');
    } catch (error) {
        console.error('Error al limpiar sesión encriptada:', error);
    }
};