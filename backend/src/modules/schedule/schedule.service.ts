import { PrismaClient, Schedule, EmployeeSchedule } from '@prisma/client';
import { z } from 'zod';
import { cache } from '../../config/redis';

const prisma = new PrismaClient();

// Tipos auxiliares para consultas SQL
interface ScheduleDay {
    id: string;
    scheduleId: string;
    dayOfWeek: number;
    createdAt: Date;
}


interface ScheduleQueryResult {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakTime: number | null;
    flexible: boolean;
    companyId: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    scheduleDays: ScheduleDay[];
    daysOfWeek?: number[]; // Añadido para compatibilidad con frontend
    employeeSchedules?: EmployeeScheduleQueryResult[];
}

interface EmployeeScheduleQueryResult {
    id: string;
    employeeId: string;
    scheduleId: string;
    startDate: Date;
    endDate: Date | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    employee_id: string;
    employee_name: string;
    employee_surname: string;
    employee_dni: string;
}

// Esquemas de validación
const createScheduleSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de inicio inválida (formato HH:MM)'),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de fin inválida (formato HH:MM)'),
    breakTime: z.number().min(0, 'El tiempo de descanso debe ser positivo').optional(),
    flexible: z.boolean().default(false),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido (formato HEX #RRGGBB)').default('#3B82F6'),
});

const updateScheduleSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de inicio inválida (formato HH:MM)').optional(),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de fin inválida (formato HH:MM)').optional(),
    breakTime: z.number().min(0, 'El tiempo de descanso debe ser positivo').optional(),
    flexible: z.boolean().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido (formato HEX #RRGGBB)').optional(),
});

const assignToEmployeesSchema = z.object({
    employeeIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un empleado'),
    startDate: z.string().datetime('Fecha de inicio inválida'),
    endDate: z.string().datetime().optional(),
});

// Tipos
type CreateScheduleData = z.infer<typeof createScheduleSchema>;
type UpdateScheduleData = z.infer<typeof updateScheduleSchema>;
type AssignToEmployeesData = z.infer<typeof assignToEmployeesSchema>;

// Servicio de gestión de horarios
export class ScheduleService {
    // Crear nuevo horario
    static async createSchedule(companyId: string, data: CreateScheduleData): Promise<Schedule> {
        try {
            // Validar datos
            const validatedData = createScheduleSchema.parse(data);

            // Validar que la hora de fin sea posterior a la de inicio (permitiendo turnos nocturnos)
            if (!this.isValidTimeRange(validatedData.startTime, validatedData.endTime)) {
                throw new Error('La hora de fin debe ser posterior a la hora de inicio');
            }

            // Validar que no exista un horario con el mismo nombre
            const existingSchedule = await prisma.$queryRaw<Array<{ id: string }>>`
                SELECT id FROM "schedules"
                WHERE "companyId" = ${companyId} AND name = ${validatedData.name}
                LIMIT 1
            `;

            if (existingSchedule && existingSchedule.length > 0) {
                throw new Error('Ya existe un horario con este nombre');
            }

            // Crear horario sin días específicos (solo turno)
            const schedule = await prisma.schedule.create({
                data: {
                    companyId,
                    name: validatedData.name,
                    startTime: validatedData.startTime,
                    endTime: validatedData.endTime,
                    breakTime: validatedData.breakTime,
                    flexible: validatedData.flexible,
                    color: validatedData.color,
                    active: true,
                },
            });

            // Limpiar caché
            await cache.clearPattern(`schedules:${companyId}:*`);

            console.log('🎨 [ScheduleService] createSchedule - Schedule created:', {
                id: schedule.id,
                name: schedule.name,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                color: schedule.color,
                companyId: schedule.companyId
            });
            return schedule;
        } catch (error) {
            console.error('❌ Error creando horario:', error);
            throw error;
        }
    }

