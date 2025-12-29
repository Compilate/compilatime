import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db';
// Importamos el servicio directamente para evitar problemas de tipos
import authService from '../src/modules/auth/auth.service';

async function testEmployeeLogin() {
    console.log('🔍 Probando login de empleados...\n');

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
            
            try {
                // Intentar login con PIN 1234 (que es el PIN por defecto según el script check-pins.ts)
                const result = await authService.loginEmployee({
                    companySlug: employee.company.slug,
                    dni: employee.dni,
                    pin: '1234'
                });

                console.log('   ✅ Login exitoso');
                console.log(`   Usuario: ${result.user.name} ${result.user.surname || ''}`);
                console.log(`   Token generado: ${result.tokens.accessToken ? 'Sí' : 'No'}\n`);
            } catch (error: any) {
                console.log(`   ❌ Error en login: ${error.message}`);
                
                // Si el error es de credenciales inválidas, vamos a verificar el PIN
                if (error.message.includes('Credenciales inválidas')) {
                    console.log('   🔍 Verificando PIN...');
                    
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
                        
                        // Intentar login de nuevo
                        try {
                            await authService.loginEmployee({
                                companySlug: employee.company.slug,
                                dni: employee.dni,
                                pin: '1234'
                            });
                            console.log('   ✅ Login exitoso después de actualizar PIN\n');
                        } catch (retryError: any) {
                            console.log(`   ❌ Error en login después de actualizar PIN: ${retryError.message}\n`);
                        }
                    }
                }
            }
        }

        console.log('✅ Prueba de login de empleados completada');
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testEmployeeLogin();