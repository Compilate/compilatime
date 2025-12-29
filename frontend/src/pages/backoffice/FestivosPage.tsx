import React, { useState, useEffect } from 'react';
import { absencesApi, CompanyHoliday, HolidayType } from '../../lib/api/absences.api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';

const FestivosPage: React.FC = () => {
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHoliday | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: HolidayType.PUBLIC,
    recurring: false,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  });

  // Cargar festivos
  const loadHolidays = async () => {
    try {
      setLoading(true);
      const response = await absencesApi.getCompanyHolidays(filters);
      setHolidays(response.holidays);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los festivos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, [filters]);

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Abrir modal para crear/editar
  const openModal = (holiday?: CompanyHoliday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date.split('T')[0], // Formatear fecha para input date
        type: holiday.type,
        recurring: holiday.recurring,
        description: holiday.description || '',
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        name: '',
        date: '',
        type: HolidayType.PUBLIC,
        recurring: false,
        description: '',
      });
    }
    setShowModal(true);
    setError(null);
  };

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false);
    setEditingHoliday(null);
    setError(null);
  };

  // Guardar festivo
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingHoliday) {
        await absencesApi.updateCompanyHoliday(editingHoliday.id, formData);
        setSuccess('Festivo actualizado correctamente');
      } else {
        await absencesApi.createCompanyHoliday(formData);
        setSuccess('Festivo creado correctamente');
      }

      closeModal();
      loadHolidays();

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el festivo');
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar festivo
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este festivo?')) {
      return;
    }

    try {
      await absencesApi.deleteCompanyHoliday(id);
      setSuccess('Festivo eliminado correctamente');
      loadHolidays();

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el festivo');
    }
  };

  // Cambiar estado de un festivo (activo/inactivo)
  const toggleHolidayStatus = async (holiday: CompanyHoliday) => {
    try {
      await absencesApi.updateCompanyHoliday(holiday.id, {
        active: !holiday.active,
      });
      setSuccess(`Festivo ${holiday.active ? 'desactivado' : 'activado'} correctamente`);
      loadHolidays();

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar el estado del festivo');
    }
  };

  // Obtener etiqueta del tipo de festivo
  const getHolidayTypeLabel = (type: HolidayType) => {
    switch (type) {
      case HolidayType.PUBLIC:
        return 'Público';
      case HolidayType.COMPANY:
        return 'Empresa';
      case HolidayType.RELIGIOUS:
        return 'Religioso';
      default:
        return type;
    }
  };

  // Obtener clase CSS para el tipo de festivo
  const getHolidayTypeClass = (type: HolidayType) => {
    switch (type) {
      case HolidayType.PUBLIC:
        return 'bg-blue-100 text-blue-800';
      case HolidayType.COMPANY:
        return 'bg-green-100 text-green-800';
      case HolidayType.RELIGIOUS:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Festivos</h1>
        <Button onClick={() => openModal()}>
          Añadir Festivo
        </Button>
      </div>

      {/* Mensajes de error y éxito */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha desde
            </label>
            <Input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha hasta
            </label>
            <Input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => setFilters({ startDate: '', endDate: '' })}
            >
              Limpiar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de festivos */}
      {loading ? (
        <Loader />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {holidays.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay festivos configurados
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
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recurrente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {holidays.map((holiday) => (
                    <tr key={holiday.id} className={holiday.active ? '' : 'opacity-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {holiday.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(holiday.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getHolidayTypeClass(holiday.type)}`}>
                          {getHolidayTypeLabel(holiday.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {holiday.recurring ? 'Sí' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${holiday.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                          }`}>
                          {holiday.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {holiday.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toggleHolidayStatus(holiday)}
                          className={`mr-3 ${holiday.active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                          title={holiday.active ? 'Desactivar' : 'Activar'}
                        >
                          {holiday.active ? '⏸️' : '▶️'}
                        </button>
                        <button
                          onClick={() => openModal(holiday)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(holiday.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal para crear/editar festivo */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {editingHoliday ? 'Editar Festivo' : 'Nuevo Festivo'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  >
                    <option value={HolidayType.PUBLIC}>Público</option>
                    <option value={HolidayType.COMPANY}>Empresa</option>
                    <option value={HolidayType.RELIGIOUS}>Religioso</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="recurring"
                      checked={formData.recurring}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Recurrente (se repite cada año)</span>
                  </label>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? 'Guardando...' : (editingHoliday ? 'Actualizar' : 'Crear')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FestivosPage;
