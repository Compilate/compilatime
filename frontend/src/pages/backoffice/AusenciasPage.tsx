import React, { useState, useEffect } from 'react';
import { absencesApi, Absence, AbsenceStatus, AbsenceType } from '../../lib/api/absences.api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Table from '../../components/common/Table';
import AbsenceForm from '../../components/backoffice/AbsenceForm';

const AusenciasPage: React.FC = () => {
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
    const [filters, setFilters] = useState({
        employeeId: '',
        type: '',
        status: '',
        startDate: '',
        endDate: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0
    });

    // Cargar ausencias
    const loadAbsences = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (filters.employeeId) params.append('employeeId', filters.employeeId);
            if (filters.type) params.append('type', filters.type);
            if (filters.status) params.append('status', filters.status);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            params.append('page', pagination.page.toString());
            params.append('limit', pagination.limit.toString());

            const response = await absencesApi.getAbsences({
                employeeId: filters.employeeId || undefined,
                type: filters.type as any,
                status: filters.status as any,
                startDate: filters.startDate || undefined,
                endDate: filters.endDate || undefined,
                offset: (pagination.page - 1) * pagination.limit,
                limit: pagination.limit
            });

            setAbsences(response.absences);
            setPagination(prev => ({
                ...prev,
                total: response.total
            }));
        } catch (error: any) {
            setError(error.message || 'Error al cargar las ausencias');
        } finally {
            setLoading(false);
        }
    };

    // Eliminar ausencia
    const handleDelete = async (id: string) => {
        if (!confirm('¿Está seguro de que desea eliminar esta ausencia?')) {
            return;
        }

        try {
            await absencesApi.deleteAbsence(id);
            setSuccess('Ausencia eliminada correctamente');
            loadAbsences();
        } catch (error: any) {
            setError(error.message || 'Error al eliminar la ausencia');
        }
    };

    // Aprobar ausencia
    const handleApprove = async (id: string) => {
        try {
            await absencesApi.approveAbsence(id);
            setSuccess('Ausencia aprobada correctamente');
            loadAbsences();
        } catch (error: any) {
            setError(error.message || 'Error al aprobar la ausencia');
        }
    };

    // Rechazar ausencia
    const handleReject = async (id: string) => {
        const reason = prompt('Motivo del rechazo:');
        if (!reason) return;

        try {
            await absencesApi.rejectAbsence(id, reason);
            setSuccess('Ausencia rechazada correctamente');
            loadAbsences();
        } catch (error: any) {
            setError(error.message || 'Error al rechazar la ausencia');
        }
    };

    // Editar ausencia
    const handleEdit = (absence: Absence) => {
        setEditingAbsence(absence);
        setShowForm(true);
    };

    // Nueva ausencia
    const handleNew = () => {
        setEditingAbsence(null);
        setShowForm(true);
    };

    // Cerrar formulario
    const handleCloseForm = () => {
        setShowForm(false);
        setEditingAbsence(null);
    };

    // Guardar ausencia
    const handleSave = () => {
        setShowForm(false);
        setEditingAbsence(null);
        loadAbsences();
    };

    // Manejar cambios en filtros
    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // Cambiar página
    const handlePageChange = (page: number) => {
        setPagination(prev => ({ ...prev, page }));
    };

    // Exportar a CSV
    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.employeeId) params.append('employeeId', filters.employeeId);
            if (filters.type) params.append('type', filters.type);
            if (filters.status) params.append('status', filters.status);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            await absencesApi.exportAbsences(params.toString());
        } catch (error: any) {
            setError(error.message || 'Error al exportar las ausencias');
        }
    };

    // Cargar datos al montar el componente
    useEffect(() => {
        loadAbsences();
    }, [pagination.page, filters]);

    // Limpiar mensajes
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(null);
                setError(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    const getStatusLabel = (status: AbsenceStatus): string => {
        const labels: Record<AbsenceStatus, string> = {
            [AbsenceStatus.PENDING]: 'Pendiente',
            [AbsenceStatus.APPROVED]: 'Aprobada',
            [AbsenceStatus.REJECTED]: 'Rechazada',
            [AbsenceStatus.CANCELLED]: 'Cancelada'
        };
        return labels[status] || status;
    };

    const getStatusClass = (status: AbsenceStatus): string => {
        const classes: Record<AbsenceStatus, string> = {
            [AbsenceStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
            [AbsenceStatus.APPROVED]: 'bg-green-100 text-green-800',
            [AbsenceStatus.REJECTED]: 'bg-red-100 text-red-800',
            [AbsenceStatus.CANCELLED]: 'bg-gray-100 text-gray-800'
        };
        return classes[status] || '';
    };

    const getTypeLabel = (type: AbsenceType): string => {
        const labels = {
            [AbsenceType.VACATION]: 'Vacaciones',
            [AbsenceType.SICK_LEAVE]: 'Baja por enfermedad',
            [AbsenceType.PERSONAL]: 'Asunto personal',
            [AbsenceType.MATERNITY]: 'Maternidad',
            [AbsenceType.PATERNITY]: 'Paternidad',
            [AbsenceType.BEREAVEMENT]: 'Duelo',
            [AbsenceType.UNPAID]: 'No remunerada',
            [AbsenceType.TRAINING]: 'Formación'
        };
        return labels[type] || type;
    };

    const columns = [
        {
            key: 'employee' as keyof Absence,
            label: 'Empleado',
            render: (value: any) => value?.name || '-'
        },
        {
            key: 'type' as keyof Absence,
            label: 'Tipo',
            render: (value: AbsenceType) => getTypeLabel(value)
        },
        {
            key: 'startDate' as keyof Absence,
            label: 'Fecha Inicio',
            render: (value: string) => new Date(value).toLocaleDateString()
        },
        {
            key: 'endDate' as keyof Absence,
            label: 'Fecha Fin',
            render: (value: string) => new Date(value).toLocaleDateString()
        },
        {
            key: 'days' as keyof Absence,
            label: 'Días'
        },
        {
            key: 'status' as keyof Absence,
            label: 'Estado',
            render: (value: AbsenceStatus) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(value)}`}>
                    {getStatusLabel(value)}
                </span>
            )
        },
        {
            key: 'id' as keyof Absence,
            label: 'Acciones',
            render: (value: string, row: Absence) => (
                <div className="flex space-x-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEdit(row)}
                    >
                        Editar
                    </Button>
                    {row.status === AbsenceStatus.PENDING && (
                        <>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleApprove(value)}
                            >
                                Aprobar
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleReject(value)}
                            >
                                Rechazar
                            </Button>
                        </>
                    )}
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(value)}
                    >
                        Eliminar
                    </Button>
                </div>
            )
        }
    ];

    if (loading && absences.length === 0) {
        return (
            <div className="flex justify-center py-8">
                <Loader size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">Gestión de Ausencias</h1>
                        <div className="flex space-x-3">
                            <Button
                                variant="primary"
                                onClick={handleNew}
                            >
                                Nueva Ausencia
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleExport}
                            >
                                Exportar CSV
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Filtros */}
                    <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Empleado
                                </label>
                                <Input
                                    type="text"
                                    value={filters.employeeId}
                                    onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                                    placeholder="Buscar por nombre o DNI"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo
                                </label>
                                <select
                                    value={filters.type}
                                    onChange={(e) => handleFilterChange('type', e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Todos</option>
                                    {Object.values(AbsenceType).map(type => (
                                        <option key={type} value={type}>
                                            {getTypeLabel(type)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Estado
                                </label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Todos</option>
                                    {Object.values(AbsenceStatus).map(status => (
                                        <option key={status} value={status}>
                                            {getStatusLabel(status)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha Inicio
                                </label>
                                <Input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha Fin
                                </label>
                                <Input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Éxito */}
                    {success && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    {/* Tabla de ausencias */}
                    <Table
                        columns={columns as any}
                        data={absences}
                        loading={loading}
                    />

                    {/* Paginación */}
                    {!loading && pagination.total > pagination.limit && (
                        <div className="mt-4 flex justify-center">
                            <div className="flex space-x-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                >
                                    Anterior
                                </Button>
                                <span className="px-3 py-1 text-sm text-gray-700">
                                    Página {pagination.page} de {Math.ceil(pagination.total / pagination.limit)}
                                </span>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de formulario */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">
                                {editingAbsence ? 'Editar Ausencia' : 'Nueva Ausencia'}
                            </h3>
                        </div>
                        <AbsenceForm
                            absence={editingAbsence}
                            onSave={handleSave}
                            onCancel={handleCloseForm}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AusenciasPage;