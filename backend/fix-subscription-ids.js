const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSubscriptionIds() {
    try {
        console.log('🔧 Corrigiendo currentSubscriptionId en las empresas...');

        // Obtener todas las empresas con suscripciones pero sin currentSubscriptionId
        const companies = await prisma.company.findMany({
            where: {
                currentSubscriptionId: null
            },
            select: {
                id: true,
                name: true,
            }
        });

        console.log(`📊 Empresas sin currentSubscriptionId: ${companies.length}`);

        for (const company of companies) {
            // Buscar la suscripción activa más reciente para esta empresa
            const activeSubscription = await prisma.subscription.findFirst({
                where: {
                    companyId: company.id,
                    status: 'ACTIVE'
                },
                orderBy: {
                    createdAt: 'desc'
                },
                select: {
                    id: true,
                    status: true,
                    startDate: true,
                    endDate: true,
                    plan: {
                        select: {
                            name: true,
                        }
                    }
                }
            });

            if (activeSubscription) {
                console.log(`\n🏢 Empresa: ${company.name}`);
                console.log(`   Actualizando currentSubscriptionId a: ${activeSubscription.id}`);
                console.log(`   Suscripción: ${activeSubscription.plan.name} (${activeSubscription.status})`);

                // Actualizar la empresa con el ID de la suscripción activa
                await prisma.company.update({
                    where: { id: company.id },
                    data: { currentSubscriptionId: activeSubscription.id }
                });

                console.log(`   ✅ Actualizado correctamente`);
            } else {
                console.log(`\n🏢 Empresa: ${company.name}`);
                console.log(`   ❌ No tiene suscripciones activas`);
            }
        }

        console.log('\n✅ Proceso completado');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixSubscriptionIds();