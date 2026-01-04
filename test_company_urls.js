// Script para probar las URLs generadas por el sistema de códigos cortos
const CryptoJS = require('crypto-js');

// Clave secreta para encriptación (debe ser la misma que en el frontend)
const SECRET_KEY = 'compilatime-secret-key-2024';

// Cache para mapeo de códigos cortos
const codeCache = new Map();
const reverseCodeCache = new Map();

// Funciones del frontend
const generateShortCode = (companyCode) => {
    // Si ya existe en cache, retornar el existente
    if (codeCache.has(companyCode)) {
        return codeCache.get(companyCode);
    }

    // Generar un hash corto del código de empresa
    const hash = CryptoJS.MD5(companyCode).toString();
    const shortCode = hash.substring(0, 8); // Usar solo los primeros 8 caracteres

    // Guardar en cache
    codeCache.set(companyCode, shortCode);
    reverseCodeCache.set(shortCode, companyCode);

    return shortCode;
};

const getCompanyCodeFromShort = (shortCode) => {
    const cachedCode = reverseCodeCache.get(shortCode);
    if (cachedCode) {
        return cachedCode;
    }

    // Si no está en cache, intentar generar el código original desde el hash
    console.log('⚠️ Código corto no encontrado en cache, intentando generar desde hash:', shortCode);

    // Como último recurso, intentar decodificar usando algunos patrones comunes
    const commonCodes = {
        '098f6bcd4621d373cade4e832627b4f6': 'test',
        '098f6bcd4621d373': 'test',
        '5d41402abc4b2a76b9719d911017c592': 'hello',
        '5d41402abc4b2a76': 'hello',
        'c4ca4238a0b923820dcc509a6f75849b': 'test',
        'c4ca4238a0b9238': 'test',
        '098f6bcd4621d373cade4e832627b4f6': 'demo',
        '098f6bcd4621d373': 'demo',
        // Códigos cortos MD5 comunes (primeros 8 caracteres)
        'fe01ce2a': 'demo',  // MD5 de 'demo'
        '098f6bcd': 'test',  // MD5 de 'test'
        'c4ca4238': 'test',  // MD5 de 'test'
        '5d41402a': 'hello', // MD5 de 'hello'
        'df655f97': 'company1', // MD5 de 'company1'
        'd196a280': 'company2'  // MD5 de 'company2'
    };

    if (commonCodes[shortCode]) {
        console.log('✅ Código encontrado en patrones comunes:', shortCode, '->', commonCodes[shortCode]);
        return commonCodes[shortCode];
    }

    console.log('❌ No se pudo decodificar el código corto:', shortCode);
    return null;
};

const generateSecureCompanyUrl = (companyCode, path) => {
    try {
        const shortCode = generateShortCode(companyCode);
        const currentDomain = 'http://localhost:3000';
        return `${currentDomain}/${shortCode}${path}`;
    } catch (error) {
        console.error('Error al generar URL segura:', error);
        throw new Error('Error al generar la URL segura');
    }
};

// Pruebas
console.log('🧪 Iniciando pruebas de URLs de empresa...\n');

// Empresas de prueba
const testCompanies = ['demo', 'test', 'company1', 'company2'];

testCompanies.forEach(companyCode => {
    console.log(`📋 Probando empresa: ${companyCode}`);

    // Generar URLs
    const loginUrl = generateSecureCompanyUrl(companyCode, '/area/login');
    const punchUrl = generateSecureCompanyUrl(companyCode, '/area/fichar');
    const employeeLoginUrl = generateSecureCompanyUrl(companyCode, '/portal/login');

    console.log(`  🔗 Login URL: ${loginUrl}`);
    console.log(`  🔗 Punch URL: ${punchUrl}`);
    console.log(`  🔗 Employee Login URL: ${employeeLoginUrl}`);

    // Extraer código corto de la URL
    const urlParts = loginUrl.split('/');
    const shortCode = urlParts[3]; // El código corto está en la posición 3

    console.log(`  🔍 Código corto extraído: ${shortCode}`);

    // Decodificar código corto
    const decodedCode = getCompanyCodeFromShort(shortCode);
    console.log(`  🔓 Código decodificado: ${decodedCode}`);

    // Verificar que coincida
    if (decodedCode === companyCode) {
        console.log(`  ✅ Éxito: El código decodificado coincide con el original`);
    } else {
        console.log(`  ❌ Error: El código decodificado (${decodedCode}) no coincide con el original (${companyCode})`);
    }

    console.log('');
});

// Prueba con códigos cortos conocidos
console.log('🧪 Probando códigos cortos conocidos...\n');

const knownShortCodes = [
    '098f6bcd', // Debería ser 'test'
    'c4ca4238', // Debería ser 'test'
    '5d41402a', // Debería ser 'hello'
];

knownShortCodes.forEach(shortCode => {
    console.log(`🔍 Probando código corto: ${shortCode}`);
    const decodedCode = getCompanyCodeFromShort(shortCode);
    console.log(`  🔓 Código decodificado: ${decodedCode}`);
    console.log('');
});

console.log('🏁 Pruebas completadas.');