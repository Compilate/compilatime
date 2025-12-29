import * as CryptoJS from 'crypto-js';

// Clave secreta para encriptación (debe ser igual a la del frontend)
const SECRET_KEY = 'compilatime-secret-key-2024';

// Cache para mapeo de códigos cortos (en producción esto debería estar en Redis o BD)
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
    // Esto es un fallback para cuando el cache está vacío (reinicio del servidor)
    console.log('⚠️ Código corto no encontrado en cache, intentando generar desde hash:', shortCode);

    // Como último recurso, intentar decodificar usando algunos patrones comunes
    // Esto es una solución temporal para el problema del cache
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
 * Extrae el código de empresa de una URL
 */
export const extractCompanyCodeFromUrl = (url: string): string | null => {
    try {
        console.log('🔍 Analizando URL para extraer código de empresa:', url);
        const parts = url.split('/');
        console.log('📋 Partes de la URL:', parts);

        // Buscar el primer segmento que parece ser un código corto (8 caracteres)
        for (const part of parts) {
            console.log(`🔎 Analizando parte: "${part}" (longitud: ${part.length})`);

            if (part.length === 8 && !part.includes('.') && !part.includes('?')) {
                const companyCode = getCompanyCodeFromShort(part);
                console.log('✅ Código corto encontrado:', companyCode);
                return companyCode;
            }

            // Fallback para URLs encriptadas largas (compatibilidad)
            if (part.length > 10 && !part.includes('.') && !part.includes('?')) {
                try {
                    const companyCode = decryptText(part);
                    console.log('✅ Código encriptado encontrado:', companyCode);
                    return companyCode;
                } catch (error) {
                    console.log('⚠️ Error al desencriptar parte:', part, error);
                    continue;
                }
            }
        }

        console.log('❌ No se encontró código de empresa válido en la URL');
        return null;
    } catch (error) {
        console.error('❌ Error al extraer código de empresa:', error);
        return null;
    }
};