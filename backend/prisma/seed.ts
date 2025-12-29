import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env';

const prisma = new PrismaClient();

// Datos de ejemplo para el seed
const seedData = {
    companies: [
        {
            name: 'Empresa Demo S.L.',
            slug: 'demo',
            email: 'demo@compilatime.com',
            phone: '+34 900 000 001',
            address: 'Calle Principal 123, Madrid, España',
            timezone: 'Europe/Madrid',
            locale: 'es',
            active: true,
        },
        {
            name: 'Tech Solutions S.A.',
            slug: 'techsolutions',
            email: 'info@techsolutions.com',
            phone: '+34 900 000 002',
            address: 'Avenida Innovación 456, Barcelona, España',
            timezone: 'Europe/Madrid',
            locale: 'es',
            active: true,
        },
    ],

    companyUsers: [
        {
            companySlug: 'demo',
            name: 'Administrador Principal',
            email: 'admin@demo.com',
            password: 'Admin123!',
            role: 'SUPER_ADMIN',
        },
        {
            companySlug: 'demo',
            name: 'Gestora RRHH',
            email: 'rrhh@demo.com',
            password: 'Gestor123!',
            role: 'MANAGER',
        },
        {
            companySlug: 'demo',
            name: 'Supervisor Turno',
            email: 'supervisor@demo.com',
            password: 'Super123!',
            role: 'SUPERVISOR',
        },
        {
            companySlug: 'techsolutions',
            name: 'CTO Tech Solutions',
            email: 'cto@techsolutions.com',
            password: 'CTO123!',
            role: 'ADMIN',
        },
    ],

    employees: [
        {
            companySlug: 'demo',
            dni: '12345678A',
            name: 'Juan',
            surname: 'García López',
            email: 'juan.garcia@demo.com',
            pin: '1234',
            password: 'Empleado123!',
            department: 'Desarrollo',
            position: 'Desarrollador Senior',
            contractType: 'INDEFINIDO',
            hireDate: new Date('2023-01-15'),
            salary: 35000,
            active: true,
        },
        {
            companySlug: 'demo',
            dni: '87654321B',
            name: 'María',
            surname: 'Rodríguez Martínez',
            email: 'maria.rodriguez@demo.com',
            pin: '5678',
            password: 'Empleado123!',
            department: 'Marketing',
            position: 'Marketing Manager',
            contractType: 'INDEFINIDO',
            hireDate: new Date('2023-03-01'),
            salary: 32000,
            active: true,
        },
        {
            companySlug: 'demo',
            dni: '11223344C',
            name: 'Carlos',
            surname: 'Sánchez Pérez',
            email: 'carlos.sanchez@demo.com',
            pin: '9012',
            password: 'Empleado123!',
            department: 'Ventas',
            position: 'Comercial',
            contractType: 'TEMPORAL',
            hireDate: new Date('2023-06-01'),
            salary: 28000,
            active: true,
        },
        {
            companySlug: 'techsolutions',
            dni: '55443322K',
            name: 'Ana',
            surname: 'Martínez García',
            email: 'ana.martinez@techsolutions.com',
            pin: '3456',
            password: 'Empleado123!',
            department: 'Ingeniería',
            position: 'Ingeniera de Software',
            contractType: 'INDEFINIDO',
            hireDate: new Date('2022-09-01'),
            salary: 42000,
            active: true,
        },
    ],

    schedules: [
        {
            companySlug: 'demo',
            name: 'Turno Mañana',
            dayOfWeek: 1, // Lunes
            startTime: '08:00',
            endTime: '14:00',
            breakTime: 30,
            flexible: false,
            active: true,
        },
        {
            companySlug: 'demo',
            name: 'Turno Tarde',
            dayOfWeek: 1, // Lunes
            startTime: '14:00',
            endTime: '22:00',
            breakTime: 30,
            flexible: false,
            active: true,
        },
        {
            companySlug: 'demo',
            name: 'Turno Nocturno',
            dayOfWeek: 1, // Lunes
            startTime: '22:00',
            endTime: '06:00',
            breakTime: 45,
            flexible: false,
            active: true,
        },
        {
            companySlug: 'techsolutions',
            name: 'Horario Flexible',
            dayOfWeek: 1, // Lunes
            startTime: '09:00',
            endTime: '18:00',
            breakTime: 60,
            flexible: true,
            active: true,
        },
    ],

    overtimeRules: [
        {
            companySlug: 'demo',
            name: 'Horas Extras Diarias',
            description: 'Horas extras después de 8h diarias',
            dayType: 'WEEKDAY',
            minMinutes: 1,
            multiplier: 1.25,
            active: true,
        },
        {
            companySlug: 'demo',
            name: 'Horas Extras Fin de Semana',
            description: 'Horas extras los sábados con multiplicador 1.5',
            dayType: 'WEEKEND',
            minMinutes: 1,
            multiplier: 1.5,
            active: true,
        },
        {
            companySlug: 'techsolutions',
            name: 'Horas Extras Tecnología',
            description: 'Horas extras con multiplicador 2.0 para equipo técnico',
            dayType: 'WEEKDAY',
            minMinutes: 1,
            multiplier: 2.0,
            active: true,
        },
    ],
};

