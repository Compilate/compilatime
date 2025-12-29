import React, { useState, useEffect } from 'react';
import { absencesApi, Absence, AbsenceType, CreateAbsenceData, UpdateAbsenceData } from '../../lib/api/absences.api';
import { employeesApi, Employee } from '../../lib/api/employees.api';
import Button from '../common/Button';
import Input from '../common/Input';

interface AbsenceFormProps {
    absence?: Absence | null;
    onSave: () => void;
    onCancel: () => void;
}

const AbsenceForm: React.FC<AbsenceFormProps> = ({ absence, onSave, onCancel }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateAbsenceData>({
        employeeId: '',
        type: AbsenceType.VACATION,
        startDate: '',
        endDate: '',
        reason: '',
        halfDay: false,
        startHalfDay: 'morning',
        endHalfDay: 'morning',
        notes: '',
        emergencyContact: '',
        backupEmployeeId: ''
    });

    // Cargar empleados al montar el componente
    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const response = await employeesApi.getEmployees();
                setEmployees(response.employees);
            } catch (error: any) {
                setError(error.message || 'Error al cargar los empleados');
            }
        };

        loadEmployees();
    }, []);

    // Cargar datos de la ausencia si estamos editando
    useEffect(() => {
        if (absence) {
            setFormData({
                employeeId: absence.employeeId,
                type: absence.type,
                startDate: absence.startDate,
                endDate: absence.endDate,
                reason: absence.reason || '',
                halfDay: absence.halfDay || false,
                startHalfDay: absence.startHalfDay || 'morning',
                endHalfDay: absence.endHalfDay || 'morning',
                notes: absence.notes || '',
                emergencyContact: absence.emergencyContact || '',
                backupEmployeeId: absence.backupEmployeeId || ''
            });
        }
    }, [absence]);

    // Manejar cambios en el formulario
    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Calcular días de ausencia
    const calculateDays = () => {
        if (!formData.startDate || !formData.endDate) return 0;

        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);

        if (start > end) return 0;

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        return formData.halfDay ? 0.5 : diffDays;
    };

    // Validar formulario
    const validateForm = (): string | null => {
        if (!formData.employeeId) return 'Debe seleccionar un empleado';
        if (!formData.type) return 'Debe seleccionar un tipo de ausencia';
        if (!formData.startDate) return 'Debe seleccionar una fecha de inicio';
        if (!formData.endDate) return 'Debe seleccionar una fecha de fin';

        // El motivo solo es obligatorio para tipos que no sean vacaciones
        if (formData.type !== AbsenceType.VACATION && !formData.reason?.trim()) {
            return 'El motivo es obligatorio para este tipo de ausencia';
        }

        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);

        if (start > end) return 'La fecha de fin debe ser posterior a la fecha de inicio';

        return null;
    };

    // Guardar ausencia
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const data = {
                ...formData,
                days: calculateDays()
            };

            if (absence) {
                await absencesApi.updateAbsence(absence.id, data as UpdateAbsenceData);
            } else {
                await absencesApi.createAbsence(data);
            }

            onSave();
        } catch (error: any) {
            setError(error.message || 'Error al guardar la ausencia');
        } finally {
            setLoading(false);
        }
    };

    const getTypeLabel = (type: AbsenceType): string => {
        const labels = {
            [AbsenceType.VACATION]: 'Vacaciones',
            [AbsenceType.SICK_LEAVE]: 'Baja por enfermedad',
            [AbsenceType.PERSONAL]: 'Asunto personal',
            [AbsenceType.MATERNITY]: 'Maternidad',
            [AbsenceType.PATERNITY]: 'Paternidad',
            [AbsenceType.BEREAVEMENT]: 'Duelo',
            [AbsenceType.UNPAID]: 'No remunerada',
            [AbsenceType.TRAINING]: 'Formación'
        };
        return labels[type] || type;
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Empleado */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empleado *
                </label>
                <select
                    value={formData.employeeId}
                    onChange={(e) => handleChange('employeeId', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                >
                    <option value="">Seleccionar empleado</option>
                    {employees.map(employee => (
                        <option key={employee.id} value={employee.id}>
                            {employee.name} ({employee.dni})
                        </option>
                    ))}
                </select>
            </div>

            {/* Tipo de ausencia */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de ausencia *
                </label>
                <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                >
                    {Object.values(AbsenceType).map(type => (
                        <option key={type} value={type}>
                            {getTypeLabel(type)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de inicio *
                    </label>
                    <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                        required
                        min={new Date().toISOString().split('T')[0]} // No permitir fechas anteriores a hoy
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de fin *
                    </label>
                    <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => handleChange('endDate', e.target.value)}
                        required
                        min={formData.startDate || new Date().toISOString().split('T')[0]} // No permitir fecha anterior a la de inicio
                    />
                </div>
            </div>

            {/* Medio día */}
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="halfDay"
                    checked={formData.halfDay}
                    onChange={(e) => handleChange('halfDay', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="halfDay" className="ml-2 block text-sm text-gray-900">
                    Medio día
                </label>
            </div>

            {formData.halfDay && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mitad de inicio
                        </label>
                        <select
                            value={formData.startHalfDay}
                            onChange={(e) => handleChange('startHalfDay', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="morning">Mañana</option>
                            <option value="afternoon">Tarde</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mitad de fin
                        </label>
                        <select
                            value={formData.endHalfDay}
                            onChange={(e) => handleChange('endHalfDay', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="morning">Mañana</option>
                            <option value="afternoon">Tarde</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Motivo */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo {formData.type !== AbsenceType.VACATION && <span className="text-red-500">*</span>}
                </label>
                <textarea
                    value={formData.reason}
                    onChange={(e) => handleChange('reason', e.target.value)}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={formData.type === AbsenceType.VACATION ? "Motivo de las vacaciones (opcional)..." : "Motivo de la ausencia..."}
                    required={formData.type !== AbsenceType.VACATION}
                />
                {formData.type === AbsenceType.VACATION && (
                    <p className="text-xs text-gray-500 mt-1">El motivo es opcional para vacaciones</p>
                )}
            </div>

            {/* Notas */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas internas
                </label>
                <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notas internas..."
                />
            </div>

            {/* Contacto de emergencia */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contacto de emergencia
                </label>
                <Input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => handleChange('emergencyContact', e.target.value)}
                    placeholder="Teléfono o persona de contacto"
                />
            </div>

            {/* Empleado de respaldo */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empleado de respaldo
                </label>
                <select
                    value={formData.backupEmployeeId}
                    onChange={(e) => handleChange('backupEmployeeId', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">Sin respaldo</option>
                    {employees
                        .filter(emp => emp.id !== formData.employeeId)
                        .map(employee => (
                            <option key={employee.id} value={employee.id}>
                                {employee.name} ({employee.dni})
                            </option>
                        ))}
                </select>
            </div>

            {/* Resumen de días */}
            {formData.startDate && formData.endDate && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                    <strong>Total de días: {calculateDays()}</strong>
                </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : (absence ? 'Actualizar' : 'Crear')}
                </Button>
            </div>
        </form>
    );
};

export default AbsenceForm;