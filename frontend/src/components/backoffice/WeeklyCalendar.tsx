import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { weeklyScheduleApi, scheduleApi } from '../../lib/api';
import { Schedule, WeeklySchedule, Employee } from '../../types/weeklySchedule';
import Button from '../common/Button';
import Loader from '../common/Loader';

// Tipos para drag and drop
interface WeeklyCalendarProps {
    employees: Employee[];
    onScheduleChange?: () => void;
}

// Componente principal del calendario semanal
const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ employees, onScheduleChange }) => {
    const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Generar los días de la semana actual
    const generateWeekDays = useCallback((weekStart: Date) => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = addDays(weekStart, i);
            days.push({
                date: format(date, 'yyyy-MM-dd'),
                dayOfWeek: i,
                dayName: format(date, 'EEEE', { locale: es }),
            });
        }
        return days;
    }, []);

    const weekDays = generateWeekDays(currentWeek);
    const weekStartString = format(currentWeek, 'yyyy-MM-dd');

    // Cargar datos
    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Cargar horarios disponibles
            const schedulesResponse = await scheduleApi.getSchedules();
            if (schedulesResponse.success && schedulesResponse.data) {
                setSchedules(schedulesResponse.data.schedules || []);
            }

            // Cargar asignaciones semanales de todos los empleados
            const weeklySchedulesResponse = await weeklyScheduleApi.getCompanyWeeklySchedules(weekStartString);
            if (weeklySchedulesResponse.success && weeklySchedulesResponse.data) {
                setWeeklySchedules((weeklySchedulesResponse.data as any) || []);
            }
        } catch (err) {
            console.error('Error al cargar datos del calendario:', err);
            setError('No se pudieron cargar los datos del calendario');
        } finally {
            setIsLoading(false);
        }
    }, [weekStartString]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Manejar drag end
    const handleDragEnd = useCallback(async (result: any) => {
        if (!result.destination) {
            return;
        }

        const { source, destination, draggableId } = result;

        // Si viene de la lista de horarios disponibles
        if (source.droppableId === 'schedules-list') {
            // destination.droppableId tiene el formato "employeeId-dayOfWeek"
            const [employeeId, dayOfWeek] = destination.droppableId.split('-');

            try {
                await weeklyScheduleApi.upsertWeeklySchedule({
                    employeeId,
                    weekStart: weekStartString,
                    dayOfWeek: parseInt(dayOfWeek),
                    scheduleId: draggableId,
                    active: true,
                });

                // Recargar datos
                await loadData();
                onScheduleChange?.();
            } catch (err) {
                console.error('Error al asignar horario:', err);
                setError('No se pudo asignar el horario');
            }
        }
        // Si es una reorganización dentro del mismo día
        else if (source.droppableId.startsWith('employee-') && destination.droppableId.startsWith('employee-')) {
            // Aquí podríamos implementar lógica para reorganizar horarios dentro del mismo día
            // Por ahora, no hacemos nada ya que solo permitimos un horario por día
        }
    }, [weekStartString, loadData, onScheduleChange]);

    // Eliminar asignación semanal
    const handleRemoveWeeklySchedule = useCallback(async (weeklyScheduleId: string) => {
        try {
            await weeklyScheduleApi.deleteWeeklySchedule(weeklyScheduleId);
            await loadData();
            onScheduleChange?.();
        } catch (err) {
            console.error('Error al eliminar asignación:', err);
            setError('No se pudo eliminar la asignación');
        }
    }, [loadData, onScheduleChange]);

    // Navegación entre semanas
    const navigateWeek = useCallback((direction: 'prev' | 'next') => {
        setCurrentWeek(prev =>
            direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
        );
    }, []);

    // Obtener asignaciones para un empleado y día específicos
    const getWeeklySchedulesForEmployeeAndDay = useCallback((
        employeeId: string,
        dayOfWeek: number
    ) => {
        return weeklySchedules.filter(
            ws => ws.employeeId === employeeId && ws.dayOfWeek === dayOfWeek
        );
    }, [weeklySchedules]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="bg-white rounded-lg shadow-lg p-6">
                {/* Cabecera con navegación y horarios disponibles */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">
                            Calendario Semanal - {format(currentWeek, 'dd MMM yyyy', { locale: es })}
                        </h2>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => navigateWeek('prev')}
                                disabled={isLoading}
                            >
                                ← Semana Anterior
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigateWeek('next')}
                                disabled={isLoading}
                            >
                                Siguiente Semana →
                            </Button>
                        </div>
                    </div>

                    {/* Lista de horarios arrastrables */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Horarios Disponibles</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                            {schedules.map((schedule, index) => (
                                <Draggable key={schedule.id} draggableId={schedule.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`bg-blue-100 border border-blue-300 rounded p-2 mb-2 cursor-move hover:bg-blue-200 transition-colors ${snapshot.isDragging ? 'opacity-50' : ''
                                                }`}
                                        >
                                            <div className="font-medium text-sm text-blue-900">{schedule.name}</div>
                                            <div className="text-xs text-blue-700">
                                                {schedule.startTime} - {schedule.endTime}
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Calendario semanal */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="border border-gray-300 bg-gray-100 p-3 text-left font-semibold text-gray-700 min-w-[150px]">
                                    Empleado
                                </th>
                                {weekDays.map(day => (
                                    <th key={day.dayOfWeek} className="border border-gray-300 bg-gray-100 p-3 text-center font-semibold text-gray-700 min-w-[120px]">
                                        <div>{day.dayName}</div>
                                        <div className="text-sm font-normal text-gray-600">
                                            {format(new Date(day.date), 'dd/MM')}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(employee => (
                                <tr key={employee.id}>
                                    <td className="border border-gray-300 bg-gray-50 p-3 font-medium text-gray-800">
                                        {employee.name}
                                    </td>
                                    {weekDays.map(day => {
                                        const daySchedules = getWeeklySchedulesForEmployeeAndDay(employee.id, day.dayOfWeek);
                                        return (
                                            <td key={day.dayOfWeek} className="border border-gray-300 p-2">
                                                <Droppable droppableId={`${employee.id}-${day.dayOfWeek}`}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.droppableProps}
                                                            className={`min-h-[80px] border-2 border-dashed rounded-lg p-2 transition-colors ${snapshot.isDraggingOver
                                                                ? 'border-green-500 bg-green-50'
                                                                : 'border-gray-200 bg-white'
                                                                }`}
                                                        >
                                                            {daySchedules.map((weeklySchedule) => (
                                                                <div
                                                                    key={weeklySchedule.id}
                                                                    className="bg-green-100 border border-green-300 rounded p-2 mb-2 relative group"
                                                                >
                                                                    <button
                                                                        onClick={() => handleRemoveWeeklySchedule(weeklySchedule.id)}
                                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        title="Eliminar asignación"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                    <div className="font-medium text-sm text-green-900">
                                                                        {weeklySchedule.schedule?.name || 'Horario'}
                                                                    </div>
                                                                    <div className="text-xs text-green-700">
                                                                        {weeklySchedule.schedule?.startTime} - {weeklySchedule.schedule?.endTime}
                                                                    </div>
                                                                    {weeklySchedule.notes && (
                                                                        <div className="text-xs text-gray-600 mt-1">
                                                                            {weeklySchedule.notes}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {daySchedules.length === 0 && (
                                                                <div className="text-gray-400 text-sm text-center py-4">
                                                                    Arrastra un horario aquí
                                                                </div>
                                                            )}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {employees.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No hay empleados para mostrar en el calendario
                    </div>
                )}
            </div>
        </DragDropContext>
    );
};

export default WeeklyCalendar;