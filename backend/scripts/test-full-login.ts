import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFullLogin() {
    console.log('🔍 Probando login completo (con tokens)...\n');

    try {
        // 1. Buscar empresa
        console.log('1. Buscando empresa...');
        const company = await prisma.company.findUnique({
            where: { slug: 'demo', active: true },
        });

        if (!company) {
            console.log('   ❌ Empresa no encontrada');
            return;
        }
        console.log('   ✅ Empresa encontrada');

        // 2. Buscar empleado
        console.log('2. Buscando empleado...');
        const employee = await prisma.employee.findFirst({
            where: {
                companyId: company.id,
                dni: '12345678A'.toUpperCase(),
                active: true,
            },
            include: {
                company: true,
            },
        });

        if (!employee) {
            console.log('   ❌ Empleado no encontrado');
            return;
        }
        console.log('   ✅ Empleado encontrado');

        // 3. Verificar PIN
        console.log('3. Verificando PIN...');
        const startTime = Date.now();
        const isPinValid = await bcrypt.compare('1234', employee.pin);
        const endTime = Date.now();
        
        console.log(`   Tiempo de comparación: ${endTime - startTime}ms`);
        console.log(`   PIN válido: ${isPinValid ? 'Sí' : 'No'}`);
        
        if (!isPinValid) {
            console.log('   ❌ PIN inválido');
            return;
        }

        // 4. Generar tokens
        console.log('4. Generando tokens...');
        const tokenStart = Date.now();
        
        const accessToken = jwt.sign(
            {
                id: employee.id,
                type: 'employee',
                companyId: company.id,
            },
            'your-super-secret-jwt-key-that-is-at-least-32-characters-long',
            { expiresIn: '7d' }
        );

        const refreshToken = jwt.sign(
            {
                id: employee.id,
                type: 'employee',
                companyId: company.id,
                refresh: true,
            },
            'your-super-secret-jwt-key-that-is-at-least-32-characters-long',
            { expiresIn: '30d' }
        );
        
        const tokenEnd = Date.now();
        console.log(`   Tiempo de generación de tokens: ${tokenEnd - tokenStart}ms`);
        
        // 5. Calcular tiempo de expiración
        const decoded = jwt.decode(accessToken) as any;
        const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
        
        console.log('   ✅ Login exitoso con tokens');
        console.log(`   Access token: ${accessToken.substring(0, 20)}...`);
        console.log(`   Refresh token: ${refreshToken.substring(0, 20)}...`);
        console.log(`   Expires in: ${expirationTime}s`);

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testFullLogin();