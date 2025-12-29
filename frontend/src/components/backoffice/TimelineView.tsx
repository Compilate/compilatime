import React, { useState, useEffect } from 'react';
import { employeeApi, timeEntryApi } from '../../lib/api';
import Loader from '../common/Loader';
import Button from '../common/Button';

interface TimeEntry {
    id: string;
    employee: {
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

interface Schedule {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    color?: string;
    isReference?: boolean; // Para diferenciar entre horarios asignados y predefinidos
}

interface Employee {
    id: string;
    name: string;
    dni: string;
}

interface TimelineViewProps {
    date: string;
    employeeId?: string;
    employees?: Employee[];
}

const TimelineView: React.FC<TimelineViewProps> = ({ date, employeeId, employees = [] }) => {
    const [loading, setLoading] = useState(true);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [schedules, setSchedules] = useState<{ [employeeId: string]: Schedule[] }>({});
    const [selectedEmployee, setSelectedEmployee] = useState<string>(employeeId || '');
    const [error, setError] = useState<string | null>(null);

    // Estados para el formulario de fichaje manual
    const [showManualPunch, setShowManualPunch] = useState(false);
    const [manualPunchData, setManualPunchData] = useState({
        employeeId: '',
        type: 'IN' as 'IN' | 'OUT',
        date: date,
        time: ''
    });
    const [submittingPunch, setSubmittingPunch] = useState(false);
    const [punchError, setPunchError] = useState<string | null>(null);

    // Generar horas del día (0-23)
    const hours = Array.from({ length: 24 }, (_, i) => i);

    useEffect(() => {
        if (date) {
            loadData();
        }
    }, [date, selectedEmployee]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Cargar registros de fichaje - ampliamos el rango para incluir turnos que cruzan medianoche
            const selectedDate = new Date(date);
            const previousDay = new Date(selectedDate);
            previousDay.setDate(previousDay.getDate() - 1);
            const nextDay = new Date(selectedDate);
            nextDay.setDate(nextDay.getDate() + 1);

            const entriesParams: any = {
                from: previousDay.toISOString().split('T')[0],
                to: nextDay.toISOString().split('T')[0],
            };

            if (selectedEmployee) {
                entriesParams.employeeId = selectedEmployee;
            }

            console.log('🔍 DEBUG loadData - Parámetros de consulta:', {
                selectedDate: date,
                from: entriesParams.from,
                to: entriesParams.to,
                employeeId: entriesParams.employeeId || 'todos'
            });

            const entriesResponse = await timeEntryApi.getTimeEntries(entriesParams);
            if (entriesResponse.success && entriesResponse.data) {
                const allEntries = entriesResponse.data.timeEntries || [];
                console.log('🔍 DEBUG loadData - Total entries recibidos:', allEntries.length);
                console.log('🔍 DEBUG loadData - Entries detallados:', allEntries.map(e => ({
                    id: e.id,
                    type: e.type,
                    timestamp: e.timestamp,
                    date: new Date(e.timestamp).toISOString().split('T')[0],
                    hours: new Date(e.timestamp).getHours(),
                    minutes: new Date(e.timestamp).getMinutes(),
                    breakTypeId: e.breakTypeId,
                    breakType: e.breakType,
                    breakReason: e.breakReason
                })));
                setTimeEntries(allEntries);
            }

            // Si hay un empleado seleccionado, cargar sus horarios del día
            if (selectedEmployee && selectedEmployee.trim() !== '') {
                try {
                    console.log('🔍 DEBUG loadData - Cargando horarios para empleado:', selectedEmployee);
                    console.log('🔍 DEBUG loadData - selectedEmployee tipo:', typeof selectedEmployee);
                    console.log('🔍 DEBUG loadData - selectedEmployee valor:', selectedEmployee);

                    // Primero, cargar los registros para saber qué fechas tienen fichajes
                    const entriesResponse = await timeEntryApi.getTimeEntries(entriesParams);
                    if (entriesResponse.success && entriesResponse.data) {
                        const allEntries = entriesResponse.data.timeEntries || [];
                        console.log('🔍 DEBUG loadData - Total entries recibidos:', allEntries.length);

                        // Obtener las fechas únicas que tienen fichajes
                        const uniqueDates = Array.from(new Set(
                            allEntries.map(entry => new Date(entry.timestamp).toISOString().split('T')[0])
                        )).sort();

                        console.log('🔍 DEBUG loadData - Fechas únicas con fichajes:', uniqueDates);

                        // Cargar horarios para cada fecha que tiene fichajes
                        const schedulesData: { [date: string]: Schedule[] } = {};

                        for (const dateStr of uniqueDates) {
                            try {
                                console.log(`🔍 DEBUG loadData - Cargando horarios para fecha ${dateStr}`);
                                const scheduleResponse = await employeeApi.getDailySchedule(selectedEmployee, dateStr);
                                console.log(`🔍 DEBUG loadData - scheduleResponse para fecha ${dateStr}:`, scheduleResponse);
                                if (scheduleResponse.success && scheduleResponse.data) {
                                    const dateSchedules = (scheduleResponse.data as any).schedules || [];
                                    console.log(`🔍 DEBUG loadData - schedulesData para fecha ${dateStr}:`, dateSchedules);
                                    // Si el empleado no tiene horarios asignados, no mostrar ningún turno (descanso)
                                    schedulesData[dateStr] = dateSchedules;
                                }
                            } catch (scheduleError) {
                                console.warn(`No se pudieron cargar los horarios del empleado para la fecha ${dateStr}:`, scheduleError);
                                // En caso de error, no mostrar ningún turno
                                schedulesData[dateStr] = [];
                            }
                        }

                        console.log('🔍 DEBUG loadData - schedulesData final:', schedulesData);

                        // Almacenar los horarios por fecha en el estado
                        setSchedules({
                            [selectedEmployee]: [] // Por defecto, no mostrar ningún turno
                        });

                        // Almacenar los horarios por fecha en una variable adicional
                        (window as any).schedulesByDate = schedulesData;
                    }
                } catch (scheduleError) {
                    console.warn('No se pudieron cargar los horarios del empleado:', scheduleError);
                    // En caso de error, no mostrar ningún turno
                    setSchedules({
                        [selectedEmployee]: []
                    });
                }
            } else {
                // Si no hay empleado seleccionado, cargar horarios de todos los empleados
                const schedulesData: { [employeeId: string]: Schedule[] } = {};
                const schedulesByDateAndEmployee: { [employeeId: string]: { [date: string]: Schedule[] } } = {};

                // Primero, obtener los fichajes de todos los empleados
                const allEntriesResponse = await timeEntryApi.getTimeEntries(entriesParams);
                if (allEntriesResponse.success && allEntriesResponse.data) {
                    const allEntries = allEntriesResponse.data.timeEntries || [];
                    console.log('🔍 DEBUG loadData - Total entries recibidos para todos los empleados:', allEntries.length);

                    // Procesar cada empleado
                    for (const employee of employees) {
                        try {
                            // Obtener los fichajes de este empleado para saber qué fechas tienen registros
                            const employeeEntries = allEntries.filter((e: TimeEntry) => e.employee.id === employee.id);

                            if (employeeEntries.length > 0) {
                                // Obtener las fechas únicas que tienen fichajes de este empleado
                                const uniqueDates = Array.from(new Set(
                                    employeeEntries.map((entry: TimeEntry) => new Date(entry.timestamp).toISOString().split('T')[0])
                                )).sort();

                                console.log(`🔍 DEBUG loadData - Empleado ${employee.id}, fechas con fichajes:`, uniqueDates);

                                // Cargar horarios para cada fecha que tiene fichajes
                                schedulesByDateAndEmployee[employee.id] = {};

                                // Usar Promise.all para cargar todos los horarios en paralelo
                                const schedulePromises = uniqueDates.map(async (dateStr) => {
                                    try {
                                        console.log(`🔍 DEBUG loadData - Cargando horarios para empleado ${employee.id}, fecha ${dateStr}`);
                                        const scheduleResponse = await employeeApi.getDailySchedule(employee.id, dateStr);
                                        console.log(`🔍 DEBUG loadData - scheduleResponse para ${employee.id}, fecha ${dateStr}:`, scheduleResponse);
                                        if (scheduleResponse.success && scheduleResponse.data) {
                                            const dateSchedules = (scheduleResponse.data as any).schedules || [];
                                            console.log(`🔍 DEBUG loadData - schedulesData para ${employee.id}, fecha ${dateStr}:`, dateSchedules);
                                            // Si el empleado no tiene horarios asignados, no mostrar ningún turno (descanso)
                                            return { dateStr, schedules: dateSchedules };
                                        }
                                        return { dateStr, schedules: [] };
                                    } catch (scheduleError) {
                                        console.warn(`No se pudieron cargar los horarios del empleado ${employee.id} para la fecha ${dateStr}:`, scheduleError);
                                        // En caso de error, no mostrar ningún turno
                                        return { dateStr, schedules: [] };
                                    }
                                });

                                // Esperar a que todas las llamadas se completen
                                const scheduleResults = await Promise.all(schedulePromises);

                                // Almacenar los resultados en schedulesByDateAndEmployee
                                scheduleResults.forEach(({ dateStr, schedules }) => {
                                    schedulesByDateAndEmployee[employee.id][dateStr] = schedules;
                                });

                                // Usar los horarios de la fecha seleccionada como horarios por defecto
                                const selectedDateSchedules = schedulesByDateAndEmployee[employee.id][date] || [];
                                schedulesData[employee.id] = selectedDateSchedules;
                            } else {
                                // Si el empleado no tiene fichajes, cargar los horarios de la fecha seleccionada
                                const scheduleResponse = await employeeApi.getDailySchedule(employee.id, date);
                                console.log(`🔍 DEBUG loadData - scheduleResponse para ${employee.id}:`, scheduleResponse);
                                if (scheduleResponse.success && scheduleResponse.data) {
                                    const employeeSchedules = (scheduleResponse.data as any).schedules || [];
                                    console.log(`🔍 DEBUG loadData - employeeSchedules para ${employee.id}:`, employeeSchedules);
                                    // Si el empleado no tiene horarios asignados, no mostrar ningún turno (descanso)
                                    schedulesData[employee.id] = employeeSchedules;
                                }
                            }
                        } catch (scheduleError) {
                            console.warn(`No se pudieron cargar los horarios del empleado ${employee.id}:`, scheduleError);
                            // En caso de error, no mostrar ningún turno
                            schedulesData[employee.id] = [];
                        }
                    }
                }

                console.log('🔍 DEBUG loadData - schedulesData final:', schedulesData);
                console.log('🔍 DEBUG loadData - schedulesByDateAndEmployee final:', schedulesByDateAndEmployee);
                setSchedules(schedulesData);

                // Almacenar los horarios por fecha y por empleado en una variable adicional
                (window as any).schedulesByDateAndEmployee = schedulesByDateAndEmployee;
            }

        } catch (error: any) {
            setError(error.message || 'Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    // Convertir hora a posición en la línea de tiempo (porcentaje)
    const timeToPosition = (timeString: string): number => {
        const [hours, minutes] = timeString.split(':').map(Number);
        return ((hours * 60 + minutes) / (24 * 60)) * 100;
    };

    // Convertir hora a posición en la línea de tiempo (porcentaje) usando hora UTC
    const timeToPositionUTC = (timeString: string): number => {
        const [hours, minutes] = timeString.split(':').map(Number);
        return ((hours * 60 + minutes) / (24 * 60)) * 100;
    };

    // Calcular horas brutas del día (basadas en turnos asignados)
    const calculateGrossHours = (schedules: Schedule[]): number => {
        console.log('🔍 DEBUG calculateGrossHours - schedules recibidos:', schedules);
        console.log('🔍 DEBUG calculateGrossHours - número de schedules:', schedules.length);

        let totalMinutes = 0;

        schedules.forEach((schedule, index) => {
            console.log(`🔍 DEBUG schedule ${index}:`, {
                id: schedule.id,
                name: schedule.name,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                isReference: schedule.isReference
            });

            const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
            const [endHour, endMinute] = schedule.endTime.split(':').map(Number);

            let startTimeMinutes = startHour * 60 + startMinute;
            let endTimeMinutes = endHour * 60 + endMinute;

            console.log(`🔍 DEBUG schedule ${index} - tiempos en minutos:`, {
                startTimeMinutes,
                endTimeMinutes,
                startHour,
                startMinute,
                endHour,
                endMinute
            });

            // Si el turno cruza medianoche
            if (endTimeMinutes < startTimeMinutes) {
                endTimeMinutes += 24 * 60; // Añadir 24 horas
                console.log(`🔍 DEBUG schedule ${index} - cruza medianoche, nuevo endTimeMinutes:`, endTimeMinutes);
            }

            const duration = endTimeMinutes - startTimeMinutes;
            console.log(`🔍 DEBUG schedule ${index} - duration (minutos):`, duration);

            totalMinutes += Math.max(0, duration);
            console.log(`🔍 DEBUG schedule ${index} - totalMinutes acumulado:`, totalMinutes);
        });

        console.log('🔍 DEBUG calculateGrossHours - totalMinutes final:', totalMinutes);
        return totalMinutes; // Devolver minutos, se convertirá a horas en formatMinutes
    };

    // Calcular horas netas del día (basadas en fichajes reales)
    const calculateNetHours = (entries: TimeEntry[]): number => {
        let totalMinutes = 0;
        let lastEntryTime: Date | null = null;

        const sortedEntries = [...entries].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (const entry of sortedEntries) {
            const entryTime = new Date(entry.timestamp);

            if (entry.type === 'IN') {
                lastEntryTime = entryTime;
            } else if (entry.type === 'OUT' && lastEntryTime) {
                const duration = Math.round((entryTime.getTime() - lastEntryTime.getTime()) / (1000 * 60));
                totalMinutes += Math.max(0, duration);
                lastEntryTime = null;
            }
        }

        // Si hay una entrada sin salida, contar hasta la hora actual
        if (lastEntryTime && lastEntryTime < new Date()) {
            const duration = Math.round((new Date().getTime() - lastEntryTime.getTime()) / (1000 * 60));
            totalMinutes += Math.max(0, duration);
        }

        return totalMinutes;
    };

    // Calcular total de tiempo de pausa
    const calculateBreakMinutes = (entries: TimeEntry[]): number => {
        let totalMinutes = 0;
        let lastBreakTime: Date | null = null;

        const sortedEntries = [...entries].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (const entry of sortedEntries) {
            const entryTime = new Date(entry.timestamp);

            if (entry.type === 'BREAK') {
                lastBreakTime = entryTime;
            } else if (entry.type === 'RESUME' && lastBreakTime) {
                const duration = Math.round((entryTime.getTime() - lastBreakTime.getTime()) / (1000 * 60));
                totalMinutes += Math.max(0, duration);
                lastBreakTime = null;
            }
        }

        // Si hay una pausa sin reanudar, contar hasta la hora actual
        if (lastBreakTime && lastBreakTime < new Date()) {
            const duration = Math.round((new Date().getTime() - lastBreakTime.getTime()) / (1000 * 60));
            totalMinutes += Math.max(0, duration);
        }

        return totalMinutes;
    };

    // Formatear minutos a horas y minutos
    const formatMinutes = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins.toString().padStart(2, '0')}m`;
    };

    // Convertir timestamp a posición en la línea de tiempo
    const timestampToPosition = (timestamp: string): number => {
        const date = new Date(timestamp);
        // Usar hora local para mostrar correctamente los fichajes en la zona horaria del usuario
        const hours = date.getHours();
        const minutes = date.getMinutes();

        console.log('🔍 DEBUG timestampToPosition:', {
            timestamp,
            localHours: hours,
            localMinutes: minutes,
            utcHours: date.getUTCHours(),
            utcMinutes: date.getUTCMinutes(),
            timezoneOffset: date.getTimezoneOffset()
        });

        // Calcular posición basada en hora local
        const position = ((hours * 60 + minutes) / (24 * 60)) * 100;

        console.log('🔍 DEBUG timestampToPosition - posición calculada:', position);

        return position;
    };

    // Obtener tipo de fichaje
    const getTypeLabel = (type: string, breakType?: { name: string; color: string }) => {
        const types = {
            'IN': 'Entrada',
            'OUT': 'Salida',
            'BREAK': breakType ? breakType.name : 'Pausa',
            'RESUME': 'Reanudar',
        };
        return types[type as keyof typeof types] || type;
    };

    // Obtener color para tipo de fichaje
    const getTypeColor = (type: string) => {
        const colors = {
            'IN': 'bg-green-500',
            'OUT': 'bg-red-500',
            'BREAK': 'bg-yellow-500',
            'RESUME': 'bg-blue-500',
        };
        return colors[type as keyof typeof colors] || 'bg-gray-500';
    };

    // Determinar si un horario cruza medianoche
    const scheduleCrossesMidnight = (schedule: Schedule): boolean => {
        const [startHour] = schedule.startTime.split(':').map(Number);
        const [endHour] = schedule.endTime.split(':').map(Number);
        return endHour < startHour || (endHour === startHour && schedule.endTime < schedule.startTime);
    };

    // Verificar si un fichaje está dentro de algún horario asignado
    const isTimeEntryWithinSchedule = (entry: TimeEntry, schedules: Schedule[]): boolean => {
        if (schedules.length === 0) return false;

        const entryTime = new Date(entry.timestamp);
        // Usar hora local para verificar si el fichaje está dentro del horario
        const entryHours = entryTime.getHours();
        const entryMinutes = entryTime.getMinutes();
        const entryTotalMinutes = entryHours * 60 + entryMinutes;

        return schedules.some(schedule => {
            const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
            const [endHour, endMinute] = schedule.endTime.split(':').map(Number);

            let startMinutes = startHour * 60 + startMinute;
            let endMinutes = endHour * 60 + endMinute;

            // Si el turno cruza medianoche
            if (endMinutes < startMinutes) {
                endMinutes += 24 * 60; // Añadir 24 horas
                // Para el fichaje, si es antes de mediodía, considerarlo del día siguiente
                let adjustedEntryMinutes = entryTotalMinutes;
                if (entryTotalMinutes < startMinutes) {
                    adjustedEntryMinutes += 24 * 60;
                }
                return adjustedEntryMinutes >= startMinutes && adjustedEntryMinutes <= endMinutes;
            } else {
                // Turno normal
                return entryTotalMinutes >= startMinutes && entryTotalMinutes <= endMinutes;
            }
        });
    };

    // Agrupar registros por empleado y por fecha de calendario
    const groupEntriesByEmployeeAndDate = (entries: TimeEntry[]) => {
        const grouped: { [employeeId: string]: { [date: string]: TimeEntry[] } } = {};

        console.log('🔍 DEBUG groupEntriesByEmployeeAndDate - Procesando', entries.length, 'entries');

        entries.forEach(entry => {
            const entryTime = new Date(entry.timestamp);
            const originalDate = entryTime.toISOString().split('T')[0];
            let entryDate = originalDate;

            console.log('🔍 DEBUG groupEntriesByEmployeeAndDate - entry:', {
                id: entry.id,
                type: entry.type,
                timestamp: entry.timestamp,
                entryTime: entryTime.toString(),
                originalDate: originalDate,
                hours: entryTime.getHours(),
                minutes: entryTime.getMinutes(),
                dayOfWeek: entryTime.getDay(),
                timezoneOffset: entryTime.getTimezoneOffset()
            });

            // SIMPLIFICACIÓN: Todos los fichajes se agrupan por su fecha original
            // Sin ajustes automáticos para evitar confusiones
            // La visualización de turnos que cruzan medianoche se manejará solo en la posición visual

            if (!grouped[entry.employee.id]) {
                grouped[entry.employee.id] = {};
            }

            if (!grouped[entry.employee.id][entryDate]) {
                grouped[entry.employee.id][entryDate] = [];
            }

            grouped[entry.employee.id][entryDate].push(entry);
            console.log('🔍 DEBUG groupEntriesByEmployeeAndDate - entry agrupado:', {
                employeeId: entry.employee.id,
                entryDate: entryDate,
                totalEntriesInGroup: grouped[entry.employee.id][entryDate].length
            });
        });

        console.log('🔍 DEBUG groupEntriesByEmployeeAndDate - resultado final:', grouped);
        return grouped;
    };

    // Agrupar por empleado y fecha
    const entriesByEmployeeAndDate = groupEntriesByEmployeeAndDate(timeEntries);

    // DEBUG: Mostrar información detallada de agrupación
    console.log('🔍 DEBUG TimelineView - Resumen de agrupación:');
    Object.entries(entriesByEmployeeAndDate).forEach(([employeeId, dates]) => {
        console.log(`  Empleado ${employeeId}:`);
        Object.entries(dates).forEach(([date, entries]) => {
            console.log(`    Fecha ${date}: ${entries.length} entries`);
            entries.forEach(entry => {
                console.log(`      - ${entry.type} at ${entry.timestamp}`);
            });
        });
    });

    // Obtener empleados a mostrar
    const employeesToShow = selectedEmployee
        ? employees.filter(emp => emp.id === selectedEmployee)
        : employees; // Mostrar todos los empleados cuando no hay uno seleccionado

    // Obtener fechas únicas para mostrar
    const getUniqueDates = (employeeId: string): string[] => {
        const employeeEntries = entriesByEmployeeAndDate[employeeId] || {};
        return Object.keys(employeeEntries).sort();
    };

    // Formatear fecha para mostrar
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString + 'T00:00:00');
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return date.toLocaleDateString('es-ES', options);
    };

    // Determinar si una fecha es la fecha seleccionada
    const isSelectedDate = (dateString: string): boolean => {
        return dateString === date;
    };

    // Función para manejar el fichaje manual
    const handleManualPunch = async () => {
        if (!manualPunchData.employeeId || !manualPunchData.time) {
            setPunchError('Por favor, complete todos los campos');
            return;
        }

        try {
            setSubmittingPunch(true);
            setPunchError(null);

            // Combinar fecha y hora para crear el timestamp
            const dateTime = new Date(`${manualPunchData.date}T${manualPunchData.time}`);
            const timestamp = dateTime.toISOString();

            const punchData = {
                employeeId: manualPunchData.employeeId,
                type: manualPunchData.type,
                timestamp,
                source: 'ADMIN',
                createdByEmployee: false
            };

            const response = await timeEntryApi.createTimeEntry(punchData);

            if (response.success) {
                // Cerrar el formulario y recargar los datos
                setShowManualPunch(false);
                setManualPunchData({
                    employeeId: '',
                    type: 'IN',
                    date: date,
                    time: ''
                });
                loadData(); // Recargar los datos para mostrar el nuevo fichaje
            } else {
                setPunchError(response.message || 'Error al crear el fichaje');
            }
        } catch (error: any) {
            setPunchError(error.message || 'Error al crear el fichaje');
        } finally {
            setSubmittingPunch(false);
        }
    };

    // Función para abrir el formulario de fichaje manual
    const openManualPunchForm = (employeeId?: string) => {
        setManualPunchData({
            employeeId: employeeId || '',
            type: 'IN',
            date: date,
            time: ''
        });
        setShowManualPunch(true);
        setPunchError(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader size="lg" />
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
        <div className="space-y-4">
            {/* Selector de empleado y botón de fichaje manual */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <label className="block text-sm font-medium text-gray-700">
                        Filtrar por empleado:
                    </label>
                    <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Todos los empleados</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {emp.name} ({emp.dni})
                            </option>
                        ))}
                    </select>
                </div>

                <Button
                    variant="primary"
                    onClick={() => openManualPunchForm(selectedEmployee)}
                    className="flex items-center space-x-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Fichaje Manual</span>
                </Button>
            </div>

            {/* Línea de tiempo */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Encabezado con horas */}
                <div className="relative mb-6">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                        {hours.map(hour => (
                            <div key={`hour-label-${hour}`} className="flex-1 text-center">
                                {hour.toString().padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>
                    {/* Línea principal */}
                    <div className="relative h-2 bg-gray-200 rounded-full">
                        {/* Marcas de hora */}
                        {hours.map(hour => (
                            <div
                                key={`hour-mark-${hour}`}
                                className="absolute top-0 bottom-0 w-px bg-gray-400"
                                style={{ left: `${(hour / 24) * 100}%` }}
                            />
                        ))}
                    </div>
                </div>

                {/* Líneas de tiempo por empleado y fecha */}
                {employeesToShow.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No hay registros de fichaje para la fecha seleccionada.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {employeesToShow.map(employee => {
                            const uniqueDates = getUniqueDates(employee.id);

                            return (
                                <div key={employee.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                                    {/* Nombre del empleado */}
                                    <div className="mb-4">
                                        <span className="font-medium text-gray-900 text-lg">
                                            {employee.name} ({employee.dni})
                                        </span>
                                    </div>

                                    {/* Mostrar cada fecha con sus fichajes */}
                                    {uniqueDates.length === 0 ? (
                                        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                                            No hay registros para este empleado en el rango de fechas.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {uniqueDates.map(dateString => {
                                                const entriesForDate = entriesByEmployeeAndDate[employee.id]?.[dateString] || [];
                                                const isMainDate = isSelectedDate(dateString);

                                                console.log(`🔍 DEBUG render - Procesando fecha ${dateString} para empleado ${employee.id}:`, {
                                                    entriesCount: entriesForDate.length,
                                                    entries: entriesForDate.map(e => ({
                                                        id: e.id,
                                                        type: e.type,
                                                        timestamp: e.timestamp,
                                                        hour: new Date(e.timestamp).getHours(),
                                                        date: new Date(e.timestamp).toISOString().split('T')[0]
                                                    })),
                                                    isMainDate,
                                                    isSelectedDate: isSelectedDate(dateString),
                                                    selectedDateProp: date
                                                });

                                                return (
                                                    <div key={dateString} className={`rounded-lg p-4 ${isMainDate ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                                                        {/* Encabezado de fecha */}
                                                        <div className="mb-3">
                                                            <span className={`font-medium ${isMainDate ? 'text-blue-900' : 'text-gray-700'}`}>
                                                                {formatDate(dateString)}
                                                                {isMainDate && (
                                                                    <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                                                                        Fecha seleccionada
                                                                    </span>
                                                                )}
                                                                <span className="ml-2 text-xs text-gray-500">
                                                                    (DEBUG: {dateString})
                                                                </span>
                                                            </span>
                                                        </div>

                                                        {/* Línea de tiempo del empleado para esta fecha */}
                                                        <div className="relative h-12 bg-white rounded-full border border-gray-300">
                                                            {/* Indicador de día de descanso */}
                                                            {((window as any).schedulesByDateAndEmployee?.[employee.id]?.[dateString] || []).length === 0 && (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <span className="text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                                                                        🏖️ Día de descanso
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Horarios asignados (turnos) - mostrar en la fecha seleccionada y en días con fichajes */}
                                                            {(isMainDate || entriesForDate.length > 0) && ((window as any).schedulesByDateAndEmployee?.[employee.id]?.[dateString] || [])?.map((schedule: Schedule) => {
                                                                const crossesMidnight = scheduleCrossesMidnight(schedule);
                                                                let startPosition = timeToPositionUTC(schedule.startTime);
                                                                let endPosition = timeToPositionUTC(schedule.endTime);
                                                                let width = endPosition - startPosition;
                                                                const isReference = schedule.isReference || false;

                                                                // Si el horario cruza medianoche, mostrarlo desde la hora de inicio hasta el final del día
                                                                if (crossesMidnight) {
                                                                    // Mantener la posición de inicio, pero extender hasta el final del día (100%)
                                                                    endPosition = 100;
                                                                    width = endPosition - startPosition;
                                                                }

                                                                return (
                                                                    <div
                                                                        key={`schedule-${employee.id}-${schedule.id}-${dateString}`}
                                                                        className={`absolute top-1 bottom-1 rounded-md border-2 ${isReference
                                                                            ? 'border-dashed border-gray-300'
                                                                            : 'border-solid border-gray-400'
                                                                            }`}
                                                                        style={{
                                                                            left: `${startPosition}%`,
                                                                            width: `${width}%`,
                                                                            backgroundColor: schedule.color || '#e5e7eb',
                                                                            opacity: isMainDate
                                                                                ? (isReference ? 0.4 : 0.75)
                                                                                : (isReference ? 0.25 : 0.5)
                                                                        }}
                                                                        title={`${schedule.name}: ${schedule.startTime} - ${schedule.endTime}${crossesMidnight ? ' (cruza medianoche)' : ''}${isReference ? ' (turno predefinido)' : ''}`}
                                                                    >
                                                                        <div className={`text-xs text-center font-medium truncate px-1 ${isMainDate
                                                                            ? (isReference ? 'text-gray-500' : 'text-gray-700')
                                                                            : (isReference ? 'text-gray-400' : 'text-gray-600')
                                                                            }`}>
                                                                            {schedule.name}
                                                                            {crossesMidnight && (
                                                                                <span className="ml-1">🌙</span>
                                                                            )}
                                                                            {isReference && (
                                                                                <span className="ml-1 text-xs">📅</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Registros de fichaje para esta fecha */}
                                                            {entriesForDate.map(entry => {
                                                                const position = timestampToPosition(entry.timestamp);
                                                                const schedulesForDate = (window as any).schedulesByDateAndEmployee?.[employee.id]?.[dateString] || [];
                                                                const isWithinSchedule = isTimeEntryWithinSchedule(entry, schedulesForDate);
                                                                const isOutsideSchedule = !isWithinSchedule && schedulesForDate.length > 0;

                                                                // Calcular tiempo de retraso para fichajes IN fuera de horario
                                                                let delayMinutes: number | null = null;
                                                                if (entry.type === 'IN' && schedulesForDate.length > 0) {
                                                                    // Encontrar el turno más temprano
                                                                    const earliestSchedule = schedulesForDate.reduce((earliest: Schedule, schedule: Schedule) => {
                                                                        const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
                                                                        const earliestStartHour = earliest.startTime.split(':')[0];
                                                                        const earliestStartMinute = earliest.startTime.split(':')[1];
                                                                        const startMinutes = startHour * 60 + startMinute;
                                                                        const earliestStartMinutes = parseInt(earliestStartHour) * 60 + parseInt(earliestStartMinute);
                                                                        return startMinutes < earliestStartMinutes ? schedule : earliest;
                                                                    }, schedulesForDate[0]);

                                                                    const [scheduleStartHour, scheduleStartMinute] = earliestSchedule.startTime.split(':').map(Number);
                                                                    const scheduleStartMinutes = scheduleStartHour * 60 + scheduleStartMinute;

                                                                    const entryTime = new Date(entry.timestamp);
                                                                    const entryMinutes = entryTime.getHours() * 60 + entryTime.getMinutes();

                                                                    // Calcular el retraso
                                                                    if (entryMinutes > scheduleStartMinutes) {
                                                                        delayMinutes = entryMinutes - scheduleStartMinutes;
                                                                    }
                                                                }

                                                                const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
                                                                const entryHour = new Date(entry.timestamp).getHours();

                                                                console.log(`🔍 DEBUG render - Renderizando entry ${entry.id} (${entry.type}) en fecha ${dateString}:`, {
                                                                    entryTimestamp: entry.timestamp,
                                                                    entryDate,
                                                                    entryHour,
                                                                    position,
                                                                    containerDateString: dateString,
                                                                    datesMatch: entryDate === dateString,
                                                                    isWithinSchedule,
                                                                    isOutsideSchedule,
                                                                    delayMinutes
                                                                });

                                                                return (
                                                                    <div
                                                                        key={`entry-${entry.id}-${dateString}`}
                                                                        className={`absolute top-0 bottom-0 w-3 rounded-full ${getTypeColor(entry.type)} border-2 border-white shadow-sm transform -translate-x-1/2 cursor-pointer hover:scale-125 transition-transform ${isOutsideSchedule ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}
                                                                        style={{ left: `${position}%` }}
                                                                        title={`${getTypeLabel(entry.type)}: ${new Date(entry.timestamp).toLocaleTimeString('es-ES')}${isOutsideSchedule ? ' (FUERA DE HORARIO)' : ''}${delayMinutes !== null ? ` (Retraso: ${formatMinutes(delayMinutes)})` : ''}`}
                                                                    >
                                                                        {/* Indicador de fuera de horario */}
                                                                        {isOutsideSchedule && (
                                                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></div>
                                                                        )}

                                                                        {/* Indicador de retraso */}
                                                                        {delayMinutes !== null && delayMinutes > 0 && (
                                                                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-orange-500 rounded-full border border-white animate-pulse"></div>
                                                                        )}

                                                                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity z-10">
                                                                            {getTypeLabel(entry.type, entry.breakType)}
                                                                            <br />
                                                                            {new Date(entry.timestamp).toLocaleTimeString('es-ES')}
                                                                            <br />
                                                                            <span className="text-xs text-gray-400">
                                                                                Fecha: {entryDate} | Container: {dateString}
                                                                            </span>
                                                                            {isOutsideSchedule && (
                                                                                <>
                                                                                    <br />
                                                                                    <span className="text-red-300 font-semibold">⚠️ Fuera de horario</span>
                                                                                </>
                                                                            )}
                                                                            {delayMinutes !== null && delayMinutes > 0 && (
                                                                                <>
                                                                                    <br />
                                                                                    <span className="text-orange-300 font-semibold">⏰ Retraso: {formatMinutes(delayMinutes)}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Leyenda de tipos de fichaje para esta fecha */}
                                                        {entriesForDate.length > 0 && (
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {(() => {
                                                                    const uniqueTypes = Array.from(new Set(entriesForDate.map(e => e.type)));
                                                                    // Ordenar tipos: primero IN (Entrada), luego OUT (Salida), luego el resto
                                                                    const orderedTypes = uniqueTypes.sort((a, b) => {
                                                                        if (a === 'IN') return -1;
                                                                        if (b === 'IN') return 1;
                                                                        if (a === 'OUT') return -1;
                                                                        if (b === 'OUT') return 1;
                                                                        return 0;
                                                                    });
                                                                    return orderedTypes;
                                                                })().map(type => (
                                                                    <div key={type} className="flex items-center space-x-1">
                                                                        <div className={`w-3 h-3 rounded-full ${getTypeColor(type)}`} />
                                                                        <span className="text-xs text-gray-600">
                                                                            {type === 'BREAK' && entriesForDate.find(e => e.type === 'BREAK')?.breakType
                                                                                ? getTypeLabel(type, entriesForDate.find(e => e.type === 'BREAK')?.breakType)
                                                                                : getTypeLabel(type)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                <div className="text-xs text-gray-500 ml-2">
                                                                    {entriesForDate.length} fichaje{entriesForDate.length !== 1 ? 's' : ''}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Resumen de horas */}
                                                        <div className="mt-3 text-xs text-gray-600">
                                                            <div className="flex flex-wrap gap-4">
                                                                {/* Horas brutas (basadas en turnos) */}
                                                                {((window as any).schedulesByDateAndEmployee?.[employee.id]?.[dateString] || [])?.length > 0 && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <span className="font-medium">Horas brutas:</span>
                                                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                            {(() => {
                                                                                console.log('🔍 DEBUG render - employee.id:', employee.id);
                                                                                console.log('🔍 DEBUG render - schedules[employee.id]:', schedules[employee.id]);
                                                                                const schedulesForDate = (window as any).schedulesByDateAndEmployee?.[employee.id]?.[dateString] || [];
                                                                                console.log('🔍 DEBUG render - schedulesForDate:', schedulesForDate);
                                                                                const grossHours = calculateGrossHours(schedulesForDate);
                                                                                console.log('🔍 DEBUG render - grossHours calculadas:', grossHours);
                                                                                return formatMinutes(grossHours);
                                                                            })()}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Horas netas (basadas en fichajes) */}
                                                                <div className="flex items-center space-x-1">
                                                                    <span className="font-medium">Horas netas:</span>
                                                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                                                        {formatMinutes(calculateNetHours(entriesForDate))}
                                                                    </span>
                                                                </div>

                                                                {/* Tiempo de pausa */}
                                                                <div className="flex items-center space-x-1">
                                                                    <span className="font-medium">Tiempo de pausa:</span>
                                                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                                        {formatMinutes(calculateBreakMinutes(entriesForDate))}
                                                                    </span>
                                                                </div>

                                                                {/* Total de retrasos */}
                                                                {(() => {
                                                                    const totalDelayMinutes = entriesForDate.reduce((total, entry) => {
                                                                        if (entry.type === 'IN') {
                                                                            const schedulesForDate = (window as any).schedulesByDateAndEmployee?.[employee.id]?.[dateString] || [];
                                                                            if (schedulesForDate.length > 0) {
                                                                                // Encontrar el turno más temprano
                                                                                const earliestSchedule = schedulesForDate.reduce((earliest: Schedule, schedule: Schedule) => {
                                                                                    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
                                                                                    const earliestStartHour = earliest.startTime.split(':')[0];
                                                                                    const earliestStartMinute = earliest.startTime.split(':')[1];
                                                                                    const startMinutes = startHour * 60 + startMinute;
                                                                                    const earliestStartMinutes = parseInt(earliestStartHour) * 60 + parseInt(earliestStartMinute);
                                                                                    return startMinutes < earliestStartMinutes ? schedule : earliest;
                                                                                }, schedulesForDate[0]);

                                                                                const [scheduleStartHour, scheduleStartMinute] = earliestSchedule.startTime.split(':').map(Number);
                                                                                const scheduleStartMinutes = scheduleStartHour * 60 + scheduleStartMinute;

                                                                                const entryTime = new Date(entry.timestamp);
                                                                                const entryMinutes = entryTime.getHours() * 60 + entryTime.getMinutes();

                                                                                // Calcular el retraso
                                                                                if (entryMinutes > scheduleStartMinutes) {
                                                                                    return total + (entryMinutes - scheduleStartMinutes);
                                                                                }
                                                                            }
                                                                        }
                                                                        return total;
                                                                    }, 0);

                                                                    return totalDelayMinutes > 0 && (
                                                                        <div className="flex items-center space-x-1">
                                                                            <span className="font-medium">Total de retrasos:</span>
                                                                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded flex items-center space-x-1">
                                                                                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                                                                <span>{formatMinutes(totalDelayMinutes)}</span>
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })()}

                                                                {/* Fichajes fuera de horario */}
                                                                {((window as any).schedulesByDateAndEmployee?.[employee.id]?.[dateString] || [])?.length > 0 && entriesForDate.length > 0 && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <span className="font-medium">Fuera de horario:</span>
                                                                        {(() => {
                                                                            const schedulesForDate = (window as any).schedulesByDateAndEmployee?.[employee.id]?.[dateString] || [];
                                                                            const outsideScheduleCount = entriesForDate.filter(entry =>
                                                                                !isTimeEntryWithinSchedule(entry, schedulesForDate)
                                                                            ).length;
                                                                            return outsideScheduleCount > 0 ? (
                                                                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded flex items-center space-x-1">
                                                                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                                                                    <span>{outsideScheduleCount} fichaje{outsideScheduleCount !== 1 ? 's' : ''}</span>
                                                                                </span>
                                                                            ) : (
                                                                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                                                    Ninguno
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}

                                                                {/* Información adicional */}
                                                                {((window as any).schedulesByDateAndEmployee?.[employee.id]?.[dateString] || [])?.length > 0 && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <span className="text-gray-500">
                                                                            {(() => {
                                                                                const schedulesForDate = (window as any).schedulesByDateAndEmployee?.[employee.id]?.[dateString] || [];
                                                                                return `${schedulesForDate.length} turno${schedulesForDate.length !== 1 ? 's' : ''}`;
                                                                            })()}
                                                                        </span>
                                                                        {((window as any).schedulesByDateAndEmployee?.[employee.id]?.[dateString] || [])?.some((s: Schedule) => scheduleCrossesMidnight(s)) && (
                                                                            <span className="text-blue-600">
                                                                                <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-1"></span>
                                                                                Cruza medianoche
                                                                            </span>
                                                                        )}
                                                                        {!isMainDate && (
                                                                            <span className="text-gray-500">
                                                                                <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                                                                                Predefinido
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                <div className="text-sm">
                    <strong>Información:</strong>
                    <ul className="mt-1 ml-4 list-disc space-y-1">
                        <li>Los rectángulos coloreados representan los turnos asignados (visibles solo en la fecha seleccionada)</li>
                        <li>Los círculos indican los registros de fichaje reales</li>
                        <li><strong>Horas brutas:</strong> Total de horas asignadas según los turnos predefinidos del día</li>
                        <li><strong>Horas netas:</strong> Total de horas realmente trabajadas según fichajes de entrada/salida</li>
                        <li><strong>Tiempo de pausa:</strong> Total de tiempo de pausa según fichajes de pausa/reanudar</li>
                        <li><strong>Fichajes fuera de horario:</strong> Se muestran con un anillo rojo y un punto rojo parpadeante</li>
                        <li>Los turnos que cruzan medianoche se muestran ocupando todo el ancho con el símbolo 🌙</li>
                        <li>Los turnos predefinidos se muestran con menor opacidad y símbolo 📅</li>
                        <li>Los fichajes están separados por fechas para mayor claridad</li>
                        <li>La fecha seleccionada aparece resaltada en azul con los turnos asignados</li>
                        <li>Pasa el cursor sobre los elementos para ver más detalles</li>
                    </ul>
                </div>
            </div>

            {/* Modal para fichaje manual */}
            {showManualPunch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Fichaje Manual
                            </h3>
                            <button
                                onClick={() => setShowManualPunch(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {punchError && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
                                {punchError}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Selector de empleado */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Empleado
                                </label>
                                <select
                                    value={manualPunchData.employeeId}
                                    onChange={(e) => setManualPunchData({ ...manualPunchData, employeeId: e.target.value })}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="">Seleccionar empleado...</option>
                                    {employees.map(emp => (
                                        <option key={`manual-emp-${emp.id}`} value={emp.id}>
                                            {emp.name} ({emp.dni})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Tipo de fichaje */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Fichaje
                                </label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="IN"
                                            checked={manualPunchData.type === 'IN'}
                                            onChange={(e) => setManualPunchData({ ...manualPunchData, type: e.target.value as 'IN' | 'OUT' })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm text-gray-700">Entrada</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="OUT"
                                            checked={manualPunchData.type === 'OUT'}
                                            onChange={(e) => setManualPunchData({ ...manualPunchData, type: e.target.value as 'IN' | 'OUT' })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm text-gray-700">Salida</span>
                                    </label>
                                </div>
                            </div>

                            {/* Fecha */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha
                                </label>
                                <input
                                    type="date"
                                    value={manualPunchData.date}
                                    onChange={(e) => setManualPunchData({ ...manualPunchData, date: e.target.value })}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            {/* Hora */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Hora
                                </label>
                                <input
                                    type="time"
                                    value={manualPunchData.time}
                                    onChange={(e) => setManualPunchData({ ...manualPunchData, time: e.target.value })}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <Button
                                variant="secondary"
                                onClick={() => setShowManualPunch(false)}
                                disabled={submittingPunch}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleManualPunch}
                                disabled={submittingPunch}
                                className="flex items-center space-x-2"
                            >
                                {submittingPunch && (
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                <span>{submittingPunch ? 'Guardando...' : 'Registrar Fichaje'}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimelineView;