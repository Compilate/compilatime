import React, { useState, useEffect } from 'react';
import { breakTypesApi, BreakType, BreakTypeStats } from '../../lib/api/breakTypes.api';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';

const TiposPausaPage: React.FC = () => {
    console.log('🔍 [TiposPausaPage] Componente renderizando...');

    const [loading, setLoading] = useState(true);
    const [breakTypes, setBreakTypes] = useState<BreakType[]>([]);
    const [stats, setStats] = useState<BreakTypeStats[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [selectedBreakType, setSelectedBreakType] = useState<BreakType | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#F59E0B',
        requiresReason: false,
        maxMinutes: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    console.log('🔍 [TiposPausaPage] Estado inicial:', {
        loading,
        breakTypesCount: breakTypes.length,
        statsCount: stats.length,
        showCreateModal,
        showEditModal,
        showStatsModal,
        selectedBreakType,
        formData,
        error,
        success
    });

    // Cargar tipos de pausa
    const loadBreakTypes = async () => {
        try {
            console.log('🔍 [TiposPausaPage] Cargando tipos de pausa...');
            setLoading(true);
            setError(null);
            const response = await breakTypesApi.getBreakTypes();
            console.log('🔍 [TiposPausaPage] Response:', response);
            if (response.success) {
                console.log('✅ [TiposPausaPage] Tipos de pausa cargados:', response.data.breakTypes);
                setBreakTypes(response.data.breakTypes);
            } else {
                console.error('❌ [TiposPausaPage] Error al cargar tipos de pausa:', response);
            }
        } catch (err: any) {
            console.error('❌ [TiposPausaPage] Error al cargar tipos de pausa:', err);
            setError(err.message || 'Error al cargar tipos de pausa');
        } finally {
            setLoading(false);
        }
    };

    // Cargar estadísticas
    const loadStats = async () => {
        try {
            const response = await breakTypesApi.getBreakTypeStats();
            if (response.success) {
                setStats(response.data.stats);
            }
        } catch (err: any) {
            console.error('Error al cargar estadísticas:', err);
        }
    };

    useEffect(() => {
        loadBreakTypes();
    }, []);

    // Crear tipo de pausa
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            setSuccess(null);

            const data = {
                name: formData.name,
                description: formData.description || undefined,
                color: formData.color,
                requiresReason: formData.requiresReason,
                maxMinutes: formData.maxMinutes ? parseInt(formData.maxMinutes) : undefined,
            };

            const response = await breakTypesApi.createBreakType(data);
            if (response.success) {
                setSuccess('Tipo de pausa creado correctamente');
                setShowCreateModal(false);
                setFormData({
                    name: '',
                    description: '',
                    color: '#F59E0B',
                    requiresReason: false,
                    maxMinutes: '',
                });
                loadBreakTypes();
            }
        } catch (err: any) {
            setError(err.message || 'Error al crear tipo de pausa');
        }
    };

    // Actualizar tipo de pausa
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBreakType) return;

        try {
            setError(null);
            setSuccess(null);

            const data = {
                name: formData.name,
                description: formData.description || undefined,
                color: formData.color,
                active: selectedBreakType.active,
                requiresReason: formData.requiresReason,
                maxMinutes: formData.maxMinutes ? parseInt(formData.maxMinutes) : undefined,
            };

            const response = await breakTypesApi.updateBreakType(selectedBreakType.id, data);
            if (response.success) {
                setSuccess('Tipo de pausa actualizado correctamente');
                setShowEditModal(false);
                setSelectedBreakType(null);
                setFormData({
                    name: '',
                    description: '',
                    color: '#F59E0B',
                    requiresReason: false,
                    maxMinutes: '',
                });
                loadBreakTypes();
            }
        } catch (err: any) {
            setError(err.message || 'Error al actualizar tipo de pausa');
        }
    };

    // Eliminar tipo de pausa
    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este tipo de pausa?')) {
            return;
        }

        try {
            setError(null);
            const response = await breakTypesApi.deleteBreakType(id);
            if (response.success) {
                setSuccess('Tipo de pausa eliminado correctamente');
                loadBreakTypes();
            }
        } catch (err: any) {
            setError(err.message || 'Error al eliminar tipo de pausa');
        }
    };

    // Abrir modal de edición
    const openEditModal = (breakType: BreakType) => {
        setSelectedBreakType(breakType);
        setFormData({
            name: breakType.name,
            description: breakType.description || '',
            color: breakType.color,
            requiresReason: breakType.requiresReason,
            maxMinutes: breakType.maxMinutes?.toString() || '',
        });
        setShowEditModal(true);
    };

    // Formatear minutos a horas y minutos
    const formatMinutes = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
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
            {/* Encabezado */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tipos de Pausa</h1>
                    <p className="text-gray-600 mt-1">
                        Gestiona los diferentes tipos de pausas disponibles para los empleados
                    </p>
                </div>
                <div className="flex space-x-3">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            loadStats();
                            setShowStatsModal(true);
                        }}
                    >
                        📊 Ver Estadísticas
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        ➕ Nuevo Tipo de Pausa
                    </Button>
                </div>
            </div>

            {/* Mensajes de error y éxito */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {success}
                </div>
            )}

            {/* Lista de tipos de pausa */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {breakTypes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No hay tipos de pausa configurados.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nombre
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Descripción
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Color
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Requiere Motivo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tiempo Máximo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {breakTypes.map((breakType) => (
                                    <tr key={breakType.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div
                                                    className="w-4 h-4 rounded mr-3"
                                                    style={{ backgroundColor: breakType.color }}
                                                />
                                                <span className="text-sm font-medium text-gray-900">
                                                    {breakType.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {breakType.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div
                                                    className="w-6 h-6 rounded border border-gray-300"
                                                    style={{ backgroundColor: breakType.color }}
                                                />
                                                <span className="ml-2 text-sm text-gray-500">
                                                    {breakType.color}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {breakType.requiresReason ? '✅ Sí' : '❌ No'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {breakType.maxMinutes ? formatMinutes(breakType.maxMinutes) : 'Sin límite'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${breakType.active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {breakType.active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => openEditModal(breakType)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(breakType.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de creación */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Nuevo Tipo de Pausa
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ej: Almuerzo, Descanso, etc."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    placeholder="Descripción opcional del tipo de pausa"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Color
                                </label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-12 h-12 rounded border border-gray-300 cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-500">{formData.color}</span>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="requiresReason"
                                    checked={formData.requiresReason}
                                    onChange={(e) => setFormData({ ...formData, requiresReason: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="requiresReason" className="ml-2 block text-sm text-gray-900">
                                    Requiere motivo
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tiempo máximo (minutos)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.maxMinutes}
                                    onChange={(e) => setFormData({ ...formData, maxMinutes: e.target.value })}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Dejar vacío para sin límite"
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="primary">
                                    Crear
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de edición */}
            {showEditModal && selectedBreakType && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Editar Tipo de Pausa
                            </h3>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedBreakType(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Color
                                </label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-12 h-12 rounded border border-gray-300 cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-500">{formData.color}</span>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="requiresReasonEdit"
                                    checked={formData.requiresReason}
                                    onChange={(e) => setFormData({ ...formData, requiresReason: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="requiresReasonEdit" className="ml-2 block text-sm text-gray-900">
                                    Requiere motivo
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tiempo máximo (minutos)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.maxMinutes}
                                    onChange={(e) => setFormData({ ...formData, maxMinutes: e.target.value })}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-center mb-4">
                                <input
                                    type="checkbox"
                                    id="activeEdit"
                                    checked={selectedBreakType.active}
                                    onChange={(e) => {
                                        if (selectedBreakType) {
                                            setSelectedBreakType({
                                                ...selectedBreakType,
                                                active: e.target.checked,
                                            });
                                        }
                                    }}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="activeEdit" className="ml-2 block text-sm text-gray-900">
                                    Activo
                                </label>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedBreakType(null);
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="primary">
                                    Guardar
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de estadísticas */}
            {showStatsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                📊 Estadísticas de Tipos de Pausa
                            </h3>
                            <button
                                onClick={() => setShowStatsModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        {stats.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No hay estadísticas disponibles.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tipo de Pausa
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tiempo Total
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Número de Pausas
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Empleados
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {stats.map((stat) => (
                                            <tr key={stat.breakType.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div
                                                            className="w-4 h-4 rounded mr-3"
                                                            style={{ backgroundColor: stat.breakType.color }}
                                                        />
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {stat.breakType.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                    {formatMinutes(stat.totalMinutes)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {stat.entryCount}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {stat.employeeCount}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TiposPausaPage;
