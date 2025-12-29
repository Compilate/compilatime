import React, { useState, useEffect } from 'react';
import { scheduleApi, employeeApi } from '../../lib/api';
import Button from '../../components/common/Button';
// import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import ScheduleForm from '../../components/backoffice/ScheduleForm';
import WeeklyCalendarSimple from '../../components/backoffice/WeeklyCalendarSimple';
import { Employee } from '../../types/weeklySchedule';

interface Schedule {
    id: string;
    name: string;
    daysOfWeek?: number[];
    dayOfWeek?: number; // Para compatibilidad con datos antiguos
    startTime: string;
    endTime: string;
    color?: string;
    createdAt: string;
    updatedAt: string;
}

const HorariosPage: React.FC = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [filterDay, setFilterDay] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
    const [employees, setEmployees] = useState<Employee[]>([]);

    useEffect(() => {
        loadSchedules();
        loadEmployees();
    }, []);

    const loadSchedules = async () => {
        try {
            setLoading(true);
            const response = await scheduleApi.getSchedules();
            if (response.success && response.data) {
                setSchedules(response.data.schedules || []);
            }
        } catch (error: any) {
            setError(error.message || 'Error al cargar los horarios');
        } finally {
            setLoading(false);
        }
    };

    const loadEmployees = async () => {
        try {
            const response = await employeeApi.getEmployees({ active: true });
            if (response.success && response.data) {
                setEmployees(response.data.employees || []);
            }
        } catch (error: any) {
            console.error('Error al cargar empleados:', error);
        }
    };

    const handleCreateSchedule = () => {
        setEditingSchedule(null);
        setShowForm(true);
    };

    const handleEditSchedule = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        setShowForm(true);
    };

    const handleDeleteSchedule = async (schedule: Schedule) => {
        const confirmMessage = `¿Estás seguro de que deseas eliminar el horario "${schedule.name}"?`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            await scheduleApi.deleteSchedule(schedule.id);
            await loadSchedules();
        } catch (error: any) {
            // Si hay empleados asignados, preguntar si desea forzar la eliminación
            if (error.message && error.message.includes('empleados asignados')) {
                const forceConfirm = window.confirm(
                    `${error.message}\n\n¿Deseas forzar la eliminación? Esto también eliminará las asignaciones de empleados a este horario.`
                );

                if (forceConfirm) {
                    try {
                        await scheduleApi.deleteSchedule(schedule.id, true);
                        await loadSchedules();
                    } catch (forceError: any) {
                        setError(forceError.message || 'Error al eliminar el horario');
                    }
                }
            } else {
                setError(error.message || 'Error al eliminar el horario');
            }
        }
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingSchedule(null);
        loadSchedules();
    };

    const handleFormCancel = () => {
        setShowForm(false);
        setEditingSchedule(null);
    };

    const handleScheduleChange = () => {
        loadSchedules();
    };

    const filteredSchedules = schedules.filter(schedule => {
        if (filterDay === 'all') return true;
        const filterDayNum = parseInt(filterDay);

        // Verificar si el día está en daysOfWeek (nuevo formato) o dayOfWeek (antiguo)
        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
            return schedule.daysOfWeek.includes(filterDayNum);
        } else if (schedule.dayOfWeek !== undefined) {
            return schedule.dayOfWeek === filterDayNum;
        }
        return false;
    });

    // const getDayName = (dayOfWeek: number) => {
    //     const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    //     return days[dayOfWeek];
    // };


    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatTime = (timeString: string) => {
        return timeString.substring(0, 5);
    };

    if (showForm) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {editingSchedule ? 'Editar Horario' : 'Nuevo Horario'}
                    </h1>
                    <Button
                        onClick={handleFormCancel}
                        variant="secondary"
                    >
                        Cancelar
                    </Button>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <ScheduleForm
                        schedule={editingSchedule ? {
                            id: editingSchedule.id,
                            name: editingSchedule.name,
                            startTime: editingSchedule.startTime,
                            endTime: editingSchedule.endTime,
                            color: editingSchedule.color,
                        } : undefined}
                        onSuccess={handleFormSuccess}
                        onCancel={handleFormCancel}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Horarios</h1>
                    <p className="text-gray-600">
                        Administra los horarios y turnos de trabajo de tu empresa.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleCreateSchedule}
                        variant={activeTab === 'list' ? 'primary' : 'outline'}
                    >
                        Nuevo Horario
                    </Button>
                </div>
            </div>

            {/* Tabs de navegación */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'list'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Lista de Horarios
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'calendar'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Calendario Semanal
                    </button>
                </nav>
            </div>

            {/* Contenido según tab activo */}
            {activeTab === 'calendar' ? (
                <WeeklyCalendarSimple
                    employees={employees}
                    onScheduleChange={handleScheduleChange}
                />
            ) : (
                <>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                            <div className="flex items-center space-x-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Filtrar por día
                                    </label>
                                    <select
                                        value={filterDay}
                                        onChange={(e) => setFilterDay(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">Todos los días</option>
                                        <option value="0">Domingo</option>
                                        <option value="1">Lunes</option>
                                        <option value="2">Martes</option>
                                        <option value="3">Miércoles</option>
                                        <option value="4">Jueves</option>
                                        <option value="5">Viernes</option>
                                        <option value="6">Sábado</option>
                                    </select>
                                </div>
                                <Button
                                    onClick={loadSchedules}
                                    variant="secondary"
                                >
                                    Actualizar
                                </Button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader size="lg" />
                            </div>
                        ) : filteredSchedules.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-400 text-lg mb-2">🕐</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No hay horarios configurados
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    {filterDay === 'all'
                                        ? 'Crea tu primer horario para comenzar'
                                        : 'No hay horarios configurados para este día'}
                                </p>
                                {filterDay === 'all' && (
                                    <Button onClick={handleCreateSchedule}>
                                        Crear Primer Horario
                                    </Button>
                                )}
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
                                                Horario
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Creado
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredSchedules.map((schedule) => (
                                            <tr key={schedule.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {schedule.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(schedule.createdAt)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-2">
                                                        <Button
                                                            onClick={() => handleEditSchedule(schedule)}
                                                            variant="secondary"
                                                            size="sm"
                                                        >
                                                            Editar
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleDeleteSchedule(schedule)}
                                                            variant="danger"
                                                            size="sm"
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
                </>
            )}
        </div>
    );
};

export default HorariosPage;