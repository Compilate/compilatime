import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { weeklyScheduleApi, scheduleApi } from '../../lib/api';
import { Schedule, WeeklySchedule, Employee } from '../../types/weeklySchedule';
import Button from '../common/Button';
import Loader from '../common/Loader';

// Función para generar clases CSS a partir de un color HEX
const getColorClasses = (color: string) => {
    // Convertir HEX a RGB para calcular colores claros y oscuros
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

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

    return {
        background: `rgb(${lightR}, ${lightG}, ${lightB})`,
        border: `rgb(${darkR}, ${darkG}, ${darkB})`,
        textColor,
        subTextColor
    };
};

// Función para obtener estilos en línea basados en el color del horario
const getScheduleStyles = (schedule: Schedule) => {
    const color = schedule.color || '#3B82F6';
    const colorClasses = getColorClasses(color);

    return {
        backgroundColor: colorClasses.background,
        borderColor: colorClasses.border,
        color: colorClasses.textColor
    };
};


// Función para calcular la diferencia en horas entre dos tiempos
const calculateHoursDifference = (startTime: string, endTime: string): number => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Para turnos nocturnos que cruzan medianoche, calcular correctamente
    if (endMinutes <= startMinutes) {
        // Es un turno nocturno que cruza medianoche
        return ((24 * 60) - startMinutes + endMinutes) / 60;
    }

    return (endMinutes - startMinutes) / 60;
};

// Función para determinar si un horario es nocturno (cruza medianoche)
const isNightShift = (startTime: string, endTime: string): boolean => {
    const [startHour] = startTime.split(':').map(Number);
    const [endHour] = endTime.split(':').map(Number);

    // Un turno es nocturno si la hora de inicio es mayor o igual a la hora de fin
    // Esto indica que cruza medianoche (ej: 22:00 a 06:00)
    return startHour >= endHour && startHour >= 22;
};

// Tipos para el calendario semanal
interface WeeklyCalendarProps {
    employees: Employee[];
    onScheduleChange?: () => void;
}

