import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Plus,
    Edit,
    Eye,
    Ban,
    CheckCircle,
    Filter,
    Users,
    AlertCircle,
    UserPlus,
    X
} from 'lucide-react';
import { superadminApi } from '../../lib/superadminApi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';
import { useSecureNavigation } from '../../hooks/useSecureNavigation';

import { Company } from '../../lib/superadminApi';

const EmpresasAdminPage: React.FC = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Estados para el formulario de creación de empleado super admin
    const [showCreateSuperadminModal, setShowCreateSuperadminModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
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

    const navigate = useNavigate();
    const { getCompanyUrls } = useSecureNavigation();

    useEffect(() => {
        loadCompanies();
    }, []);

    useEffect(() => {
        filterCompanies();
    }, [companies, searchTerm, filterStatus]);

    const loadCompanies = async () => {
        try {
            setIsLoading(true);
            setError('');

            console.log('Cargando empresas...');
            const response = await superadminApi.getCompanies();
            console.log('Respuesta de la API:', response);

            if (response.success && response.data) {
                console.log('Datos de empresas recibidos:', response.data);
                setCompanies(response.data);
            } else {
                console.error('Error en la respuesta:', response.message);
                setError(response.message || 'Error al cargar las empresas');
            }
        } catch (error) {
            console.error('Error cargando empresas:', error);
            setError('Error de conexión al cargar las empresas');
        } finally {
            setIsLoading(false);
        }
    };

    const filterCompanies = () => {
        let filtered = [...companies];

        // Filtrar por término de búsqueda
        if (searchTerm) {
            filtered = filtered.filter(company =>
                company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtrar por estado
        if (filterStatus !== 'all') {
            filtered = filtered.filter(company =>
                filterStatus === 'active' ? company && company.active === true : company && company.active === false
            );
        }

        setFilteredCompanies(filtered);
    };

    const handleViewCompany = (companyId: string) => {
        navigate(`/admin/empresas/${companyId}`);
    };

    const handleEditCompany = (companyId: string) => {
        navigate(`/admin/empresas/${companyId}/edit`);
    };

    const handleSuspendCompany = async (companyId: string) => {
        if (!confirm('¿Estás seguro de que deseas suspender esta empresa?')) {
            return;
        }

        try {
            const response = await superadminApi.suspendCompany(companyId, 'Suspensión administrativa');

            if (response.success) {
                loadCompanies(); // Recargar la lista
            } else {
                setError(response.message || 'Error al suspender la empresa');
            }
        } catch (error) {
            console.error('Error suspendiendo empresa:', error);
            setError('Error de conexión al suspender la empresa');
        }
    };

    const handleReactivateCompany = async (companyId: string) => {
        if (!confirm('¿Estás seguro de que deseas reactivar esta empresa?')) {
            return;
        }

        try {
            const response = await superadminApi.reactivateCompany(companyId);

            if (response.success) {
                loadCompanies(); // Recargar la lista
            } else {
                setError(response.message || 'Error al reactivar la empresa');
            }
        } catch (error) {
            console.error('Error reactivando empresa:', error);
            setError('Error de conexión al reactivar la empresa');
        }
    };

    // Funciones para manejar el formulario de creación de empleado super admin
    const handleCreateSuperadminEmployee = (company: Company) => {
        setSelectedCompany(company);
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
        setSelectedCompany(null);
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

        if (!selectedCompany) {
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

            const response = await superadminApi.createDefaultSuperadminEmployee(selectedCompany.id, employeeData);

            if (response.success) {
                setCreateSuperadminSuccess('Empleado super admin creado correctamente');
                loadCompanies(); // Recargar la lista de empresas
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

    const columns = [
        {
            key: 'name',
            label: 'Empresa',
            render: (company: Company) => {
                if (!company) {
                    return (
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                                <Building2 className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">Sin datos</div>
                                <div className="text-sm text-gray-500">Sin datos</div>
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <div className="font-medium text-gray-900">{company.name}</div>
                            <div className="text-sm text-gray-500">{company.slug}</div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'email',
            label: 'Contacto',
            render: (company: Company) => {
                if (!company) {
                    return (
                        <div>
                            <div className="text-sm text-gray-900">Sin datos</div>
                            <div className="text-xs text-gray-500">Sin datos</div>
                        </div>
                    );
                }
                return (
                    <div>
                        <div className="text-sm text-gray-900">{company.email}</div>
                        {company.phone && (
                            <div className="text-xs text-gray-500">{company.phone}</div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'employees',
            label: 'Empleados',
            render: (company: Company) => {
                if (!company) {
                    return (
                        <div className="flex items-center">
                            <Users className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">0</span>
                        </div>
                    );
                }
                const employeeCount = company._count?.employeeCompanies || 0;
                return (
                    <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{employeeCount}</span>
                    </div>
                );
            }
        },
        {
            key: 'subscription',
            label: 'Suscripción',
            render: (company: Company) => {
                console.log('Renderizando suscripción para empresa:', company);
                if (!company) {
                    return (
                        <div className="flex flex-col">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Sin datos
                            </span>
                        </div>
                    );
                }
                const subscriptionStatus = getSubscriptionStatus(company);
                console.log('Estado de suscripción:', subscriptionStatus);
                return (
                    <div className="flex flex-col">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${subscriptionStatus.bgColor} ${subscriptionStatus.color}`}>
                            {subscriptionStatus.text}
                        </span>
                        {company.currentSubscription && (
                            <span className="text-xs text-gray-500 mt-1">
                                {company.currentSubscription.plan.name}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'status',
            label: 'Estado',
            render: (company: Company) => {
                if (!company || company.active === undefined) {
                    return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Sin datos
                        </span>
                    );
                }
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${company.active
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
                    </span>
                );
            }
        },
        {
            key: 'createdAt',
            label: 'Creación',
            render: (company: Company) => {
                console.log('Renderizando fecha para empresa:', company);
                console.log('Fecha createdAt:', company.createdAt);
                return (
                    <div className="text-sm text-gray-900">
                        {formatDate(company.createdAt)}
                    </div>
                );
            }
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (company: Company) => {
                if (!company || !company.id) {
                    return (
                        <div className="flex items-center space-x-2 text-gray-400">
                            <span className="text-sm">Sin acciones</span>
                        </div>
                    );
                }

                return (
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handleViewCompany(company.id)}
                            className="text-indigo-600 hover:text-indigo-900 transition-colors"
                            title="Ver detalles"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                const urls = getCompanyUrls(company.slug);
                                const loginUrl = urls.employeeLogin;
                                // Copiar al portapapeles
                                navigator.clipboard.writeText(loginUrl);
                                alert(`URL de login encriptada copiada:\n${loginUrl}\n\nPuedes usar este enlace para que los empleados accedan directamente a esta empresa.`);
                            }}
                            className="text-green-600 hover:text-green-900 transition-colors ml-2"
                            title="Copiar URL de login"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 00-2-2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2zm0 0h8a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 002 2v-2a2 2 0 00-2-2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => handleEditCompany(company.id)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Editar empresa"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleCreateSuperadminEmployee(company)}
                            className="text-purple-600 hover:text-purple-900 transition-colors ml-2"
                            title="Crear empleado super admin"
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>
                        {company.active !== undefined ? (
                            company.active ? (
                                <button
                                    onClick={() => handleSuspendCompany(company.id)}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                    title="Suspender empresa"
                                >
                                    <Ban className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleReactivateCompany(company.id)}
                                    className="text-green-600 hover:text-green-900 transition-colors"
                                    title="Reactivar empresa"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                </button>
                            )
                        ) : null}
                    </div>
                );
            }
        }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader size="lg" text="Cargando empresas..." />
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Empresas</h1>
                    <p className="text-gray-600 mt-1">
                        Administra todas las empresas del sistema CompilaTime
                    </p>
                </div>
                <Button
                    onClick={() => navigate('/admin/empresas/create')}
                    className="flex items-center"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Empresa
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
                                placeholder="Buscar por nombre, código o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            // icon={<Search className="w-4 h-4" />}
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
                                <option value="all">Todas</option>
                                <option value="active">Activas</option>
                                <option value="suspended">Suspendidas</option>
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

            {/* Tabla de empresas */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table
                    columns={columns as any}
                    data={filteredCompanies}
                    emptyMessage="No se encontraron empresas"
                />
            </div>

            {/* Resumen */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                            {companies.length}
                        </div>
                        <div className="text-sm text-gray-600">Total empresas</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {companies.filter(c => c && c.active === true).length}
                        </div>
                        <div className="text-sm text-gray-600">Empresas activas</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                            {companies.filter(c => c && c.active === false).length}
                        </div>
                        <div className="text-sm text-gray-600">Empresas suspendidas</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                            {companies.reduce((sum, c) => {
                                if (!c || !c._count) return sum;
                                const employeeCount = c._count.employeeCompanies || 0;
                                return sum + employeeCount;
                            }, 0)}
                        </div>
                        <div className="text-sm text-gray-600">Total empleados</div>
                    </div>
                </div>
            </div>

            {/* Modal para crear empleado super admin */}
            {showCreateSuperadminModal && selectedCompany && (
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
                                            <Input
                                                type="text"
                                                name="dni"
                                                value={formData.dni}
                                                onChange={handleInputChange}
                                                placeholder="12345678A"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nombre *
                                            </label>
                                            <Input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="Juan"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Apellidos
                                            </label>
                                            <Input
                                                type="text"
                                                name="surname"
                                                value={formData.surname}
                                                onChange={handleInputChange}
                                                placeholder="Pérez"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email
                                            </label>
                                            <Input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="juan@ejemplo.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Teléfono
                                            </label>
                                            <Input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="600123456"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                PIN *
                                            </label>
                                            <Input
                                                type="password"
                                                name="pin"
                                                value={formData.pin}
                                                onChange={handleInputChange}
                                                placeholder="1234"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Departamento
                                            </label>
                                            <Input
                                                type="text"
                                                name="department"
                                                value={formData.department}
                                                onChange={handleInputChange}
                                                placeholder="Administración"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Posición
                                            </label>
                                            <Input
                                                type="text"
                                                name="position"
                                                value={formData.position}
                                                onChange={handleInputChange}
                                                placeholder="Super Admin"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Salario
                                            </label>
                                            <Input
                                                type="number"
                                                name="salary"
                                                value={formData.salary}
                                                onChange={handleInputChange}
                                                placeholder="30000"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse sm:justify-end sm:space-x-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCloseCreateSuperadminModal}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={createSuperadminLoading}
                                            className="ml-3"
                                        >
                                            {createSuperadminLoading ? 'Creando...' : 'Crear Empleado'}
                                        </Button>
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

export default EmpresasAdminPage;