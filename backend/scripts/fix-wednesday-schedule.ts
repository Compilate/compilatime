import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixWednesdaySchedule() {
    try {
        console.log('🔧 Corrigiendo asignación de horario del miércoles...');

        // ID del empleado
        const employeeId = 'cmj72rmzq000f979jyxccxygt';

        // ID del "Turno Nocturno" (el correcto)
        const nightShiftId = 'cmj72rnd20017979j5o7z95cn';

        // ID del "Turno Mañana" (el incorrecto)
        const morningShiftId = 'cmj72rncq000j979jlj3i6ago';

        // Buscar la asignación incorrecta (miércoles, día 3)
        const incorrectAssignment = await prisma.weeklySchedule.findFirst({
            where: {
                employeeId: employeeId,
                dayOfWeek: 3, // Miércoles
                weekStart: '2025-12-15T00:00:00.000Z', // Semana que empieza el 15 de diciembre
                scheduleId: morningShiftId
            },
        });

        if (!incorrectAssignment) {
            console.log('❌ No se encontró la asignación incorrecta para corregir');
            return;
        }

        console.log('📋 Asignación encontrada:', {
            id: incorrectAssignment.id,
            employeeId: incorrectAssignment.employeeId,
            dayOfWeek: incorrectAssignment.dayOfWeek,
            scheduleId: incorrectAssignment.scheduleId,
            weekStart: incorrectAssignment.weekStart
        });

        // Actualizar la asignación para que apunte al "Turno Nocturno"
        const updatedAssignment = await prisma.weeklySchedule.update({
            where: {
                id: incorrectAssignment.id
            },
            data: {
                scheduleId: nightShiftId
            }
        });

        console.log('✅ Asignación corregida:', {
            id: updatedAssignment.id,
            employeeId: updatedAssignment.employeeId,
            dayOfWeek: updatedAssignment.dayOfWeek,
            scheduleId: updatedAssignment.scheduleId,
            weekStart: updatedAssignment.weekStart
        });

        // Verificar que el "Turno Nocturno" existe y tiene los datos correctos
        const nightShift = await prisma.schedule.findUnique({
            where: {
                id: nightShiftId
            }
        });

        if (nightShift) {
            console.log('🌙 Datos del Turno Nocturno:', {
                id: nightShift.id,
                name: nightShift.name,
                startTime: nightShift.startTime,
                endTime: nightShift.endTime
            });
        }

        console.log('🎉 Corrección completada exitosamente');

    } catch (error) {
        console.error('❌ Error al corregir la asignación:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixWednesdaySchedule();