import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import {
    CreditCard,
    Plus,
    Edit,
    Eye,
    Trash2,
    CheckCircle,
    XCircle,
    Filter,
    Users,
    Clock,
    AlertCircle,
    CheckSquare,
} from 'lucide-react';
import { superadminApi, Plan } from '../../lib/superadminApi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';
import PlanForm from '../../components/admin/PlanForm';

interface PlanWithCount extends Plan {
    _count: {
        subscriptions: number;
    };
}

const PlanesAdminPage: React.FC = () => {
    const [plans, setPlans] = useState<PlanWithCount[]>([]);
    const [filteredPlans, setFilteredPlans] = useState<PlanWithCount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanWithCount | null>(null);

    // const navigate = useNavigate();

    useEffect(() => {
        loadPlans();
    }, []);

    useEffect(() => {
        filterPlans();
    }, [plans, searchTerm, filterStatus]);

    const loadPlans = async () => {
        try {
            setIsLoading(true);
            setError('');

            console.log('Cargando planes...');
            const response = await superadminApi.getPlans();
            console.log('Respuesta de planes:', response);

            if (response.success && response.data) {
                console.log('Planes cargados:', response.data);
                setPlans(response.data.map((plan: any) => ({
                    ...plan,
                    _count: plan._count || { subscriptions: 0 }
                })));
            } else {
                console.error('Error en respuesta:', response);
                setError(response.message || 'Error al cargar los planes');
            }
        } catch (error) {
            console.error('Error cargando planes:', error);
            setError('Error de conexión al cargar los planes');
        } finally {
            setIsLoading(false);
        }
    };

    const filterPlans = () => {
        let filtered = [...plans];

        // Filtrar por término de búsqueda
        if (searchTerm) {
            filtered = filtered.filter(plan =>
                plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (plan.description && plan.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Filtrar por estado
        if (filterStatus !== 'all') {
            filtered = filtered.filter(plan =>
                filterStatus === 'active' ? plan.active : !plan.active
            );
        }

        setFilteredPlans(filtered);
    };

    const handleViewPlan = (plan: PlanWithCount) => {
        setSelectedPlan(plan);
        setShowViewModal(true);
    };

    const handleEditPlan = (plan: PlanWithCount) => {
        setSelectedPlan(plan);
        setShowEditModal(true);
    };

    const handleCreatePlan = () => {
        setSelectedPlan(null);
        setShowCreateModal(true);
    };

    const handleDeletePlan = async (planId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este plan? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const response = await superadminApi.deletePlan(planId);

            if (response.success) {
                loadPlans(); // Recargar la lista
            } else {
                setError(response.message || 'Error al eliminar el plan');
            }
        } catch (error) {
            console.error('Error eliminando plan:', error);
            setError('Error de conexión al eliminar el plan');
        }
    };

    const handleTogglePlanStatus = async (planId: string, activate: boolean) => {
        try {
            const response = await superadminApi.updatePlan(planId, { active: activate });

            if (response.success) {
                loadPlans(); // Recargar la lista
            } else {
                setError(response.message || `Error al ${activate ? 'activar' : 'desactivar'} el plan`);
            }
        } catch (error) {
            console.error(`Error ${activate ? 'activando' : 'desactivando'} plan:`, error);
            setError(`Error de conexión al ${activate ? 'activar' : 'desactivar'} el plan`);
        }
    };

    const handlePlanFormSuccess = () => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setSelectedPlan(null);
        loadPlans(); // Recargar la lista
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getFeaturesList = (features: any) => {
        if (!features || typeof features !== 'object') {
            return [];
        }

        return Object.entries(features)
            .filter(([_, value]) => value === true)
            .map(([key, _]) => {
                const featureNames: Record<string, string> = {
                    basicTimeTracking: 'Control de tiempo básico',
                    basicReports: 'Reportes básicos',
                    employeeManagement: 'Gestión de empleados',
                    scheduleManagement: 'Gestión de horarios',
                    absenceManagement: 'Gestión de ausencias',
                    emailSupport: 'Soporte por email',
                    apiAccess: 'Acceso a API',
                    advancedReports: 'Reportes avanzados',
                    customBranding: 'Branding personalizado',
                    prioritySupport: 'Soporte prioritario',
                    dedicatedAccountManager: 'Gestor de cuenta dedicado',
                    slaGuarantee: 'Garantía SLA',
                    whiteLabel: 'White Label',
                    customIntegrations: 'Integraciones personalizadas',
                    onPremiseOption: 'Opción on-premise'
                };

                return featureNames[key] || key;
            });
    };

    const columns = [
        {
            key: 'name',
            label: 'Plan',
            render: (plan: PlanWithCount) => (
                <div className="flex items-center">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                        <CreditCard className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{plan.name}</div>
                        {plan.description && (
                            <div className="text-sm text-gray-500">{plan.description}</div>
                        )}
                    </div>
                </div>
            )
        },
        {
            key: 'pricing',
            label: 'Precios',
            render: (plan: PlanWithCount) => (
                <div>
                    <div className="text-sm font-medium text-gray-900">
                        Mensual: {formatCurrency(plan.priceMonthly)}
                    </div>
                    <div className="text-sm text-gray-500">
                        Anual: {formatCurrency(plan.priceYearly)}
                    </div>
                </div>
            )
        },
        {
            key: 'limits',
            label: 'Límites',
            render: (plan: PlanWithCount) => (
                <div>
                    <div className="flex items-center text-sm text-gray-900">
                        <Users className="w-4 h-4 mr-2" />
                        {plan.maxEmployees} empleados
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-2" />
                        {plan.maxTimeEntriesPerMonth} fichajes/mes
                    </div>
                </div>
            )
        },
        {
            key: 'subscriptions',
            label: 'Suscripciones',
            render: (plan: PlanWithCount) => (
                <div className="text-center">
                    <div className="text-lg font-medium text-gray-900">
                        {plan._count?.subscriptions ?? 0}
                    </div>
                    <div className="text-sm text-gray-500">activas</div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Estado',
            render: (plan: PlanWithCount) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {plan.active ? (
                        <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activo
                        </>
                    ) : (
                        <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactivo
                        </>
                    )}
                </span>
            )
        },
        {
            key: 'createdAt',
            label: 'Creación',
            render: (plan: PlanWithCount) => (
                <div className="text-sm text-gray-900">
                    {formatDate(plan.createdAt)}
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (plan: PlanWithCount) => (
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handleViewPlan(plan)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        title="Ver detalles"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleEditPlan(plan)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Editar plan"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleTogglePlanStatus(plan.id, !plan.active)}
                        className={`${plan.active
                            ? 'text-yellow-600 hover:text-yellow-900'
                            : 'text-green-600 hover:text-green-900'
                            } transition-colors`}
                        title={plan.active ? 'Desactivar plan' : 'Activar plan'}
                    >
                        {plan.active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Eliminar plan"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader size="lg" text="Cargando planes..." />
            </div>
        );
    }

    if (error && !showCreateModal && !showEditModal) {
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Planes</h1>
                    <p className="text-gray-600 mt-1">
                        Administra los planes de suscripción del sistema CompilaTime
                    </p>
                </div>
                <Button
                    onClick={handleCreatePlan}
                    className="flex items-center"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Plan
                </Button>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Búsqueda
                            </label>
                            <Input
                                type="text"
                                placeholder="Buscar por nombre o descripción..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Estado
                            </label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">Todos</option>
                                <option value="active">Activos</option>
                                <option value="inactive">Inactivos</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterStatus('all');
                                }}
                            >
                                Limpiar filtros
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabla de planes */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table
                    columns={columns as any}
                    data={filteredPlans}
                    emptyMessage="No se encontraron planes"
                />
            </div>

            {/* Resumen */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                            {plans.length}
                        </div>
                        <div className="text-sm text-gray-600">Total planes</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {plans.filter(p => p.active).length}
                        </div>
                        <div className="text-sm text-gray-600">Planes activos</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                            {plans.filter(p => !p.active).length}
                        </div>
                        <div className="text-sm text-gray-600">Planes inactivos</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                            {plans.reduce((sum, p) => sum + (p._count?.subscriptions ?? 0), 0)}
                        </div>
                        <div className="text-sm text-gray-600">Total suscripciones</div>
                    </div>
                </div>
            </div>

            {/* Modal de creación/edición */}
            <PlanForm
                plan={selectedPlan || undefined}
                isOpen={showCreateModal || showEditModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedPlan(null);
                }}
                onSuccess={handlePlanFormSuccess}
            />

            {/* Modal de visualización */}
            {showViewModal && selectedPlan && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full z-50">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Detalles del Plan: {selectedPlan.name}
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowViewModal(false);
                                            setSelectedPlan(null);
                                        }}
                                        className="text-gray-400 hover:text-gray-500"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Información General</h4>
                                            <dl className="space-y-2">
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Nombre:</dt>
                                                    <dd className="text-sm font-medium text-gray-900">{selectedPlan.name}</dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Descripción:</dt>
                                                    <dd className="text-sm text-gray-900">{selectedPlan.description || 'Sin descripción'}</dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Estado:</dt>
                                                    <dd className="text-sm">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedPlan.active
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {selectedPlan.active ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Creado:</dt>
                                                    <dd className="text-sm text-gray-900">{formatDate(selectedPlan.createdAt)}</dd>
                                                </div>
                                            </dl>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Precios</h4>
                                            <dl className="space-y-2">
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Mensual:</dt>
                                                    <dd className="text-sm font-medium text-gray-900">{formatCurrency(selectedPlan.priceMonthly)}</dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Anual:</dt>
                                                    <dd className="text-sm font-medium text-gray-900">{formatCurrency(selectedPlan.priceYearly)}</dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Ahorro anual:</dt>
                                                    <dd className="text-sm font-medium text-green-600">
                                                        {formatCurrency(selectedPlan.priceMonthly * 12 - selectedPlan.priceYearly)}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Límites</h4>
                                            <dl className="space-y-2">
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Empleados máx:</dt>
                                                    <dd className="text-sm font-medium text-gray-900">{selectedPlan.maxEmployees}</dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Fichajes/mes máx:</dt>
                                                    <dd className="text-sm font-medium text-gray-900">{selectedPlan.maxTimeEntriesPerMonth}</dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-sm text-gray-500">Suscripciones activas:</dt>
                                                    <dd className="text-sm font-medium text-gray-900">{selectedPlan._count?.subscriptions ?? 0}</dd>
                                                </div>
                                            </dl>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Características</h4>
                                            <div className="space-y-2">
                                                {getFeaturesList(selectedPlan.features).map((feature, index) => (
                                                    <div key={index} className="flex items-center text-sm text-gray-900">
                                                        <CheckSquare className="w-4 h-4 mr-2 text-green-600" />
                                                        {feature}
                                                    </div>
                                                ))}
                                                {getFeaturesList(selectedPlan.features).length === 0 && (
                                                    <div className="text-sm text-gray-500">No hay características configuradas</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end mt-6">
                                    <Button
                                        onClick={() => {
                                            setShowViewModal(false);
                                            setSelectedPlan(null);
                                        }}
                                    >
                                        Cerrar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanesAdminPage;