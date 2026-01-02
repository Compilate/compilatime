import React, { useState } from 'react';
import { timeEntryApi } from '../../lib/api';
import Button from '../common/Button';
// import Input from '../common/Input';

interface TimeEntry {
    id: string;
    employee?: {
        id: string;
        name: string;
        dni: string;
    };
    type: 'IN' | 'OUT' | 'BREAK' | 'RESUME';
    timestamp: string;
    source: string;
    location?: string;
    notes?: string;
    createdByEmployee: boolean;
}

interface TimeEntryEditFormProps {
    timeEntry: TimeEntry;
    onClose: () => void;
    onSave: (updatedEntry: TimeEntry) => void;
    onContinueBreak?: () => void; // Nuevo prop para continuar pausa
}

const TimeEntryEditForm: React.FC<TimeEntryEditFormProps> = ({
    timeEntry,
    onClose,
    onSave,
    onContinueBreak
}) => {
    const [formData, setFormData] = useState({
        type: timeEntry.type,
        timestamp: new Date(timeEntry.timestamp).toISOString().slice(0, 16), // Format for datetime-local input
        location: timeEntry.location || '',
        notes: timeEntry.notes || '',
    });
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason.trim()) {
            setError('El motivo de la modificación es obligatorio');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const updateData = {
                type: formData.type,
                timestamp: new Date(formData.timestamp).toISOString(),
                location: formData.location || undefined,
                notes: formData.notes || undefined,
            };

            const response = await timeEntryApi.updateTimeEntry(timeEntry.id, {
                ...updateData,
                reason: reason.trim()
            });

            if (response.success && response.data) {
                onSave(response.data as TimeEntry);
                onClose();
            } else {
                setError(response.message || 'Error al actualizar el registro');
            }
        } catch (error: any) {
            setError(error.message || 'Error al actualizar el registro');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                        Editar Registro de Fichaje
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-4">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Empleado
                        </label>
                        <div className="text-sm text-gray-900">
                            {timeEntry.employee ? `${timeEntry.employee.name} (${timeEntry.employee.dni})` : 'Empleado no encontrado'}
                        </div>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo
                        </label>
                        <select
                            id="type"
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="IN">Entrada</option>
                            <option value="OUT">Salida</option>
                            <option value="BREAK">Pausa</option>
                            <option value="RESUME">Reanudar</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha y Hora
                        </label>
                        <input
                            type="datetime-local"
                            id="timestamp"
                            name="timestamp"
                            value={formData.timestamp}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                            Ubicación
                        </label>
                        <input
                            type="text"
                            id="location"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ubicación del fichaje"
                        />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                            Notas
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Notas adicionales"
                        />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                            Motivo de la modificación <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="reason"
                            name="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Explica por qué se está modificando este registro"
                            required
                        />
                    </div>

                    <div className="flex justify-end space-x-3">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        {onContinueBreak && (
                            <Button
                                type="button"
                                onClick={onContinueBreak}
                                variant="primary"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Continuar Pausa
                            </Button>
                        )}
                        <Button
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TimeEntryEditForm;