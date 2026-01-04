import { ApiResponse } from './api';

// Interfaz para el superadmin
export interface Superadmin {
    id: string;
    email: string;
    name: string;
    lastLoginAt?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

// Interfaz para el login de superadmin
export interface SuperadminLoginRequest {
    email: string;
    password: string;
}

export interface SuperadminLoginResponse {
    token: string;
    superadmin: Superadmin;
}

// Interfaz para cambio de contraseña
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

// Interfaz para creación de superadmin
export interface CreateSuperadminRequest {
    email: string;
    password: string;
    name: string;
}

// Interfaz para actualización de superadmin
export interface UpdateSuperadminRequest {
    email?: string;
    name?: string;
    active?: boolean;
}

// Interfaz para crear empleado super admin por defecto
export interface CreateDefaultSuperadminEmployeeRequest {
    dni: string;
    name: string;
    surname?: string;
    email?: string;
    phone?: string;
    pin: string;
    department?: string;
    position?: string;
    salary?: number;
}

// Interfaz para Plan
export interface Plan {
    id: string;
    name: string;
    description?: string;
    priceMonthly: number;
    priceYearly: number;
    durationMonths: number;
    maxEmployees: number;
    maxTimeEntriesPerMonth: number;
    features: any;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: {
        subscriptions: number;
    };
}

// Interfaz para creación de Plan
export interface CreatePlanRequest {
    name: string;
    description?: string;
    priceMonthly: number;
    priceYearly: number;
    durationMonths: number;
    maxEmployees: number;
    maxTimeEntriesPerMonth: number;
    features?: any;
}

// Interfaz para actualización de Plan
export interface UpdatePlanRequest {
    name?: string;
    description?: string;
    priceMonthly?: number;
    priceYearly?: number;
    durationMonths?: number;
    maxEmployees?: number;
    maxTimeEntriesPerMonth?: number;
    features?: any;
    active?: boolean;
}

// Interfaz para Company
export interface Company {
    id: string;
    name: string;
    slug: string;
    email: string;
    phone?: string;
    address?: string;
    logo?: string;
    timezone?: string;
    locale?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: {
        employeeCompanies: number;
        companyUsers: number;
        subscriptions: number;
    };
    currentSubscription?: {
        id: string;
        status: string;
        endDate: string;
        plan: {
            id: string;
            name: string;
            maxEmployees: number;
            priceMonthly: number;
            priceYearly: number;
        };
    };
}

// Interfaz para creación de Company
export interface CreateCompanyRequest {
    name: string;
    slug: string;
    email: string;
    phone?: string;
    address?: string;
    logo?: string;
    timezone?: string;
    locale?: string;
    settings?: any;
}

// Interfaz para actualización de Company
export interface UpdateCompanyRequest {
    name?: string;
    slug?: string;
    email?: string;
    phone?: string;
    address?: string;
    logo?: string;
    timezone?: string;
    locale?: string;
    settings?: any;
    active?: boolean;
}

// Interfaz para Subscription
export interface Subscription {
    id: string;
    companyId: string;
    planId: string;
    startDate: string;
    endDate: string;
    renewsAutomatically: boolean;
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';
    paymentMethod: 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER' | 'MANUAL';
    trialEndsAt?: string;
    cancelledAt?: string;
    cancellationReason?: string;
    createdAt: string;
    updatedAt: string;
    company?: {
        id: string;
        name: string;
        slug: string;
        email: string;
        isActive: boolean;
        suspensionReason?: string;
    };
    plan?: {
        id: string;
        name: string;
        priceMonthly: number;
        priceYearly: number;
        maxEmployees: number;
        maxTimeEntriesPerMonth: number;
        active: boolean;
    };
    payments?: Payment[];
    _count?: {
        payments: number;
    };
}

// Interfaz para creación de Subscription
export interface CreateSubscriptionRequest {
    companyId: string;
    planId: string;
    startDate: string;
    endDate: string;
    renewsAutomatically?: boolean;
    paymentMethod?: 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER' | 'MANUAL';
    trialEndsAt?: string;
}

// Interfaz para actualización de Subscription
export interface UpdateSubscriptionRequest {
    planId?: string;
    startDate?: string;
    endDate?: string;
    renewsAutomatically?: boolean;
    status?: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';
    paymentMethod?: 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER' | 'MANUAL';
    trialEndsAt?: string;
    cancelledAt?: string;
    cancellationReason?: string;
}

// Interfaz para Payment
export interface Payment {
    id: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    paidAt?: string;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    method: 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER' | 'MANUAL';
    stripePaymentId?: string;
    invoiceUrl?: string;
    failureReason?: string;
    createdAt: string;
    updatedAt: string;
    subscription?: {
        id: string;
        company: {
            id: string;
            name: string;
            slug: string;
        };
        plan: {
            id: string;
            name: string;
        };
    };
}

// Interfaz para creación de Payment
export interface CreatePaymentRequest {
    subscriptionId: string;
    amount: number;
    currency?: string;
    method?: 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER' | 'MANUAL';
    stripePaymentId?: string;
    invoiceUrl?: string;
}

// Interfaz para actualización de Payment
export interface UpdatePaymentRequest {
    amount?: number;
    currency?: string;
    paidAt?: string;
    status?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    method?: 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER' | 'MANUAL';
    stripePaymentId?: string;
    invoiceUrl?: string;
    failureReason?: string;
}

// Cliente API para Superadmin
class SuperadminApiClient {
    private baseUrl: string;