// Componente principal del calendario semanal
const WeeklyCalendarSimple: React.FC<WeeklyCalendarProps> = ({ employees, onScheduleChange }) => {

    const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
    const [selectedSchedule, setSelectedSchedule] = useState<string | 'REST' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCopying, setIsCopying] = useState(false);


    // Generar los días de la semana actual
    const generateWeekDays = useCallback((weekStart: Date) => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = addDays(weekStart, i);
            const dayOfWeek = date.getDay(); // Usar getDay() para coincidir con backend
            days.push({
                date: format(date, 'yyyy-MM-dd'),
                dayOfWeek: dayOfWeek, // Usar el valor real de getDay()
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

            // Cargar horarios disponibles
            const schedulesResponse = await scheduleApi.getSchedules();
            if (schedulesResponse.success && schedulesResponse.data) {
                const schedulesData = schedulesResponse.data.schedules || [];
                setSchedules(schedulesData);
            }

            // Cargar asignaciones semanales de todos los empleados
            const weeklySchedulesResponse = await weeklyScheduleApi.getCompanyWeeklySchedules(weekStartString);
            if (weeklySchedulesResponse.success && weeklySchedulesResponse.data) {
                const weeklyData = (weeklySchedulesResponse.data as any) || [];

                setWeeklySchedules(weeklyData);
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


    // Asignar horario a empleado en día específico
    const handleAssignSchedule = useCallback(async (employeeId: string, dayOfWeek: number, scheduleId: string | null) => {
        try {
            if (scheduleId === null) {
                // Para días de descanso, creamos una asignación especial de descanso
                // No eliminamos las asignaciones existentes para permitir múltiples turnos + descanso
                await weeklyScheduleApi.upsertWeeklySchedule({
                    employeeId,
                    weekStart: weekStartString,
                    dayOfWeek,
                    scheduleId: null, // Usar null para días de descanso
                    active: true,
                    notes: 'Día de descanso'
                });
            } else {
                // Para horarios normales, asignamos como siempre
                await weeklyScheduleApi.upsertWeeklySchedule({
                    employeeId,
                    weekStart: weekStartString,
                    dayOfWeek,
                    scheduleId,
                    active: true,
                });
            }

            // Recargar datos
            await loadData();
            onScheduleChange?.();
            setSelectedSchedule(null);
        } catch (err) {
            console.error('Error al asignar horario:', err);
            setError('No se pudo asignar el horario');
        }
    }, [weekStartString, weeklySchedules, loadData, onScheduleChange]);

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

    // Calcular horas totales por día para todos los empleados
    const calculateDailyHours = useCallback((dayOfWeek: number) => {
        let totalHours = 0;

        employees.forEach(employee => {
            const daySchedules = getWeeklySchedulesForEmployeeAndDay(employee.id, dayOfWeek);
            daySchedules.forEach(ws => {
                if (ws.schedule?.startTime && ws.schedule?.endTime) {
                    totalHours += calculateHoursDifference(ws.schedule.startTime, ws.schedule.endTime);
                }
            });
        });

        return totalHours;
    }, [employees, getWeeklySchedulesForEmployeeAndDay]);

    // Calcular horas totales de la semana
    const calculateWeeklyTotalHours = useCallback(() => {
        let totalHours = 0;

        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            totalHours += calculateDailyHours(dayOfWeek);
        }

        return totalHours;
    }, [calculateDailyHours]);

    // Calcular horas semanales para un empleado específico
    const calculateEmployeeWeeklyHours = useCallback((employeeId: string) => {
        let totalHours = 0;

        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            const daySchedules = getWeeklySchedulesForEmployeeAndDay(employeeId, dayOfWeek);
            daySchedules.forEach(ws => {
                if (ws.schedule?.startTime && ws.schedule?.endTime) {
                    totalHours += calculateHoursDifference(ws.schedule.startTime, ws.schedule.endTime);
                }
            });
        }

        return totalHours;
    }, [getWeeklySchedulesForEmployeeAndDay]);

    // Función para copiar la configuración de la semana actual al resto de semanas del año
    const handleCopyWeekToAllWeeks = useCallback(async () => {
        if (!confirm('¿Estás seguro de que quieres copiar esta configuración a todas las semanas del año? Esta acción sobrescribirá las asignaciones existentes.')) {
            return;
        }

        try {
            setIsCopying(true);
            setError(null);

            // Verificar si hay asignaciones en la semana actual
            if (weeklySchedules.length === 0) {
                setError('No hay asignaciones en la semana actual para copiar.');
                return;
            }

            // Obtener todas las semanas del año actual
            const currentYear = new Date().getFullYear();
            const yearStart = startOfWeek(new Date(currentYear, 0, 1), { weekStartsOn: 1 });
            const yearEnd = startOfWeek(new Date(currentYear, 11, 31), { weekStartsOn: 1 });

            const weeksToCopy = [];
            let currentWeekDate = yearStart;

            while (currentWeekDate <= yearEnd) {
                const currentWeekString = format(currentWeekDate, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

                // No copiar a la semana actual
                if (currentWeekString !== weekStartString) {
                    weeksToCopy.push(currentWeekString);
                }

                currentWeekDate = addWeeks(currentWeekDate, 1);
            }

            if (weeksToCopy.length === 0) {
                setError('No hay semanas adicionales a las que copiar (solo existe la semana actual).');
                return;
            }

            // Copiar a cada semana
            const employeeIds = employees.map(emp => emp.id);
            let successCount = 0;
            let errorCount = 0;

            for (const targetWeekStart of weeksToCopy) {
                try {
                    await weeklyScheduleApi.copyWeekToWeek({
                        sourceWeekStart: weekStartString,
                        targetWeekStart: targetWeekStart,
                        employeeIds
                    });
                    successCount++;
                } catch (error) {
                    console.error(`Error copiando a semana ${targetWeekStart}:`, error);
                    errorCount++;
                }
            }

            if (errorCount > 0) {
                setError(`Se copió la configuración a ${successCount} semanas, pero hubo ${errorCount} errores.`);
            } else {
                alert(`Configuración copiada exitosamente a ${successCount} semanas del año.`);
                // Recargar datos para mostrar los cambios
                await loadData();
            }

        } catch (err) {
            console.error('Error al copiar semana a todas las semanas:', err);
            setError('No se pudo copiar la configuración a todas las semanas');
        } finally {
            setIsCopying(false);
        }
    }, [weekStartString, employees, weeklySchedules, loadData]);

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
                        <Button
                            variant="secondary"
                            onClick={handleCopyWeekToAllWeeks}
                            disabled={isCopying || isLoading || weeklySchedules.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isCopying ? (
                                <>
                                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                                    Copiando...
                                </>
                            ) : (
                                <>
                                    📋 Copiar a Todas las Semanas
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Lista de horarios disponibles */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Horarios Disponibles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                        {/* Horario de descanso */}
                        <div
                            onClick={() => {
                                const newSelectedSchedule = selectedSchedule === 'REST' ? null : 'REST';
                                setSelectedSchedule(newSelectedSchedule);
                            }}
                            className={`border rounded p-2 mb-2 cursor-pointer hover:opacity-80 transition-colors ${selectedSchedule === 'REST' ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                                }`}
                            style={{
                                backgroundColor: '#f3f4f6',
                                borderColor: selectedSchedule === 'REST' ? '#3b82f6' : '#d1d5db',
                                color: '#374151'
                            }}
                        >
                            <div className={`font-medium text-sm`}>
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
                                className={`border rounded p-2 mb-2 cursor-pointer hover:opacity-80 transition-colors ${selectedSchedule === schedule.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                                    }`}
                                style={getScheduleStyles(schedule)}
                            >
                                <div className={`font-medium text-sm`}>
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
                            <th className="border border-gray-300 bg-blue-100 p-3 text-center font-semibold text-blue-800 min-w-[100px]">
                                Total Semana
                            </th>
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
                                        <td
                                            key={day.dayOfWeek}
                                            className="border border-gray-300 p-2"
                                            onClick={() => {
                                                if (selectedSchedule) {
                                                    // Convertir 'REST' a null para días de descanso
                                                    const scheduleIdToSend = selectedSchedule === 'REST' ? null : selectedSchedule;
                                                    handleAssignSchedule(employee.id, day.dayOfWeek, scheduleIdToSend);
                                                }
                                            }}
                                            style={{
                                                cursor: selectedSchedule ? 'pointer' : 'default',
                                                backgroundColor: selectedSchedule ? '#f0f9ff' : 'transparent'
                                            }}
                                        >
                                            {daySchedules.map((weeklySchedule) => {
                                                // Verificar si es una asignación de descanso
                                                const isRestDay = weeklySchedule.scheduleId === null;

                                                if (isRestDay) {
                                                    // Renderizar día de descanso
                                                    return (
                                                        <div
                                                            key={weeklySchedule.id}
                                                            className={`border rounded p-2 mb-2 relative group`}
                                                            style={{
                                                                backgroundColor: '#f3f4f6',
                                                                borderColor: '#d1d5db',
                                                                color: '#374151'
                                                            }}
                                                        >
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveWeeklySchedule(weeklySchedule.id);
                                                                }}
                                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Eliminar asignación"
                                                            >
                                                                ×
                                                            </button>
                                                            <div className="font-medium text-sm">
                                                                Descanso
                                                            </div>
                                                            <div className="text-xs">
                                                                Día libre
                                                            </div>
                                                            {weeklySchedule.notes && (
                                                                <div className="text-xs opacity-75 mt-1">
                                                                    {weeklySchedule.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                } else {
                                                    // Renderizar horario normal
                                                    return (
                                                        <div
                                                            key={weeklySchedule.id}
                                                            className={`border rounded p-2 mb-2 relative group`}
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
                                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Eliminar asignación"
                                                            >
                                                                ×
                                                            </button>
                                                            <div className="font-medium text-sm flex items-center gap-1">
                                                                {weeklySchedule.schedule?.name || 'Horario'}
                                                                {weeklySchedule.schedule?.startTime && weeklySchedule.schedule?.endTime &&
                                                                    isNightShift(weeklySchedule.schedule.startTime, weeklySchedule.schedule.endTime) && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800" title="Turno nocturno">
                                                                            🌙
                                                                        </span>
                                                                    )}
                                                            </div>
                                                            <div className="text-xs">
                                                                {weeklySchedule.schedule?.startTime} - {weeklySchedule.schedule?.endTime}
                                                            </div>
                                                            {weeklySchedule.notes && (
                                                                <div className="text-xs opacity-75 mt-1">
                                                                    {weeklySchedule.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                            })}
                                            {daySchedules.length === 0 && (
                                                <div className={`text-gray-400 text-sm text-center py-4 ${selectedSchedule === 'REST' ? 'text-blue-600 font-medium' : ''
                                                    }`}>
                                                    {selectedSchedule === 'REST' ? 'Click para marcar como descanso' : selectedSchedule ? 'Click para asignar horario' : 'Selecciona un horario arriba'}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="border border-gray-300 bg-blue-50 p-3 text-center font-semibold text-blue-800">
                                    {calculateEmployeeWeeklyHours(employee.id) > 0 ? `${calculateEmployeeWeeklyHours(employee.id).toFixed(1)}h` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-100 font-semibold">
                            <td className="border border-gray-300 p-3 text-gray-800">
                                Total Horas
                            </td>
                            {weekDays.map(day => {
                                const dailyHours = calculateDailyHours(day.dayOfWeek);
                                return (
                                    <td key={day.dayOfWeek} className="border border-gray-300 p-3 text-center text-gray-800">
                                        {dailyHours > 0 ? `${dailyHours.toFixed(1)}h` : '-'}
                                    </td>
                                );
                            })}
                            <td className="border border-gray-300 p-3 text-center bg-blue-100 text-blue-800 font-bold">
                                {calculateWeeklyTotalHours() > 0 ? `${calculateWeeklyTotalHours().toFixed(1)}h` : '-'}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {employees.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No hay empleados para mostrar en el calendario
                </div>
            )}

            {selectedSchedule && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-700">
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

export default WeeklyCalendarSimple;