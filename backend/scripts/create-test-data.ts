import { PrismaClient, TimeEntryType, TimeEntrySource } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestData() {
    try {
        console.log('🔍 Creando datos de prueba para la página "Mis Registros"...');

        // Obtener el primer empleado activo
        const employee = await prisma.employee.findFirst({
            where: {
                active: true
            },
            include: {
                company: true
            }
        });

        if (!employee) {
            console.error('❌ No se encontró ningún empleado activo');
            return;
        }

        console.log(`✅ Empleado encontrado: ${employee.name} (${employee.dni}) - Empresa: ${employee.company.name}`);

        // Eliminar registros existentes para este empleado
        await prisma.timeEntry.deleteMany({
            where: {
                employeeId: employee.id
            }
        });
        console.log('🗑️ Registros existentes eliminados');

        // Crear registros de prueba para los últimos días
        const now = new Date();
        const entries = [];

        // Crear registros para los últimos 5 días
        for (let i = 4; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            date.setHours(0, 0, 0, 0);

            // Entrada
            entries.push({
                companyId: employee.companyId,
                employeeId: employee.id,
                type: TimeEntryType.IN,
                timestamp: new Date(date.getTime() + 8 * 60 * 60 * 1000), // 8:00 AM
                source: TimeEntrySource.WEB,
                createdByEmployee: true
            });

            // Salida
            entries.push({
                companyId: employee.companyId,
                employeeId: employee.id,
                type: TimeEntryType.OUT,
                timestamp: new Date(date.getTime() + 16 * 60 * 60 * 1000), // 4:00 PM
                source: TimeEntrySource.WEB,
                createdByEmployee: true
            });

            // Pausa (algunos días)
            if (i % 2 === 0) {
                entries.push({
                    companyId: employee.companyId,
                    employeeId: employee.id,
                    type: TimeEntryType.BREAK,
                    timestamp: new Date(date.getTime() + 12 * 60 * 60 * 1000), // 12:00 PM
                    source: TimeEntrySource.WEB,
                    createdByEmployee: true
                });

                entries.push({
                    companyId: employee.companyId,
                    employeeId: employee.id,
                    type: TimeEntryType.RESUME,
                    timestamp: new Date(date.getTime() + 12.5 * 60 * 60 * 1000), // 12:30 PM
                    source: TimeEntrySource.WEB,
                    createdByEmployee: true
                });
            }
        }

        // Insertar todos los registros
        await prisma.timeEntry.createMany({
            data: entries
        });

        console.log(`✅ Se crearon ${entries.length} registros de prueba`);

        // Verificar los registros creados
        const createdEntries = await prisma.timeEntry.findMany({
            where: {
                employeeId: employee.id
            },
            orderBy: {
                timestamp: 'desc'
            },
            take: 10
        });

        console.log('📋 Registros creados (últimos 10):');
        createdEntries.forEach((entry, index) => {
            console.log(`  ${index + 1}. ID: ${entry.id}, Tipo: ${entry.type}, Timestamp: ${entry.timestamp.toISOString()}`);
        });

        console.log('✅ Datos de prueba creados exitosamente');
        console.log('🌐 Ahora puedes probar la página "Mis Registros" en el frontend');

    } catch (error) {
        console.error('❌ Error creando datos de prueba:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la función
createTestData();