    constructor() {
        // Usar ruta relativa (funciona tanto en local con Vite proxy como en producción con Nginx)
        this.baseUrl = import.meta.env.VITE_API_URL || '';
    }

    // Obtener el token de superadmin desde las cookies o localStorage
    private getAuthHeader(): { 'Cookie': string } | { 'Authorization': string } | {} {
        console.log('🔍 [getAuthHeader] Iniciando obtención de token...');
        console.log('🔍 [getAuthHeader] Timestamp:', new Date().toISOString());

        if (typeof document !== 'undefined') {
            console.log('🔍 [getAuthHeader] Document está definido');
            console.log('🔍 [getAuthHeader] URL actual:', window.location.href);

            // Primero intentar obtener desde las cookies
            const cookies = document.cookie.split(';');
            console.log('🔍 [getAuthHeader] Cookies disponibles:', cookies);
            console.log('🔍 [getAuthHeader] document.cookie completo:', document.cookie);

            const superadminToken = cookies.find(cookie =>
                cookie.trim().startsWith('superadmin_token=')
            );

            if (superadminToken) {
                console.log('✅ [getAuthHeader] Token encontrado en cookies:', superadminToken);
                console.log('✅ [getAuthHeader] Retornando header con cookie');
                return { 'Cookie': superadminToken };
            } else {
                console.log('🔍 [getAuthHeader] No se encontró cookie superadmin_token');
            }

            // Si no hay cookie, intentar desde localStorage
            try {
                console.log('🔍 [getAuthHeader] Buscando token en localStorage...');
                const stored = localStorage.getItem('superadmin-auth');
                console.log('🔍 [getAuthHeader] Datos en localStorage:', stored);

                if (stored) {
                    const parsedData = JSON.parse(stored);
                    console.log('🔍 [getAuthHeader] Datos parseados:', parsedData);

                    if (parsedData.isAuthenticated && parsedData.superadmin && parsedData.token) {
                        console.log('✅ [getAuthHeader] Token encontrado en localStorage:', parsedData.token);
                        console.log('✅ [getAuthHeader] Retornando header con Authorization Bearer');
                        return { 'Authorization': `Bearer ${parsedData.token}` };
                    }
                }
            } catch (error) {
                console.error('❌ [getAuthHeader] Error leyendo localStorage:', error);
            }
        } else {
            console.log('❌ [getAuthHeader] Document no está definido');
        }

        console.log('❌ [getAuthHeader] No se encontró token de superadmin');
        console.log('❌ [getAuthHeader] Retornando headers vacíos');
        return {};
    }

    // Login de superadmin
    async login(credentials: SuperadminLoginRequest): Promise<ApiResponse<SuperadminLoginResponse>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
                credentials: 'include', // Importante para las cookies
            });

            const data = await response.json();
            console.log('Datos recibidos del servidor:', data);

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error en el login',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Login exitoso',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Logout de superadmin
    async logout(): Promise<ApiResponse<null>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/logout`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error en el logout',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Logout exitoso',
                data: null,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Obtener datos del superadmin autenticado
    async getMe(): Promise<ApiResponse<Superadmin>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/me`, {
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener datos del superadmin',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Datos obtenidos correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Cambiar contraseña
    async changePassword(passwordData: ChangePasswordRequest): Promise<ApiResponse<null>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(passwordData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al cambiar la contraseña',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Contraseña cambiada correctamente',
                data: null,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Obtener todos los superadmins
    async getSuperadmins(): Promise<ApiResponse<Superadmin[]>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/superadmins`, {
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener superadmins',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Superadmins obtenidos correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Crear un nuevo superadmin
    async createSuperadmin(superadminData: CreateSuperadminRequest): Promise<ApiResponse<Superadmin>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/superadmins`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(superadminData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al crear superadmin',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Superadmin creado correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Actualizar un superadmin
    async updateSuperadmin(id: string, superadminData: UpdateSuperadminRequest): Promise<ApiResponse<Superadmin>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/superadmins/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(superadminData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al actualizar superadmin',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Superadmin actualizado correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Eliminar un superadmin
    async deleteSuperadmin(id: string): Promise<ApiResponse<null>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/superadmins/${id}`, {
                method: 'DELETE',
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al eliminar superadmin',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Superadmin eliminado correctamente',
                data: null,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Verificar si el superadmin está autenticado
    async isAuthenticated(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/me`, {
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Obtener estadísticas de empresas
    async getCompaniesStats(): Promise<ApiResponse<any>> {
        try {
            const authHeader = this.getAuthHeader();
            console.log('🔍 [getCompaniesStats] Auth header:', authHeader);
            console.log('🔍 [getCompaniesStats] URL:', `${this.baseUrl}/api/companies/stats/overview`);

            const response = await fetch(`${this.baseUrl}/api/companies/stats/overview`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeader,
                },
                credentials: 'include',
            });

            console.log('🔍 [getCompaniesStats] Response status:', response.status);
            console.log('🔍 [getCompaniesStats] Response ok:', response.ok);
            console.log('🔍 [getCompaniesStats] Response headers:', response.headers);

            const data = await response.json();
            console.log('🔍 [getCompaniesStats] Response data:', data);
            console.log('🔍 [getCompaniesStats] Response data.success:', data.success);
            console.log('🔍 [getCompaniesStats] Response data.data:', data.data);
            console.log('🔍 [getCompaniesStats] Response data.message:', data.message);

            if (!response.ok) {
                console.error('🔍 [getCompaniesStats] Response NOT OK:', data);
                return {
                    success: false,
                    message: data.message || 'Error al obtener estadísticas de empresas',
                    error: data.errors,
                };
            }

            console.log('🔍 [getCompaniesStats] Response OK, returning success');
            return {
                success: true,
                message: data.message || 'Estadísticas de empresas obtenidas correctamente',
                data: data.data,
            };
        } catch (error) {
            console.error('🔍 [getCompaniesStats] Error:', error);
            console.error('🔍 [getCompaniesStats] Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                name: error instanceof Error ? error.name : 'Unknown Error'
            });
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Obtener estadísticas de suscripciones
    async getSubscriptionStats(): Promise<ApiResponse<any>> {
        try {
            const authHeader = this.getAuthHeader();
            console.log('🔍 [getSubscriptionStats] Auth header:', authHeader);
            console.log('🔍 [getSubscriptionStats] URL:', `${this.baseUrl}/api/subscriptions/stats/overview`);

            const response = await fetch(`${this.baseUrl}/api/subscriptions/stats/overview`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeader,
                },
                credentials: 'include',
            });

            console.log('🔍 [getSubscriptionStats] Response status:', response.status);
            console.log('🔍 [getSubscriptionStats] Response ok:', response.ok);

            const data = await response.json();
            console.log('🔍 [getSubscriptionStats] Response data:', data);

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener estadísticas de suscripciones',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Estadísticas de suscripciones obtenidas correctamente',
                data: data.data,
            };
        } catch (error) {
            console.error('🔍 [getSubscriptionStats] Error:', error);
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Obtener estadísticas de pagos
    async getPaymentStats(): Promise<ApiResponse<any>> {
        try {
            const authHeader = this.getAuthHeader();
            console.log('🔍 [getPaymentStats] Auth header:', authHeader);
            console.log('🔍 [getPaymentStats] URL:', `${this.baseUrl}/api/payments/stats/overview`);

            const response = await fetch(`${this.baseUrl}/api/payments/stats/overview`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeader,
                },
                credentials: 'include',
            });

            console.log('🔍 [getPaymentStats] Response status:', response.status);
            console.log('🔍 [getPaymentStats] Response ok:', response.ok);

            const data = await response.json();
            console.log('🔍 [getPaymentStats] Response data:', data);

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener estadísticas de pagos',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Estadísticas de pagos obtenidas correctamente',
                data: data.data,
            };
        } catch (error) {
            console.error('🔍 [getPaymentStats] Error:', error);
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Obtener estadísticas de planes
    async getPlansStats(): Promise<ApiResponse<any>> {
        try {
            const authHeader = this.getAuthHeader();
            console.log('🔍 [getPlansStats] Auth header:', authHeader);
            console.log('🔍 [getPlansStats] URL:', `${this.baseUrl}/api/plans/stats/overview`);

            const response = await fetch(`${this.baseUrl}/api/plans/stats/overview`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeader,
                },
                credentials: 'include',
            });

            console.log('🔍 [getPlansStats] Response status:', response.status);
            console.log('🔍 [getPlansStats] Response ok:', response.ok);

            const data = await response.json();
            console.log('🔍 [getPlansStats] Response data:', data);

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener estadísticas de planes',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Estadísticas de planes obtenidas correctamente',
                data: data.data,
            };
        } catch (error) {
            console.error('🔍 [getPlansStats] Error:', error);
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Obtener una empresa por ID
    async getCompany(id: string): Promise<ApiResponse<Company>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/companies/${id}`, {
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener la empresa',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Empresa obtenida correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Crear una nueva empresa
    async createCompany(companyData: CreateCompanyRequest): Promise<ApiResponse<Company>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/companies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(companyData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al crear la empresa',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Empresa creada correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Actualizar una empresa
    async updateCompany(id: string, companyData: UpdateCompanyRequest): Promise<ApiResponse<Company>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/companies/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(companyData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al actualizar la empresa',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Empresa actualizada correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Eliminar una empresa
    async deleteCompany(id: string): Promise<ApiResponse<null>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/companies/${id}`, {
                method: 'DELETE',
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al eliminar la empresa',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Empresa eliminada correctamente',
                data: null,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Obtener todas las empresas
    async getCompanies(): Promise<ApiResponse<any[]>> {
        try {
            const authHeader = this.getAuthHeader();
            console.log('🔍 [getCompanies] Auth header:', authHeader);
            console.log('🔍 [getCompanies] URL:', `${this.baseUrl}/api/companies`);

            const response = await fetch(`${this.baseUrl}/api/companies`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeader,
                },
                credentials: 'include',
            });

            console.log('🔍 [getCompanies] Response status:', response.status);
            console.log('🔍 [getCompanies] Response ok:', response.ok);

            const data = await response.json();
            console.log('🔍 [getCompanies] Response data:', data);

            if (!response.ok) {
                console.error('🔍 [getCompanies] Response NOT OK:', data);
                return {
                    success: false,
                    message: data.message || 'Error al obtener las empresas',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Empresas obtenidas correctamente',
                data: data.data,
            };
        } catch (error) {
            console.error('🔍 [getCompanies] Error:', error);
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Suspender una empresa
    async suspendCompany(id: string, reason: string): Promise<ApiResponse<any>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/companies/${id}/suspend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify({ reason }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al suspender la empresa',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Empresa suspendida correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Reactivar una empresa
    async reactivateCompany(id: string): Promise<ApiResponse<any>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/companies/${id}/reactivate`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al reactivar la empresa',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Empresa reactivada correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Obtener todos los planes
    async getPlans(): Promise<ApiResponse<Plan[]>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/plans`, {
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener los planes',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Planes obtenidos correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Obtener un plan por ID
    async getPlan(id: string): Promise<ApiResponse<Plan>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/plans/${id}`, {
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener el plan',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Plan obtenido correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Crear un nuevo plan
    async createPlan(planData: CreatePlanRequest): Promise<ApiResponse<Plan>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/plans`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(planData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al crear el plan',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Plan creado correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Actualizar un plan
    async updatePlan(id: string, planData: UpdatePlanRequest): Promise<ApiResponse<Plan>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/plans/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(planData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al actualizar el plan',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Plan actualizado correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Eliminar un plan
    async deletePlan(id: string): Promise<ApiResponse<null>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/plans/${id}`, {
                method: 'DELETE',
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al eliminar el plan',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Plan eliminado correctamente',
                data: null,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Activar un plan
    async activatePlan(id: string): Promise<ApiResponse<Plan>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/plans/${id}/activate`, {
                method: 'PATCH',
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al activar el plan',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Plan activado correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Desactivar un plan
    async deactivatePlan(id: string): Promise<ApiResponse<Plan>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/plans/${id}/deactivate`, {
                method: 'PATCH',
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al desactivar el plan',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Plan desactivado correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // ==================== MÉTODOS DE SUSCRIPCIONES ====================

    // Obtener todas las suscripciones
    async getSubscriptions(): Promise<ApiResponse<Subscription[]>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/subscriptions`, {
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener las suscripciones',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Suscripciones obtenidas correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Obtener una suscripción por ID
    async getSubscription(id: string): Promise<ApiResponse<Subscription>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/subscriptions/${id}`, {
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener la suscripción',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Suscripción obtenida correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Crear una nueva suscripción
    async createSubscription(subscriptionData: CreateSubscriptionRequest): Promise<ApiResponse<Subscription>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/subscriptions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(subscriptionData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al crear la suscripción',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Suscripción creada correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Actualizar una suscripción
    async updateSubscription(id: string, subscriptionData: UpdateSubscriptionRequest): Promise<ApiResponse<Subscription>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/subscriptions/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(subscriptionData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al actualizar la suscripción',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Suscripción actualizada correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Cancelar una suscripción
    async cancelSubscription(id: string, reason: string): Promise<ApiResponse<Subscription>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/subscriptions/${id}/cancel`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify({ cancellationReason: reason }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al cancelar la suscripción',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Suscripción cancelada correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Reactivar una suscripción
    async reactivateSubscription(id: string): Promise<ApiResponse<Subscription>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/subscriptions/${id}/reactivate`, {
                method: 'PATCH',
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al reactivar la suscripción',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Suscripción reactivada correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Eliminar una suscripción
    async deleteSubscription(id: string): Promise<ApiResponse<null>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/subscriptions/${id}`, {
                method: 'DELETE',
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al eliminar la suscripción',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Suscripción eliminada correctamente',
                data: null,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // ==================== MÉTODOS DE PAGOS ====================

    // Obtener todos los pagos
    async getPayments(): Promise<ApiResponse<Payment[]>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/payments`, {
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener los pagos',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Pagos obtenidos correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Obtener un pago por ID
    async getPayment(id: string): Promise<ApiResponse<Payment>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/payments/${id}`, {
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al obtener el pago',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Pago obtenido correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Crear un nuevo pago
    async createPayment(paymentData: CreatePaymentRequest): Promise<ApiResponse<Payment>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(paymentData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al crear el pago',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Pago creado correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Actualizar un pago
    async updatePayment(id: string, paymentData: UpdatePaymentRequest): Promise<ApiResponse<Payment>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/payments/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(paymentData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al actualizar el pago',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Pago actualizado correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Confirmar un pago
    async confirmPayment(id: string): Promise<ApiResponse<Payment>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/payments/${id}/confirm`, {
                method: 'PATCH',
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al confirmar el pago',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Pago confirmado correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Marcar un pago como fallido
    async failPayment(id: string, reason: string): Promise<ApiResponse<Payment>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/payments/${id}/fail`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify({ failureReason: reason }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al marcar el pago como fallido',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Pago marcado como fallido correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Eliminar un pago
    async deletePayment(id: string): Promise<ApiResponse<null>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/payments/${id}`, {
                method: 'DELETE',
                headers: {
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al eliminar el pago',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Pago eliminado correctamente',
                data: null,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Crear empleado super admin por defecto para una empresa
    async createDefaultSuperadminEmployee(companyId: string, employeeData: CreateDefaultSuperadminEmployeeRequest): Promise<ApiResponse<{
        employee: any;
        employeeCompany: any;
        companyUser: any;
        message: string;
    }>> {
        try {
            const response = await fetch(`${this.baseUrl}/api/superadmin/companies/${companyId}/create-superadmin-employee`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader(),
                },
                credentials: 'include',
                body: JSON.stringify(employeeData),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Error al crear empleado super admin',
                    error: data.errors,
                };
            }

            return {
                success: true,
                message: data.message || 'Empleado super admin creado correctamente',
                data: data.data,
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error de conexión',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}

export const superadminApi = new SuperadminApiClient();