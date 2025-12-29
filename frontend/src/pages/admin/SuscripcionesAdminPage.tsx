import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    CreditCard,
    Filter,
    Plus,
    RefreshCw,
    Search,
    Edit,
    Trash2,
    Ban,
    CheckCircle,
    AlertCircle,
    Clock,
    XCircle
} from 'lucide-react';
import { superadminApi, Subscription } from '../../lib/superadminApi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';

const SuscripcionesAdminPage: React.FC = () => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [methodFilter, setMethodFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    // Cargar suscripciones
    const loadSubscriptions = async () => {
        try {
            setIsLoading(true);
            setError('');

            const response = await superadminApi.getSubscriptions();

            if (response.success && response.data) {
                setSubscriptions(response.data);
                setFilteredSubscriptions(response.data);
            } else {
                setError(response.message || 'Error al cargar las suscripciones');
            }
        } catch (error) {
            console.error('Error al cargar suscripciones:', error);
            setError('Error de conexión al cargar las suscripciones');
        } finally {
            setIsLoading(false);
        }
    };

    // Aplicar filtros
    const applyFilters = () => {
        let filtered = subscriptions;

        // Filtro de búsqueda
        if (searchTerm) {
            filtered = filtered.filter(sub =>
                sub.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sub.company?.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sub.plan?.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtro de estado
        if (statusFilter !== 'all') {
            filtered = filtered.filter(sub => sub.status === statusFilter);
        }

        // Filtro de método de pago
        if (methodFilter !== 'all') {
            filtered = filtered.filter(sub => sub.paymentMethod === methodFilter);
        }

        setFilteredSubscriptions(filtered);
    };

    // Cancelar suscripción
    const handleCancelSubscription = async (subscriptionId: string, companyName: string) => {
        if (!window.confirm(`¿Estás seguro de que quieres cancelar la suscripción de ${companyName}?`)) {
            return;
        }

        const reason = prompt('Por favor, indica el motivo de la cancelación:');
        if (!reason) {
            return;
        }

        try {
            setError('');
            setSuccess('');

            const response = await superadminApi.cancelSubscription(subscriptionId, reason);

            if (response.success) {
                setSuccess('Suscripción cancelada correctamente');
                loadSubscriptions(); // Recargar la lista
            } else {
                setError(response.message || 'Error al cancelar la suscripción');
            }
        } catch (error) {
            console.error('Error al cancelar suscripción:', error);
            setError('Error de conexión al cancelar la suscripción');
        }
    };

    // Reactivar suscripción
    const handleReactivateSubscription = async (subscriptionId: string, companyName: string) => {
        if (!window.confirm(`¿Estás seguro de que quieres reactivar la suscripción de ${companyName}?`)) {
            return;
        }

        try {
            setError('');
            setSuccess('');

            const response = await superadminApi.reactivateSubscription(subscriptionId);

            if (response.success) {
                setSuccess('Suscripción reactivada correctamente');
                loadSubscriptions(); // Recargar la lista
            } else {
                setError(response.message || 'Error al reactivar la suscripción');
            }
        } catch (error) {
            console.error('Error al reactivar suscripción:', error);
            setError('Error de conexión al reactivar la suscripción');
        }
    };

    // Eliminar suscripción
    const handleDeleteSubscription = async (subscriptionId: string, companyName: string) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar la suscripción de ${companyName}? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            setError('');
            setSuccess('');

            const response = await superadminApi.deleteSubscription(subscriptionId);

            if (response.success) {
                setSuccess('Suscripción eliminada correctamente');
                loadSubscriptions(); // Recargar la lista
            } else {
                setError(response.message || 'Error al eliminar la suscripción');
            }
        } catch (error) {
            console.error('Error al eliminar suscripción:', error);
            setError('Error de conexión al eliminar la suscripción');
        }
    };

    // Formatear fecha
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Obtener color del estado
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800';
            case 'EXPIRED':
                return 'bg-gray-100 text-gray-800';
            case 'TRIAL':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Obtener icono del estado
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <CheckCircle className="w-4 h-4" />;
            case 'CANCELLED':
                return <XCircle className="w-4 h-4" />;
            case 'EXPIRED':
                return <AlertCircle className="w-4 h-4" />;
            case 'TRIAL':
                return <Clock className="w-4 h-4" />;
            default:
                return <AlertCircle className="w-4 h-4" />;
        }
    };

    // Obtener texto del estado
    const getStatusText = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'Activa';
            case 'CANCELLED':
                return 'Cancelada';
            case 'EXPIRED':
                return 'Expirada';
            case 'TRIAL':
                return 'Prueba';
            default:
                return status;
        }
    };

    // Obtener texto del método de pago
    const getPaymentMethodText = (method: string) => {
        switch (method) {
            case 'STRIPE':
                return 'Stripe';
            case 'PAYPAL':
                return 'PayPal';
            case 'BANK_TRANSFER':
                return 'Transferencia';
            case 'MANUAL':
                return 'Manual';
            default:
                return method;
        }
    };

    // Efecto para cargar datos
    useEffect(() => {
        loadSubscriptions();
    }, []);

    // Efecto para aplicar filtros
    useEffect(() => {
        applyFilters();
    }, [subscriptions, searchTerm, statusFilter, methodFilter]);

    // Limpiar mensajes
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError('');
                setSuccess('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    // Definir columnas de la tabla
    const columns = [
        {
            key: 'companyId' as keyof Subscription,
            label: 'Empresa',
            render: (subscription: Subscription) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {subscription.company?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                        {subscription.company?.slug}
                    </div>
                </div>
            )
        },
        {
            key: 'planId' as keyof Subscription,
            label: 'Plan',
            render: (subscription: Subscription) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {subscription.plan?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                        €{subscription.plan?.priceMonthly}/mes
                    </div>
                </div>
            )
        },
        {
            key: 'status' as keyof Subscription,
            label: 'Estado',
            render: (subscription: Subscription) => (
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                    {getStatusIcon(subscription.status)}
                    <span className="ml-1">{getStatusText(subscription.status)}</span>
                </div>
            )
        },
        {
            key: 'startDate' as keyof Subscription,
            label: 'Fechas',
            render: (subscription: Subscription) => (
                <div>
                    <div className="text-sm">
                        <span className="font-medium">Inicio:</span> {formatDate(subscription.startDate)}
                    </div>
                    <div className="text-sm">
                        <span className="font-medium">Fin:</span> {formatDate(subscription.endDate)}
                    </div>
                    {subscription.trialEndsAt && (
                        <div className="text-sm text-blue-600">
                            <span className="font-medium">Trial:</span> {formatDate(subscription.trialEndsAt)}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'paymentMethod' as keyof Subscription,
            label: 'Método de pago',
            render: (subscription: Subscription) => (
                <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                    {getPaymentMethodText(subscription.paymentMethod)}
                </div>
            )
        },
        {
            key: 'renewsAutomatically' as keyof Subscription,
            label: 'Renovación',
            render: (subscription: Subscription) => (
                <div className="flex items-center">
                    <RefreshCw className={`w-4 h-4 mr-2 ${subscription.renewsAutomatically ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className={subscription.renewsAutomatically ? 'text-green-600' : 'text-gray-500'}>
                        {subscription.renewsAutomatically ? 'Automática' : 'Manual'}
                    </span>
                </div>
            )
        },
        {
            key: 'id' as keyof Subscription,
            label: 'Acciones',
            render: (subscription: Subscription) => (
                <div className="flex items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/suscripciones/${subscription.id}/edit`)}
                    >
                        <Edit className="w-4 h-4" />
                    </Button>

                    {subscription.status === 'ACTIVE' ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelSubscription(subscription.id, subscription.company?.name || '')}
                            className="text-orange-600 hover:text-orange-800"
                        >
                            <Ban className="w-4 h-4" />
                        </Button>
                    ) : (subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivateSubscription(subscription.id, subscription.company?.name || '')}
                            className="text-green-600 hover:text-green-800"
                        >
                            <CheckCircle className="w-4 h-4" />
                        </Button>
                    ) : null}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSubscription(subscription.id, subscription.company?.name || '')}
                        className="text-red-600 hover:text-red-800"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestión de Suscripciones</h1>
                        <p className="text-gray-600 mt-1">
                            Administra todas las suscripciones del sistema
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate('/admin/suscripciones/nueva')}
                        className="flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Suscripción
                    </Button>
                </div>
            </div>

            {/* Mensajes */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
                    {success}
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        {showFilters ? 'Ocultar' : 'Mostrar'} filtros
                    </Button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Búsqueda
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Buscar por empresa, slug o plan..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Estado
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">Todos los estados</option>
                                <option value="ACTIVE">Activa</option>
                                <option value="CANCELLED">Cancelada</option>
                                <option value="EXPIRED">Expirada</option>
                                <option value="TRIAL">Prueba</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Método de pago
                            </label>
                            <select
                                value={methodFilter}
                                onChange={(e) => setMethodFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">Todos los métodos</option>
                                <option value="STRIPE">Stripe</option>
                                <option value="PAYPAL">PayPal</option>
                                <option value="BANK_TRANSFER">Transferencia</option>
                                <option value="MANUAL">Manual</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                    setMethodFilter('all');
                                }}
                            >
                                Limpiar filtros
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabla de suscripciones */}
            <div className="bg-white rounded-lg shadow">
                {isLoading ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader size="lg" />
                    </div>
                ) : filteredSubscriptions.length === 0 ? (
                    <div className="text-center p-8">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No se encontraron suscripciones
                        </h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm || statusFilter !== 'all' || methodFilter !== 'all'
                                ? 'Intenta ajustar los filtros para ver más resultados.'
                                : 'Comienza creando una nueva suscripción.'}
                        </p>
                        <Button onClick={() => navigate('/admin/suscripciones/nueva')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Suscripción
                        </Button>
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        data={filteredSubscriptions}
                    />
                )}
            </div>

            {/* Resumen */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Activas</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {subscriptions.filter(s => s.status === 'ACTIVE').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Canceladas</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {subscriptions.filter(s => s.status === 'CANCELLED').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <AlertCircle className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Expiradas</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {subscriptions.filter(s => s.status === 'EXPIRED').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">En prueba</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {subscriptions.filter(s => s.status === 'TRIAL').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuscripcionesAdminPage;