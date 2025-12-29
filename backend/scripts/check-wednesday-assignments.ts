import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWednesdayAssignments() {
    try {
        console.log('🔍 Verificando asignaciones del miércoles (dayOfWeek: 3)...');

        // ID del empleado
        const employeeId = 'cmj72rmzq000f979jyxccxygt';

        // Buscar asignaciones para el miércoles (dayOfWeek: 3)
        const wednesdayAssignments = await prisma.weeklySchedule.findMany({
            where: {
                employeeId: employeeId,
                dayOfWeek: 3, // Miércoles
                weekStart: '2025-12-15T00:00:00.000Z', // Semana que empieza el 15 de diciembre
            },
            include: {
                schedule: true,
            },
        });

        console.log('📋 Asignaciones del miércoles (dayOfWeek: 3):');
        wednesdayAssignments.forEach((assignment, index) => {
            console.log(`${index + 1}. ID: ${assignment.id}`);
            console.log(`   Schedule ID: ${assignment.scheduleId}`);
            console.log(`   Schedule Name: ${assignment.schedule?.name}`);
            console.log(`   Schedule Time: ${assignment.schedule?.startTime} - ${assignment.schedule?.endTime}`);
            console.log(`   DayOfWeek: ${assignment.dayOfWeek}`);
            console.log(`   WeekStart: ${assignment.weekStart}`);
            console.log('---');
        });

        // También verificar asignaciones del martes para comparar
        const tuesdayAssignments = await prisma.weeklySchedule.findMany({
            where: {
                employeeId: employeeId,
                dayOfWeek: 2, // Martes
                weekStart: '2025-12-15T00:00:00.000Z', // Semana que empieza el 15 de diciembre
            },
            include: {
                schedule: true,
            },
        });

        console.log('📋 Asignaciones del martes (dayOfWeek: 2) para comparar:');
        tuesdayAssignments.forEach((assignment, index) => {
            console.log(`${index + 1}. ID: ${assignment.id}`);
            console.log(`   Schedule ID: ${assignment.scheduleId}`);
            console.log(`   Schedule Name: ${assignment.schedule?.name}`);
            console.log(`   Schedule Time: ${assignment.schedule?.startTime} - ${assignment.schedule?.endTime}`);
            console.log(`   DayOfWeek: ${assignment.dayOfWeek}`);
            console.log(`   WeekStart: ${assignment.weekStart}`);
            console.log('---');
        });

    } catch (error) {
        console.error('❌ Error verificando asignaciones:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkWednesdayAssignments();