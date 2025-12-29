import React, { useState, useEffect } from 'react';
import {
    Building2,
    Users,
    CreditCard,
    TrendingUp,
    TrendingDown,
    Calendar,
    DollarSign,
    AlertCircle,
    CheckCircle,
    Clock,
    BarChart3,
    // PieChart,
    Activity
} from 'lucide-react';
import { superadminApi } from '../../lib/superadminApi';
import { useSuperadminAuth } from '../../contexts/SuperadminAuthContext';

interface DashboardStats {
    companies: {
        total: number;
        active: number;
        suspended: number;
        newThisMonth: number;
    };
    employees: {
        total: number;
        active: number;
    };
    subscriptions: {
        total: number;
        active: number;
        expired: number;
        expiringSoon: number;
    };
    payments: {
        total: number;
        thisMonth: number;
        pending: number;
        failed: number;
    };
    plans: {
        total: number;
        active: number;
    };
}

const DashboardAdminPage: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { isAuthenticated, superadmin } = useSuperadminAuth();

    useEffect(() => {
        // Verificar si el usuario es un superadmin antes de cargar estadísticas
        const checkSuperadminAuth = async () => {
            try {
                if (!isAuthenticated || !superadmin) {
                    console.log('❌ [DashboardAdminPage] Usuario no es superadmin, redirigiendo al login de admin');
                    window.location.href = '/admin/login';
                    return;
                }
                console.log('✅ [DashboardAdminPage] Usuario es superadmin, cargando estadísticas');
                loadDashboardStats();
            } catch (error) {
                console.error('❌ [DashboardAdminPage] Error al verificar autenticación de superadmin:', error);
                setError('Error al verificar autenticación');
            }
        };

        checkSuperadminAuth();
    }, [isAuthenticated, superadmin]);

    const loadDashboardStats = async () => {
        try {
            setIsLoading(true);
            setError('');

            console.log('🔄 [DashboardAdminPage] Iniciando carga de estadísticas...');

            // Obtener estadísticas de empresas
            console.log('📊 [DashboardAdminPage] Obteniendo estadísticas de empresas...');
            const companiesResponse = await superadminApi.getCompaniesStats();
            console.log('📊 [DashboardAdminPage] Respuesta empresas completa:', companiesResponse);
            console.log('📊 [DashboardAdminPage] Respuesta empresas success:', companiesResponse.success);
            console.log('📊 [DashboardAdminPage] Respuesta empresas data:', companiesResponse.data);
            console.log('📊 [DashboardAdminPage] Respuesta empresas message:', companiesResponse.message);

            // Obtener estadísticas de suscripciones
            console.log('📊 [DashboardAdminPage] Obteniendo estadísticas de suscripciones...');
            const subscriptionsResponse = await superadminApi.getSubscriptionStats();
            console.log('📊 [DashboardAdminPage] Respuesta suscripciones:', subscriptionsResponse);

            // Obtener estadísticas de pagos
            console.log('📊 [DashboardAdminPage] Obteniendo estadísticas de pagos...');
            const paymentsResponse = await superadminApi.getPaymentStats();
            console.log('📊 [DashboardAdminPage] Respuesta pagos:', paymentsResponse);

            // Obtener estadísticas de planes
            console.log('📊 [DashboardAdminPage] Obteniendo estadísticas de planes...');
            const plansResponse = await superadminApi.getPlansStats();
            console.log('📊 [DashboardAdminPage] Respuesta planes:', plansResponse);

            if (companiesResponse.success && subscriptionsResponse.success &&
                paymentsResponse.success && plansResponse.success) {

                console.log('✅ [DashboardAdminPage] Todas las respuestas fueron exitosas');
                const statsData = {
                    companies: companiesResponse.data,
                    subscriptions: subscriptionsResponse.data,
                    payments: paymentsResponse.data,
                    plans: plansResponse.data,
                    employees: {
                        total: companiesResponse.data.totalEmployees,
                        active: companiesResponse.data.totalEmployees // Asumimos que todos los empleados están activos
                    }
                };
                console.log('📊 [DashboardAdminPage] Datos de estadísticas a guardar:', statsData);
                setStats(statsData);
            } else {
                console.log('❌ [DashboardAdminPage] Error en las respuestas:', {
                    companies: companiesResponse.success,
                    subscriptions: subscriptionsResponse.success,
                    payments: paymentsResponse.success,
                    plans: plansResponse.success
                });
                setError('Error al cargar las estadísticas del dashboard');
            }
        } catch (error) {
            console.error('❌ [DashboardAdminPage] Error cargando estadísticas del dashboard:', error);
            console.error('❌ [DashboardAdminPage] Detalles del error:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                name: error instanceof Error ? error.name : 'Unknown Error'
            });
            setError('Error de conexión al cargar las estadísticas');
        } finally {
            setIsLoading(false);
        }
    };

    const StatCard: React.FC<{
        title: string;
        value: string | number;
        icon: React.ReactNode;
        trend?: {
            value: number;
            isUp: boolean;
        };
        color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo';
    }> = ({ title, value, icon, trend, color = 'blue' }) => {
        const colorClasses = {
            blue: 'bg-blue-50 text-blue-600 border-blue-200',
            green: 'bg-green-50 text-green-600 border-green-200',
            red: 'bg-red-50 text-red-600 border-red-200',
            yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
            purple: 'bg-purple-50 text-purple-600 border-purple-200',
            indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200'
        };

        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">{title}</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
                        {trend && (
                            <div className={`flex items-center mt-2 text-sm ${trend.isUp ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {trend.isUp ? (
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                ) : (
                                    <TrendingDown className="h-4 w-4 mr-1" />
                                )}
                                <span>{trend.value}%</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-3 rounded-full ${colorClasses[color]}`}>
                        {icon}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center text-gray-500 py-8">
                No hay datos disponibles
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard de Administración</h1>
                <p className="text-gray-600 mt-1">Resumen general del sistema CompilaTime</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Empresas */}
                <StatCard
                    title="Total Empresas"
                    value={stats.companies.total}
                    icon={<Building2 className="h-6 w-6" />}
                    color="blue"
                />

                <StatCard
                    title="Empresas Activas"
                    value={stats.companies.active}
                    icon={<CheckCircle className="h-6 w-6" />}
                    color="green"
                />

                <StatCard
                    title="Empresas Suspendidas"
                    value={stats.companies.suspended}
                    icon={<AlertCircle className="h-6 w-6" />}
                    color="red"
                />

                {/* Empleados */}
                <StatCard
                    title="Total Empleados"
                    value={stats.employees.total}
                    icon={<Users className="h-6 w-6" />}
                    color="purple"
                />

                <StatCard
                    title="Nuevas Empresas (Mes)"
                    value={stats.companies.newThisMonth}
                    icon={<TrendingUp className="h-6 w-6" />}
                    color="green"
                />

                {/* Suscripciones */}
                <StatCard
                    title="Suscripciones Activas"
                    value={stats.subscriptions.active}
                    icon={<CreditCard className="h-6 w-6" />}
                    color="indigo"
                />

                <StatCard
                    title="Suscripciones Expiradas"
                    value={stats.subscriptions.expired}
                    icon={<Clock className="h-6 w-6" />}
                    color="red"
                />

                <StatCard
                    title="Por Expirar (30d)"
                    value={stats.subscriptions.expiringSoon}
                    icon={<Calendar className="h-6 w-6" />}
                    color="yellow"
                />

                {/* Pagos */}
                <StatCard
                    title="Ingresos Mensuales"
                    value={`€${(stats.payments.thisMonth || 0).toFixed(2)}`}
                    icon={<DollarSign className="h-6 w-6" />}
                    color="green"
                />

                <StatCard
                    title="Pagos Pendientes"
                    value={stats.payments.pending}
                    icon={<Clock className="h-6 w-6" />}
                    color="yellow"
                />

                <StatCard
                    title="Pagos Fallidos"
                    value={stats.payments.failed}
                    icon={<AlertCircle className="h-6 w-6" />}
                    color="red"
                />

                {/* Planes */}
                <StatCard
                    title="Planes Activos"
                    value={stats.plans.active}
                    icon={<BarChart3 className="h-6 w-6" />}
                    color="blue"
                />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <Building2 className="h-5 w-5 text-indigo-600 mr-3" />
                        <span className="text-sm font-medium text-gray-900">Gestionar Empresas</span>
                    </button>

                    <button className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <CreditCard className="h-5 w-5 text-indigo-600 mr-3" />
                        <span className="text-sm font-medium text-gray-900">Ver Suscripciones</span>
                    </button>

                    <button className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <DollarSign className="h-5 w-5 text-indigo-600 mr-3" />
                        <span className="text-sm font-medium text-gray-900">Gestionar Pagos</span>
                    </button>

                    <button className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <BarChart3 className="h-5 w-5 text-indigo-600 mr-3" />
                        <span className="text-sm font-medium text-gray-900">Configurar Planes</span>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
                <div className="space-y-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Activity className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-gray-900">
                                El sistema está funcionando correctamente
                            </p>
                            <p className="text-xs text-gray-500">
                                Última verificación: {new Date().toLocaleString('es-ES')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardAdminPage;