import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSimpleLogin() {
    console.log('🔍 Probando login simple (sin tokens)...\n');

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
        
        if (isPinValid) {
            console.log('   ✅ Login exitoso (simulado sin tokens)');
        } else {
            console.log('   ❌ PIN inválido');
        }

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testSimpleLogin();