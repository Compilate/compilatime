import { PrismaClient, Employee, EmployeeSchedule } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { cache } from '../../config/redis';
import { sendEmail } from '../../config/email';
import { env } from '../../config/env';

const prisma = new PrismaClient();

// Esquemas de validación
const createEmployeeSchema = z.object({
    dni: z.string().min(1, 'El DNI es requerido'),
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    surname: z.string().optional(),
    email: z.string().email('Email inválido').optional(),
    phone: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    contractType: z.string().optional(),
    hireDate: z.string().optional(),
    salary: z.number().optional(),
    pin: z.string().min(4, 'El PIN debe tener al menos 4 caracteres'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
    scheduleIds: z.array(z.string()).optional(),
});

const updateEmployeeSchema = z.object({
    dni: z.string().min(1, 'El DNI es requerido').optional(),
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
    surname: z.string().optional(),
    email: z.string().email('Email inválido').optional(),
    phone: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    contractType: z.string().optional(),
    hireDate: z.string().optional(),
    salary: z.number().optional(),
    pin: z.string().min(4, 'El PIN debe tener al menos 4 caracteres').optional().or(z.literal('')),
    active: z.boolean().optional(),
    scheduleIds: z.array(z.string()).optional(),
});

// Tipos
type CreateEmployeeData = z.infer<typeof createEmployeeSchema>;
type UpdateEmployeeData = z.infer<typeof updateEmployeeSchema>;

// Servicio de gestión de empleados
export class EmployeeService {
    // Crear nuevo empleado
    static async createEmployee(companyId: string, data: CreateEmployeeData): Promise<Employee> {
        try {
            // Validar datos
            const validatedData = createEmployeeSchema.parse(data);

            // Verificar si el DNI ya existe en la empresa
            const existingDni = await (prisma as any).employeeCompany.findFirst({
                where: {
                    companyId,
                    employee: {
                        dni: validatedData.dni,
                    },
                },
            });

            if (existingDni) {
                throw new Error('El DNI ya está registrado en esta empresa');
            }

            // Verificar si el email ya existe en la empresa
            if (validatedData.email) {
                const existingEmail = await (prisma as any).employeeCompany.findFirst({
                    where: {
                        companyId,
                        employee: {
                            email: validatedData.email,
                        },
                    },
                });

                if (existingEmail) {
                    throw new Error('El email ya está registrado en esta empresa');
                }
            }

            // Generar PIN si no se proporciona
            const pin = validatedData.pin || this.generatePin();
            const pinHash = await bcrypt.hash(pin, 10);

            // Generar hash de contraseña si se proporciona
            let passwordHash: string | undefined;
            if (validatedData.password) {
                passwordHash = await bcrypt.hash(validatedData.password, 10);
            }

            // Crear empleado (global, sin companyId)
            const employee = await (prisma as any).employee.create({
                data: {
                    dni: validatedData.dni,
                    name: validatedData.name,
                    surname: validatedData.surname,
                    email: validatedData.email,
                    phone: validatedData.phone,
                    pin: pinHash,
                    passwordHash,
                    active: true,
                },
            });

            // Crear relación con la empresa
            await (prisma as any).employeeCompany.create({
                data: {
                    employeeId: employee.id,
                    companyId,
                    employeeCode: validatedData.dni,
                    department: validatedData.department,
                    position: validatedData.position,
                    salary: validatedData.salary,
                    hireDate: validatedData.hireDate ? new Date(validatedData.hireDate) : undefined,
                    active: true,
                },
            });

            // Asignar horarios si se proporcionan
            if (validatedData.scheduleIds && validatedData.scheduleIds.length > 0) {
                await this.assignSchedulesToEmployee(employee.id, validatedData.scheduleIds);
            }

            // Enviar email de bienvenida si tiene email
            if (validatedData.email) {
                await this.sendWelcomeEmail(employee, pin);
            }

            // Limpiar caché
            await cache.clearPattern(`employees:${companyId}:*`);

            console.log(`✅ Empleado creado: ${employee.name} (${employee.dni})`);
            return employee;
        } catch (error) {
            console.error('❌ Error creando empleado:', error);
            throw error;
        }
    }

    // Obtener empleado por ID
    static async getEmployeeById(companyId: string, employeeId: string): Promise<Employee | null> {
        try {
            // Intentar obtener desde caché
            const cacheKey = `employee:${employeeId}`;
            const cached = await cache.get(cacheKey);

            if (cached) {
                return JSON.parse(cached);
            }

            const employee = await (prisma as any).employee.findFirst({
                where: {
                    id: employeeId,
                    employeeCompanies: {
                        some: {
                            companyId,
                            active: true,
                        },
                    },
                },
                include: {
                    employeeSchedules: {
                        include: {
                            schedule: true,
                        },
                    },
                    employeeCompanies: {
                        where: {
                            companyId,
                            active: true,
                        },
                        include: {
                            company: true,
                        },
                    },
                },
            });

            if (employee) {
                // Guardar en caché por 30 minutos
                await cache.set(cacheKey, JSON.stringify(employee), 1800);
            }

            return employee;
        } catch (error) {
            console.error(`❌ Error obteniendo empleado ${employeeId}:`, error);
            throw error;
        }
    }

    // Obtener empleado por DNI
    static async getEmployeeByDni(companyId: string, dni: string): Promise<Employee | null> {
        try {
            const employee = await (prisma as any).employee.findFirst({
                where: {
                    dni,
                    employeeCompanies: {
                        some: {
                            companyId,
                            active: true,
                        },
                    },
                },
                include: {
                    employeeCompanies: {
                        where: {
                            companyId,
                            active: true,
                        },
                        include: {
                            company: true,
                        },
                    },
                },
            });

            return employee;
        } catch (error) {
            console.error(`❌ Error obteniendo empleado por DNI ${dni}:`, error);
            throw error;
        }
    }

    // Obtener lista de empleados con filtros
    static async getEmployees(
        companyId: string,
        filters: {
            active?: boolean;
            department?: string;
            position?: string;
            search?: string;
            page?: number;
            limit?: number;
        } = {}
    ) {
        try {
            const {
                active,
                department,
                position,
                search,
                page = 1,
                limit = 20,
            } = filters;

            const skip = (page - 1) * limit;

            // Construir filtro where
            const where: any = {
                employeeCompanies: {
                    some: {
                        companyId,
                        active: true,
                    },
                },
            };

            if (active !== undefined) {
                where.active = active;
            }

            if (department) {
                where.department = {
                    contains: department,
                    mode: 'insensitive',
                };
            }

            if (position) {
                where.position = {
                    contains: position,
                    mode: 'insensitive',
                };
            }

            if (search) {
                where.OR = [
                    {
                        name: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        surname: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        dni: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        email: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                ];
            }

            const [employees, total] = await Promise.all([
                (prisma as any).employee.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        employeeSchedules: {
                            include: {
                                schedule: true,
                            },
                        },
                        employeeCompanies: {
                            where: {
                                companyId,
                                active: true,
                            },
                            include: {
                                company: true,
                            },
                        },
                    },
                }),
                (prisma as any).employee.count({ where }),
            ]);

            return {
                employees,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            console.error(`❌ Error obteniendo empleados de empresa ${companyId}:`, error);
            throw error;
        }
    }

    // Actualizar empleado
    static async updateEmployee(companyId: string, employeeId: string, data: UpdateEmployeeData): Promise<Employee> {
        try {
            // Validar datos
            const validatedData = updateEmployeeSchema.parse(data);

            // Verificar si el DNI ya existe en la empresa (si se está actualizando)
            if (validatedData.dni) {
                const existingDni = await (prisma as any).employeeCompany.findFirst({
                    where: {
                        companyId,
                        employee: {
                            dni: validatedData.dni,
                        },
                        employeeId: { not: employeeId },
                    },
                });

                if (existingDni) {
                    throw new Error('El DNI ya está registrado en esta empresa');
                }
            }

            // Verificar si el email ya existe en la empresa (si se está actualizando)
            if (validatedData.email) {
                const existingEmail = await (prisma as any).employeeCompany.findFirst({
                    where: {
                        companyId,
                        employee: {
                            email: validatedData.email,
                        },
                        employeeId: { not: employeeId },
                    },
                });

                if (existingEmail) {
                    throw new Error('El email ya está registrado en esta empresa');
                }
            }

            // Convertir fecha si se proporciona
            const updateData: any = { ...validatedData };
            if (validatedData.hireDate) {
                updateData.hireDate = new Date(validatedData.hireDate);
            }

            // Hashear PIN si se proporciona y no está vacío
            if (validatedData.pin && validatedData.pin.trim() !== '') {
                const pinHash = await bcrypt.hash(validatedData.pin, 10);
                updateData.pin = pinHash;
            } else {
                // Si el PIN está vacío, eliminarlo de los datos a actualizar
                delete updateData.pin;
            }

            // Eliminar scheduleIds de los datos a actualizar (se maneja por separado)
            const { scheduleIds, ...employeeUpdateData } = updateData;

            // Actualizar datos globales del empleado
            const employee = await (prisma as any).employee.update({
                where: {
                    id: employeeId,
                },
                data: employeeUpdateData,
            });

            // Actualizar datos específicos de la empresa si se proporcionan
            const companySpecificData: any = {};
            if (validatedData.department) companySpecificData.department = validatedData.department;
            if (validatedData.position) companySpecificData.position = validatedData.position;
            if (validatedData.salary) companySpecificData.salary = validatedData.salary;
            if (validatedData.hireDate) companySpecificData.hireDate = new Date(validatedData.hireDate);

            if (Object.keys(companySpecificData).length > 0) {
                await (prisma as any).employeeCompany.updateMany({
                    where: {
                        employeeId,
                        companyId,
                    },
                    data: companySpecificData,
                });
            }

            // Asignar horarios si se proporcionan
            if (validatedData.scheduleIds && validatedData.scheduleIds.length > 0) {
                await this.assignSchedulesToEmployee(employeeId, validatedData.scheduleIds);
            }

            // Limpiar caché (con manejo de errores)
            try {
                await cache.clearPattern(`employee:${employeeId}*`);
                await cache.clearPattern(`employees:${companyId}:*`);
            } catch (cacheError) {
                console.warn('⚠️ Error limpiando caché:', cacheError);
                // Continuar aunque falle la limpieza de caché
            }

            console.log(`✅ Empleado actualizado: ${employee.name} (${employee.dni})`);
            return employee;
        } catch (error) {
            console.error(`❌ Error actualizando empleado ${employeeId}:`, error);
            throw error;
        }
    }

    // Eliminar empleado (baja lógica)
    static async deleteEmployee(companyId: string, employeeId: string): Promise<Employee> {
        try {
            // Desactivar empleado globalmente
            const employee = await (prisma as any).employee.update({
                where: {
                    id: employeeId,
                },
                data: {
                    active: false,
                },
            });

            // Desactivar relación con la empresa
            await (prisma as any).employeeCompany.updateMany({
                where: {
                    employeeId,
                    companyId,
                },
                data: {
                    active: false,
                },
            });

            // Limpiar caché
            await cache.clearPattern(`employee:${employeeId}*`);
            await cache.clearPattern(`employees:${companyId}:*`);

            console.log(`✅ Empleado dado de baja: ${employee.name} (${employee.dni})`);
            return employee;
        } catch (error) {
            console.error(`❌ Error eliminando empleado ${employeeId}:`, error);
            throw error;
        }
    }

    // Asignar horarios a empleado
    static async assignSchedulesToEmployee(employeeId: string, scheduleIds: string[]): Promise<void> {
        try {
            // Eliminar asignaciones existentes
            await prisma.employeeSchedule.deleteMany({
                where: { employeeId },
            });

            // Crear nuevas asignaciones
            const assignments = scheduleIds.map(scheduleId => ({
                employeeId,
                scheduleId,
                startDate: new Date(),
                active: true,
            }));

            await prisma.employeeSchedule.createMany({
                data: assignments,
            });

            console.log(`✅ Horarios asignados al empleado ${employeeId}`);
        } catch (error) {
            console.error(`❌ Error asignando horarios al empleado ${employeeId}:`, error);
            throw error;
        }
    }

    // Asignar un solo horario a empleado (para la página individual)
    static async assignScheduleToEmployee(employeeId: string, scheduleId: string): Promise<void> {
        try {
            // Verificar si ya existe esta asignación
            const existingAssignment = await prisma.employeeSchedule.findFirst({
                where: {
                    employeeId,
                    scheduleId,
                },
            });

            if (existingAssignment) {
                throw new Error('Este horario ya está asignado al empleado');
            }

            // Crear nueva asignación
            await prisma.employeeSchedule.create({
                data: {
                    employeeId,
                    scheduleId,
                    startDate: new Date(),
                    active: true,
                },
            });

            console.log(`✅ Horario ${scheduleId} asignado al empleado ${employeeId}`);
        } catch (error) {
            console.error(`❌ Error asignando horario ${scheduleId} al empleado ${employeeId}:`, error);
            throw error;
        }
    }

    // Obtener horarios de un empleado
    static async getEmployeeSchedules(companyId: string, employeeId: string): Promise<EmployeeSchedule[]> {
        try {
            const schedules = await prisma.employeeSchedule.findMany({
                where: {
                    employeeId,
                    schedule: {
                        companyId,
                    },
                },
                include: {
                    schedule: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return schedules;
        } catch (error) {
            console.error(`❌ Error obteniendo horarios del empleado ${employeeId}:`, error);
            throw error;
        }
    }

    // Eliminar asignación de horario específica
    static async removeEmployeeSchedule(companyId: string, employeeScheduleId: string): Promise<void> {
        try {
            // Verificar que la asignación pertenece a un empleado de la empresa
            const employeeSchedule = await (prisma as any).employeeSchedule.findFirst({
                where: {
                    id: employeeScheduleId,
                    employee: {
                        employeeCompanies: {
                            some: {
                                companyId,
                                active: true,
                            },
                        },
                    },
                },
            });

            if (!employeeSchedule) {
                throw new Error('Asignación de horario no encontrada');
            }

            // Eliminar la asignación
            await prisma.employeeSchedule.delete({
                where: {
                    id: employeeScheduleId,
                },
            });

            // Limpiar caché (con manejo de errores)
            try {
                await cache.clearPattern(`employee:${employeeSchedule.employeeId}*`);
                await cache.clearPattern(`employees:${companyId}:*`);
            } catch (cacheError) {
                console.warn('⚠️ Error limpiando caché:', cacheError);
                // Continuar aunque falle la limpieza de caché
            }

            console.log(`✅ Asignación de horario eliminada: ${employeeScheduleId}`);
        } catch (error) {
            console.error(`❌ Error eliminando asignación de horario ${employeeScheduleId}:`, error);
            throw error;
        }
    }

    // Resetear PIN de empleado
    static async resetEmployeePin(_companyId: string, employeeId: string): Promise<{ pin: string }> {
        try {
            const newPin = this.generatePin();
            const pinHash = await bcrypt.hash(newPin, 10);

            await (prisma as any).employee.update({
                where: {
                    id: employeeId,
                },
                data: {
                    pin: pinHash,
                },
            });

            // Limpiar caché (con manejo de errores)
            try {
                await cache.clearPattern(`employee:${employeeId}*`);
            } catch (cacheError) {
                console.warn('⚠️ Error limpiando caché:', cacheError);
                // Continuar aunque falle la limpieza de caché
            }

            console.log(`✅ PIN reseteado para empleado ${employeeId}`);
            return { pin: newPin };
        } catch (error) {
            console.error(`❌ Error reseteando PIN del empleado ${employeeId}:`, error);
            throw error;
        }
    }

    // Cambiar contraseña de empleado
    static async changeEmployeePassword(
        companyId: string,
        employeeId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        try {
            // Obtener empleado
            const employee = await (prisma as any).employee.findFirst({
                where: {
                    id: employeeId,
                    employeeCompanies: {
                        some: {
                            companyId,
                            active: true,
                        },
                    },
                },
            });

            if (!employee || !employee.passwordHash) {
                throw new Error('Empleado no encontrado o no tiene contraseña configurada');
            }

            // Verificar contraseña actual
            const isValidPassword = await bcrypt.compare(currentPassword, employee.passwordHash);
            if (!isValidPassword) {
                throw new Error('Contraseña actual incorrecta');
            }

            // Hashear nueva contraseña
            const newPasswordHash = await bcrypt.hash(newPassword, 10);

            // Actualizar contraseña
            await (prisma as any).employee.update({
                where: {
                    id: employeeId,
                },
                data: {
                    passwordHash: newPasswordHash,
                },
            });

            // Limpiar caché (con manejo de errores)
            try {
                await cache.clearPattern(`employee:${employeeId}*`);
            } catch (cacheError) {
                console.warn('⚠️ Error limpiando caché:', cacheError);
                // Continuar aunque falle la limpieza de caché
            }

            console.log(`✅ Contraseña cambiada para empleado ${employeeId}`);
        } catch (error) {
            console.error(`❌ Error cambiando contraseña del empleado ${employeeId}:`, error);
            throw error;
        }
    }

    // Verificar PIN de empleado
    static async verifyEmployeePin(companyId: string, dni: string, pin: string): Promise<Employee | null> {
        try {
            const employee = await (prisma as any).employee.findFirst({
                where: {
                    dni,
                    active: true,
                    employeeCompanies: {
                        some: {
                            companyId,
                            active: true,
                        },
                    },
                },
            });

            if (!employee) {
                return null;
            }

            const isValidPin = await bcrypt.compare(pin, employee.pin);
            if (!isValidPin) {
                return null;
            }

            return employee;
        } catch (error) {
            console.error(`❌ Error verificando PIN del empleado ${dni}:`, error);
            throw error;
        }
    }

    // Obtener estadísticas de empleados
    static async getEmployeeStats(companyId: string): Promise<any> {
        try {
            const cacheKey = `employee-stats:${companyId}`;
            const cached = await cache.get(cacheKey);

            if (cached) {
                return JSON.parse(cached);
            }

            const [
                totalEmployees,
                activeEmployees,
                inactiveEmployees,
                employeesByDepartment,
                recentHires,
            ] = await Promise.all([
                (prisma as any).employeeCompany.count({
                    where: { companyId, active: true },
                }),
                (prisma as any).employeeCompany.count({
                    where: { companyId, employee: { active: true }, active: true },
                }),
                (prisma as any).employeeCompany.count({
                    where: { companyId, employee: { active: false }, active: true },
                }),
                // Agrupar por departamento desde EmployeeCompany
                (prisma as any).$queryRaw`
                    SELECT department, COUNT(*) as _count
                    FROM employee_companies
                    WHERE companyId = ${companyId} AND active = true
                    AND employeeId IN (SELECT id FROM employees WHERE active = true)
                    GROUP BY department
                `,
                (prisma as any).employeeCompany.count({
                    where: {
                        companyId,
                        hireDate: {
                            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
                        },
                        active: true,
                    },
                }),
            ]);

            const stats = {
                total: totalEmployees,
                active: activeEmployees,
                inactive: inactiveEmployees,
                byDepartment: employeesByDepartment.map((item: any) => ({
                    department: item.department || 'Sin departamento',
                    count: item._count,
                })),
                recentHires,
            };

            // Guardar en caché por 10 minutos
            await cache.set(cacheKey, JSON.stringify(stats), 600);

            return stats;
        } catch (error) {
            console.error(`❌ Error obteniendo estadísticas de empleados ${companyId}:`, error);
            throw error;
        }
    }

    // Métodos auxiliares
    private static generatePin(): string {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    private static async sendWelcomeEmail(employee: Employee, pin: string): Promise<void> {
        try {
            if (!employee.email) return;

            const subject = 'Bienvenido a CompilaTime';
            const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1E40AF; color: white; padding: 20px; text-align: center;">
            <h1>👋 Bienvenido a CompilaTime</h1>
          </div>
          <div style="padding: 20px;">
            <h2>¡Tu cuenta está lista!</h2>
            <p>Hola ${employee.name},</p>
            <p>Has sido dado de alta en el sistema de control horario CompilaTime.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>📋 Datos de acceso:</h3>
              <p><strong>DNI:</strong> ${employee.dni}</p>
              <p><strong>PIN para fichar:</strong> ${pin}</p>
              <p><strong>Email:</strong> ${employee.email}</p>
            </div>
            <p>Puedes usar tu DNI y PIN para fichar en el sistema.</p>
            <p>Si también se te ha proporcionado una contraseña, puedes acceder a tu zona personal para ver tus registros.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${env.FRONTEND_URL}/empleado/fichar" style="background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Fichar Ahora
              </a>
            </div>
            <p>Si tienes alguna pregunta, contacta con tu administrador.</p>
            <p>Saludos,<br>El equipo de CompilaTime</p>
          </div>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>© 2024 CompilaTime. Todos los derechos reservados.</p>
          </div>
        </div>
      `;

            await sendEmail({ to: employee.email, subject, html });
        } catch (error) {
            console.error('❌ Error enviando email de bienvenida al empleado:', error);
        }
    }

    // Obtener horario diario de un empleado
    static async getDailySchedule(companyId: string, employeeId: string, date: string) {
        try {
            console.log(`🔍 DEBUG getDailySchedule - employeeId: ${employeeId}, date: ${date}, companyId: ${companyId}`);

            const targetDate = new Date(date);
            const dayOfWeek = targetDate.getDay(); // 0 = Domingo, 6 = Sábado

            console.log(`🔍 DEBUG getDailySchedule - targetDate: ${targetDate}, dayOfWeek: ${dayOfWeek}`);


            // Obtener horarios asignados al empleado (filtrando por día específico usando ScheduleDays)
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
                        lte: targetDate,
                    },
                    OR: [
                        { endDate: null },
                        { endDate: { gte: targetDate } },
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
                distinct: ['scheduleId'], // Evitar duplicados por scheduleId
            });

            console.log(`🔍 DEBUG getDailySchedule - employeeSchedules encontrados: ${employeeSchedules.length}`);

            // Primero buscar asignaciones semanales (prioridad 1)
            let schedules: any[];

            // Obtener asignaciones semanales para este empleado en esta semana
            const weekStart = new Date(targetDate);
            // Calcular inicio de la semana (Lunes) - igual que en WeeklyCalendarSimple
            const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajustar para que lunes sea el primer día
            weekStart.setDate(diff);
            weekStart.setHours(0, 0, 0, 0); // Establecer hora a medianoche

            // Ajustar para que la semana empiece realmente en lunes (día 1)
            const weekDay = weekStart.getDay();
            const mondayDiff = weekDay === 0 ? -6 : 1 - weekDay; // Si es domingo, retroceder 6 días, si no, retroceder hasta lunes
            weekStart.setDate(weekStart.getDate() + mondayDiff);
            weekStart.setHours(0, 0, 0, 0); // Establecer hora a medianoche

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // Fin de la semana (Domingo)
            weekEnd.setHours(23, 59, 59, 999);


            const weeklyAssignments = await prisma.weeklySchedule.findMany({
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

            console.log(`🔍 DEBUG getDailySchedule - weeklyAssignments encontrados: ${weeklyAssignments.length}`);

            if (weeklyAssignments.length > 0) {
                // Usar los horarios asignados en la semana actual (PRIORIDAD 1)
                console.log(`🔍 DEBUG getDailySchedule - usando weeklyAssignments`);
                schedules = weeklyAssignments.map(wa => ({
                    id: wa.schedule!.id,
                    name: wa.schedule!.name,
                    startTime: wa.schedule!.startTime,
                    endTime: String(wa.schedule!.endTime).replace(/"/g, ''),
                    color: wa.schedule!.color,
                    breakTime: wa.schedule!.breakTime || 0,
                    flexible: wa.schedule!.flexible,
                    isReference: false, // Marcar como horario asignado
                }));

            } else {
                // Si no hay asignaciones semanales, no mostrar horarios (día de descanso)
                console.log(`🔍 DEBUG getDailySchedule - no hay asignaciones semanales, mostrando array vacío (día de descanso)`);
                schedules = [];
            }

            console.log(`🔍 DEBUG getDailySchedule - schedules finales (${schedules.length}):`, schedules);

            // Obtener fichajes del día
            const dayStart = new Date(targetDate);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(targetDate);
            dayEnd.setHours(23, 59, 59, 999);

            const timeEntries = await prisma.timeEntry.findMany({
                where: {
                    employeeId,
                    timestamp: {
                        gte: dayStart,
                        lte: dayEnd,
                    },
                },
                orderBy: { timestamp: 'asc' },
                include: {
                    breakType: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            color: true
                        }
                    }
                }
            });

            // Calcular horas trabajadas
            let workedMinutes = 0;
            let lastEntryTime: Date | null = null;

            for (const entry of timeEntries) {
                if (entry.type === 'IN') {
                    lastEntryTime = entry.timestamp;
                } else if (entry.type === 'OUT' && lastEntryTime) {
                    workedMinutes += Math.round((entry.timestamp.getTime() - lastEntryTime.getTime()) / (1000 * 60));
                    lastEntryTime = null;
                }
            }

            // Si hay una entrada sin salida, contar hasta ahora
            if (lastEntryTime && lastEntryTime < new Date()) {
                workedMinutes += Math.round((new Date().getTime() - lastEntryTime.getTime()) / (1000 * 60));
            }

            const result = {
                date: date,
                dayOfWeek,
                dayName: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek],
                schedules,
                timeEntries: timeEntries.map(te => ({
                    id: te.id,
                    type: te.type,
                    timestamp: te.timestamp,
                    source: te.source,
                })),
                workedMinutes,
                workedHours: Math.floor(workedMinutes / 60),
                workedMinutesRemainder: workedMinutes % 60,
            };


            return result;
        } catch (error) {
            console.error(`❌ Error obteniendo horario diario del empleado ${employeeId}:`, error);
            throw error;
        }
    }

    // Obtener horario semanal de un empleado
    static async getWeeklySchedule(companyId: string, employeeId: string, startDate: string) {
        try {
            const start = new Date(startDate);

            // Calcular el inicio de la semana (lunes) - igual que en getDailySchedule
            const dayOfWeek = start.getDay();

            // Calcular el lunes de la semana actual
            // Si es domingo (0), retroceder 6 días
            // Si es otro día, retroceder hasta el lunes
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

            // Crear una nueva fecha para el lunes de la semana
            const weekStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() + daysToMonday);
            weekStart.setHours(0, 0, 0, 0); // Establecer hora a medianoche

            const end = new Date(weekStart);
            end.setDate(weekStart.getDate() + 6); // Semana de 7 días

            const dailySchedules = [];

            // Empezar desde el lunes (i = 0) hasta el domingo (i = 6)
            for (let i = 0; i < 7; i++) {
                // Crear una nueva instancia de Date para cada iteración para evitar modificar weekStart
                const currentDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);

                // Asegurarse de que la fecha sea correcta (evitar problemas con cambios de mes/año)
                currentDate.setHours(12, 0, 0, 0); // Establecer hora mediodía para evitar problemas de zona horaria

                const dailySchedule = await this.getDailySchedule(
                    companyId,
                    employeeId,
                    currentDate.toISOString().split('T')[0]
                );

                dailySchedules.push(dailySchedule);
            }

            // Calcular totales de la semana
            const totalWorkedMinutes = dailySchedules.reduce((sum, day) => sum + day.workedMinutes, 0);
            const totalWorkedHours = Math.floor(totalWorkedMinutes / 60);
            const totalWorkedMinutesRemainder = totalWorkedMinutes % 60;

            // Obtener resúmenes WorkDay si existen
            const workDays = await prisma.workDay.findMany({
                where: {
                    employeeId,
                    date: {
                        gte: weekStart,
                        lte: end,
                    },
                },
                orderBy: { date: 'asc' },
            });

            return {
                startDate: weekStart.toISOString(),
                endDate: end.toISOString().split('T')[0],
                dailySchedules,
                week: dailySchedules, // Agregar propiedad 'week' para compatibilidad con frontend
                totals: {
                    workedMinutes: totalWorkedMinutes,
                    workedHours: totalWorkedHours,
                    workedMinutesRemainder: totalWorkedMinutesRemainder,
                },
                workDays: workDays.map(wd => ({
                    date: wd.date.toISOString().split('T')[0],
                    startTime: wd.startTime,
                    endTime: wd.endTime,
                    workedMinutes: wd.workedMinutes,
                    overtimeMinutes: wd.overtimeMinutes,
                    breakMinutes: wd.breakMinutes,
                    status: wd.status,
                })),
            };
        } catch (error) {
            console.error(`❌ Error obteniendo horario semanal del empleado ${employeeId}:`, error);
            throw error;
        }
    }
}

export default EmployeeService;