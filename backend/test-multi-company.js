const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testMultiCompany() {
    console.log('🧪 Creando datos de prueba para sistema multi-empresa...');

    try {
        // 1. Obtener empresas existentes
        const companies = await prisma.company.findMany({
            where: { active: true },
            take: 2,
        });

        if (companies.length < 2) {
            console.log('❌ Se necesitan al menos 2 empresas para probar el sistema multi-empresa');
            return;
        }

        console.log(`📊 Encontradas ${companies.length} empresas para pruebas`);

        // 2. Crear un empleado de prueba
        const employeeDni = '98765432X';
        const employeePin = await bcrypt.hash('1234', 10);

        // Verificar si el empleado ya existe
        let employee = await prisma.employee.findUnique({
            where: { dni: employeeDni }
        });

        if (!employee) {
            employee = await prisma.employee.create({
                data: {
                    dni: employeeDni,
                    name: 'Empleado',
                    surname: 'Multi-Empresa',
                    email: 'multiempresa@test.com',
                    pin: employeePin,
                    active: true,
                }
            });
            console.log('✅ Empleado creado:', employee.name);
        } else {
            console.log('ℹ️ Empleado ya existe:', employee.name);
        }

        // 3. Asignar el empleado a las empresas
        for (let i = 0; i < companies.length; i++) {
            const company = companies[i];

            // Verificar si ya existe la relación
            const existingRelation = await prisma.employeeCompany.findFirst({
                where: {
                    employeeId: employee.id,
                    companyId: company.id,
                }
            });

            if (!existingRelation) {
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
                console.log(`ℹ️ Relación ya existe: ${employee.name} -> ${company.name}`);
            }
        }

        // 4. Probar la función getEmployeeCompanies
        console.log('\n🔍 Probando función getEmployeeCompanies...');

        // Simular la llamada a la función del servicio
        const employeeCompanies = await prisma.employeeCompany.findMany({
            where: {
                employeeId: employee.id,
                active: true,
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        active: true,
                    },
                },
            },
            orderBy: {
                company: {
                    name: 'asc',
                },
            },
        });

        const activeCompanies = employeeCompanies
            .filter(ec => ec.company.active)
            .map(ec => ({
                id: ec.company.id,
                name: ec.company.name,
                slug: ec.company.slug,
                employeeCode: ec.employeeCode,
                department: ec.department,
                position: ec.position,
                active: ec.active,
            }));

        console.log('📋 Empresas del empleado:');
        activeCompanies.forEach(company => {
            console.log(`  - ${company.name} (${company.slug}) - ${company.position}`);
        });

        // 5. Probar login en cada empresa
        console.log('\n🔐 Probando login en cada empresa...');
        for (const company of activeCompanies) {
            console.log(`\n📍 Probando login en empresa: ${company.name} (${company.slug})`);

            // Buscar empresa por slug
            const companyData = await prisma.company.findUnique({
                where: { slug: company.slug, active: true },
            });

            if (!companyData) {
                console.log(`❌ Empresa no encontrada: ${company.slug}`);
                continue;
            }

            // Verificar relación empleado-empresa
            const employeeCompany = await prisma.employeeCompany.findFirst({
                where: {
                    employeeId: employee.id,
                    companyId: companyData.id,
                    active: true,
                },
                include: {
                    company: true,
                    employee: {
                        select: {
                            id: true,
                            dni: true,
                            name: true,
                            surname: true,
                            email: true,
                            phone: true,
                            avatar: true,
                            active: true,
                            createdAt: true,
                            updatedAt: true,
                        }
                    }
                }
            });

            if (!employeeCompany) {
                console.log(`❌ El empleado no está asignado a esta empresa: ${company.name}`);
                continue;
            }

            // Verificar PIN
            const isPinValid = await bcrypt.compare('1234', employee.pin);
            if (!isPinValid) {
                console.log(`❌ PIN inválido para empresa: ${company.name}`);
                continue;
            }

            console.log(`✅ Login exitoso en empresa: ${company.name}`);
            console.log(`   - Código empleado: ${employeeCompany.employeeCode}`);
            console.log(`   - Departamento: ${employeeCompany.department}`);
            console.log(`   - Posición: ${employeeCompany.position}`);
        }

        console.log('\n✅ Prueba del sistema multi-empresa completada');
        console.log('\n📝 Datos de prueba creados:');
        console.log(`   - DNI: ${employeeDni}`);
        console.log(`   - PIN: 1234`);
        console.log(`   - Empresas asignadas: ${activeCompanies.length}`);
        activeCompanies.forEach(company => {
            console.log(`     * ${company.name} (${company.slug})`);
        });

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testMultiCompany();