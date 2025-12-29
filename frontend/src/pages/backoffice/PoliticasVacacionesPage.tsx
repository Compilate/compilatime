import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { absencesApi } from '../../lib/api/absences.api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import type { VacationPolicy } from '../../lib/api/absences.api';

const PoliticasVacacionesPage: React.FC = () => {
    useAuth(); // Solo para verificar que el componente esté dentro del contexto
    const [politicas, setPoliticas] = useState<VacationPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Estados para el formulario
    const [showForm, setShowForm] = useState(false);
    const [editingPolitica, setEditingPolitica] = useState<VacationPolicy | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        daysPerYear: 22,
        maxCarryOverDays: 5,
        probationPeriodDays: 0,
        minNoticeDays: 3,
        allowHalfDays: true,
        restrictByDepartment: false,
        requiresApproval: true,
        isActive: true
    });

    useEffect(() => {
        loadPoliticas();
    }, []);

    const loadPoliticas = async () => {
        try {
            setLoading(true);
            const response = await absencesApi.getVacationPolicies();
            if (response) {
                setPoliticas(response);
            } else {
                setError('Error al cargar las políticas de vacaciones');
            }
        } catch (error) {
            console.error('Error al cargar políticas:', error);
            setError('Error al cargar las políticas de vacaciones');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingPolitica(null);
        setFormData({
            name: '',
            description: '',
            daysPerYear: 22,
            maxCarryOverDays: 5,
            probationPeriodDays: 0,
            minNoticeDays: 3,
            allowHalfDays: true,
            restrictByDepartment: false,
            requiresApproval: true,
            isActive: true
        });
        setShowForm(true);
    };

    const handleEdit = (politica: VacationPolicy) => {
        setEditingPolitica(politica);
        setFormData({
            name: politica.name,
            description: politica.description || '',
            daysPerYear: politica.yearlyDays,
            maxCarryOverDays: politica.maxCarryOverDays,
            probationPeriodDays: politica.probationDays,
            minNoticeDays: politica.minNoticeDays,
            allowHalfDays: politica.allowHalfDays,
            restrictByDepartment: politica.restrictByDepartment,
            requiresApproval: politica.requiresApproval,
            isActive: politica.active
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('El nombre de la política es obligatorio');
            return;
        }

        try {
            if (editingPolitica) {
                await absencesApi.updateVacationPolicy(editingPolitica.id, formData);
                setSuccess('Política actualizada correctamente');
            } else {
                await absencesApi.createVacationPolicy({
                    name: formData.name,
                    description: formData.description,
                    yearlyDays: formData.daysPerYear,
                    probationDays: formData.probationPeriodDays,
                    maxCarryOverDays: formData.maxCarryOverDays,
                    minNoticeDays: formData.minNoticeDays,
                    requiresApproval: formData.requiresApproval,
                    allowHalfDays: formData.allowHalfDays,
                    restrictByDepartment: formData.restrictByDepartment
                });
                setSuccess('Política creada correctamente');
            }

            setShowForm(false);
            loadPoliticas();
        } catch (error) {
            console.error('Error al guardar política:', error);
            setError('Error al guardar la política');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta política?')) {
            return;
        }

        try {
            await absencesApi.deleteVacationPolicy(id);
            setSuccess('Política eliminada correctamente');
            loadPoliticas();
        } catch (error) {
            console.error('Error al eliminar política:', error);
            setError('Error al eliminar la política');
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Políticas de Vacaciones</h1>
                    <p className="text-gray-600">Gestiona las políticas de vacaciones de la empresa</p>
                </div>
                <Button
                    variant="primary"
                    onClick={handleCreate}
                >
                    Nueva Política
                </Button>
            </div>

            {/* Alertas */}
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

            {/* Lista de políticas */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {politicas.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No hay políticas de vacaciones configuradas
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nombre
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Días por año
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Máx. días arrastre
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Período prueba
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Requiere aprobación
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
                                {politicas.map((politica) => (
                                    <tr key={politica.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {politica.name}
                                                </div>
                                                {politica.description && (
                                                    <div className="text-sm text-gray-500 max-w-xs truncate">
                                                        {politica.description}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {politica.yearlyDays}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {politica.maxCarryOverDays}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {politica.probationDays > 0
                                                ? `${politica.probationDays} días`
                                                : 'No aplica'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {politica.requiresApproval ? 'Sí' : 'No'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${politica.active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {politica.active ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleEdit(politica)}
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(politica.id)}
                                                >
                                                    Eliminar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de formulario */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingPolitica ? 'Editar Política' : 'Nueva Política'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre *
                                </label>
                                <Input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Vacaciones estándar"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Descripción detallada de la política..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Días por año *
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="365"
                                        value={formData.daysPerYear}
                                        onChange={(e) => setFormData({ ...formData, daysPerYear: parseInt(e.target.value) || 0 })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Máx. días arrastre
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="365"
                                        value={formData.maxCarryOverDays}
                                        onChange={(e) => setFormData({ ...formData, maxCarryOverDays: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Período de prueba (días)
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="365"
                                        value={formData.probationPeriodDays}
                                        onChange={(e) => setFormData({ ...formData, probationPeriodDays: parseInt(e.target.value) || 0 })}
                                        placeholder="Días antes de poder solicitar vacaciones"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Días de preaviso
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="365"
                                        value={formData.minNoticeDays}
                                        onChange={(e) => setFormData({ ...formData, minNoticeDays: parseInt(e.target.value) || 0 })}
                                        placeholder="Días de antelación para solicitar"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.requiresApproval}
                                        onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Requiere aprobación de un administrador
                                    </span>
                                </label>

                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.allowHalfDays}
                                        onChange={(e) => setFormData({ ...formData, allowHalfDays: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Permitir medios días
                                    </span>
                                </label>

                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.restrictByDepartment}
                                        onChange={(e) => setFormData({ ...formData, restrictByDepartment: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Restringir por departamento
                                    </span>
                                </label>

                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Política activa
                                    </span>
                                </label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <Button
                                    variant="secondary"
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="primary"
                                    type="submit"
                                >
                                    {editingPolitica ? 'Actualizar' : 'Crear'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PoliticasVacacionesPage;