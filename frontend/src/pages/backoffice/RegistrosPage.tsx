import React, { useState, useEffect } from 'react';
import { timeEntryApi, employeeApi } from '../../lib/api';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import TimeEntryFilter from '../../components/backoffice/TimeEntryFilter';
import TimelineView from '../../components/backoffice/TimelineView';
import TimeEntryEditForm from '../../components/backoffice/TimeEntryEditForm';

interface TimeEntry {
    id: string;
    employee?: {
        id: string;
        name: string;
        dni: string;
    };
    type: 'IN' | 'OUT' | 'BREAK' | 'RESUME';
    timestamp: string;
    source: string;
    createdByEmployee: boolean;
    breakTypeId?: string;
    breakType?: {
        id: string;
        name: string;
        color: string;
        description?: string;
    };
    breakReason?: string;
}

interface Employee {
    id: string;
    name: string;
    dni: string;
}

const RegistrosPage: React.FC = () => {
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
    const [filters, setFilters] = useState({
        employeeId: '',
        from: '',
        to: '',
        type: '',
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 1,
    });
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

    useEffect(() => {
        loadData();
        loadEmployees();
    }, []);

    // Cargar datos cuando cambian los filtros o la paginación
    useEffect(() => {
        loadData();
    }, [filters, pagination.page]);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await timeEntryApi.getTimeEntries(filters);
            console.log('RegistrosPage - Respuesta de getTimeEntries:', response);
            if (response.success && response.data) {
                setTimeEntries(response.data.timeEntries || []);
                const paginationData = response.data.pagination;
                if (paginationData) {
                    setPagination(prev => ({
                        ...prev,
                        ...paginationData,
                    }));
                }
            }
        } catch (error: any) {
            setError(error.message || 'Error al cargar los registros');
        } finally {
            setLoading(false);
        }
    };

    const loadEmployees = async () => {
        try {
            const response = await employeeApi.getEmployees();
            if (response.success && response.data) {
                setEmployees(response.data.employees || []);
            }
        } catch (error: any) {
            console.error('Error cargando empleados:', error);
        }
    };

    const handleFiltersChange = (newFilters: any) => {
        setFilters(newFilters);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleDeleteTimeEntry = async (id: string) => {
        // Pedir motivo para la eliminación
        const reason = window.prompt('Por favor, indica el motivo para eliminar este registro:');
        if (reason === null) {
            // Usuario canceló el diálogo
            return;
        }

        if (reason.trim() === '') {
            setError('El motivo es obligatorio para eliminar un registro');
            return;
        }

        try {
            await timeEntryApi.deleteTimeEntry(id, reason.trim());
            await loadData();
        } catch (error: any) {
            setError(error.message || 'Error al eliminar el registro');
        }
    };

    const handleExport = async () => {
        try {
            await timeEntryApi.exportTimeEntries(filters);
        } catch (error: any) {
            setError(error.message || 'Error al exportar los registros');
        }
    };

    const handleEditTimeEntry = (entry: TimeEntry) => {
        setEditingEntry(entry);
    };

    const handleSaveTimeEntry = (updatedEntry: TimeEntry) => {
        // Actualizar el registro en la lista
        setTimeEntries(prevEntries =>
            prevEntries.map(entry =>
                entry.id === updatedEntry.id ? updatedEntry : entry
            )
        );
        setEditingEntry(null);
    };

    const handleCloseEditForm = () => {
        setEditingEntry(null);
    };

    const getTypeLabel = (type: string, breakType?: { name: string; color: string }) => {
        const types = {
            'IN': 'Entrada',
            'OUT': 'Salida',
            'BREAK': breakType ? breakType.name : 'Pausa',
            'RESUME': 'Reanudar',
        };
        return types[type as keyof typeof types] || type;
    };

    const getTypeBadgeClass = (type: string) => {
        const classes = {
            'IN': 'bg-green-100 text-green-800',
            'OUT': 'bg-red-100 text-red-800',
            'BREAK': 'bg-yellow-100 text-yellow-800',
            'RESUME': 'bg-blue-100 text-blue-800',
        };
        return classes[type as keyof typeof classes] || 'bg-gray-100 text-gray-800';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Registros de Fichaje</h1>
                <p className="text-gray-600">
                    Consulta y gestiona todos los registros de fichaje de los empleados.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <TimeEntryFilter
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    employees={employees}
                />

                <div className="flex justify-between items-center mb-4">
                    <div className="flex space-x-2">
                        <Button
                            onClick={() => setViewMode('list')}
                            variant={viewMode === 'list' ? 'primary' : 'secondary'}
                        >
                            Vista de Lista
                        </Button>
                        <Button
                            onClick={() => setViewMode('timeline')}
                            variant={viewMode === 'timeline' ? 'primary' : 'secondary'}
                        >
                            Vista de Línea de Tiempo
                        </Button>
                    </div>
                    <Button onClick={handleExport}>
                        Exportar a CSV
                    </Button>
                </div>

                {/* Vista de Línea de Tiempo */}
                {viewMode === 'timeline' && (
                    <div className="mt-6">
                        <TimelineView
                            date={filters.from || new Date().toISOString().split('T')[0]}
                            employeeId={filters.employeeId || undefined}
                            employees={employees}
                        />
                    </div>
                )}

                {/* Vista de Lista */}
                {viewMode === 'list' && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Empleado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha y Hora
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Origen
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {timeEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                            No se encontraron registros con los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    timeEntries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {entry.employee ? entry.employee.name : 'Empleado no encontrado'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {entry.employee ? `(${entry.employee.dni})` : ''}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeClass(entry.type)}`}>
                                                    {getTypeLabel(entry.type, entry.breakType)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {formatDate(entry.timestamp)}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {formatTime(entry.timestamp)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                                    {entry.source}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    <Button
                                                        onClick={() => handleEditTimeEntry(entry)}
                                                        variant="secondary"
                                                        size="sm"
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleDeleteTimeEntry(entry.id)}
                                                        variant="danger"
                                                        size="sm"
                                                    >
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewMode === 'list' && pagination.pages > 1 && (
                    <div className="flex justify-center items-center space-x-4 mt-6">
                        <Button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            variant="secondary"
                        >
                            Anterior
                        </Button>
                        <span className="text-sm text-gray-700">
                            Página {pagination.page} de {pagination.pages}
                        </span>
                        <Button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.pages}
                            variant="secondary"
                        >
                            Siguiente
                        </Button>
                    </div>
                )}

                {viewMode === 'list' && (
                    <div className="mt-4 text-sm text-gray-500">
                        Mostrando {timeEntries.length} de {pagination.total} registros
                    </div>
                )}
            </div>

            {/* Modal de edición */}
            {editingEntry && (
                <TimeEntryEditForm
                    timeEntry={editingEntry}
                    onClose={handleCloseEditForm}
                    onSave={handleSaveTimeEntry}
                />
            )}
        </div>
    );
};

export default RegistrosPage;