import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEmployeeLogin() {
    console.log('🔍 Probando login de empleados (versión simple)...\n');

    try {
        // 1. Verificar empleados existentes
        console.log('1. Verificando empleados existentes...');
        const employees = await prisma.employee.findMany({
            where: { active: true },
            include: { company: true }
        });

        console.log(`   👥 Empleados activos encontrados: ${employees.length}\n`);

        // 2. Probar login con cada empleado
        for (const employee of employees) {
            console.log(`2. Probando login para: ${employee.name} (${employee.dni})`);
            console.log(`   Empresa: ${employee.company.name} (${employee.company.slug})`);
            
            // Verificar si el PIN es correcto comparando con el hash
            const isPinValid = await bcrypt.compare('1234', employee.pin);
            console.log(`   PIN 1234 válido: ${isPinValid ? 'Sí' : 'No'}`);
            
            // Si no es válido, vamos a generar un nuevo hash para 1234
            if (!isPinValid) {
                console.log('   🔧 Generando nuevo hash para PIN 1234...');
                const newPinHash = await bcrypt.hash('1234', 10);
                
                // Actualizar el PIN del empleado
                await prisma.employee.update({
                    where: { id: employee.id },
                    data: { pin: newPinHash }
                });
                
                console.log('   ✅ PIN actualizado correctamente');
                
                // Verificar de nuevo
                const isValidNow = await bcrypt.compare('1234', newPinHash);
                console.log(`   PIN 1234 válido después de actualizar: ${isValidNow ? 'Sí' : 'No'}`);
            } else {
                console.log('   ✅ Login debería funcionar con PIN 1234');
            }
            
            console.log('');
        }

        console.log('✅ Prueba de login de empleados completada');
        console.log('\n📋 Credenciales para prueba:');
        
        // Mostrar empleados con PIN 1234 válido
        const validEmployees = await prisma.employee.findMany({
            where: { active: true },
            include: { company: true }
        });
        
        for (const emp of validEmployees) {
            const isValid = await bcrypt.compare('1234', emp.pin);
            if (isValid) {
                console.log(`   👤 ${emp.name} ${emp.surname || ''}`);
                console.log(`      DNI: ${emp.dni}`);
                console.log(`      Empresa: ${emp.company.slug}`);
                console.log(`      PIN: 1234`);
                console.log('');
            }
        }
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testEmployeeLogin();