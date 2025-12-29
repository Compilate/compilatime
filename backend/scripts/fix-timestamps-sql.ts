import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTimestampsWithPrisma() {
    console.log('🔍 Buscando registros con timestamps nulos o inválidos usando Prisma...');

    try {
        // Primero, buscar todos los registros para analizar
        const allEntries = await prisma.timeEntry.findMany({
            select: {
                id: true,
                employeeId: true,
                type: true,
                timestamp: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50 // Limitar a 50 para análisis
        });

        console.log(`📊 Analizando ${allEntries.length} registros recientes`);

        // Identificar registros problemáticos
        const problematicEntries = allEntries.filter(entry => {
            return !entry.timestamp ||
                entry.timestamp < new Date('2000-01-01') ||
                entry.timestamp > new Date('2030-12-31');
        });

        console.log(`🔍 Encontrados ${problematicEntries.length} registros problemáticos`);

        if (problematicEntries.length === 0) {
            console.log('✅ No se encontraron registros con problemas de timestamp');
            return;
        }

        // Mostrar detalles de los registros problemáticos
        for (const entry of problematicEntries) {
            console.log(`⚠️ Registro problemático:`, {
                id: entry.id,
                employeeId: entry.employeeId,
                type: entry.type,
                timestamp: entry.timestamp,
                timestampType: typeof entry.timestamp,
                createdAt: entry.createdAt
            });
        }

        // Corregir registros con timestamp nulo
        for (const entry of problematicEntries) {
            if (!entry.timestamp) {
                // Establecer timestamp a createdAt si es nulo
                await prisma.timeEntry.update({
                    where: { id: entry.id },
                    data: { timestamp: entry.createdAt }
                });
                console.log(`✅ Corregido registro ${entry.id}: timestamp nulo -> ${entry.createdAt}`);
            } else {
                console.log(`⚠️ Registro con timestamp inválido: ${entry.id}, timestamp: ${entry.timestamp}`);
            }
        }

        console.log('✅ Corrección de timestamps completada');

        // Verificar todos los registros después de la corrección
        const sampleEntries = await prisma.timeEntry.findMany({
            select: {
                id: true,
                employeeId: true,
                type: true,
                timestamp: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        });

        console.log('\n📋 Muestra de registros después de la corrección:');
        sampleEntries.forEach(entry => {
            const timestampValid = entry.timestamp && !isNaN(entry.timestamp.getTime());
            console.log(`  - ID: ${entry.id}, Timestamp: ${entry.timestamp}, Válido: ${timestampValid ? '✅' : '❌'}`);
        });

    } catch (error) {
        console.error('❌ Error al corregir timestamps:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la función
fixTimestampsWithPrisma();