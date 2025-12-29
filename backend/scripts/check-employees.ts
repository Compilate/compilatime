import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkEmployees() {
    try {
        console.log('🔍 Verificando datos en la base de datos...\n');

        // Verificar empresas
        const companies = await prisma.company.findMany();
        console.log(`📊 Empresas encontradas: ${companies.length}`);
        companies.forEach(company => {
            console.log(`  - ${company.name} (slug: ${company.slug})`);
        });

        // Verificar empleados
        const employees = await prisma.employee.findMany({
            include: {
                company: true
            }
        });
        console.log(`\n👥 Empleados encontrados: ${employees.length}`);
        employees.forEach(employee => {
            console.log(`  - ${employee.name} ${employee.surname || ''} (DNI: ${employee.dni}, Empresa: ${employee.company.slug})`);
        });

        // Si no hay empleados, crear uno de prueba
        if (employees.length === 0 && companies.length > 0) {
            console.log('\n⚠️  No hay empleados. Creando empleado de prueba...');

            const company = companies[0];
            const testPin = '1234';
            const hashedPin = await bcrypt.hash(testPin, 10);

            const newEmployee = await prisma.employee.create({
                data: {
                    companyId: company.id,
                    dni: '12345678A',
                    name: 'Empleado',
                    surname: 'Prueba',
                    email: 'empleado@prueba.com',
                    pin: hashedPin,
                    active: true,
                }
            });

            console.log(`✅ Empleado de prueba creado:`);
            console.log(`   Nombre: ${newEmployee.name} ${newEmployee.surname}`);
            console.log(`   DNI: ${newEmployee.dni}`);
            console.log(`   PIN: ${testPin}`);
            console.log(`   Empresa: ${company.slug}`);
        }

        // Verificar usuarios de empresa
        const companyUsers = await prisma.companyUser.findMany({
            include: {
                company: true
            }
        });
        console.log(`\n👤 Usuarios de empresa encontrados: ${companyUsers.length}`);
        companyUsers.forEach(user => {
            console.log(`  - ${user.name} (${user.email}) - Rol: ${user.role} - Empresa: ${user.company.slug}`);
        });

        // Si no hay usuarios de empresa, crear uno de prueba
        if (companyUsers.length === 0 && companies.length > 0) {
            console.log('\n⚠️  No hay usuarios de empresa. Creando usuario de prueba...');

            const company = companies[0];
            const testPassword = 'password123';
            const hashedPassword = await bcrypt.hash(testPassword, 10);

            const newUser = await prisma.companyUser.create({
                data: {
                    companyId: company.id,
                    name: 'Administrador',
                    email: 'admin@prueba.com',
                    passwordHash: hashedPassword,
                    role: 'ADMIN',
                    active: true,
                }
            });

            console.log(`✅ Usuario de prueba creado:`);
            console.log(`   Nombre: ${newUser.name}`);
            console.log(`   Email: ${newUser.email}`);
            console.log(`   Contraseña: ${testPassword}`);
            console.log(`   Rol: ${newUser.role}`);
            console.log(`   Empresa: ${company.slug}`);
        }

    } catch (error) {
        console.error('❌ Error al verificar datos:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkEmployees();