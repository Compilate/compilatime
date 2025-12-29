const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createMultiCompanyEmployees() {
    console.log('🔄 Creando empleados multi-empresa de prueba...');

    try {
        // Obtener empresas existentes
        const companies = await prisma.company.findMany({
            where: { active: true },
            select: { id: true, name: true, slug: true }
        });

        if (companies.length < 2) {
            console.log('⚠️ Se necesitan al menos 2 empresas para crear empleados multi-empresa');
            return;
        }

        console.log(`📊 Encontradas ${companies.length} empresas`);

        // Crear un empleado que trabaja en múltiples empresas
        const employeeDni = '12345678Z';
        const employeePin = await bcrypt.hash('1234', 10);

        // Verificar si el empleado ya existe
        let employee = await prisma.employee.findUnique({
            where: { dni: employeeDni }
        });

        if (!employee) {
            employee = await prisma.employee.create({
                data: {
                    dni: employeeDni,
                    name: 'Juan',
                    surname: 'Multiempresa',
                    email: 'juan.multiempresa@test.com',
                    pin: employeePin,
                    active: true
                }
            });
            console.log(`✅ Empleado creado: ${employee.name} ${employee.surname}`);
        } else {
            console.log(`ℹ️ El empleado ya existe: ${employee.name} ${employee.surname}`);
        }

        // Asignar el empleado a las primeras 2 empresas
        for (let i = 0; i < Math.min(2, companies.length); i++) {
            const company = companies[i];

            // Verificar si ya existe la relación
            const existingRelation = await prisma.$queryRaw`
                SELECT COUNT(*) as count
                FROM "employee_companies"
                WHERE "employeeId" = ${employee.id} AND "companyId" = ${company.id}
            `;

            if (parseInt(existingRelation[0].count) === 0) {
                await prisma.employeeCompany.create({
                    data: {
                        employeeId: employee.id,
                        companyId: company.id,
                        employeeCode: `${employeeDni}-${company.slug}`,
                        department: i === 0 ? 'Tecnología' : 'Administración',
                        position: i === 0 ? 'Desarrollador' : 'Administrativo',
                        salary: i === 0 ? 30000 : 25000,
                        hireDate: new Date('2023-01-01'),
                        active: true
                    }
                });
                console.log(`✅ Relación creada: ${employee.name} -> ${company.name}`);
            } else {
                console.log(`ℹ️ La relación ya existe: ${employee.name} -> ${company.name}`);
            }
        }

        // Crear otro empleado multi-empresa
        const employee2Dni = '87654321X';
        const employee2Pin = await bcrypt.hash('5678', 10);

        let employee2 = await prisma.employee.findUnique({
            where: { dni: employee2Dni }
        });

        if (!employee2) {
            employee2 = await prisma.employee.create({
                data: {
                    dni: employee2Dni,
                    name: 'María',
                    surname: 'Polivalente',
                    email: 'maria.polivalente@test.com',
                    pin: employee2Pin,
                    active: true
                }
            });
            console.log(`✅ Empleado creado: ${employee2.name} ${employee2.surname}`);
        } else {
            console.log(`ℹ️ El empleado ya existe: ${employee2.name} ${employee2.surname}`);
        }

        // Asignar el segundo empleado a las últimas 2 empresas
        for (let i = Math.max(0, companies.length - 2); i < companies.length; i++) {
            const company = companies[i];

            const existingRelation = await prisma.$queryRaw`
                SELECT COUNT(*) as count
                FROM "employee_companies"
                WHERE "employeeId" = ${employee2.id} AND "companyId" = ${company.id}
            `;

            if (parseInt(existingRelation[0].count) === 0) {
                await prisma.employeeCompany.create({
                    data: {
                        employeeId: employee2.id,
                        companyId: company.id,
                        employeeCode: `${employee2Dni}-${company.slug}`,
                        department: 'Recursos Humanos',
                        position: 'Técnico RRHH',
                        salary: 28000,
                        hireDate: new Date('2023-06-01'),
                        active: true
                    }
                });
                console.log(`✅ Relación creada: ${employee2.name} -> ${company.name}`);
            } else {
                console.log(`ℹ️ La relación ya existe: ${employee2.name} -> ${company.name}`);
            }
        }

        console.log('✅ Creación de empleados multi-empresa completada');

        // Mostrar resumen
        console.log('\n📋 Resumen de empleados multi-empresa:');

        const multiCompanyEmployees = await prisma.$queryRaw`
            SELECT 
                e.dni,
                e.name,
                e.surname,
                COUNT(ec."companyId") as company_count,
                ARRAY_AGG(c.name) as companies
            FROM employees e
            JOIN "employee_companies" ec ON e.id = ec."employeeId"
            JOIN companies c ON ec."companyId" = c.id
            WHERE e.active = true
            GROUP BY e.id, e.dni, e.name, e.surname
            HAVING COUNT(ec."companyId") > 1
            ORDER BY e.name
        `;

        multiCompanyEmployees.forEach(emp => {
            console.log(`👤 ${emp.name} ${emp.surname} (DNI: ${emp.dni}) - ${emp.company_count} empresas: ${emp.companies.join(', ')}`);
        });

    } catch (error) {
        console.error('❌ Error durante la creación:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la creación
createMultiCompanyEmployees()
    .then(() => {
        console.log('🎉 Proceso de creación finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Falló la creación:', error);
        process.exit(1);
    });