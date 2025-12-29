import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeeApi, scheduleApi } from '../../lib/api';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';

interface Employee {
    id: string;
    dni: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

interface Schedule {
    id: string;
    name: string;
    daysOfWeek?: number[];
    dayOfWeek?: number;
    startTime: string;
    endTime: string;
    createdAt: string;
    updatedAt: string;
}

interface EmployeeSchedule {
    id: string;
    employeeId: string;
    scheduleId: string;
    schedule: Schedule;
}

const EmpleadoHorariosPage: React.FC = () => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
    const [employeeSchedules, setEmployeeSchedules] = useState<EmployeeSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

    useEffect(() => {
        if (employeeId) {
            loadData();
        }
    }, [employeeId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Cargar datos del empleado
            const employeeResponse = await employeeApi.getEmployee(employeeId!);
            if (employeeResponse.success && employeeResponse.data) {
                setEmployee(employeeResponse.data.employee);
            }

            // Cargar todos los horarios disponibles
            const schedulesResponse = await scheduleApi.getSchedules();
            if (schedulesResponse.success && schedulesResponse.data) {
                setAllSchedules(schedulesResponse.data.schedules || []);
            }

            // Cargar horarios asignados al empleado
            const employeeSchedulesResponse = await employeeApi.getEmployeeSchedules(employeeId!);
            if (employeeSchedulesResponse.success && employeeSchedulesResponse.data) {
                setEmployeeSchedules(employeeSchedulesResponse.data || []);
            }
        } catch (error: any) {
            setError(error.message || 'Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignSchedule = async () => {
        if (!selectedScheduleId || !employeeId) {
            return;
        }

        try {
            await employeeApi.assignScheduleToEmployee(employeeId, selectedScheduleId);
            setSelectedScheduleId('');
            await loadData();
        } catch (error: any) {
            setError(error.message || 'Error al asignar el horario');
        }
    };

    const handleRemoveSchedule = async (employeeScheduleId: string) => {
        console.log('EmpleadoHorariosPage - handleRemoveSchedule llamado con ID:', employeeScheduleId);

        if (!window.confirm('¿Estás seguro de que deseas eliminar esta asignación de horario?')) {
            return;
        }

        try {
            console.log('EmpleadoHorariosPage - Llamando a employeeApi.removeScheduleFromEmployee con ID:', employeeScheduleId);
            await employeeApi.removeScheduleFromEmployee(employeeScheduleId);
            console.log('EmpleadoHorariosPage - Eliminación exitosa, recargando datos...');
            await loadData();
        } catch (error: any) {
            console.error('EmpleadoHorariosPage - Error al eliminar asignación de horario:', error);
            setError(error.message || 'Error al eliminar la asignación de horario');
        }
    };

    const getDaysNames = (schedule: Schedule) => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
            return schedule.daysOfWeek.map(day => days[day]).join(', ');
        }

        if (schedule.dayOfWeek !== undefined) {
            return days[schedule.dayOfWeek];
        }

        return 'Sin días asignados';
    };

    const formatTime = (timeString: string) => {
        return timeString.substring(0, 5);
    };

    // Filtrar horarios que no están asignados al empleado
    const availableSchedules = allSchedules.filter(schedule =>
        !employeeSchedules.some(es => es.scheduleId === schedule.id)
    );

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader size="lg" />
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="text-center py-8">
                <div className="text-red-500 text-lg mb-2">❌</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Empleado no encontrado
                </h3>
                <Button onClick={() => navigate('/portal/team')}>
                    Volver a Equipo
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Horarios de {employee.name}
                    </h1>
                    <p className="text-gray-600">
                        DNI: {employee.dni}
                    </p>
                </div>
                <Button
                    onClick={() => navigate('/portal/team')}
                    variant="secondary"
                >
                    Volver a Equipo
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Asignar nuevo horario */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Asignar Nuevo Horario</h2>
                <div className="flex items-end space-x-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleccionar Horario
                        </label>
                        <select
                            value={selectedScheduleId}
                            onChange={(e) => setSelectedScheduleId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Selecciona un horario...</option>
                            {availableSchedules.map((schedule) => (
                                <option key={schedule.id} value={schedule.id}>
                                    {schedule.name} - {getDaysNames(schedule)} ({formatTime(schedule.startTime)} - {formatTime(schedule.endTime)})
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button
                        onClick={handleAssignSchedule}
                        disabled={!selectedScheduleId}
                    >
                        Asignar Horario
                    </Button>
                </div>
                {availableSchedules.length === 0 && (
                    <p className="text-gray-500 mt-2">
                        No hay horarios disponibles para asignar.
                        <button
                            onClick={() => navigate('/portal/schedules')}
                            className="text-blue-600 hover:text-blue-800 underline ml-1"
                        >
                            Crea nuevos horarios aquí
                        </button>
                    </p>
                )}
            </div>

            {/* Horarios asignados */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Horarios Asignados</h2>
                {employeeSchedules.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-lg mb-2">🕐</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay horarios asignados
                        </h3>
                        <p className="text-gray-500">
                            Este empleado no tiene horarios asignados actualmente.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nombre del Horario
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Días
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Horario
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {employeeSchedules.map((employeeSchedule) => (
                                    <tr key={employeeSchedule.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {employeeSchedule.schedule.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {getDaysNames(employeeSchedule.schedule)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {formatTime(employeeSchedule.schedule.startTime)} - {formatTime(employeeSchedule.schedule.endTime)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Button
                                                onClick={() => handleRemoveSchedule(employeeSchedule.id)}
                                                variant="danger"
                                                size="sm"
                                            >
                                                Eliminar
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmpleadoHorariosPage;