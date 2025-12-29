import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSchedule() {
    try {
        const employeeId = 'cmj72rmzq000f979jyxccxygt';
        const companyId = 'cmj72rl410000979juw0gjcym';
        const targetDate = '2025-12-16';
        const targetDateObj = new Date(targetDate);
        const dayOfWeek = targetDateObj.getDay(); // 0 = Domingo, 6 = Sábado

        console.log('🔍 DEBUG DIRECTO - EmployeeId:', employeeId);
        console.log('🔍 DEBUG DIRECTO - CompanyId:', companyId);
        console.log('🔍 DEBUG DIRECTO - TargetDate:', targetDate);
        console.log('🔍 DEBUG DIRECTO - DayOfWeek:', dayOfWeek);

        // 1. Verificar EmployeeSchedules (asignaciones permanentes) - CON FILTRO POR DÍA
        console.log('\n📋 1. EmployeeSchedules (asignaciones permanentes con filtro por día):');
        const employeeSchedules = await prisma.employeeSchedule.findMany({
            where: {
                employeeId,
                schedule: {
                    companyId,
                    active: true,
                    scheduleDays: {
                        some: {
                            dayOfWeek: dayOfWeek
                        }
                    }
                },
                active: true,
                startDate: {
                    lte: targetDateObj,
                },
                OR: [
                    { endDate: null },
                    { endDate: { gte: targetDateObj } },
                ],
            },
            include: {
                schedule: {
                    include: {
                        scheduleDays: true
                    }
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        console.log('EmployeeSchedules encontrados:', employeeSchedules.length);
        employeeSchedules.forEach(es => {
            console.log(`  - ${es.schedule.name} (${es.schedule.startTime} - ${es.schedule.endTime})`);
        });

        // 2. Verificar WeeklySchedules (asignaciones semanales)
        console.log('\n📅 2. WeeklySchedules (asignaciones semanales):');
        const weekStart = new Date(targetDateObj);
        weekStart.setDate(targetDateObj.getDate() - targetDateObj.getDay()); // Inicio de la semana (Domingo)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Fin de la semana (Sábado)

        console.log('WeekStart:', weekStart.toISOString().split('T')[0]);
        console.log('WeekEnd:', weekEnd.toISOString().split('T')[0]);

        const weeklySchedules = await prisma.weeklySchedule.findMany({
            where: {
                employeeId,
                weekStart: {
                    gte: weekStart,
                    lte: weekEnd,
                },
                dayOfWeek: dayOfWeek,
                scheduleId: {
                    not: null, // Excluir días de descanso
                },
            },
            include: {
                schedule: true,
            },
        });

        console.log('WeeklySchedules encontrados:', weeklySchedules.length);
        weeklySchedules.forEach(ws => {
            console.log(`  - ${ws.schedule?.name} (${ws.schedule?.startTime} - ${ws.schedule?.endTime})`);
        });

        // 3. Verificar todos los Schedule de la empresa
        console.log('\n🏢 3. Todos los Schedule de la empresa:');
        const companySchedules = await prisma.schedule.findMany({
            where: {
                companyId,
                active: true,
            },
            orderBy: {
                startTime: 'asc',
            },
        });

        console.log('CompanySchedules encontrados:', companySchedules.length);
        companySchedules.forEach(schedule => {
            console.log(`  - ${schedule.name} (${schedule.startTime} - ${schedule.endTime})`);
        });

        // 4. Verificar ScheduleDays para cada schedule
        console.log('\n📆 4. ScheduleDays (días de la semana para cada horario):');
        for (const schedule of companySchedules) {
            const scheduleDays = await prisma.scheduleDay.findMany({
                where: {
                    scheduleId: schedule.id,
                },
            });

            if (scheduleDays.length > 0) {
                console.log(`  Schedule "${schedule.name}" (${schedule.id}):`);
                scheduleDays.forEach(sd => {
                    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    console.log(`    - ${dayNames[sd.dayOfWeek]} (${sd.dayOfWeek})`);
                });
            }
        }

    } catch (error) {
        console.error('Error en debugSchedule:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugSchedule();