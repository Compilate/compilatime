import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Buscando horarios de Juan...');

    // Buscar Juan
    const juan = await prisma.employee.findFirst({
        where: {
            name: 'Juan',
            dni: '12345678A'
        }
    });

    if (!juan) {
        console.log('❌ No se encontró a Juan');
        return;
    }

    console.log('✅ Juan encontrado:', juan.id, juan.name);

    // Buscar EmployeeCompany de Juan
    const employeeCompanies = await prisma.employeeCompany.findMany({
        where: {
            employeeId: juan.id,
            active: true
        }
    });

    console.log('📊 EmployeeCompanies de Juan:', employeeCompanies.length);

    for (const ec of employeeCompanies) {
        console.log('📊 EmployeeCompany:', ec.id, '- companyId:', ec.companyId);

        // Buscar EmployeeSchedules de Juan para esta empresa
        const employeeSchedules = await prisma.employeeSchedule.findMany({
            where: {
                employeeId: juan.id,
                schedule: {
                    companyId: ec.companyId
                }
            },
            include: {
                schedule: true
            }
        });

        console.log('📊 EmployeeSchedules de Juan para esta empresa:', employeeSchedules.length);

        for (const es of employeeSchedules) {
            console.log('📊   EmployeeSchedule:', es.id);
            console.log('📊     Schedule:', es.schedule.id, es.schedule.name);
            console.log('📊     Hora inicio:', es.schedule.startTime);
            console.log('📊     Hora fin:', es.schedule.endTime);

            const [startHour, startMinute] = es.schedule.startTime.split(':').map(Number);
            const [endHour, endMinute] = es.schedule.endTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;

            console.log('📊     Inicio (minutos):', startMinutes);
            console.log('📊     Fin (minutos):', endMinutes);
            console.log('📊     Es nocturno:', endMinutes < startMinutes);
        }
    }

    // Buscar todos los horarios de la empresa
    const companyId = employeeCompanies[0]?.companyId;
    if (companyId) {
        console.log('📊 Buscando todos los horarios de la empresa:', companyId);

        const allSchedules = await prisma.schedule.findMany({
            where: {
                companyId
            }
        });

        console.log('📊 Todos los horarios de la empresa:', allSchedules.length);

        for (const schedule of allSchedules) {
            console.log('📊   Schedule:', schedule.id, schedule.name);
            console.log('📊     Hora inicio:', schedule.startTime);
            console.log('📊     Hora fin:', schedule.endTime);

            const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
            const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;

            console.log('📊     Inicio (minutos):', startMinutes);
            console.log('📊     Fin (minutos):', endMinutes);
            console.log('📊     Es nocturno:', endMinutes < startMinutes);
        }
    }
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
