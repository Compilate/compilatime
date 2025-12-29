import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de Superadmin y planes básicos...');

    try {
        // Crear Superadmin principal
        const existingSuperadmin = await prisma.superadmin.findFirst({
            where: { email: 'admin@compilatime.com' }
        });

        if (!existingSuperadmin) {
            const hashedPassword = await bcrypt.hash('admin123456', 10);

            const superadmin = await prisma.superadmin.create({
                data: {
                    email: 'admin@compilatime.com',
                    passwordHash: hashedPassword,
                    name: 'Superadmin CompilaTime',
                    active: true
                }
            });

            console.log('✅ Superadmin creado:', { id: superadmin.id, email: superadmin.email });
        } else {
            console.log('ℹ️ Superadmin ya existe:', existingSuperadmin.email);
        }

        // Crear planes básicos
        const plans = [
            {
                name: 'Básico',
                description: 'Ideal para pequeñas empresas hasta 10 empleados',
                priceMonthly: 29.99,
                priceYearly: 299.99,
                maxEmployees: 10,
                maxTimeEntriesPerMonth: 500,
                features: {
                    basicTimeTracking: true,
                    basicReports: true,
                    employeeManagement: true,
                    scheduleManagement: true,
                    absenceManagement: true,
                    emailSupport: true,
                    apiAccess: false,
                    advancedReports: false,
                    customBranding: false,
                    prioritySupport: false,
                    dedicatedAccountManager: false,
                    slaGuarantee: false
                }
            },
            {
                name: 'Pro',
                description: 'Perfecto para empresas en crecimiento hasta 50 empleados',
                priceMonthly: 79.99,
                priceYearly: 799.99,
                maxEmployees: 50,
                maxTimeEntriesPerMonth: 2000,
                features: {
                    basicTimeTracking: true,
                    basicReports: true,
                    employeeManagement: true,
                    scheduleManagement: true,
                    absenceManagement: true,
                    emailSupport: true,
                    apiAccess: true,
                    advancedReports: true,
                    customBranding: false,
                    prioritySupport: true,
                    dedicatedAccountManager: false,
                    slaGuarantee: false
                }
            },
            {
                name: 'Premium',
                description: 'Solución completa para empresas grandes hasta 200 empleados',
                priceMonthly: 199.99,
                priceYearly: 1999.99,
                maxEmployees: 200,
                maxTimeEntriesPerMonth: 10000,
                features: {
                    basicTimeTracking: true,
                    basicReports: true,
                    employeeManagement: true,
                    scheduleManagement: true,
                    absenceManagement: true,
                    emailSupport: true,
                    apiAccess: true,
                    advancedReports: true,
                    customBranding: true,
                    prioritySupport: true,
                    dedicatedAccountManager: true,
                    slaGuarantee: true
                }
            },
            {
                name: 'Enterprise',
                description: 'Personalizado para empresas corporativas sin límites',
                priceMonthly: 499.99,
                priceYearly: 4999.99,
                maxEmployees: 1000,
                maxTimeEntriesPerMonth: 50000,
                features: {
                    basicTimeTracking: true,
                    basicReports: true,
                    employeeManagement: true,
                    scheduleManagement: true,
                    absenceManagement: true,
                    emailSupport: true,
                    apiAccess: true,
                    advancedReports: true,
                    customBranding: true,
                    prioritySupport: true,
                    dedicatedAccountManager: true,
                    slaGuarantee: true,
                    whiteLabel: true,
                    customIntegrations: true,
                    onPremiseOption: true
                }
            }
        ];

        for (const planData of plans) {
            const existingPlan = await prisma.plan.findFirst({
                where: { name: planData.name }
            });

            if (!existingPlan) {
                const plan = await prisma.plan.create({
                    data: planData
                });

                console.log('✅ Plan creado:', {
                    id: plan.id,
                    name: plan.name,
                    price: plan.priceMonthly,
                    maxEmployees: plan.maxEmployees
                });
            } else {
                console.log('ℹ️ Plan ya existe:', existingPlan.name);
            }
        }

        console.log('🎉 Seed de Superadmin y planes completado exitosamente');

        // Mostrar información de acceso
        console.log('\n📋 Información de acceso al panel de Superadmin:');
        console.log('🔗 URL: http://localhost:4000/admin/login');
        console.log('📧 Email: admin@compilatime.com');
        console.log('🔑 Contraseña: admin123456');
        console.log('\n⚠️  Recuerda cambiar la contraseña después del primer inicio de sesión');

    } catch (error) {
        console.error('❌ Error durante el seed:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });