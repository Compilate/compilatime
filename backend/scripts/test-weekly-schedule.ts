import { PrismaClient } from '@prisma/client';
import employeeService from '../src/modules/employee/employee.service';

const prisma = new PrismaClient();

async function testWeeklySchedule() {
    try {
        console.log('🔍 Probando getWeeklySchedule para el empleado cmj72rmzq000f979jyxccxygt...');

        // Obtener el empleado
        const employee = await prisma.employee.findUnique({
            where: { id: 'cmj72rmzq000f979jyxccxygt' }
        });

        if (!employee) {
            console.error('❌ Empleado no encontrado');
            return;
        }

        console.log(`✅ Empleado encontrado: ${employee.name} ${employee.surname || ''}`);

        // Probar getWeeklySchedule para la fecha actual (16 de diciembre de 2025)
        const targetDate = new Date('2025-12-16T00:00:00.000Z');
        console.log(`📅 Fecha de prueba: ${targetDate.toISOString()}`);

        const weeklySchedule = await employeeService.getWeeklySchedule(employee.companyId, employee.id, targetDate.toISOString());

        console.log('\n📊 Resultado de getWeeklySchedule:');
        console.log(JSON.stringify(weeklySchedule, null, 2));

        // Verificar que el primer día sea lunes (15 de diciembre)
        if (weeklySchedule.dailySchedules && weeklySchedule.dailySchedules.length > 0) {
            const firstDay = weeklySchedule.dailySchedules[0];
            console.log(`\n🔍 Primer día de la semana: ${firstDay.date} (${firstDay.dayName})`);

            // Convertir la fecha de inicio a formato local para verificar
            const startDate = new Date(weeklySchedule.startDate);
            const localStartDate = startDate.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' });
            console.log(`📅 Fecha de inicio (UTC): ${weeklySchedule.startDate}`);
            console.log(`📅 Fecha de inicio (local): ${localStartDate}`);

            if (firstDay.date === '2025-12-15') {
                console.log('✅ El primer día es correctamente lunes 15 de diciembre');
            } else {
                console.log(`❌ ERROR: Se esperaba lunes 15 de diciembre, pero se obtuvo ${firstDay.date}`);
            }
        }

    } catch (error) {
        console.error('❌ Error al probar getWeeklySchedule:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testWeeklySchedule();