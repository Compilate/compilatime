import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Building2,
    ArrowLeft,
    Edit,
    Users,
    Calendar,
    CreditCard,
    Mail,
    Phone,
    MapPin,
    CheckCircle,
    Ban,
    AlertCircle,
    UserPlus,
    X
} from 'lucide-react';
import { superadminApi } from '../../lib/superadminApi';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { Company } from '../../lib/superadminApi';
import { useSecureNavigation } from '../../hooks/useSecureNavigation';

const DetallesEmpresaPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getCompanyUrls } = useSecureNavigation();
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Estados para el formulario de creación de empleado super admin
    const [showCreateSuperadminModal, setShowCreateSuperadminModal] = useState(false);
    const [createSuperadminLoading, setCreateSuperadminLoading] = useState(false);
    const [createSuperadminError, setCreateSuperadminError] = useState('');
    const [createSuperadminSuccess, setCreateSuperadminSuccess] = useState('');
    const [formData, setFormData] = useState({
        dni: '',
        name: '',
        surname: '',
        email: '',
        phone: '',
        pin: '',
        department: '',
        position: '',
        salary: ''
    });

    useEffect(() => {
        if (id) {
            loadCompany();
        }
    }, [id]);

    const loadCompany = async () => {
        if (!id) {
            setError('ID de empresa no proporcionado');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError('');

            const response = await superadminApi.getCompany(id);

            if (response.success && response.data) {
                setCompany(response.data);
            } else {
                setError(response.message || 'Error al cargar los detalles de la empresa');
            }
        } catch (error) {
            console.error('Error cargando detalles de la empresa:', error);
            setError('Error de conexión al cargar los detalles de la empresa');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditCompany = () => {
        if (company) {
            navigate(`/admin/empresas/${company.id}/edit`);
        }
    };

    const handleSuspendCompany = async () => {
        if (!company || !confirm('¿Estás seguro de que deseas suspender esta empresa?')) {
            return;
        }

        try {
            const response = await superadminApi.suspendCompany(company.id, 'Suspensión administrativa');

            if (response.success) {
                loadCompany(); // Recargar los datos
            } else {
                setError(response.message || 'Error al suspender la empresa');
            }
        } catch (error) {
            console.error('Error suspendiendo empresa:', error);
            setError('Error de conexión al suspender la empresa');
        }
    };

    const handleReactivateCompany = async () => {
        if (!company || !confirm('¿Estás seguro de que deseas reactivar esta empresa?')) {
            return;
        }

        try {
            const response = await superadminApi.reactivateCompany(company.id);

            if (response.success) {
                loadCompany(); // Recargar los datos
            } else {
                setError(response.message || 'Error al reactivar la empresa');
            }
        } catch (error) {
            console.error('Error reactivando empresa:', error);
            setError('Error de conexión al reactivar la empresa');
        }
    };

    // Funciones para manejar el formulario de creación de empleado super admin
    const handleCreateSuperadminEmployee = () => {
        if (!company) return;

        setShowCreateSuperadminModal(true);
        setCreateSuperadminError('');
        setCreateSuperadminSuccess('');
        setFormData({
            dni: '',
            name: '',
            surname: '',
            email: '',
            phone: '',
            pin: '',
            department: 'Administración',
            position: 'Super Admin',
            salary: ''
        });
    };

    const handleCloseCreateSuperadminModal = () => {
        setShowCreateSuperadminModal(false);
        setCreateSuperadminError('');
        setCreateSuperadminSuccess('');
        setFormData({
            dni: '',
            name: '',
            surname: '',
            email: '',
            phone: '',
            pin: '',
            department: '',
            position: '',
            salary: ''
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmitCreateSuperadmin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!company) {
            setCreateSuperadminError('No se ha seleccionado ninguna empresa');
            return;
        }

        // Validaciones básicas
        if (!formData.dni.trim()) {
            setCreateSuperadminError('El DNI es requerido');
            return;
        }

        if (!formData.name.trim()) {
            setCreateSuperadminError('El nombre es requerido');
            return;
        }

        if (!formData.pin.trim()) {
            setCreateSuperadminError('El PIN es requerido');
            return;
        }

        if (formData.pin.length < 4) {
            setCreateSuperadminError('El PIN debe tener al menos 4 caracteres');
            return;
        }

        try {
            setCreateSuperadminLoading(true);
            setCreateSuperadminError('');

            const employeeData = {
                dni: formData.dni.toUpperCase(),
                name: formData.name.trim(),
                surname: formData.surname.trim() || undefined,
                email: formData.email.trim() || undefined,
                phone: formData.phone.trim() || undefined,
                pin: formData.pin.trim(),
                department: formData.department.trim() || undefined,
                position: formData.position.trim() || undefined,
                salary: formData.salary ? parseFloat(formData.salary) : undefined
            };

            const response = await superadminApi.createDefaultSuperadminEmployee(company.id, employeeData);

            if (response.success) {
                setCreateSuperadminSuccess('Empleado super admin creado correctamente');
                loadCompany(); // Recargar los datos de la empresa
                setTimeout(() => {
                    handleCloseCreateSuperadminModal();
                }, 2000);
            } else {
                setCreateSuperadminError(response.message || 'Error al crear el empleado super admin');
            }
        } catch (error: any) {
            console.error('Error al crear empleado super admin:', error);
            setCreateSuperadminError('Error de conexión al crear el empleado super admin');
        } finally {
            setCreateSuperadminLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getSubscriptionStatus = (company: Company) => {
        if (!company.currentSubscription) {
            return { text: 'Sin suscripción', color: 'text-gray-600', bgColor: 'bg-gray-100' };
        }

        const { status, endDate } = company.currentSubscription;
        const isExpired = new Date(endDate) < new Date();

        if (status === 'ACTIVE' && !isExpired) {
            return { text: 'Activa', color: 'text-green-600', bgColor: 'bg-green-100' };
        } else if (status === 'ACTIVE' && isExpired) {
            return { text: 'Expirada', color: 'text-red-600', bgColor: 'bg-red-100' };
        } else if (status === 'CANCELLED') {
            return { text: 'Cancelada', color: 'text-gray-600', bgColor: 'bg-gray-100' };
        } else {
            return { text: status, color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader size="lg" text="Cargando detalles de la empresa..." />
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

    if (!company) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                        <p className="text-sm text-red-800">Empresa no encontrada</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/admin/empresas')}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a empresas
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Detalles de la Empresa</h1>
                </div>
                <div className="flex items-center space-x-3">
                    <Button
                        onClick={handleEditCompany}
                        className="flex items-center"
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Empresa
                    </Button>
                    <button
                        onClick={handleCreateSuperadminEmployee}
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Crear Super Admin
                    </button>
                </div>
            </div>

            {/* Información principal */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Columna izquierda - Información básica */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>

                            <div className="space-y-4">
                                <div className="flex items-center">
                                    <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Nombre</p>
                                        <p className="text-lg font-semibold text-gray-900">{company.name}</p>
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-700 w-20">Código:</span>
                                    <p className="text-lg font-semibold text-gray-900">{company.slug}</p>
                                </div>

                                <div className="flex items-center">
                                    <Mail className="w-5 h-5 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Email</p>
                                        <p className="text-lg font-semibold text-gray-900">{company.email}</p>
                                    </div>
                                </div>

                                {company.phone && (
                                    <div className="flex items-center">
                                        <Phone className="w-5 h-5 text-gray-400 mr-3" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Teléfono</p>
                                            <p className="text-lg font-semibold text-gray-900">{company.phone}</p>
                                        </div>
                                    </div>
                                )}

                                {company.address && (
                                    <div className="flex items-start">
                                        <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Dirección</p>
                                            <p className="text-lg font-semibold text-gray-900">{company.address}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado y Suscripción</h2>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Estado</p>
                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${company.active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {company.active ? (
                                                <>
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Activa
                                                </>
                                            ) : (
                                                <>
                                                    <Ban className="w-3 h-3 mr-1" />
                                                    Suspendida
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={company.active ? handleSuspendCompany : handleReactivateCompany}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${company.active
                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                    >
                                        {company.active ? 'Suspender' : 'Reactivar'}
                                    </button>
                                </div>

                                {company.currentSubscription && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center">
                                                <CreditCard className="w-5 h-5 text-gray-400 mr-2" />
                                                <p className="text-sm font-medium text-gray-700">Suscripción</p>
                                            </div>
                                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionStatus(company).bgColor} ${getSubscriptionStatus(company).color}`}>
                                                {getSubscriptionStatus(company).text}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="font-medium text-gray-700">Plan:</p>
                                                <p className="text-gray-900">{company.currentSubscription.plan.name}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-700">Precio:</p>
                                                <p className="text-gray-900">€{company.currentSubscription.plan.priceMonthly}/mes</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-700">Empleados máx:</p>
                                                <p className="text-gray-900">{company.currentSubscription.plan.maxEmployees}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-700">Finaliza:</p>
                                                <p className="text-gray-900">{formatDate(company.currentSubscription.endDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Columna derecha - Estadísticas */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg text-center">
                                    <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-blue-900">
                                        {company._count?.employeeCompanies || 0}
                                    </p>
                                    <p className="text-sm text-blue-700">Empleados</p>
                                </div>

                                <div className="bg-green-50 p-4 rounded-lg text-center">
                                    <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-green-900">
                                        {company._count?.subscriptions || 0}
                                    </p>
                                    <p className="text-sm text-green-700">Suscripciones</p>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Información de Sistema</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">ID de empresa:</span>
                                        <span className="font-mono text-gray-900">{company.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Creada el:</span>
                                        <span className="text-gray-900">{formatDate(company.createdAt)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Última actualización:</span>
                                        <span className="text-gray-900">{formatDate(company.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enlaces rápidos a portales */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Enlaces Rápidos</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                            <Building2 className="w-6 h-6 text-blue-600 mr-2" />
                            <h3 className="font-medium text-blue-900">Portal Empresa (Backoffice)</h3>
                        </div>
                        <p className="text-sm text-blue-700 mb-3">Acceso al panel de administración (/portal/login)</p>
                        <button
                            onClick={() => {
                                const urls = getCompanyUrls(company.slug);
                                navigator.clipboard.writeText(urls.employeeLogin);
                                alert('URL del Portal Empresa copiada al portapapeles');
                            }}
                            className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            Copiar URL Portal
                        </button>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                            <Users className="w-6 h-6 text-green-600 mr-2" />
                            <h3 className="font-medium text-green-900">Portal Empleado (Fichaje)</h3>
                        </div>
                        <p className="text-sm text-green-700 mb-3">Acceso para empleados (/area/login)</p>
                        <button
                            onClick={() => {
                                const urls = getCompanyUrls(company.slug);
                                navigator.clipboard.writeText(urls.login);
                                alert('URL del Portal Empleado copiada al portapapeles');
                            }}
                            className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                            Copiar URL Portal
                        </button>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                            <Calendar className="w-6 h-6 text-purple-600 mr-2" />
                            <h3 className="font-medium text-purple-900">Fichaje Rápido</h3>
                        </div>
                        <p className="text-sm text-purple-700 mb-3">Acceso directo para fichaje (/area/fichar)</p>
                        <button
                            onClick={() => {
                                const urls = getCompanyUrls(company.slug);
                                navigator.clipboard.writeText(urls.punch);
                                alert('URL de Fichaje Rápido copiada al portapapeles');
                            }}
                            className="w-full px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                            Copiar URL Fichaje
                        </button>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">URLs Generadas:</h4>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Portal Empresa:</span>
                            <code className="bg-white px-2 py-1 rounded text-gray-800 max-w-xs truncate">
                                {getCompanyUrls(company.slug).employeeLogin}
                            </code>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Portal Empleado:</span>
                            <code className="bg-white px-2 py-1 rounded text-gray-800 max-w-xs truncate">
                                {getCompanyUrls(company.slug).login}
                            </code>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Fichaje Rápido:</span>
                            <code className="bg-white px-2 py-1 rounded text-gray-800 max-w-xs truncate">
                                {getCompanyUrls(company.slug).punch}
                            </code>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal para crear empleado super admin */}
            {showCreateSuperadminModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full z-50">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
                        <div className="bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                        Crear Empleado Super Admin
                                    </h3>
                                    <button
                                        onClick={handleCloseCreateSuperadminModal}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {createSuperadminSuccess && (
                                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <CheckCircle className="h-5 w-5 text-green-400" />
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-green-800">
                                                    {createSuperadminSuccess}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {createSuperadminError && (
                                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <AlertCircle className="h-5 w-5 text-red-400" />
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-red-800">
                                                    {createSuperadminError}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmitCreateSuperadmin} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                DNI *
                                            </label>
                                            <input
                                                type="text"
                                                name="dni"
                                                value={formData.dni}
                                                onChange={handleInputChange}
                                                placeholder="12345678A"
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nombre *
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="Juan"
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Apellidos
                                            </label>
                                            <input
                                                type="text"
                                                name="surname"
                                                value={formData.surname}
                                                onChange={handleInputChange}
                                                placeholder="Pérez"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="juan@ejemplo.com"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Teléfono
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="600123456"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                PIN *
                                            </label>
                                            <input
                                                type="password"
                                                name="pin"
                                                value={formData.pin}
                                                onChange={handleInputChange}
                                                placeholder="1234"
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Departamento
                                            </label>
                                            <input
                                                type="text"
                                                name="department"
                                                value={formData.department}
                                                onChange={handleInputChange}
                                                placeholder="Administración"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Posición
                                            </label>
                                            <input
                                                type="text"
                                                name="position"
                                                value={formData.position}
                                                onChange={handleInputChange}
                                                placeholder="Super Admin"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Salario
                                            </label>
                                            <input
                                                type="number"
                                                name="salary"
                                                value={formData.salary}
                                                onChange={handleInputChange}
                                                placeholder="30000"
                                                step="0.01"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse sm:justify-end sm:space-x-3">
                                        <button
                                            type="button"
                                            onClick={handleCloseCreateSuperadminModal}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={createSuperadminLoading}
                                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            {createSuperadminLoading ? 'Creando...' : 'Crear Empleado'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DetallesEmpresaPage;