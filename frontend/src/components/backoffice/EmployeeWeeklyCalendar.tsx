import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { weeklyScheduleApi, scheduleApi } from '../../lib/api';
import { Schedule, WeeklySchedule, Employee } from '../../types/weeklySchedule';
import Button from '../common/Button';
import Loader from '../common/Loader';

// Función para generar clases CSS a partir de un color HEX
const getColorClasses = (color: string) => {
    console.log('🎨 [EmployeeWeeklyCalendar] getColorClasses - Input color:', color);

    // Convertir HEX a RGB para calcular colores claros y oscuros
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    console.log('🎨 [EmployeeWeeklyCalendar] getColorClasses - RGB values:', { r, g, b });

    // Mantener el color original pero con mayor opacidad para el fondo (85% del color original + 15% de blanco)
    const lightR = Math.round(r * 0.85 + 255 * 0.15);
    const lightG = Math.round(g * 0.85 + 255 * 0.15);
    const lightB = Math.round(b * 0.85 + 255 * 0.15);

    // Usar el color original para el borde pero un poco más oscuro (90% del color original)
    const darkR = Math.round(r * 0.9);
    const darkG = Math.round(g * 0.9);
    const darkB = Math.round(b * 0.9);

    // Determinar si el texto debe ser claro u oscuro
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 128 ? 'text-gray-900' : 'text-white';
    const subTextColor = brightness > 128 ? 'text-gray-700' : 'text-gray-200';

    const result = {
        background: `rgb(${lightR}, ${lightG}, ${lightB})`,
        border: `rgb(${darkR}, ${darkG}, ${darkB})`,
        textColor,
        subTextColor
    };

    console.log('🎨 [EmployeeWeeklyCalendar] getColorClasses - Generated colors:', result);
    return result;
};

// Función para obtener estilos en línea basados en el color del horario
const getScheduleStyles = (schedule: Schedule) => {
    const color = schedule.color || '#3B82F6';
    console.log('🎨 [EmployeeWeeklyCalendar] getScheduleStyles - Schedule ID:', schedule.id);
    console.log('🎨 [EmployeeWeeklyCalendar] getScheduleStyles - Schedule name:', schedule.name);
    console.log('🎨 [EmployeeWeeklyCalendar] getScheduleStyles - Color from DB:', schedule.color);
    console.log('🎨 [EmployeeWeeklyCalendar] getScheduleStyles - Final color used:', color);

    const colorClasses = getColorClasses(color);

    const styles = {
        backgroundColor: colorClasses.background,
        borderColor: colorClasses.border,
        color: colorClasses.textColor
    };

    console.log('🎨 [EmployeeWeeklyCalendar] getScheduleStyles - Final styles applied:', styles);
    return styles;
};

// Función para calcular la diferencia en horas entre dos tiempos
const calculateHoursDifference = (startTime: string, endTime: string): number => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return (endMinutes - startMinutes) / 60;
};

// Tipos para el calendario semanal de empleado
interface EmployeeWeeklyCalendarProps {
    employee: Employee;
    onScheduleChange?: () => void;
}

// Componente principal del calendario semanal para un empleado
const EmployeeWeeklyCalendar: React.FC<EmployeeWeeklyCalendarProps> = ({ employee, onScheduleChange }) => {
    const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
    const [selectedSchedule, setSelectedSchedule] = useState<string | 'REST' | null>(null);
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
    const weekStartString = format(currentWeek, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

    // Cargar datos
    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            console.log('Cargando datos del calendario para empleado:', employee.id);

            // Cargar horarios disponibles
            const schedulesResponse = await scheduleApi.getSchedules();
            console.log('Respuesta de horarios:', schedulesResponse);
            if (schedulesResponse.success && schedulesResponse.data) {
                const schedulesData = schedulesResponse.data.schedules || [];
                console.log('Horarios cargados:', schedulesData);
                setSchedules(schedulesData);
            } else {
                console.error('Error en respuesta de horarios:', schedulesResponse);
            }

            // Cargar asignaciones semanales del empleado
            const weeklySchedulesResponse = await weeklyScheduleApi.getEmployeeWeeklySchedules(employee.id, weekStartString);
            console.log('📅 [EmployeeWeeklyCalendar] Respuesta de asignaciones semanales:', weeklySchedulesResponse);
            if (weeklySchedulesResponse.success && weeklySchedulesResponse.data) {
                const weeklyData = (weeklySchedulesResponse.data as any) || [];
                console.log('📅 [EmployeeWeeklyCalendar] Asignaciones semanales cargadas:', weeklyData);

                // Log detallado de cada asignación con su horario y color
                weeklyData.forEach((ws: any) => {
                    console.log('📅 [EmployeeWeeklyCalendar] WeeklySchedule:', {
                        id: ws.id,
                        employeeId: ws.employeeId,
                        dayOfWeek: ws.dayOfWeek,
                        scheduleId: ws.scheduleId,
                        schedule: ws.schedule,
                        scheduleColor: ws.schedule?.color,
                        scheduleName: ws.schedule?.name
                    });
                });

                setWeeklySchedules(weeklyData);
            } else {
                console.error('📅 [EmployeeWeeklyCalendar] Error en respuesta de asignaciones semanales:', weeklySchedulesResponse);
            }
        } catch (err) {
            console.error('Error al cargar datos del calendario:', err);
            setError('No se pudieron cargar los datos del calendario');
        } finally {
            setIsLoading(false);
        }
    }, [employee.id, weekStartString]);

    useEffect(() => {
        if (employee?.id) {
            loadData();
        }
    }, [loadData, employee?.id]);

    // Asignar horario a empleado en día específico
    const handleAssignSchedule = useCallback(async (dayOfWeek: number, scheduleId: string) => {
        try {
            console.log('Asignando horario:', { employeeId: employee.id, dayOfWeek, scheduleId });

            if (scheduleId === 'REST') {
                // Para días de descanso, eliminamos cualquier asignación existente
                const existingSchedules = weeklySchedules.filter(
                    ws => ws.employeeId === employee.id && ws.dayOfWeek === dayOfWeek
                );

                for (const existingSchedule of existingSchedules) {
                    await weeklyScheduleApi.deleteWeeklySchedule(existingSchedule.id);
                    console.log('Eliminada asignación existente para día de descanso:', existingSchedule.id);
                }
            } else {
                // Para horarios normales, asignamos como siempre
                await weeklyScheduleApi.upsertWeeklySchedule({
                    employeeId: employee.id,
                    weekStart: weekStartString,
                    dayOfWeek,
                    scheduleId,
                    active: true,
                });
                console.log('Horario asignado correctamente');
            }

            // Recargar datos
            await loadData();
            onScheduleChange?.();
            setSelectedSchedule(null);
        } catch (err) {
            console.error('Error al asignar horario:', err);
            setError('No se pudo asignar el horario');
        }
    }, [employee.id, weekStartString, weeklySchedules, loadData, onScheduleChange]);

    // Eliminar asignación semanal
    const handleRemoveWeeklySchedule = useCallback(async (weeklyScheduleId: string) => {
        try {
            console.log('Eliminando asignación:', weeklyScheduleId);

            await weeklyScheduleApi.deleteWeeklySchedule(weeklyScheduleId);

            console.log('Asignación eliminada correctamente');

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

    // Obtener asignaciones para un día específico
    const getWeeklySchedulesForDay = useCallback((dayOfWeek: number) => {
        return weeklySchedules.filter(ws => ws.dayOfWeek === dayOfWeek);
    }, [weeklySchedules]);

    // Calcular horas totales de la semana
    const calculateWeeklyTotalHours = useCallback(() => {
        let totalHours = 0;

        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            const daySchedules = getWeeklySchedulesForDay(dayOfWeek);
            daySchedules.forEach(ws => {
                if (ws.schedule?.startTime && ws.schedule?.endTime) {
                    totalHours += calculateHoursDifference(ws.schedule.startTime, ws.schedule.endTime);
                }
            });
        }

        return totalHours;
    }, [getWeeklySchedulesForDay]);

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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            {/* Cabecera con navegación y horarios disponibles */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Calendario Semanal - {employee.name}
                    </h3>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => navigateWeek('prev')}
                            disabled={isLoading}
                            size="sm"
                        >
                            ←
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigateWeek('next')}
                            disabled={isLoading}
                            size="sm"
                        >
                            →
                        </Button>
                    </div>
                    <div className="text-sm text-gray-600">
                        {format(currentWeek, 'dd MMM yyyy', { locale: es })}
                    </div>
                </div>

                {/* Lista de horarios disponibles */}
                <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Horarios Disponibles</h4>
                    <div className="flex flex-wrap gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                        {/* Horario de descanso */}
                        <div
                            onClick={() => setSelectedSchedule(selectedSchedule === 'REST' ? null : 'REST')}
                            className={`border rounded px-3 py-2 cursor-pointer hover:opacity-80 transition-colors ${selectedSchedule === 'REST' ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                                }`}
                            style={{
                                backgroundColor: '#f3f4f6',
                                borderColor: selectedSchedule === 'REST' ? '#3b82f6' : '#d1d5db',
                                color: '#374151'
                            }}
                        >
                            <div className={`font-medium`}>
                                Descanso
                            </div>
                            <div className={`text-xs`}>
                                Día libre
                            </div>
                        </div>

                        {schedules.map((schedule) => (
                            <div
                                key={schedule.id}
                                onClick={() => setSelectedSchedule(selectedSchedule === schedule.id ? null : schedule.id)}
                                className={`border rounded px-3 py-2 cursor-pointer hover:opacity-80 transition-colors text-sm ${selectedSchedule === schedule.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                                    }`}
                                style={getScheduleStyles(schedule)}
                            >
                                <div className={`font-medium`}>
                                    {schedule.name}
                                </div>
                                <div className={`text-xs`}>
                                    {schedule.startTime} - {schedule.endTime}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Calendario semanal */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className="border border-gray-300 bg-gray-100 p-2 text-left font-semibold text-gray-700">
                                Día
                            </th>
                            {weekDays.map(day => (
                                <th key={day.dayOfWeek} className="border border-gray-300 bg-gray-100 p-2 text-center font-semibold text-gray-700 min-w-[100px]">
                                    <div>{day.dayName}</div>
                                    <div className="text-xs font-normal text-gray-600">
                                        {format(new Date(day.date), 'dd/MM')}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-300 bg-gray-50 p-2 font-medium text-gray-800">
                                {employee.name}
                            </td>
                            {weekDays.map(day => {
                                const daySchedules = getWeeklySchedulesForDay(day.dayOfWeek);
                                return (
                                    <td
                                        key={day.dayOfWeek}
                                        className="border border-gray-300 p-1"
                                        onClick={() => {
                                            if (selectedSchedule) {
                                                handleAssignSchedule(day.dayOfWeek, selectedSchedule);
                                            }
                                        }}
                                        style={{
                                            cursor: selectedSchedule ? 'pointer' : 'default',
                                            backgroundColor: selectedSchedule ? '#f0f9ff' : 'transparent'
                                        }}
                                    >
                                        {daySchedules.map((weeklySchedule) => (
                                            <div
                                                key={weeklySchedule.id}
                                                className={`border rounded p-1 mb-1 relative group`}
                                                style={getScheduleStyles(weeklySchedule.schedule || {
                                                    id: '',
                                                    name: 'Horario',
                                                    startTime: '00:00',
                                                    endTime: '00:00',
                                                    color: '#3B82F6',
                                                    active: true
                                                })}
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveWeeklySchedule(weeklySchedule.id);
                                                    }}
                                                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                                    title="Eliminar asignación"
                                                >
                                                    ×
                                                </button>
                                                <div className="font-medium text-xs">
                                                    {weeklySchedule.schedule?.name || 'Horario'}
                                                </div>
                                                <div className="text-xs opacity-75">
                                                    {weeklySchedule.schedule?.startTime} - {weeklySchedule.schedule?.endTime}
                                                </div>
                                            </div>
                                        ))}
                                        {daySchedules.length === 0 ? (
                                            <div className={`text-gray-400 text-xs text-center py-4 ${selectedSchedule === 'REST' ? 'text-blue-600 font-medium' : ''
                                                }`}>
                                                {selectedSchedule === 'REST' ? 'Click para marcar como descanso' : selectedSchedule ? 'Click para asignar' : 'Selecciona horario'}
                                            </div>
                                        ) : (
                                            daySchedules.map((weeklySchedule) => (
                                                <div
                                                    key={weeklySchedule.id}
                                                    className={`border rounded p-1 mb-1 relative group`}
                                                    style={getScheduleStyles(weeklySchedule.schedule || {
                                                        id: '',
                                                        name: 'Horario',
                                                        startTime: '00:00',
                                                        endTime: '00:00',
                                                        color: '#3B82F6',
                                                        active: true
                                                    })}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveWeeklySchedule(weeklySchedule.id);
                                                        }}
                                                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                                        title="Eliminar asignación"
                                                    >
                                                        ×
                                                    </button>
                                                    <div className="font-medium text-xs">
                                                        {weeklySchedule.schedule?.name || 'Horario'}
                                                    </div>
                                                    <div className="text-xs opacity-75">
                                                        {weeklySchedule.schedule?.startTime} - {weeklySchedule.schedule?.endTime}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-100 font-semibold">
                            <td className="border border-gray-300 p-2 text-gray-800">
                                Total Horas
                            </td>
                            {weekDays.map(day => {
                                const daySchedules = getWeeklySchedulesForDay(day.dayOfWeek);
                                const dailyHours = daySchedules.reduce((total, ws) => {
                                    if (ws.schedule?.startTime && ws.schedule?.endTime) {
                                        return total + calculateHoursDifference(ws.schedule.startTime, ws.schedule.endTime);
                                    }
                                    return total;
                                }, 0);
                                return (
                                    <td key={day.dayOfWeek} className="border border-gray-300 p-2 text-center text-gray-800">
                                        {dailyHours > 0 ? `${dailyHours.toFixed(1)}h` : '-'}
                                    </td>
                                );
                            })}
                            <td className="border border-gray-300 p-2 text-center bg-blue-100 text-blue-800 font-bold">
                                {calculateWeeklyTotalHours() > 0 ? `${calculateWeeklyTotalHours().toFixed(1)}h` : '-'}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {selectedSchedule && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    <p className="text-blue-700">
                        {selectedSchedule === 'REST' ? (
                            <strong>Día de descanso seleccionado</strong>
                        ) : (
                            <>
                                Horario seleccionado: <strong>{schedules.find(s => s.id === selectedSchedule)?.name}</strong>
                            </>
                        )}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                        {selectedSchedule === 'REST'
                            ? 'Haz clic en cualquier celda del calendario para marcar como día de descanso'
                            : 'Haz clic en cualquier celda del calendario para asignar este horario'
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default EmployeeWeeklyCalendar;