async function main() {
    console.log('🌱 Iniciando seed de datos para CompilaTime...');

    try {
        // Limpiar base de datos (en desarrollo)
        if (config.isDevelopment) {
            console.log('🧹 Limpiando datos existentes...');

            // Limpiar en orden inversa para respetar foreign keys
            await prisma.timeEntryEditLog.deleteMany();
            await prisma.timeEntry.deleteMany();
            await prisma.workDay.deleteMany();
            await prisma.employeeSchedule.deleteMany();
            await prisma.schedule.deleteMany();
            await prisma.overtimeRule.deleteMany();
            await prisma.employee.deleteMany();
            await prisma.companyUser.deleteMany();
            await prisma.company.deleteMany();
        }

        console.log('📊 Creando empresas...');

        // Crear empresas
        for (const companyData of seedData.companies) {
            const company = await prisma.company.create({
                data: companyData,
            });
            console.log(`✅ Empresa creada: ${company.name} (${company.slug})`);
        }

        console.log('👥 Creando usuarios de empresa...');

        // Crear usuarios de empresa
        for (const userData of seedData.companyUsers) {
            const company = await prisma.company.findUnique({
                where: { slug: userData.companySlug },
            });

            if (!company) {
                throw new Error(`Empresa no encontrada: ${userData.companySlug}`);
            }

            const hashedPassword = await bcrypt.hash(userData.password, config.security.bcryptRounds);

            const user = await prisma.companyUser.create({
                data: {
                    companyId: company.id,
                    name: userData.name,
                    email: userData.email.toLowerCase(),
                    passwordHash: hashedPassword,
                    role: userData.role as any,
                    active: true,
                },
            });
            console.log(`✅ Usuario creado: ${user.name} (${user.email})`);
        }

        console.log('👷 Creando empleados...');

        // Crear empleados
        for (const employeeData of seedData.employees) {
            const company = await prisma.company.findUnique({
                where: { slug: employeeData.companySlug },
            });

            if (!company) {
                throw new Error(`Empresa no encontrada: ${employeeData.companySlug}`);
            }

            const hashedPin = await bcrypt.hash(employeeData.pin, config.security.bcryptRounds);
            const hashedPassword = await bcrypt.hash(employeeData.password, config.security.bcryptRounds);

            // Crear empleado (global, sin companyId)
            const employee = await (prisma as any).employee.create({
                data: {
                    dni: employeeData.dni.toUpperCase(),
                    name: employeeData.name,
                    surname: employeeData.surname,
                    email: employeeData.email?.toLowerCase(),
                    pin: hashedPin,
                    passwordHash: hashedPassword,
                    active: employeeData.active,
                },
            });

            // Crear relación con la empresa
            await (prisma as any).employeeCompany.create({
                data: {
                    employeeId: employee.id,
                    companyId: company.id,
                    employeeCode: employeeData.dni,
                    department: employeeData.department,
                    position: employeeData.position,
                    salary: employeeData.salary,
                    hireDate: employeeData.hireDate,
                    active: true,
                },
            });
            console.log(`✅ Empleado creado: ${employee.name} ${employee.surname} (${employee.dni})`);
        }

        console.log('⏰ Creando horarios...');

        // Crear horarios
        for (const scheduleData of seedData.schedules) {
            const company = await prisma.company.findUnique({
                where: { slug: scheduleData.companySlug },
            });

            if (!company) {
                throw new Error(`Empresa no encontrada: ${scheduleData.companySlug}`);
            }

            // Crear un horario principal sin día específico
            const schedule = await prisma.schedule.create({
                data: {
                    companyId: company.id,
                    name: scheduleData.name,
                    startTime: scheduleData.startTime,
                    endTime: scheduleData.endTime,
                    breakTime: scheduleData.breakTime,
                    flexible: scheduleData.flexible,
                    active: scheduleData.active,
                },
            });

            // Crear días asociados (Lunes a Viernes)
            for (let day = 1; day <= 5; day++) {
                await prisma.scheduleDay.create({
                    data: {
                        scheduleId: schedule.id,
                        dayOfWeek: day,
                    },
                });
            }
            console.log(`✅ Horario creado: ${schedule.name} (Lunes a Viernes)`);
        }

        console.log('💰 Creando reglas de horas extras...');

        // Crear reglas de horas extras
        for (const ruleData of seedData.overtimeRules) {
            const company = await prisma.company.findUnique({
                where: { slug: ruleData.companySlug },
            });

            if (!company) {
                throw new Error(`Empresa no encontrada: ${ruleData.companySlug}`);
            }

            const rule = await prisma.overtimeRule.create({
                data: {
                    companyId: company.id,
                    name: ruleData.name,
                    description: ruleData.description,
                    dayType: ruleData.dayType as any,
                    minMinutes: ruleData.minMinutes,
                    multiplier: ruleData.multiplier,
                    active: ruleData.active,
                },
            });
            console.log(`✅ Regla de horas extras creada: ${rule.name}`);
        }

        console.log('🔗 Asignando horarios a empleados...');

        // Asignar horarios a algunos empleados
        const employees = await prisma.employee.findMany({
            where: { active: true },
        });

        const schedules = await prisma.schedule.findMany({
            where: { active: true },
        });

        // Asignar horarios a los primeros 3 empleados de cada empresa
        for (let i = 0; i < Math.min(3, employees.length); i++) {
            const employee = employees[i];
            // Obtener las empresas del empleado para encontrar sus horarios
            const employeeCompanies = await (prisma as any).employeeCompany.findMany({
                where: {
                    employeeId: employee.id,
                },
            });

            // Obtener los horarios de las empresas del empleado
            const companyIds = employeeCompanies.map((ec: any) => ec.companyId);
            const employeeSchedules = schedules.filter(s => companyIds.includes(s.companyId));

            for (const schedule of employeeSchedules.slice(0, 2)) { // Asignar 2 horarios
                await prisma.employeeSchedule.create({
                    data: {
                        employeeId: employee.id,
                        scheduleId: schedule.id,
                        startDate: new Date(),
                        active: true,
                    },
                });
            }

            console.log(`✅ Horarios asignados a: ${employee.name} ${employee.surname}`);
        }

        console.log('🎉 Seed completado exitosamente!');
        console.log('');
        console.log('📋 Datos de acceso creados:');
        console.log('');
        console.log('🏢 EMPRESA DEMO:');
        console.log('   Código: demo');
        console.log('   Email: admin@demo.com');
        console.log('   Contraseña: Admin123!');
        console.log('');
        console.log('👤 EMPLEADOS DEMO:');
        console.log('   Juan García - DNI: 12345678A - PIN: 1234');
        console.log('   María Rodríguez - DNI: 87654321B - PIN: 5678');
        console.log('   Carlos Sánchez - DNI: 11223344C - PIN: 9012');
        console.log('');
        console.log('🏢 EMPRESA TECH SOLUTIONS:');
        console.log('   Código: techsolutions');
        console.log('   Email: cto@techsolutions.com');
        console.log('   Contraseña: CTO123!');
        console.log('');
        console.log('👤 EMPLEADO TECH SOLUTIONS:');
        console.log('   Ana Martínez - DNI: 55443322K - PIN: 3456');

    } catch (error) {
        console.error('❌ Error durante el seed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// function getDayName(dayOfWeek: number): string {
//     const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
//     return days[dayOfWeek];
// }

// Ejecutar el seed
main()
    .catch((error) => {
        console.error('❌ Error fatal en el seed:', error);
        process.exit(1);
    });