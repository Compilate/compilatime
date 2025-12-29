import React, { useState, useEffect } from 'react';
import { scheduleApi } from '../../lib/api';
import Button from '../common/Button';
import Input from '../common/Input';
import Loader from '../common/Loader';

interface Schedule {
    id?: string;
    name: string;
    startTime: string;
    endTime: string;
    color?: string;
}

// Para compatibilidad con datos antiguos que puedan venir del backend
// interface LegacySchedule {
//     id?: string;
//     name: string;
//     dayOfWeek?: number;
//     startTime: string;
//     endTime: string;
// }

interface ScheduleFormProps {
    schedule?: Schedule;
    onSuccess: () => void;
    onCancel: () => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ schedule, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState<Schedule>({
        name: '',
        startTime: '09:00',
        endTime: '17:00',
        color: '#3B82F6',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (schedule) {
            setFormData({
                name: schedule.name,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                color: schedule.color || '#3B82F6',
            });
        }
    }, [schedule]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (schedule?.id) {
                await scheduleApi.updateSchedule(schedule.id, formData);
            } else {
                await scheduleApi.createSchedule(formData);
            }
            onSuccess();
        } catch (error: any) {
            setError(error.message || 'Error al guardar el horario');
        } finally {
            setLoading(false);
        }
    };


    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="space-y-6">
                <Input
                    label="Nombre del turno *"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Turno mañana, Turno tarde, etc."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        label="Hora de inicio *"
                        name="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        required
                    />

                    <Input
                        label="Hora de fin *"
                        name="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color del turno
                    </label>
                    <div className="flex items-center space-x-3">
                        <input
                            type="color"
                            name="color"
                            value={formData.color}
                            onChange={handleInputChange}
                            className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                            type="text"
                            name="color"
                            value={formData.color}
                            onChange={handleInputChange}
                            placeholder="#3B82F6"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            pattern="^#[0-9A-Fa-f]{6}$"
                            title="Color en formato HEX (#RRGGBB)"
                        />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                        El color se usará para identificar visualmente este turno en el calendario
                    </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                        <strong>Nota:</strong> Los turnos creados aquí estarán disponibles en el calendario semanal
                        para asignarlos a empleados en días específicos.
                    </p>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                    type="button"
                    onClick={onCancel}
                    variant="secondary"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                >
                    {loading && <Loader size="sm" />}
                    {schedule?.id ? 'Actualizar Horario' : 'Crear Horario'}
                </Button>
            </div>
        </form>
    );
};

export default ScheduleForm;