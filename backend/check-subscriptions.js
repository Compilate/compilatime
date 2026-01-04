const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSubscriptions() {
    try {
        console.log('🔍 Verificando suscripciones en la base de datos...');

        // Obtener todas las empresas
        const companies = await prisma.company.findMany({
            select: {
                id: true,
                name: true,
                currentSubscriptionId: true,
            }
        });

        console.log(`📊 Total empresas: ${companies.length}`);

        // Obtener todas las suscripciones
        const subscriptions = await prisma.subscription.findMany({
            select: {
                id: true,
                companyId: true,
                status: true,
                startDate: true,
                endDate: true,
                plan: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        console.log(`📋 Total suscripciones: ${subscriptions.length}`);

        // Mostrar detalles
        for (const company of companies) {
            console.log(`\n🏢 Empresa: ${company.name} (${company.id})`);
            console.log(`   currentSubscriptionId: ${company.currentSubscriptionId}`);

            const companySubscriptions = subscriptions.filter(s => s.companyId === company.id);
            console.log(`   Suscripciones (${companySubscriptions.length}):`);

            for (const sub of companySubscriptions) {
                console.log(`     - ${sub.id}: ${sub.status} (${sub.plan?.name || 'Sin plan'}) del ${sub.startDate} al ${sub.endDate}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSubscriptions();