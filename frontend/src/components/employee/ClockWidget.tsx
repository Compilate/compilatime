import React, { useState, useEffect } from 'react';
import { formatTime } from '../../lib/utils';

interface ClockWidgetProps {
    className?: string;
    textColor?: string;
}

const ClockWidget: React.FC<ClockWidgetProps> = ({ className, textColor = 'text-gray-600' }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            setDate(now);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };
        return new Intl.DateTimeFormat('es-ES', options).format(date);
    };

    return (
        <div className={`text-center ${className}`}>
            {/* Fecha */}
            <div className={`${textColor} text-lg font-medium mb-2`}>
                {formatDate(date)}
            </div>

            {/* Hora */}
            <div className={`text-6xl font-bold ${textColor.replace('text-gray-600', 'text-gray-900')} tabular-nums`}>
                {formatTime(currentTime)}
            </div>

            {/* Segundos */}
            <div className={`text-2xl ${textColor.replace('text-gray-600', 'text-gray-500')} mt-2 tabular-nums`}>
                {currentTime.getSeconds().toString().padStart(2, '0')}
            </div>

            {/* Indicador de AM/PM */}
            <div className={`text-sm ${textColor.replace('text-gray-600', 'text-gray-500')} mt-1`}>
                {currentTime.getHours() >= 12 ? 'PM' : 'AM'}
            </div>
        </div>
    );
};

export default ClockWidget;