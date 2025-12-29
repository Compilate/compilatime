import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLoginDirect() {
    console.log('🔍 Probando login de empleados directamente (sin HTTP)...\n');

    try {
        // 1. Verificar empleados existentes
        console.log('1. Verificando empleados existentes...');
        const employees = await prisma.employee.findMany({
            where: { active: true },
            include: { company: true }
        });

        console.log(`   👥 Empleados activos encontrados: ${employees.length}\n`);

        // 2. Probar login con el primer empleado
        const employee = employees[0]; // Juan García López
        console.log(`2. Probando login para: ${employee.name} (${employee.dni})`);
        console.log(`   Empresa: ${employee.company.name} (${employee.company.slug})`);
        
        // Buscar empresa por slug
        const company = await prisma.company.findUnique({
            where: { slug: employee.company.slug, active: true },
        });

        if (!company) {
            console.log('   ❌ Empresa no encontrada o inactiva');
            return;
        }

        // Buscar empleado
        const foundEmployee = await prisma.employee.findFirst({
            where: {
                companyId: company.id,
                dni: employee.dni.toUpperCase(),
                active: true,
            },
            include: {
                company: true,
            },
        });

        if (!foundEmployee) {
            console.log('   ❌ Empleado no encontrado');
            return;
        }

        console.log('   ✅ Empleado encontrado en la BD');
        
        // Medir tiempo de comparación del PIN
        console.log('   🔍 Verificando PIN...');
        const startTime = Date.now();
        const isPinValid = await bcrypt.compare('1234', foundEmployee.pin);
        const endTime = Date.now();
        
        console.log(`   Tiempo de comparación: ${endTime - startTime}ms`);
        console.log(`   PIN válido: ${isPinValid ? 'Sí' : 'No'}`);
        
        if (isPinValid) {
            console.log('   ✅ Login exitoso (simulado)');
        } else {
            console.log('   ❌ PIN inválido');
        }

        // 3. Probar con diferentes rounds de bcrypt
        console.log('\n3. Probando diferentes rounds de bcrypt...');
        const testPin = '1234';
        
        for (const rounds of [10, 12, 14]) {
            const hashStart = Date.now();
            const hash = await bcrypt.hash(testPin, rounds);
            const hashEnd = Date.now();
            
            const compareStart = Date.now();
            const isValid = await bcrypt.compare(testPin, hash);
            const compareEnd = Date.now();
            
            console.log(`   Rounds ${rounds}:`);
            console.log(`     Hash: ${hashEnd - hashStart}ms`);
            console.log(`     Compare: ${compareEnd - compareStart}ms`);
            console.log(`     Válido: ${isValid}`);
        }

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testLoginDirect();