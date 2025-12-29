import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTimestamps() {
    try {
        console.log('🔍 Buscando registros con timestamps nulos o inválidos...');

        // Buscar registros con timestamp null
        const nullTimestamps = await prisma.timeEntry.findMany({
            where: {
                timestamp: null as any
            }
        });

        console.log(`📊 Se encontraron ${nullTimestamps.length} registros con timestamp null`);

        if (nullTimestamps.length > 0) {
            console.log('🔧 Registros con timestamp null:');
            nullTimestamps.forEach(entry => {
                console.log(`  - ID: ${entry.id}, Empleado: ${entry.employeeId}, Tipo: ${entry.type}, Creado: ${entry.createdAt}`);
            });

            // Opción 1: Eliminar estos registros
            console.log('\n🗑️ Eliminando registros con timestamp null...');
            for (const entry of nullTimestamps) {
                await prisma.timeEntry.delete({
                    where: { id: entry.id }
                });
                console.log(`  ✅ Eliminado registro ${entry.id}`);
            }
        }

        // Buscar registros con timestamp inválido (fechas muy antiguas o futuras)
        const invalidTimestamps = await prisma.timeEntry.findMany({
            where: {
                OR: [
                    { timestamp: { lt: new Date('2000-01-01') } },
                    { timestamp: { gt: new Date('2030-12-31') } }
                ]
            }
        });

        console.log(`\n📊 Se encontraron ${invalidTimestamps.length} registros con timestamp inválido`);

        if (invalidTimestamps.length > 0) {
            console.log('🔧 Registros con timestamp inválido:');
            invalidTimestamps.forEach(entry => {
                console.log(`  - ID: ${entry.id}, Empleado: ${entry.employeeId}, Tipo: ${entry.type}, Timestamp: ${entry.timestamp}`);
            });

            // Opción 2: Corregir estos timestamps usando createdAt como referencia
            console.log('\n🔧 Corrigiendo timestamps inválidos...');
            for (const entry of invalidTimestamps) {
                // Usar createdAt como timestamp corregido si es razonable
                const correctedTimestamp = entry.createdAt || new Date();

                await prisma.timeEntry.update({
                    where: { id: entry.id },
                    data: { timestamp: correctedTimestamp }
                });
                console.log(`  ✅ Corregido registro ${entry.id}: ${entry.timestamp} -> ${correctedTimestamp}`);
            }
        }

        // Verificar todos los registros después de la corrección
        const allEntries = await prisma.timeEntry.findMany({
            select: {
                id: true,
                employeeId: true,
                type: true,
                timestamp: true,
                createdAt: true
            },
            take: 10 // Solo mostrar los primeros 10 para no saturar el log
        });

        console.log('\n📋 Muestra de registros después de la corrección:');
        allEntries.forEach(entry => {
            const timestampValid = entry.timestamp && !isNaN(entry.timestamp.getTime());
            console.log(`  - ID: ${entry.id}, Timestamp: ${entry.timestamp}, Válido: ${timestampValid ? '✅' : '❌'}`);
        });

        console.log('\n✅ Proceso de corrección de timestamps completado');

    } catch (error) {
        console.error('❌ Error al corregir timestamps:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar el script
fixTimestamps();