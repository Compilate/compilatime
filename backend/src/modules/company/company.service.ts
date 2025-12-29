import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../utils/apiError';

const prisma = new PrismaClient();

export class CompanyService {
    // Obtener todas las empresas
    async getAllCompanies() {
        try {
            console.log('🔍 Obteniendo todas las empresas...');
            const companies = await prisma.company.findMany({
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    email: true,
                    phone: true,
                    address: true,
                    logo: true,
                    timezone: true,
                    locale: true,
                    active: true,
                    createdAt: true,
                    updatedAt: true,
                    currentSubscriptionId: true, // Añadir este campo para depuración
                    // Configuración de acceso a zona personal de empleados
                    enableEmployeePortal: true,
                    _count: {
                        select: {
                            employeeCompanies: {
                                where: { active: true }
                            },
                            companyUsers: {
                                where: { active: true }
                            },
                            subscriptions: true
                        }
                    },
                    currentSubscription: {
                        select: {
                            id: true,
                            status: true,
                            endDate: true,
                            plan: {
                                select: {
                                    id: true,
                                    name: true,
                                    maxEmployees: true,
                                    priceMonthly: true,
                                    priceYearly: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            console.log('✅ Empresas obtenidas:', companies.length);
            if (companies.length > 0) {
                console.log('📊 Datos de la primera empresa:', {
                    id: companies[0].id,
                    name: companies[0].name,
                    currentSubscriptionId: companies[0].currentSubscriptionId,
                    currentSubscription: (companies[0] as any).currentSubscription,
                    subscriptionCount: (companies[0] as any)._count.subscriptions
                });

                // Verificar si hay suscripciones para esta empresa
                const subscriptions = await prisma.subscription.findMany({
                    where: { companyId: companies[0].id },
                    select: {
                        id: true,
                        status: true,
                        endDate: true,
                        plan: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                });
                console.log('📋 Todas las suscripciones de la primera empresa:', subscriptions);
            }
            return companies;
        } catch (error) {
            console.error('Error al obtener empresas:', error);
            throw new ApiError('Error al obtener las empresas', 500);
        }
    }

    // Obtener una empresa por ID
    async getCompanyById(id: string) {
        try {
            const company = await prisma.company.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    email: true,
                    phone: true,
                    address: true,
                    logo: true,
                    timezone: true,
                    locale: true,
                    settings: true,
                    active: true,
                    createdAt: true,
                    updatedAt: true,
                    // Campos de geolocalización
                    latitude: true,
                    longitude: true,
                    geofenceRadius: true,
                    requireGeolocation: true,
                    // Configuración de cierre automático
                    autoPunchoutEnabled: true,
                    autoPunchoutMaxMinutes: true,
                    autoPunchoutMarginBefore: true,
                    autoPunchoutMarginAfter: true,
                    // Configuración de acceso a zona personal de empleados
                    enableEmployeePortal: true,
                    _count: {
                        select: {
                            companyUsers: {
                                where: { active: true }
                            },
                            subscriptions: true,
                            timeEntries: true,
                            schedules: true
                        }
                    } as any,
                    currentSubscription: {
                        select: {
                            id: true,
                            status: true,
                            startDate: true,
                            endDate: true,
                            renewsAutomatically: true,
                            paymentMethod: true,
                            plan: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    maxEmployees: true,
                                    maxTimeEntriesPerMonth: true,
                                    priceMonthly: true,
                                    priceYearly: true,
                                    features: true
                                }
                            },
                            payments: {
                                select: {
                                    id: true,
                                    amount: true,
                                    status: true,
                                    paidAt: true,
                                    method: true,
                                    createdAt: true
                                },
                                orderBy: {
                                    createdAt: 'desc'
                                },
                                take: 10
                            }
                        }
                    }
                }
            });

            if (!company) {
                throw new ApiError('Empresa no encontrada', 404);
            }

            return company;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al obtener empresa por ID:', error);
            throw new ApiError('Error al obtener la empresa', 500);
        }
    }

    // Obtener una empresa por slug (código de empresa)
    async getCompanyBySlug(slug: string) {
        try {
            const company = await prisma.company.findUnique({
                where: { slug },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    email: true,
                    phone: true,
                    address: true,
                    logo: true,
                    timezone: true,
                    locale: true,
                    settings: true,
                    active: true,
                    createdAt: true,
                    updatedAt: true,
                    // Campos de geolocalización
                    latitude: true,
                    longitude: true,
                    geofenceRadius: true,
                    requireGeolocation: true,
                    // Configuración de cierre automático
                    autoPunchoutEnabled: true,
                    autoPunchoutMaxMinutes: true,
                    autoPunchoutMarginBefore: true,
                    autoPunchoutMarginAfter: true,
                    // Configuración de acceso a zona personal de empleados
                    enableEmployeePortal: true,
                    _count: {
                        select: {
                            companyUsers: {
                                where: { active: true }
                            },
                            subscriptions: true,
                            timeEntries: true,
                            schedules: true
                        }
                    } as any,
                    currentSubscription: {
                        select: {
                            id: true,
                            status: true,
                            startDate: true,
                            endDate: true,
                            renewsAutomatically: true,
                            paymentMethod: true,
                            plan: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    maxEmployees: true,
                                    maxTimeEntriesPerMonth: true,
                                    priceMonthly: true,
                                    priceYearly: true,
                                    features: true
                                }
                            },
                            payments: {
                                select: {
                                    id: true,
                                    amount: true,
                                    status: true,
                                    paidAt: true,
                                    method: true,
                                    createdAt: true
                                },
                                orderBy: {
                                    createdAt: 'desc'
                                },
                                take: 10
                            }
                        }
                    }
                }
            });

            if (!company) {
                throw new ApiError('Empresa no encontrada', 404);
            }

            return company;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al obtener empresa por slug:', error);
            throw new ApiError('Error al obtener la empresa', 500);
        }
    }

    // Crear una nueva empresa
    async createCompany(companyData: {
        name: string;
        slug: string;
        email: string;
        phone?: string;
        address?: string;
        logo?: string;
        timezone?: string;
        locale?: string;
        latitude?: number | null;
        longitude?: number | null;
        geofenceRadius?: number;
        requireGeolocation?: boolean;
        autoPunchoutEnabled?: boolean;
        autoPunchoutMaxMinutes?: number;
        autoPunchoutMarginBefore?: number;
        autoPunchoutMarginAfter?: number;
        enableEmployeePortal?: boolean;
        settings?: any;
    }) {
        try {
            // Validar que el slug no exista
            const existingCompany = await prisma.company.findUnique({
                where: { slug: companyData.slug }
            });

            if (existingCompany) {
                throw new ApiError('Ya existe una empresa con ese código', 409);
            }

            // Validar que el email no exista
            const existingEmail = await prisma.company.findUnique({
                where: { email: companyData.email }
            });

            if (existingEmail) {
                throw new ApiError('Ya existe una empresa con ese email', 409);
            }

            const newCompany = await prisma.company.create({
                data: {
                    ...companyData,
                    settings: companyData.settings || {}
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    email: true,
                    phone: true,
                    address: true,
                    logo: true,
                    timezone: true,
                    locale: true,
                    settings: true,
                    active: true,
                    createdAt: true,
                    updatedAt: true,
                    currentSubscriptionId: true,
                    // Configuración de acceso a zona personal de empleados
                    enableEmployeePortal: true
                }
            });

            return newCompany;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al crear empresa:', error);
            throw new ApiError('Error al crear la empresa', 500);
        }
    }

    // Actualizar una empresa
    async updateCompany(id: string, companyData: {
        name?: string;
        slug?: string;
        email?: string;
        phone?: string;
        address?: string;
        logo?: string;
        timezone?: string;
        locale?: string;
        latitude?: number | null;
        longitude?: number | null;
        geofenceRadius?: number;
        requireGeolocation?: boolean;
        autoPunchoutEnabled?: boolean;
        autoPunchoutMaxMinutes?: number;
        autoPunchoutMarginBefore?: number;
        autoPunchoutMarginAfter?: number;
        enableEmployeePortal?: boolean;
        settings?: any;
        active?: boolean;
    }) {
        try {
            // Verificar que la empresa existe
            const existingCompany = await prisma.company.findUnique({
                where: { id }
            });

            if (!existingCompany) {
                throw new ApiError('Empresa no encontrada', 404);
            }

            // Si se va a cambiar el slug, verificar que no exista
            if (companyData.slug && companyData.slug !== existingCompany.slug) {
                const slugExists = await prisma.company.findUnique({
                    where: { slug: companyData.slug }
                });

                if (slugExists) {
                    throw new ApiError('Ya existe una empresa con ese código', 409);
                }
            }

            // Si se va a cambiar el email, verificar que no exista
            if (companyData.email && companyData.email !== existingCompany.email) {
                const emailExists = await prisma.company.findUnique({
                    where: { email: companyData.email }
                });

                if (emailExists) {
                    throw new ApiError('Ya existe una empresa con ese email', 409);
                }
            }

            const updatedCompany = await prisma.company.update({
                where: { id },
                data: {
                    ...companyData,
                    settings: companyData.settings !== undefined ? companyData.settings : undefined
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    email: true,
                    phone: true,
                    address: true,
                    logo: true,
                    timezone: true,
                    locale: true,
                    settings: true,
                    active: true,
                    createdAt: true,
                    updatedAt: true,
                    // Campos de geolocalización
                    latitude: true,
                    longitude: true,
                    geofenceRadius: true,
                    requireGeolocation: true,
                    // Configuración de cierre automático
                    autoPunchoutEnabled: true,
                    autoPunchoutMaxMinutes: true,
                    autoPunchoutMarginBefore: true,
                    autoPunchoutMarginAfter: true,
                    // Configuración de acceso a zona personal de empleados
                    enableEmployeePortal: true,
                    currentSubscriptionId: true
                }
            });

            return updatedCompany;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al actualizar empresa:', error);
            throw new ApiError('Error al actualizar la empresa', 500);
        }
    }

    // Suspender una empresa
    async suspendCompany(id: string, _reason: string) {
        try {
            const company = await prisma.company.findUnique({
                where: { id }
            });

            if (!company) {
                throw new ApiError('Empresa no encontrada', 404);
            }

            const updatedCompany = await prisma.company.update({
                where: { id },
                data: {
                    active: false
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    email: true,
                    active: true,
                    updatedAt: true
                }
            });

            return updatedCompany;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al suspender empresa:', error);
            throw new ApiError('Error al suspender la empresa', 500);
        }
    }

    // Reactivar una empresa
    async reactivateCompany(id: string) {
        try {
            const company = await prisma.company.findUnique({
                where: { id }
            });

            if (!company) {
                throw new ApiError('Empresa no encontrada', 404);
            }

            const updatedCompany = await prisma.company.update({
                where: { id },
                data: {
                    active: true
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    email: true,
                    active: true,
                    updatedAt: true
                }
            });

            return updatedCompany;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al reactivar empresa:', error);
            throw new ApiError('Error al reactivar la empresa', 500);
        }
    }

    // Eliminar una empresa (con todas sus relaciones)
    async deleteCompany(id: string): Promise<void> {
        try {
            const company = await prisma.company.findUnique({
                where: { id }
            });

            if (!company) {
                throw new ApiError('Empresa no encontrada', 404);
            }

            // Eliminar la empresa (en cascada se eliminarán todas las relaciones)
            await prisma.company.delete({
                where: { id }
            });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al eliminar empresa:', error);
            throw new ApiError('Error al eliminar la empresa', 500);
        }
    }

    // Obtener estadísticas de empresas
    async getCompaniesStats(): Promise<{
        total: number;
        active: number;
        suspended: number;
        withActiveSubscription: number;
        withExpiredSubscription: number;
        totalEmployees: number;
        newThisMonth: number;
    }> {
        try {
            console.log('🔍 [getCompaniesStats] Iniciando obtención de estadísticas...');
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            console.log('🔍 [getCompaniesStats] Fechas:', { now, startOfMonth });

            // Obtener estadísticas básicas primero
            console.log('🔍 [getCompaniesStats] Obteniendo total de empresas...');
            const total = await prisma.company.count();
            console.log('🔍 [getCompaniesStats] Total empresas:', total);

            console.log('🔍 [getCompaniesStats] Obteniendo empresas activas...');
            const active = await prisma.company.count({ where: { active: true } });
            console.log('🔍 [getCompaniesStats] Empresas activas:', active);

            console.log('🔍 [getCompaniesStats] Obteniendo empresas suspendidas...');
            const suspended = await prisma.company.count({ where: { active: false } });
            console.log('🔍 [getCompaniesStats] Empresas suspendidas:', suspended);

            console.log('🔍 [getCompaniesStats] Obteniendo empresas con suscripción activa...');
            const withActiveSubscription = await prisma.company.count({
                where: {
                    currentSubscription: {
                        status: 'ACTIVE'
                    }
                }
            });
            console.log('🔍 [getCompaniesStats] Empresas con suscripción activa:', withActiveSubscription);

            console.log('🔍 [getCompaniesStats] Obteniendo empresas con suscripción expirada...');
            const withExpiredSubscription = await prisma.company.count({
                where: {
                    currentSubscription: {
                        status: 'EXPIRED'
                    }
                }
            });
            console.log('🔍 [getCompaniesStats] Empresas con suscripción expirada:', withExpiredSubscription);

            console.log('🔍 [getCompaniesStats] Obteniendo total de empleados...');
            const totalEmployees = await prisma.employeeCompany.count({
                where: {
                    active: true,
                    employee: {
                        active: true
                    }
                }
            });
            console.log('🔍 [getCompaniesStats] Total empleados:', totalEmployees);

            console.log('🔍 [getCompaniesStats] Obteniendo empresas nuevas este mes...');
            const newThisMonth = await prisma.company.count({
                where: {
                    createdAt: { gte: startOfMonth }
                }
            });
            console.log('🔍 [getCompaniesStats] Empresas nuevas este mes:', newThisMonth);

            const result = {
                total,
                active,
                suspended,
                withActiveSubscription,
                withExpiredSubscription,
                totalEmployees,
                newThisMonth
            };
            console.log('🔍 [getCompaniesStats] Resultado final:', result);
            return result;
        } catch (error) {
            console.error('❌ [getCompaniesStats] Error al obtener estadísticas de empresas:', error);
            console.error('❌ [getCompaniesStats] Detalles del error:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                name: error instanceof Error ? error.name : 'Unknown Error'
            });
            throw new ApiError('Error al obtener las estadísticas de empresas', 500);
        }
    }

    // Obtener empresas con suscripción próxima a expirar
    async getCompaniesWithExpiringSubscription(days: number = 30) {
        try {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);

            const companies = await prisma.company.findMany({
                where: {
                    active: true,
                    currentSubscription: {
                        status: 'ACTIVE',
                        endDate: {
                            lte: futureDate,
                            gte: new Date()
                        }
                    }
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    email: true,
                    currentSubscription: {
                        select: {
                            id: true,
                            endDate: true,
                            plan: {
                                select: {
                                    name: true,
                                    priceMonthly: true,
                                    priceYearly: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    currentSubscription: {
                        endDate: 'asc'
                    }
                }
            });

            return companies;
        } catch (error) {
            console.error('Error al obtener empresas con suscripción próxima a expirar:', error);
            throw new ApiError('Error al obtener las empresas con suscripción próxima a expirar', 500);
        }
    }

    // Crear empleado super admin por defecto para una empresa
    async createDefaultSuperadminEmployee(companyId: string, employeeData: {
        dni: string;
        name: string;
        surname?: string;
        email?: string;
        phone?: string;
        pin: string;
        department?: string;
        position?: string;
        salary?: number;
    }) {
        try {
            // Verificar que la empresa existe
            const company = await prisma.company.findUnique({
                where: { id: companyId }
            });

            if (!company) {
                throw new ApiError('Empresa no encontrada', 404);
            }

            // Verificar que el DNI no exista globalmente
            const existingEmployee = await prisma.employee.findUnique({
                where: { dni: employeeData.dni.toUpperCase() }
            });

            if (existingEmployee) {
                throw new ApiError('Ya existe un empleado con ese DNI', 409);
            }

            // Hashear el PIN
            const bcrypt = require('bcryptjs');
            const hashedPin = await bcrypt.hash(employeeData.pin, 10);

            // Crear el empleado global
            const newEmployee = await prisma.employee.create({
                data: {
                    dni: employeeData.dni.toUpperCase(),
                    name: employeeData.name,
                    surname: employeeData.surname || '',
                    email: employeeData.email || null,
                    phone: employeeData.phone || null,
                    pin: hashedPin,
                    department: employeeData.department || 'Administración',
                    position: employeeData.position || 'Super Admin',
                    salary: employeeData.salary || 0,
                    active: true
                },
                select: {
                    id: true,
                    dni: true,
                    name: true,
                    surname: true,
                    email: true,
                    phone: true,
                    department: true,
                    position: true,
                    salary: true,
                    active: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            // Crear la relación con la empresa
            const employeeCompany = await prisma.employeeCompany.create({
                data: {
                    employeeId: newEmployee.id,
                    companyId: companyId,
                    employeeCode: `SA-${newEmployee.dni.slice(-4)}`,
                    department: employeeData.department || 'Administración',
                    position: employeeData.position || 'Super Admin',
                    salary: employeeData.salary || 0,
                    hireDate: new Date(),
                    active: true
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            email: true,
                            active: true
                        }
                    }
                }
            });

            // Crear un usuario de empresa para el empleado (para acceso al backoffice)
            const companyUser = await prisma.companyUser.create({
                data: {
                    companyId: companyId,
                    name: `${employeeData.name} ${employeeData.surname || ''}`.trim(),
                    email: employeeData.email || `${employeeData.dni.toLowerCase()}@${company.slug}.compilatime.local`,
                    passwordHash: hashedPin,
                    role: 'SUPER_ADMIN',
                    active: true
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    active: true,
                    createdAt: true
                }
            });

            return {
                employee: newEmployee,
                employeeCompany,
                companyUser,
                message: 'Empleado super admin creado correctamente'
            };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            console.error('Error al crear empleado super admin por defecto:', error);
            throw new ApiError('Error al crear el empleado super admin por defecto', 500);
        }
    }
}