const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreEmployeeCompanies() {
    console.log('🔄 Restaurando relaciones empleado-empresa desde datos existentes...');

    try {
        // Primero, vamos a verificar si hay datos en timeEntries para recuperar las relaciones
        const timeEntries = await prisma.$queryRaw`
            SELECT DISTINCT "employeeId", "companyId"
            FROM "time_entries"
            WHERE "companyId" IS NOT NULL
        `;

        console.log(`📊 Encontradas ${timeEntries.length} relaciones empleado-empresa en time_entries`);

        // Para cada relación única, crear un registro en EmployeeCompany
        for (const entry of timeEntries) {
            console.log(`🔄 Restaurando relación: empleado ${entry.employeeId} -> empresa ${entry.companyId}`);

            // Verificar si ya existe
            const exists = await prisma.$queryRaw`
                SELECT COUNT(*) as count
                FROM "employee_companies"
                WHERE "employeeId" = ${entry.employeeId} AND "companyId" = ${entry.companyId}
            `;

            if (parseInt(exists[0].count) === 0) {
                // Obtener datos del empleado
                const employee = await prisma.$queryRaw`
                    SELECT dni, name, surname, email, phone, department, position, "contractType", "hireDate", salary, active, "createdAt", "updatedAt"
                    FROM employees
                    WHERE id = ${entry.employeeId}
                `;

                if (employee.length > 0) {
                    const emp = employee[0];

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
                            ${entry.employeeId},
                            ${entry.companyId},
                            ${emp.dni},
                            ${emp.department},
                            ${emp.position},
                            ${emp.salary},
                            ${emp.hireDate},
                            ${emp.active},
                            ${emp.createdAt},
                            ${emp.updatedAt}
                        )
                    `;

                    console.log(`✅ Relación restaurada: empleado ${emp.name} (DNI: ${emp.dni})`);
                }
            } else {
                console.log(`⚠️ La relación ya existe: empleado ${entry.employeeId} -> empresa ${entry.companyId}`);
            }
        }

        console.log('✅ Restauración completada exitosamente');

    } catch (error) {
        console.error('❌ Error durante la restauración:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la restauración
restoreEmployeeCompanies()
    .then(() => {
        console.log('🎉 Proceso de restauración finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Falló la restauración:', error);
        process.exit(1);
    });