    // Obtener horario por ID
    static async getScheduleById(companyId: string, scheduleId: string): Promise<any> {
        try {
            // Intentar obtener desde caché
            const cacheKey = `schedule:${scheduleId}`;
            const cached = await cache.get(cacheKey);

            if (cached) {
                return JSON.parse(cached);
            }

            // Obtener horario sin días específicos (solo turno)
            const scheduleResult = await prisma.$queryRaw<Array<ScheduleQueryResult>>`
                SELECT
                    s.*,
                    '[]' as scheduleDays
                FROM "schedules" s
                WHERE s.id = ${scheduleId} AND s."companyId" = ${companyId}
            `;

            if (scheduleResult && scheduleResult.length > 0) {
                const result = scheduleResult[0];

                // Para compatibilidad con el frontend, daysOfWeek será un array vacío
                result.daysOfWeek = [];

                // Obtener empleados asignados
                const employees = await prisma.$queryRaw<Array<EmployeeScheduleQueryResult>>`
                    SELECT
                        es.*,
                        e.id as employee_id,
                        e.name as employee_name,
                        e.surname as employee_surname,
                        e.dni as employee_dni
                    FROM "employee_schedules" es
                    JOIN "employees" e ON es."employeeId" = e.id
                    WHERE es."scheduleId" = ${scheduleId} AND es.active = true
                `;

                result.employeeSchedules = employees;

                // Guardar en caché por 30 minutos
                await cache.set(cacheKey, JSON.stringify(result), 1800);

                return result;
            }

            return null;
        } catch (error) {
            console.error(`❌ Error obteniendo horario ${scheduleId}:`, error);
            throw error;
        }
    }

