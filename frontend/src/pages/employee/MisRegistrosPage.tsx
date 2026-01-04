import React, { useState, useEffect } from 'react';
import { timeEntryApi } from '../../lib/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TimeEntry {
    id: string;
    type: 'IN' | 'OUT' | 'BREAK' | 'RESUME';
    timestamp: string;
    source: string;
    location?: string;
    deviceInfo?: string;
    notes?: string;
    createdByEmployee: boolean;
    createdAt: string;
    updatedAt: string;
}


const MisRegistrosPage: React.FC = () => {
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });

    // Filtros
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: ''
    });

    // Cargar registros
    const loadTimeEntries = async () => {
        try {
            setLoading(true);
            setError(null);

            const params: any = {};
            if (filters.startDate) params.from = filters.startDate;
            if (filters.endDate) params.to = filters.endDate;
            if (filters.type) params.type = filters.type;
            params.page = pagination.page;
            params.limit = pagination.limit;

            const response = await timeEntryApi.getMyTimeEntries(params);

            if (response.success && response.data) {
                const data = response.data as any;
                console.log('📊 Datos recibidos del backend:', data);
                console.log('📊 TimeEntries:', data.timeEntries);
                setTimeEntries(data.timeEntries || []);
                setPagination(data.pagination || pagination);
            } else {
                setError(response.message || 'Error al cargar los registros');
            }
        } catch (err: any) {
            console.error('Error al cargar registros:', err);
            setError(err.message || 'Error al cargar los registros');
        } finally {
            setLoading(false);
        }
    };

    // Efecto para cargar datos cuando cambian los filtros o la paginación
    useEffect(() => {
        loadTimeEntries();
    }, [filters, pagination.page]);

    // Manejar cambios en los filtros
    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Aplicar filtros
    const applyFilters = () => {
        setPagination(prev => ({ ...prev, page: 1 })); // Resetear a primera página
    };

    // Limpiar filtros
    const clearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            type: ''
        });
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // Exportar a CSV
    const exportToCSV = async () => {
        try {
            const params: any = {};
            if (filters.startDate) params.from = filters.startDate;
            if (filters.endDate) params.to = filters.endDate;
            if (filters.type) params.type = filters.type;

            // Crear URL para exportación
            const token = localStorage.getItem('compilatime-auth');
            // Usar ruta relativa (funciona tanto en local con Vite proxy como en producción con Nginx)
            const apiUrl = import.meta.env.VITE_API_URL || '';

            const queryString = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value) queryString.append(key, String(value));
            });

            const response = await fetch(`${apiUrl}/api/time-entries/export?${queryString.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Error al exportar los datos');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mis-registros-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            console.error('Error al exportar:', err);
            setError(err.message || 'Error al exportar los datos');
        }
    };

    // Cambiar página
    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    // Formatear tipo de fichaje
    const formatType = (type: string) => {
        switch (type) {
            case 'IN': return 'Entrada';
            case 'OUT': return 'Salida';
            case 'BREAK': return 'Pausa';
            case 'RESUME': return 'Reanudar';
            default: return type;
        }
    };

    // Formatear fuente
    const formatSource = (source: string) => {
        switch (source) {
            case 'WEB': return 'Web';
            case 'MOBILE': return 'Móvil';
            case 'ADMIN': return 'Administrador';
            case 'API': return 'API';
            case 'KIOSK': return 'Kiosko';
            default: return source;
        }
    };

    // Calcular estadísticas
    const calculateStats = () => {
        const entries = timeEntries;
        const totalEntries = entries.length;
        const inEntries = entries.filter(e => e.type === 'IN').length;
        const outEntries = entries.filter(e => e.type === 'OUT').length;
        const breakEntries = entries.filter(e => e.type === 'BREAK').length;
        const resumeEntries = entries.filter(e => e.type === 'RESUME').length;

        return {
            total: totalEntries,
            in: inEntries,
            out: outEntries,
            break: breakEntries,
            resume: resumeEntries
        };
    };

    const stats = calculateStats();

    // Columnas de la tabla
    const columns = [
        {
            key: 'timestamp' as keyof TimeEntry,
            label: 'Fecha y Hora',
            render: (row: TimeEntry) => {
                try {
                    // El componente Table pasa: (row, row[column.key], index)
                    const timestamp = row.timestamp;

                    // Depuración detallada
                    console.log('🔍 Procesando row:', row);
                    console.log('🔍 Timestamp final:', timestamp);
                    console.log('🔍 Tipo de timestamp:', typeof timestamp);
                    console.log('🔍 Longitud de timestamp:', timestamp?.length);

                    // Validar que el timestamp exista y sea una cadena válida
                    if (!timestamp || typeof timestamp !== 'string' || timestamp.trim() === '') {
                        console.log('❌ Timestamp inválido para:', { row });
                        return 'Sin fecha';
                    }

                    const date = new Date(timestamp);
                    console.log('🔍 Date creado:', date);
                    console.log('🔍 Date.getTime():', date.getTime());
                    console.log('🔍 isNaN(date.getTime()):', isNaN(date.getTime()));

                    // Validar que la fecha sea válida
                    if (isNaN(date.getTime())) {
                        console.log('❌ Fecha inválida detectada para timestamp:', timestamp);
                        return 'Fecha inválida';
                    }

                    const formattedDate = format(date, 'dd/MM/yyyy HH:mm', { locale: es });
                    console.log('🔍 Fecha formateada:', formattedDate);
                    return formattedDate;
                } catch (error) {
                    console.error('❌ Error formateando fecha:', error, 'Row:', row);
                    return 'Error de fecha';
                }
            }
        },
        {
            key: 'type' as keyof TimeEntry,
            label: 'Tipo',
            render: (row: TimeEntry) => {
                if (!row) return '-';
                return (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${row.type === 'IN' ? 'bg-green-100 text-green-800' :
                        row.type === 'OUT' ? 'bg-red-100 text-red-800' :
                            row.type === 'BREAK' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                        }`}>
                        {formatType(row.type)}
                    </span>
                );
            }
        },
        {
            key: 'source' as keyof TimeEntry,
            label: 'Fuente',
            render: (row: TimeEntry) => row ? formatSource(row.source) : '-'
        },
        {
            key: 'location' as keyof TimeEntry,
            label: 'Ubicación',
            render: (row: TimeEntry) => row?.location || '-'
        },
        {
            key: 'notes' as keyof TimeEntry,
            label: 'Notas',
            render: (row: TimeEntry) => row?.notes || '-'
        },
        {
            key: 'createdByEmployee' as keyof TimeEntry,
            label: 'Registrado por',
            render: (row: TimeEntry) => row ? (row.createdByEmployee ? 'Empleado' : 'Administrador') : '-'
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Mis Registros</h1>
                <p className="text-gray-600">
                    Consulta tu historial completo de fichajes y descarga informes.
                </p>
            </div>

            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total de registros</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.in}</div>
                    <div className="text-sm text-gray-600">Entradas</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-red-600">{stats.out}</div>
                    <div className="text-sm text-gray-600">Salidas</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-yellow-600">{stats.break}</div>
                    <div className="text-sm text-gray-600">Pausas</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-blue-600">{stats.resume}</div>
                    <div className="text-sm text-gray-600">Reanudaciones</div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de inicio
                        </label>
                        <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('startDate', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de fin
                        </label>
                        <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('endDate', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de fichaje
                        </label>
                        <select
                            value={filters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todos</option>
                            <option value="IN">Entrada</option>
                            <option value="OUT">Salida</option>
                            <option value="BREAK">Pausa</option>
                            <option value="RESUME">Reanudar</option>
                        </select>
                    </div>
                    <div className="flex items-end space-x-2">
                        <Button onClick={applyFilters} variant="primary">
                            Aplicar filtros
                        </Button>
                        <Button onClick={clearFilters} variant="secondary">
                            Limpiar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                    Mostrando {timeEntries.length} de {pagination.total} registros
                </div>
                <Button onClick={exportToCSV} variant="secondary">
                    Exportar a CSV
                </Button>
            </div>

            {/* Tabla de registros */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="text-gray-500">Cargando registros...</div>
                    </div>
                ) : error ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="text-red-500">{error}</div>
                    </div>
                ) : timeEntries.length === 0 ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="text-gray-500">No se encontraron registros</div>
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        data={timeEntries}
                    />
                )}
            </div>

            {/* Paginación */}
            {pagination.pages > 1 && (
                <div className="flex justify-center items-center space-x-2">
                    <Button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        variant="secondary"
                        size="sm"
                    >
                        Anterior
                    </Button>
                    <span className="text-sm text-gray-600">
                        Página {pagination.page} de {pagination.pages}
                    </span>
                    <Button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        variant="secondary"
                        size="sm"
                    >
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    );
};

export default MisRegistrosPage;