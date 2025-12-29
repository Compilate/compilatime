"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearEncryptedSession = exports.isSessionValid = exports.initializeSession = exports.getStoredRoute = exports.storeEncryptedRoute = exports.extractCompanyCodeFromUrl = exports.generateSecureCompanyUrl = exports.decryptText = exports.encryptText = void 0;
const CryptoJS = require("crypto-js");
// Clave secreta para encriptación (en producción debería estar en variables de entorno)
const SECRET_KEY = 'compilatime-secret-key-2024';
/**
 * Encripta un texto usando AES
 */
const encryptText = (text) => {
    try {
        const encrypted = CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
        // Convertir a URL-safe base64
        return encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
    catch (error) {
        console.error('Error al encriptar texto:', error);
        throw new Error('Error al encriptar el texto');
    }
};
exports.encryptText = encryptText;
/**
 * Desencripta un texto usando AES
 */
const decryptText = (encryptedText) => {
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
    }
    catch (error) {
        console.error('Error al desencriptar texto:', error);
        throw new Error('Error al desencriptar el texto');
    }
};
exports.decryptText = decryptText;
/**
 * Genera una URL segura con el código de empresa encriptado
 */
const generateSecureCompanyUrl = (baseUrl, companyCode, path) => {
    try {
        const encryptedCode = (0, exports.encryptText)(companyCode);
        return `${baseUrl}/${encryptedCode}${path}`;
    }
    catch (error) {
        console.error('Error al generar URL segura:', error);
        throw new Error('Error al generar la URL segura');
    }
};
exports.generateSecureCompanyUrl = generateSecureCompanyUrl;
/**
 * Extrae el código de empresa de una URL segura
 */
const extractCompanyCodeFromUrl = (url) => {
    try {
        const parts = url.split('/');
        // Buscar el primer segmento que parece ser un código encriptado
        for (const part of parts) {
            if (part.length > 10 && !part.includes('.') && !part.includes('?')) {
                return (0, exports.decryptText)(part);
            }
        }
        return null;
    }
    catch (error) {
        console.error('Error al extraer código de empresa:', error);
        return null;
    }
};
exports.extractCompanyCodeFromUrl = extractCompanyCodeFromUrl;
/**
 * Almacena la ruta encriptada en sessionStorage
 */
const storeEncryptedRoute = (route) => {
    try {
        const encrypted = (0, exports.encryptText)(route);
        sessionStorage.setItem('compilatime-encrypted-route', encrypted);
    }
    catch (error) {
        console.error('Error al almacenar ruta encriptada:', error);
    }
};
exports.storeEncryptedRoute = storeEncryptedRoute;
/**
 * Recupera y desencripta la ruta de sessionStorage
 */
const getStoredRoute = () => {
    try {
        const encrypted = sessionStorage.getItem('compilatime-encrypted-route');
        if (!encrypted)
            return null;
        return (0, exports.decryptText)(encrypted);
    }
    catch (error) {
        console.error('Error al recuperar ruta encriptada:', error);
        return null;
    }
};
exports.getStoredRoute = getStoredRoute;
/**
 * Inicializa la sesión con datos de seguridad
 */
const initializeSession = () => {
    try {
        const sessionId = CryptoJS.lib.WordArray.random(16).toString();
        sessionStorage.setItem('compilatime-session-id', sessionId);
    }
    catch (error) {
        console.error('Error al inicializar sesión:', error);
    }
};
exports.initializeSession = initializeSession;
/**
 * Verifica si la sesión es válida
 */
const isSessionValid = () => {
    try {
        const sessionId = sessionStorage.getItem('compilatime-session-id');
        return !!sessionId;
    }
    catch (error) {
        console.error('Error al verificar sesión:', error);
        return false;
    }
};
exports.isSessionValid = isSessionValid;
/**
 * Limpia los datos de sesión encriptados
 */
const clearEncryptedSession = () => {
    try {
        sessionStorage.removeItem('compilatime-encrypted-route');
        sessionStorage.removeItem('compilatime-session-id');
    }
    catch (error) {
        console.error('Error al limpiar sesión encriptada:', error);
    }
};
exports.clearEncryptedSession = clearEncryptedSession;
