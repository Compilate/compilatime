import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkEmployeePins() {
    try {
        console.log('🔍 Verificando PINs de empleados...\n');

        // Obtener todos los empleados con sus PINs
        const employees = await prisma.employee.findMany({
            include: {
                company: true
            }
        });

        console.log(`👥 Empleados encontrados: ${employees.length}\n`);

        for (const employee of employees) {
            console.log(`Empleado: ${employee.name} ${employee.surname || ''}`);
            console.log(`  DNI: ${employee.dni}`);
            console.log(`  Empresa: ${employee.company.slug} (${employee.company.name})`);
            console.log(`  PIN hash: ${employee.pin ? '✅ Tiene PIN' : '❌ Sin PIN'}`);
            console.log(`  Activo: ${employee.active ? '✅ Sí' : '❌ No'}`);

            // Verificar si el PIN es válido comparando con PINs comunes
            const commonPins = ['1234', '0000', '1111', '2222'];
            let validPinFound = false;

            for (const testPin of commonPins) {
                try {
                    if (employee.pin && await bcrypt.compare(testPin, employee.pin)) {
                        console.log(`  ✅ PIN válido encontrado: ${testPin}`);
                        validPinFound = true;
                        break;
                    }
                } catch (error) {
                    console.log(`  ❌ Error al verificar PIN ${testPin}: ${error}`);
                }
            }

            if (!validPinFound) {
                console.log(`  ❌ No se encontró un PIN válido común`);
                console.log(`  💡 Puedes usar este DNI para probar: ${employee.dni}`);
            }

            console.log('---');
        }

        // Verificar usuarios de empresa
        const companyUsers = await prisma.companyUser.findMany({
            include: {
                company: true
            }
        });

        console.log(`\n👤 Usuarios de empresa encontrados: ${companyUsers.length}\n`);

        for (const user of companyUsers) {
            console.log(`Usuario: ${user.name}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Empresa: ${user.company.slug} (${user.company.name})`);
            console.log(`  Rol: ${user.role}`);
            console.log(`  Password hash: ${user.passwordHash ? '✅ Tiene contraseña' : '❌ Sin contraseña'}`);
            console.log(`  Activo: ${user.active ? '✅ Sí' : '❌ No'}`);

            // Verificar si la contraseña es válida comparando con contraseñas comunes
            const commonPasswords = ['password123', 'admin123', '123456'];
            let validPasswordFound = false;

            for (const testPassword of commonPasswords) {
                try {
                    if (user.passwordHash && await bcrypt.compare(testPassword, user.passwordHash)) {
                        console.log(`  ✅ Contraseña válida encontrada: ${testPassword}`);
                        validPasswordFound = true;
                        break;
                    }
                } catch (error) {
                    console.log(`  ❌ Error al verificar contraseña: ${error}`);
                }
            }

            if (!validPasswordFound) {
                console.log(`  ❌ No se encontró una contraseña válida común`);
                console.log(`  💡 Puedes usar este email para probar: ${user.email}`);
            }

            console.log('---');
        }

        console.log('\n📋 Credenciales para prueba:');
        console.log('\n🏢 EMPRESA: demo');
        console.log('👤 USUARIO EMPRESA:');
        console.log('   Email: admin@demo.com');
        console.log('   Contraseña: password123');
        console.log('\n👥 EMPLEADOS:');

        for (const employee of employees) {
            if (employee.company.slug === 'demo') {
                // Verificar PIN para este empleado
                const commonPins = ['1234', '0000', '1111', '2222'];
                for (const testPin of commonPins) {
                    try {
                        if (employee.pin && await bcrypt.compare(testPin, employee.pin)) {
                            console.log(`   ${employee.name} ${employee.surname || ''}:`);
                            console.log(`     DNI: ${employee.dni}`);
                            console.log(`     PIN: ${testPin}`);
                            break;
                        }
                    } catch (error) {
                        // Ignorar errores de comparación
                    }
                }
            }
        }

    } catch (error) {
        console.error('❌ Error al verificar PINs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkEmployeePins();