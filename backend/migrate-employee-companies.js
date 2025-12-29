const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateEmployeeCompanies() {
    console.log('🔄 Iniciando migración de empleados a sistema multi-empresa...');

    try {
        // 1. Obtener todos los empleados existentes
        const employees = await prisma.$queryRaw`
            SELECT id, "companyId", dni, name, surname, email, phone, department, position, "contractType", "hireDate", salary, active, "createdAt", "updatedAt"
            FROM employees
        `;

        console.log(`📊 Encontrados ${employees.length} empleados para migrar`);

        // 2. Para cada empleado, crear un registro en EmployeeCompany
        for (const employee of employees) {
            console.log(`🔄 Migrando empleado: ${employee.name} (DNI: ${employee.dni})`);

            // Crear registro en EmployeeCompany
            await prisma.$executeRaw`
                INSERT INTO "employee_companies" (
                    id, 
                    "employeeId", 
                    "companyId", 
                    "employeeCode", 
                    department, 
                    position, 
                    salary, 
                    "hireDate", 
                    active, 
                    "createdAt", 
                    "updatedAt"
                ) VALUES (
                    gen_random_uuid(),
                    ${employee.id},
                    ${employee.companyId},
                    ${employee.dni}, -- Usar DNI como código de empleado por defecto
                    ${employee.department},
                    ${employee.position},
                    ${employee.salary},
                    ${employee.hireDate},
                    ${employee.active},
                    ${employee.createdAt},
                    ${employee.updatedAt}
                )
                ON CONFLICT ("employeeId", "companyId") DO NOTHING
            `;

            console.log(`✅ Empleado ${employee.name} migrado correctamente`);
        }

        console.log('✅ Migración completada exitosamente');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la migración
migrateEmployeeCompanies()
    .then(() => {
        console.log('🎉 Proceso de migración finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Falló la migración:', error);
        process.exit(1);
    });