    // Obtener horarios de una empresa
    static async getSchedules(
        companyId: string,
        filters: {
            active?: boolean;
            dayOfWeek?: number;
            search?: string;
            page?: number;
            limit?: number;
        } = {}
    ) {
        try {
            const {
                active,
                search,
                page = 1,
                limit = 50,
            } = filters;

            const skip = (page - 1) * limit;

            // Construir filtro WHERE para Prisma
            const where: any = { companyId };

            if (active !== undefined) {
                where.active = active;
            }

            if (search) {
                where.name = { contains: search, mode: 'insensitive' };
            }

            // Obtener horarios principales (turnos sin días específicos)
            const schedules = await prisma.schedule.findMany({
                where,
                orderBy: [
                    { name: 'asc' },
                    { startTime: 'asc' }
                ],
                skip,
                take: limit,
            });

            // Transformar los datos para que coincidan con el formato esperado por el frontend
            const transformedSchedules = schedules.map(schedule => ({
                ...schedule,
                // Para compatibilidad con el frontend, daysOfWeek será un array vacío
                daysOfWeek: [],
                // Mantener scheduleDays vacío para compatibilidad con código existente
                scheduleDays: []
            }));

            // Obtener conteo total
            const total = await prisma.schedule.count({ where });

            // Ya no filtramos por día ya que los horarios ahora son turnos sin días específicos
            const filteredSchedules = transformedSchedules;

            console.log('🎨 [ScheduleService] getSchedules - Schedules retrieved:');
            schedules.forEach((schedule, index) => {
                console.log(`🎨 [ScheduleService] Schedule ${index + 1}:`, {
                    id: schedule.id,
                    name: schedule.name,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    color: schedule.color,
                    active: schedule.active
                });
            });

            return {
                schedules: filteredSchedules,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            console.error(`❌ Error obteniendo horarios de empresa ${companyId}:`, error);
            throw error;
        }
    }

    // Obtener horarios por día de la semana
    static async getSchedulesByDay(companyId: string, dayOfWeek: number): Promise<any[]> {
        try {
            const scheduleDays = await prisma.$queryRaw`
                SELECT
                    s.*,
                    sd.id as schedule_day_id,
                    sd."dayOfWeek"
                FROM "schedule_days" sd
                JOIN "schedules" s ON sd."scheduleId" = s.id
                WHERE sd."dayOfWeek" = ${dayOfWeek}
                AND s."companyId" = ${companyId}
                AND s.active = true
                ORDER BY s."startTime" ASC
            `;

            return scheduleDays as any[];
        } catch (error) {
            console.error(`❌ Error obteniendo horarios del día ${dayOfWeek}:`, error);
            throw error;
        }
    }

    // Actualizar horario
    static async updateSchedule(companyId: string, scheduleId: string, data: UpdateScheduleData): Promise<Schedule> {
        try {
            // Validar datos
            const validatedData = updateScheduleSchema.parse(data);

            // Validar que la hora de fin sea posterior a la de inicio (si se proporcionan ambas, permitiendo turnos nocturnos)
            if (validatedData.startTime && validatedData.endTime) {
                if (!this.isValidTimeRange(validatedData.startTime, validatedData.endTime)) {
                    throw new Error('La hora de fin debe ser posterior a la hora de inicio');
                }
            }

            // Verificar si el horario existe
            const existingSchedule = await prisma.$queryRaw<Array<{ id: string }>>`
                SELECT id FROM "schedules"
                WHERE id = ${scheduleId} AND "companyId" = ${companyId}
                LIMIT 1
            `;

            if (!existingSchedule || existingSchedule.length === 0) {
                throw new Error('Horario no encontrado');
            }

            // Validar que no exista otro horario con el mismo nombre
            if (validatedData.name) {
                const duplicateSchedule = await prisma.$queryRaw<Array<{ id: string }>>`
                    SELECT id FROM "schedules"
                    WHERE "companyId" = ${companyId}
                    AND name = ${validatedData.name}
                    AND id != ${scheduleId}
                    LIMIT 1
                `;

                if (duplicateSchedule && duplicateSchedule.length > 0) {
                    throw new Error('Ya existe un horario con este nombre');
                }
            }

            // Actualizar horario sin días específicos (solo turno)
            const updateData: any = {};
            if (validatedData.name) updateData.name = validatedData.name;
            if (validatedData.startTime) updateData.startTime = validatedData.startTime;
            if (validatedData.endTime) updateData.endTime = validatedData.endTime;
            if (validatedData.breakTime !== undefined) updateData.breakTime = validatedData.breakTime;
            if (validatedData.flexible !== undefined) updateData.flexible = validatedData.flexible;
            if (validatedData.color) updateData.color = validatedData.color;

            const schedule = await prisma.schedule.update({
                where: { id: scheduleId },
                data: updateData,
            });

            // Limpiar caché
            await cache.clearPattern(`schedule:${scheduleId}*`);
            await cache.clearPattern(`schedules:${companyId}:*`);

            console.log('🎨 [ScheduleService] updateSchedule - Schedule updated:', {
                id: schedule.id,
                name: schedule.name,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                color: schedule.color,
                active: schedule.active,
                companyId: schedule.companyId
            });
            return schedule;
        } catch (error) {
            console.error(`❌ Error actualizando horario ${scheduleId}:`, error);
            throw error;
        }
    }

    // Eliminar horario
    static async deleteSchedule(companyId: string, scheduleId: string, force: boolean = false): Promise<void> {
        try {
            // Verificar si el horario existe
            const schedule = await prisma.$queryRaw<Array<{ id: string }>>`
                SELECT id FROM "schedules"
                WHERE id = ${scheduleId} AND "companyId" = ${companyId}
                LIMIT 1
            `;

            if (!schedule || schedule.length === 0) {
                throw new Error('Horario no encontrado');
            }

            // Verificar si hay empleados asignados
            const assignedEmployees = await prisma.$queryRaw<Array<{ count: string }>>`
                SELECT COUNT(*) as count FROM "employee_schedules"
                WHERE "scheduleId" = ${scheduleId} AND active = true
            `;

            // Obtener detalles de los empleados asignados para depuración
            const employeeDetails = await prisma.$queryRaw<Array<any>>`
                SELECT
                    es.id,
                    es."employeeId",
                    es."scheduleId",
                    es.active,
                    e.name as employee_name,
                    e.dni as employee_dni
                FROM "employee_schedules" es
                JOIN "employees" e ON es."employeeId" = e.id
                WHERE es."scheduleId" = ${scheduleId} AND es.active = true
            `;

            console.log(`🔍 Verificando horario ${scheduleId}:`);
            console.log(`   - Empleados asignados (count): ${assignedEmployees[0].count}`);
            console.log(`   - Detalles de empleados:`, employeeDetails);
            console.log(`   - Force delete: ${force}`);

            if (parseInt(assignedEmployees[0].count) > 0 && !force) {
                const employeeNames = employeeDetails.map(emp => `${emp.employee_name} (${emp.employee_dni})`).join(', ');
                throw new Error(`No se puede eliminar un horario con empleados asignados: ${employeeNames}`);
            }

            // Eliminar en transacción
            await prisma.$transaction(async (tx) => {
                // Si se fuerza la eliminación, primero eliminar las asignaciones de empleados
                if (force && parseInt(assignedEmployees[0].count) > 0) {
                    console.log(`🔧 Eliminando ${assignedEmployees[0].count} asignaciones de empleados (force delete)`);
                    await tx.$queryRaw`DELETE FROM "employee_schedules" WHERE "scheduleId" = ${scheduleId}`;
                }

                // Eliminar días asociados
                await tx.$queryRaw`DELETE FROM "schedule_days" WHERE "scheduleId" = ${scheduleId}`;

                // Eliminar horario
                await tx.schedule.delete({
                    where: { id: scheduleId },
                });
            });

            // Limpiar caché
            await cache.clearPattern(`schedule:${scheduleId}*`);
            await cache.clearPattern(`schedules:${companyId}:*`);

            console.log(`✅ Horario eliminado: ${scheduleId}`);
        } catch (error) {
            console.error(`❌ Error eliminando horario ${scheduleId}:`, error);
            throw error;
        }
    }

    // Asignar horario a múltiples empleados
    static async assignToEmployees(companyId: string, scheduleId: string, data: AssignToEmployeesData): Promise<void> {
        try {
            // Validar datos
            const validatedData = assignToEmployeesSchema.parse(data);

            // Verificar si el horario existe
            const schedule = await prisma.$queryRaw<Array<{ id: string }>>`
                SELECT id FROM "schedules"
                WHERE id = ${scheduleId} AND "companyId" = ${companyId}
                LIMIT 1
            `;

            if (!schedule || schedule.length === 0) {
                throw new Error('Horario no encontrado');
            }

            // Verificar que los empleados existen
            const employees = await prisma.$queryRaw<Array<{ id: string }>>`
                SELECT id FROM "employees"
                WHERE "companyId" = ${companyId}
                AND id = ANY(${validatedData.employeeIds})
                AND active = true
            `;

            if (employees.length !== validatedData.employeeIds.length) {
                throw new Error('Algunos empleados no existen o no están activos');
            }

            // Asignar en transacción
            await prisma.$transaction(async (tx) => {
                // Eliminar asignaciones existentes para este horario
                await tx.$queryRaw`
                    DELETE FROM "employee_schedules" 
                    WHERE "scheduleId" = ${scheduleId} 
                    AND "employeeId" = ANY(${validatedData.employeeIds})
                `;

                // Crear nuevas asignaciones
                const assignments = validatedData.employeeIds.map(employeeId => ({
                    employeeId,
                    scheduleId,
                    startDate: new Date(validatedData.startDate),
                    endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
                    active: true,
                }));

                if (assignments.length > 0) {
                    // Usar el cliente Prisma para evitar problemas de SQL
                    await tx.employeeSchedule.createMany({
                        data: assignments
                    });
                }
            });

            // Limpiar caché
            await cache.clearPattern(`schedule:${scheduleId}*`);
            await cache.clearPattern(`schedules:${companyId}:*`);

            console.log(`✅ Horario ${scheduleId} asignado a ${validatedData.employeeIds.length} empleados`);
        } catch (error) {
            console.error(`❌ Error asignando horario ${scheduleId} a empleados:`, error);
            throw error;
        }
    }

    // Eliminar asignación de horario a empleado
    static async removeAssignment(companyId: string, scheduleId: string, employeeId: string): Promise<void> {
        try {
            // Verificar si la asignación existe
            const assignment = await prisma.$queryRaw<Array<{ id: string }>>`
                SELECT es.id FROM "employee_schedules" es
                JOIN "schedules" s ON es."scheduleId" = s.id
                WHERE es."scheduleId" = ${scheduleId}
                AND es."employeeId" = ${employeeId}
                AND s."companyId" = ${companyId}
                LIMIT 1
            `;

            if (!assignment || assignment.length === 0) {
                throw new Error('Asignación no encontrada');
            }

            await prisma.$queryRaw`
                DELETE FROM "employee_schedules"
                WHERE id = ${assignment[0].id}
            `;

            // Limpiar caché
            await cache.clearPattern(`schedule:${scheduleId}*`);
            await cache.clearPattern(`schedules:${companyId}:*`);

            console.log(`✅ Asignación eliminada: horario ${scheduleId} - empleado ${employeeId}`);
        } catch (error) {
            console.error(`❌ Error eliminando asignación:`, error);
            throw error;
        }
    }

    // Obtener horarios de un empleado
    static async getEmployeeSchedules(companyId: string, employeeId: string): Promise<EmployeeSchedule[]> {
        try {
            const schedules = await prisma.$queryRaw<Array<any>>`
                SELECT 
                    es.*,
                    s.* as schedule_data
                FROM "employee_schedules" es
                JOIN "schedules" s ON es."scheduleId" = s.id
                WHERE es."employeeId" = ${employeeId}
                AND s."companyId" = ${companyId}
                AND es.active = true
                ORDER BY es."createdAt" DESC
            `;

            return schedules as any[];
        } catch (error) {
            console.error(`❌ Error obteniendo horarios del empleado ${employeeId}:`, error);
            throw error;
        }
    }

    // Obtener horario semanal completo (solo turnos sin días específicos)
    static async getWeeklySchedule(companyId: string): Promise<any> {
        try {
            const cacheKey = `weekly-schedule:${companyId}`;
            const cached = await cache.get(cacheKey);

            if (cached) {
                return JSON.parse(cached);
            }

            const schedules = await prisma.schedule.findMany({
                where: {
                    companyId,
                    active: true
                },
                orderBy: [
                    { name: 'asc' },
                    { startTime: 'asc' }
                ]
            });

            // Agrupar por día de la semana (todos los días tendrán los mismos horarios disponibles)
            const weeklySchedule: { [key: number]: any[] } = {};
            for (let day = 0; day <= 6; day++) {
                weeklySchedule[day] = schedules.map(schedule => ({
                    ...schedule,
                    dayOfWeek: day,
                    // Para compatibilidad con el frontend
                    scheduleDays: []
                }));
            }

            // Ordenar horarios de cada día por hora de inicio
            for (let day = 0; day <= 6; day++) {
                weeklySchedule[day].sort((a, b) => {
                    return this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime);
                });
            }

            // Guardar en caché por 10 minutos
            await cache.set(cacheKey, JSON.stringify(weeklySchedule), 600);

            return weeklySchedule;
        } catch (error) {
            console.error(`❌ Error obteniendo horario semanal de empresa ${companyId}:`, error);
            throw error;
        }
    }

    // Validar conflicto de horarios (solo turnos sin días específicos)
    static async validateScheduleConflict(companyId: string, employeeId: string, scheduleId: string): Promise<boolean> {
        try {
            const newSchedule = await prisma.schedule.findFirst({
                where: {
                    id: scheduleId,
                    companyId
                }
            });

            if (!newSchedule) {
                throw new Error('Horario no encontrado');
            }

            // Obtener horarios existentes del empleado
            const existingSchedules = await prisma.$queryRaw<Array<any>>`
                SELECT
                    es.*,
                    s.* as schedule_data
                FROM "employee_schedules" es
                JOIN "schedules" s ON es."scheduleId" = s.id
                WHERE es."employeeId" = ${employeeId}
                AND s."companyId" = ${companyId}
                AND es.active = true
                AND s.active = true
                AND s.id != ${scheduleId}
            `;

            // Verificar si hay solapamiento con horarios existentes
            for (const existingAssignment of existingSchedules) {
                if (this.schedulesOverlap(
                    existingAssignment.startTime,
                    existingAssignment.endTime,
                    newSchedule.startTime,
                    newSchedule.endTime
                )) {
                    return true; // Hay conflicto
                }
            }

            return false; // No hay conflicto
        } catch (error) {
            console.error(`❌ Error validando conflicto de horarios:`, error);
            throw error;
        }
    }

    // Métodos auxiliares
    private static timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Validar rango de tiempo permitiendo turnos nocturnos que cruzan medianoche
    private static isValidTimeRange(startTime: string, endTime: string): boolean {
        const startMinutes = this.timeToMinutes(startTime);
        const endMinutes = this.timeToMinutes(endTime);
        
        // Si la hora de fin es posterior a la de inicio en el mismo día, es válido
        if (endMinutes > startMinutes) {
            return true;
        }
        
        // Si la hora de fin es anterior a la de inicio, es un turno nocturno que cruza medianoche
        // Permitimos esto siempre que no sea exactamente la misma hora
        return endMinutes < startMinutes && (startMinutes - endMinutes) > 0;
    }

    private static schedulesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
        const s1 = this.timeToMinutes(start1);
        const e1 = this.timeToMinutes(end1);
        const s2 = this.timeToMinutes(start2);
        const e2 = this.timeToMinutes(end2);

        return (s1 < e2 && s2 < e1) && (s1 < s2 && e1 > s2);
    }

    // private static getDayName(dayOfWeek: number): string {
    //     const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    //     return days[dayOfWeek];
    // }
}

export default ScheduleService;