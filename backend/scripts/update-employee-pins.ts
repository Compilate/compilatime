import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateEmployeePins() {
    console.log('🔧 Actualizando PINs de empleados a 10 rounds...\n');

    try {
        // 1. Obtener todos los empleados activos
        const employees = await prisma.employee.findMany({
            where: { active: true },
        });

        console.log(`   👥 Empleados activos encontrados: ${employees.length}\n`);

        // 2. Actualizar PIN de cada empleado
        for (const employee of employees) {
            console.log(`2. Actualizando PIN para: ${employee.name} (${employee.dni})`);
            
            // Generar nuevo hash con 10 rounds
            const newPinHash = await bcrypt.hash('1234', 10);
            
            // Actualizar el PIN del empleado
            await prisma.employee.update({
                where: { id: employee.id },
                data: { pin: newPinHash }
            });
            
            console.log('   ✅ PIN actualizado correctamente');
        }

        console.log('\n✅ Todos los PINs de empleados han sido actualizados');
        console.log('\n📋 Credenciales para prueba:');
        
        // Mostrar empleados actualizados
        const updatedEmployees = await prisma.employee.findMany({
            where: { active: true },
            include: { company: true }
        });
        
        for (const emp of updatedEmployees) {
            console.log(`   👤 ${emp.name} ${emp.surname || ''}`);
            console.log(`      DNI: ${emp.dni}`);
            console.log(`      Empresa: ${emp.company.slug}`);
            console.log(`      PIN: 1234`);
            console.log('');
        }
    } catch (error) {
        console.error('❌ Error al actualizar PINs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateEmployeePins();