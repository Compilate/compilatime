const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createTestSubscriptions() {
    try {
        console.log('🌱 Creando suscripciones de prueba...');

        // Obtener todas las empresas
        const companies = await prisma.company.findMany();
        console.log(`📊 Encontradas ${companies.length} empresas`);

        // Obtener todos los planes
        const plans = await prisma.plan.findMany();
        console.log(`📋 Encontrados ${plans.length} planes`);

        // Crear suscripciones para cada empresa
        for (const company of companies) {
            // Asignar un plan aleatorio a cada empresa
            const randomPlan = plans[Math.floor(Math.random() * plans.length)];

            if (!randomPlan) {
                console.log(`⚠️ No hay planes disponibles para la empresa ${company.name}`);
                continue;
            }

            // Verificar si ya tiene una suscripción activa
            const existingSubscription = await prisma.subscription.findFirst({
                where: {
                    companyId: company.id,
                    status: 'ACTIVE'
                }
            });

            if (existingSubscription) {
                console.log(`ℹ️ La empresa ${company.name} ya tiene una suscripción activa`);
                continue;
            }

            // Crear suscripción
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1); // +1 mes

            const subscription = await prisma.subscription.create({
                data: {
                    companyId: company.id,
                    planId: randomPlan.id,
                    startDate: startDate,
                    endDate: endDate,
                    status: 'ACTIVE',
                    renewsAutomatically: true,
                    paymentMethod: 'MANUAL'
                }
            });

            console.log(`✅ Suscripción creada para ${company.name}:`);
            console.log(`   Plan: ${randomPlan.name}`);
            console.log(`   Precio: €${randomPlan.priceMonthly}/mes`);
            console.log(`   ID: ${subscription.id}`);

            // Actualizar la empresa con el ID de la suscripción
            await prisma.company.update({
                where: { id: company.id },
                data: { currentSubscriptionId: subscription.id }
            });

            console.log(`   Empresa actualizada con currentSubscriptionId: ${subscription.id}`);
            console.log('');
        }

        console.log('🎉 Suscripciones de prueba creadas exitosamente');

        // Verificar el resultado
        console.log('\n🔍 Verificando resultado...');
        const updatedCompanies = await prisma.company.findMany({
            include: {
                currentSubscription: {
                    include: {
                        plan: true
                    }
                },
                _count: {
                    select: {
                        subscriptions: true
                    }
                }
            }
        });

        for (const company of updatedCompanies) {
            console.log(`\n🏢 ${company.name}:`);
            console.log(`   currentSubscriptionId: ${company.currentSubscriptionId}`);
            console.log(`   currentSubscription: ${company.currentSubscription ? company.currentSubscription.plan.name : 'N/A'}`);
            console.log(`   subscriptionCount: ${company._count.subscriptions}`);
        }

    } catch (error) {
        console.error('❌ Error al crear suscripciones:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestSubscriptions();