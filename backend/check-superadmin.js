const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSuperadmin() {
    try {
        console.log('🔍 Verificando superadmin...');

        const superadmin = await prisma.superadmin.findFirst({
            select: {
                id: true,
                email: true,
                name: true,
                active: true,
                passwordHash: true
            }
        });

        if (superadmin) {
            console.log('📊 Superadmin encontrado:');
            console.log(`   ID: ${superadmin.id}`);
            console.log(`   Email: ${superadmin.email}`);
            console.log(`   Nombre: ${superadmin.name}`);
            console.log(`   Activo: ${superadmin.active}`);
            console.log(`   Password hash: ${superadmin.passwordHash.substring(0, 20)}...`);
        } else {
            console.log('❌ No se encontró ningún superadmin');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSuperadmin();