import React, { useState } from 'react';

interface CalendarDay {
    date: number;
    dayName: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    schedules?: Array<{
        id: string;
        name: string;
        startTime: string;
        endTime: string;
        color?: string;
    }>;
    timeEntries?: Array<{
        id: string;
        type: string;
        timestamp: string;
    }>;
}

interface CalendarViewProps {
    currentMonth: number;
    currentYear: number;
    dailySchedules: Array<{
        date: string;
        dayName: string;
        schedules: Array<{
            id: string;
            name: string;
            startTime: string;
            endTime: string;
            color?: string;
        }>;
        timeEntries: Array<{
            id: string;
            type: string;
            timestamp: string;
        }>;
    }>;
    onDateSelect?: (date: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
    currentMonth,
    currentYear,
    dailySchedules,
    onDateSelect
}) => {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);


    // Funciones auxiliares
    const getDayName = (date: Date): string => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[date.getDay()];
    };

    const isDateToday = (dateStr: string): boolean => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return dateStr === todayStr;
    };

    // Obtener el primer día del mes (ajustado para que la semana empiece por lunes)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Convertir domingo (0) a 6, y restar 1 a los demás

    // Obtener el número de días en el mes
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Obtener el número de días del mes anterior
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Crear un mapa con los datos de horarios por fecha
    const scheduleMap = new Map<string, CalendarDay>();
    dailySchedules.forEach(day => {
        // Extraer el día de la fecha (asumiendo formato YYYY-MM-DD)
        const dayOfMonth = parseInt(day.date.split('-')[2]);

        // Asegurarse de que la fecha tenga el formato correcto
        const normalizedDate = day.date;

        scheduleMap.set(normalizedDate, {
            date: dayOfMonth,
            dayName: day.dayName,
            isCurrentMonth: true,
            isToday: isDateToday(normalizedDate),
            schedules: day.schedules || [],
            timeEntries: day.timeEntries || []
        });
    });

    // Generar días del calendario
    const generateCalendarDays = (): CalendarDay[] => {
        const days: CalendarDay[] = [];

        // Días del mes anterior (ajustado para semana que empieza por lunes)
        for (let i = adjustedFirstDay - 1; i >= 0; i--) {
            const date = daysInPrevMonth - adjustedFirstDay + i + 1;
            days.push({
                date,
                dayName: '',
                isCurrentMonth: false,
                isToday: false
            });
        }

        // Días del mes actual
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            // Intentar encontrar los datos para esta fecha
            let dayData = scheduleMap.get(dateStr);

            if (dayData) {
                days.push(dayData);
            } else {
                days.push({
                    date: i,
                    dayName: getDayName(new Date(currentYear, currentMonth, i)),
                    isCurrentMonth: true,
                    isToday: isDateToday(dateStr),
                    schedules: [],
                    timeEntries: []
                });
            }
        }

        // Días del mes siguiente para completar la cuadrícula
        const remainingDays = 42 - days.length; // 6 semanas × 7 días = 42
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: i,
                dayName: '',
                isCurrentMonth: false,
                isToday: false
            });
        }

        return days;
    };


    const getScheduleColor = (color?: string): string => {
        if (!color) return 'bg-blue-100 text-blue-800 border-blue-200';

        const colorMap: Record<string, string> = {
            'red': 'bg-red-100 text-red-800 border-red-200',
            'green': 'bg-green-100 text-green-800 border-green-200',
            'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'purple': 'bg-purple-100 text-purple-800 border-purple-200',
            'pink': 'bg-pink-100 text-pink-800 border-pink-200',
            'indigo': 'bg-indigo-100 text-indigo-800 border-indigo-200',
            'gray': 'bg-gray-100 text-gray-800 border-gray-200'
        };

        return colorMap[color] || 'bg-blue-100 text-blue-800 border-blue-200';
    };

    const handleDateClick = (day: CalendarDay) => {
        if (day.isCurrentMonth && onDateSelect) {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
            setSelectedDate(dateStr);
            onDateSelect(dateStr);
        }
    };

    const calendarDays = generateCalendarDays();


    return (
        <div className="bg-white rounded-lg shadow">
            <div className="grid grid-cols-7 gap-1 p-4">
                {/* Días de la semana (empezando por lunes) */}
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-700 py-2">
                        {day}
                    </div>
                ))}

                {/* Días del calendario */}
                {calendarDays.map((day, index) => (
                    <div
                        key={index}
                        onClick={() => handleDateClick(day)}
                        className={`
                            min-h-[100px] p-2 border rounded-lg transition-all
                            ${day.isCurrentMonth
                                ? 'bg-white hover:bg-gray-50 cursor-pointer border-gray-200'
                                : 'bg-gray-50 text-gray-400 border-gray-100'
                            }
                            ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                            ${selectedDate === `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day.date).padStart(2, '0')}` ? 'bg-blue-50' : ''}
                        `}
                    >
                        <div className="text-sm font-medium mb-1">
                            {day.date}
                        </div>

                        {day.isCurrentMonth && day.dayName && (
                            <div className="text-xs text-gray-600 mb-2">
                                {day.dayName}
                            </div>
                        )}

                        {day.isCurrentMonth && day.schedules && day.schedules.length > 0 && (
                            <div className="space-y-1">
                                {day.schedules.map((schedule) => (
                                    <div
                                        key={schedule.id}
                                        className={`text-xs p-1 rounded border ${getScheduleColor(schedule.color)}`}
                                    >
                                        <div className="font-medium truncate">
                                            {schedule.name}
                                        </div>
                                        <div className="text-xs">
                                            {schedule.startTime} - {schedule.endTime}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {day.isCurrentMonth && (!day.schedules || day.schedules.length === 0) && (
                            <div className="text-xs text-gray-400">
                                Sin horarios
                            </div>
                        )}

                        {day.isCurrentMonth && day.timeEntries && day.timeEntries.length > 0 && (
                            <div className="space-y-1">
                                {day.timeEntries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className={`text-xs p-1 rounded border ${entry.type === 'IN' ? 'bg-green-100 text-green-800 border-green-200' :
                                            entry.type === 'OUT' ? 'bg-red-100 text-red-800 border-red-200' :
                                                entry.type === 'BREAK' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                    entry.type === 'RESUME' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                        'bg-gray-100 text-gray-800 border-gray-200'
                                            }`}
                                    >
                                        <div className="font-medium">
                                            {entry.type === 'IN' ? 'Entrada' :
                                                entry.type === 'OUT' ? 'Salida' :
                                                    entry.type === 'BREAK' ? 'Pausa' :
                                                        entry.type === 'RESUME' ? 'Reanudar' : entry.type}
                                        </div>
                                        <div className="text-xs">
                                            {new Date(entry.timestamp).toLocaleTimeString('es-ES', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalendarView;