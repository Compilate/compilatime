import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { employeeApi } from '../../lib/api';
import CalendarView from '../../components/employee/CalendarView';
// import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';

interface DailySchedule {
    date: string;
    dayOfWeek: number;
    dayName: string;
    schedules: Array<{
        id: string;
        name: string;
        startTime: string;
        endTime: string;
        breakTime: number;
        flexible: boolean;
    }>;
    timeEntries: Array<{
        id: string;
        type: string;
        timestamp: string;
        source: string;
    }>;
    workedMinutes: number;
    workedHours: number;
    workedMinutesRemainder: number;
}

interface WeeklySchedule {
    startDate: string;
    endDate: string;
    dailySchedules: DailySchedule[];
    totals: {
        workedMinutes: number;
        workedHours: number;
        workedMinutesRemainder: number;
    };
    workDays: Array<{
        date: string;
        startTime?: string;
        endTime?: string;
        workedMinutes: number;
        overtimeMinutes: number;
        breakMinutes: number;
        status: string;
    }>;
}

const HorarioPage: React.FC = () => {
    const [view, setView] = useState<'daily' | 'weekly' | 'calendar'>('calendar');
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [weeklyStart, setWeeklyStart] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dailySchedule, setDailySchedule] = useState<DailySchedule | null>(null);
    const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null);
    const [calendarSchedule, setCalendarSchedule] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        console.log('🔍 HorarioPage - Estado de autenticación:', {
            isAuthenticated,
            hasUser: !!user,
            userName: user?.name,
            currentPath: window.location.pathname
        });

        if (!isAuthenticated || !user) {
            console.log('🔍 HorarioPage - Redirigiendo a login porque no está autenticado');
            navigate('/area/login');
            return;
        }

        console.log('🔍 HorarioPage - Usuario autenticado, cargando horario...');
        loadSchedule();
    }, [isAuthenticated, user, view, selectedDate, weeklyStart, currentDate]);

    const loadSchedule = async () => {
        try {
            setLoading(true);
            setError(null);

            if (view === 'daily') {
                const response = await employeeApi.getMyDailySchedule(selectedDate);
                if (response.success && response.data) {
                    setDailySchedule(response.data as DailySchedule);
                }
            } else if (view === 'weekly') {
                const response = await employeeApi.getMyWeeklySchedule(weeklyStart);
                if (response.success && response.data) {
                    setWeeklySchedule(response.data as WeeklySchedule);
                }
            } else if (view === 'calendar') {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                const response = await employeeApi.getMyWeeklySchedule(dateStr);
                if (response.success && response.data) {
                    console.log('🔍 DEBUG - Respuesta completa del backend:', response.data);
                    console.log('🔍 DEBUG - dailySchedules:', (response.data as any).dailySchedules);
                    console.log('🔍 DEBUG - week:', (response.data as any).week);

                    const dailySchedules = (response.data as any).dailySchedules || (response.data as any).week || [];
                    console.log('🔍 DEBUG - dailySchedules procesadas:', dailySchedules);

                    if (dailySchedules.length > 0) {
                        console.log('🔍 DEBUG - Primer día con datos:', dailySchedules[0]);
                        console.log('🔍 DEBUG - Schedules del primer día:', dailySchedules[0].schedules);
                    }

                    setCalendarSchedule(response.data);
                }
            }
        } catch (error: any) {
            console.error('❌ Error en loadSchedule:', error);
            setError(error.message || 'Error al cargar el horario');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (time: string) => {
        if (!time) return '--:--';
        const [hours, minutes] = time.split(':');
        return `${hours}:${minutes}`;
    };

    const formatMinutes = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const getEntryTypeLabel = (type: string) => {
        const labels = {
            'IN': 'Entrada',
            'OUT': 'Salida',
            'BREAK': 'Pausa',
            'RESUME': 'Reanudar'
        };
        return labels[type as keyof typeof labels] || type;
    };

    const getEntryTypeColor = (type: string) => {
        const colors = {
            'IN': 'bg-green-100 text-green-800',
            'OUT': 'bg-red-100 text-red-800',
            'BREAK': 'bg-yellow-100 text-yellow-800',
            'RESUME': 'bg-blue-100 text-blue-800'
        };
        return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const goToPreviousDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - 1);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const goToNextDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + 1);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const goToPreviousWeek = () => {
        const date = new Date(weeklyStart);
        date.setDate(date.getDate() - 7);
        setWeeklyStart(date.toISOString().split('T')[0]);
    };

    const goToNextWeek = () => {
        const date = new Date(weeklyStart);
        date.setDate(date.getDate() + 7);
        setWeeklyStart(date.toISOString().split('T')[0]);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow-sm rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">
                            Mi Horario
                        </h1>

                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {/* Selector de vista */}
                        <div className="mb-6 flex space-x-4">
                            <button
                                onClick={() => setView('daily')}
                                className={`px-4 py-2 rounded-md font-medium ${view === 'daily'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                Vista Diaria
                            </button>
                            <button
                                onClick={() => setView('weekly')}
                                className={`px-4 py-2 rounded-md font-medium ${view === 'weekly'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                Vista Semanal
                            </button>
                            <button
                                onClick={() => setView('calendar')}
                                className={`px-4 py-2 rounded-md font-medium ${view === 'calendar'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                Vista Calendario
                            </button>
                        </div>

                        {/* Controles de navegación */}
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                {view === 'daily' ? (
                                    <>
                                        <button
                                            onClick={goToPreviousDay}
                                            className="p-2 rounded-md bg-gray-200 hover:bg-gray-300"
                                        >
                                            ←
                                        </button>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={goToNextDay}
                                            className="p-2 rounded-md bg-gray-200 hover:bg-gray-300"
                                        >
                                            →
                                        </button>
                                    </>
                                ) : view === 'weekly' ? (
                                    <>
                                        <button
                                            onClick={goToPreviousWeek}
                                            className="p-2 rounded-md bg-gray-200 hover:bg-gray-300"
                                        >
                                            ← Semana
                                        </button>
                                        <input
                                            type="date"
                                            value={weeklyStart}
                                            onChange={(e) => setWeeklyStart(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={goToNextWeek}
                                            className="p-2 rounded-md bg-gray-200 hover:bg-gray-300"
                                        >
                                            Semana →
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                const newDate = new Date(currentDate);
                                                newDate.setMonth(newDate.getMonth() - 1);
                                                setCurrentDate(newDate);
                                            }}
                                            className="p-2 rounded-md bg-gray-200 hover:bg-gray-300"
                                        >
                                            ←
                                        </button>
                                        <span className="font-medium text-gray-900">
                                            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const newDate = new Date(currentDate);
                                                newDate.setMonth(newDate.getMonth() + 1);
                                                setCurrentDate(newDate);
                                            }}
                                            className="p-2 rounded-md bg-gray-200 hover:bg-gray-300"
                                        >
                                            →
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Vista Diaria */}
                        {view === 'daily' && dailySchedule && (
                            <div className="space-y-6">
                                <div className="bg-gray-50 rounded-lg p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                        {dailySchedule.dayName} - {dailySchedule.date}
                                    </h2>

                                    {/* Horarios asignados */}
                                    {dailySchedule.schedules.length > 0 && (
                                        <div className="mb-6">
                                            <h3 className="text-md font-medium text-gray-700 mb-3">
                                                Horario Asignado
                                            </h3>
                                            <div className="space-y-2">
                                                {dailySchedule.schedules.map((schedule) => (
                                                    <div
                                                        key={schedule.id}
                                                        className="bg-white p-4 rounded-md border border-gray-200"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-medium text-gray-900">
                                                                {schedule.name}
                                                            </span>
                                                            <span className="text-gray-600">
                                                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                                            </span>
                                                        </div>
                                                        {schedule.breakTime > 0 && (
                                                            <div className="text-sm text-gray-500 mt-1">
                                                                Descanso: {schedule.breakTime} minutos
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Fichajes del día */}
                                    <div className="mb-6">
                                        <h3 className="text-md font-medium text-gray-700 mb-3">
                                            Fichajes del Día
                                        </h3>
                                        <div className="space-y-2">
                                            {dailySchedule.timeEntries.length > 0 ? (
                                                dailySchedule.timeEntries.map((entry) => (
                                                    <div
                                                        key={entry.id}
                                                        className="flex items-center justify-between bg-white p-3 rounded-md border border-gray-200"
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEntryTypeColor(entry.type)}`}>
                                                                {getEntryTypeLabel(entry.type)}
                                                            </span>
                                                            <span className="text-gray-900">
                                                                {new Date(entry.timestamp).toLocaleTimeString('es-ES', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm text-gray-500">
                                                            {entry.source}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-gray-500 text-center py-4">
                                                    No hay fichajes registrados para este día
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Resumen del día */}
                                    <div className="bg-blue-50 rounded-lg p-6">
                                        <h3 className="text-md font-medium text-blue-900 mb-3">
                                            Resumen del Día
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {dailySchedule.workedHours}
                                                </div>
                                                <div className="text-sm text-blue-700">
                                                    horas trabajadas
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {dailySchedule.workedMinutesRemainder}
                                                </div>
                                                <div className="text-sm text-blue-700">
                                                    minutos restantes
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {formatMinutes(dailySchedule.workedMinutes)}
                                                </div>
                                                <div className="text-sm text-blue-700">
                                                    total tiempo
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Vista Semanal */}
                        {view === 'weekly' && weeklySchedule && (
                            <div className="space-y-6">
                                <div className="bg-gray-50 rounded-lg p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                        Semana del {weeklySchedule.startDate} al {weeklySchedule.endDate}
                                    </h2>

                                    {/* Resumen semanal */}
                                    <div className="bg-blue-50 rounded-lg p-6 mb-6">
                                        <h3 className="text-md font-medium text-blue-900 mb-3">
                                            Resumen de la Semana
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {weeklySchedule.totals.workedHours}
                                                </div>
                                                <div className="text-sm text-blue-700">
                                                    horas totales
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {weeklySchedule.totals.workedMinutesRemainder}
                                                </div>
                                                <div className="text-sm text-blue-700">
                                                    minutos restantes
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {formatMinutes(weeklySchedule.totals.workedMinutes)}
                                                </div>
                                                <div className="text-sm text-blue-700">
                                                    tiempo total
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalle diario */}
                                    <div className="space-y-4">
                                        <h3 className="text-md font-medium text-gray-700 mb-3">
                                            Detalle Diario
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {weeklySchedule.dailySchedules.map((day, index) => (
                                                <div
                                                    key={index}
                                                    className="bg-white p-4 rounded-md border border-gray-200"
                                                >
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h4 className="font-medium text-gray-900">
                                                            {day.dayName}
                                                        </h4>
                                                        <span className="text-sm text-gray-500">
                                                            {day.date}
                                                        </span>
                                                    </div>

                                                    {day.schedules.length > 0 && (
                                                        <div className="space-y-2 mb-3">
                                                            {day.schedules.map((schedule) => (
                                                                <div
                                                                    key={schedule.id}
                                                                    className="text-sm"
                                                                >
                                                                    <span className="font-medium">
                                                                        {schedule.name}:
                                                                    </span>
                                                                    <span className="text-gray-600">
                                                                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="text-sm space-y-1">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Trabajado:</span>
                                                            <span className="font-medium">
                                                                {formatMinutes(day.workedMinutes)}
                                                            </span>
                                                        </div>
                                                        {(day as any).overtimeMinutes > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Extra:</span>
                                                                <span className="font-medium text-orange-600">
                                                                    {formatMinutes((day as any).overtimeMinutes)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Vista Calendario */}
                        {view === 'calendar' && calendarSchedule && (
                            <>
                                {(() => {
                                    const dailySchedules = calendarSchedule.dailySchedules || calendarSchedule.week || [];

                                    // Transformar los datos al formato que espera CalendarView
                                    const transformedData = dailySchedules.map((day: any) => ({
                                        date: day.date,
                                        dayName: day.dayName,
                                        schedules: day.schedules || [],
                                        timeEntries: day.timeEntries || []
                                    }));

                                    return (
                                        <CalendarView
                                            currentMonth={currentDate.getMonth()}
                                            currentYear={currentDate.getFullYear()}
                                            dailySchedules={transformedData}
                                            onDateSelect={() => {
                                                // Opcional: manejar la selección de fecha
                                            }}
                                        />
                                    );
                                })()}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HorarioPage;