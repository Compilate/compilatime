import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { absencesApi, CreateAbsenceData, Absence, VacationBalance, AbsenceType } from '../../lib/api/absences.api';
import Input from '../../components/common/Input';
import { format, differenceInCalendarDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

interface FormData {
    type: AbsenceType;
    startDate: string;
    endDate: string;
    startHalfDay: 'morning' | 'afternoon' | undefined;
    endHalfDay: 'morning' | 'afternoon' | undefined;
    reason: string;
    emergencyContact?: string;
    backupEmployeeId?: string;
}

export const SolicitarAusenciaPage: React.FC = () => {
    const { employee } = useAuth();
    const [formData, setFormData] = useState<FormData>({
        type: AbsenceType.VACATION,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        startHalfDay: undefined,
        endHalfDay: undefined,
        reason: '',
        emergencyContact: '',
        backupEmployeeId: ''
    });

    const [vacationBalance, setVacationBalance] = useState<VacationBalance | null>(null);
    const [myAbsences, setMyAbsences] = useState<Absence[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [calculatedDays, setCalculatedDays] = useState<number>(0);

    // Cargar balance de vacaciones y ausencias del empleado
    useEffect(() => {
        const loadData = async () => {
            if (!employee?.id) return;

            try {
                setLoading(true);

                // Cargar balance de vacaciones
                const balanceResponse = await absencesApi.getVacationBalance(employee.id);
                setVacationBalance(balanceResponse);

                // Cargar ausencias del empleado
                const absencesResponse = await absencesApi.getMyAbsences();
                setMyAbsences(absencesResponse);
            } catch (err) {
                console.error('Error al cargar datos:', err);
                setError('Error al cargar los datos. Por favor, recarga la página.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [employee?.id]);

    // Calcular días de ausencia cuando cambian las fechas
    useEffect(() => {
        const calculateDays = () => {
            if (!formData.startDate || !formData.endDate) {
                setCalculatedDays(0);
                return;
            }

            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);

            if (isBefore(end, start)) {
                setCalculatedDays(0);
                return;
            }

            let totalDays = differenceInCalendarDays(end, start) + 1;

            // Ajustar por medios días
            if (formData.startHalfDay === 'morning') {
                totalDays -= 0.5;
            } else if (formData.startHalfDay === 'afternoon') {
                totalDays -= 0.5;
            }

            if (formData.endHalfDay === 'morning') {
                totalDays -= 0.5;
            } else if (formData.endHalfDay === 'afternoon') {
                totalDays -= 0.5;
            }

            setCalculatedDays(Math.max(0, totalDays));
        };

        calculateDays();
    }, [formData.startDate, formData.endDate, formData.startHalfDay, formData.endHalfDay]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!employee?.id) {
            setError('No se ha podido identificar al empleado');
            return;
        }

        // Validaciones
        if (!formData.startDate || !formData.endDate) {
            setError('Las fechas de inicio y fin son obligatorias');
            return;
        }

        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);

        if (isBefore(end, start)) {
            setError('La fecha de fin no puede ser anterior a la fecha de inicio');
            return;
        }

        if (formData.type !== AbsenceType.VACATION && !formData.reason.trim()) {
            setError('El motivo es obligatorio para este tipo de ausencia');
            return;
        }

        // Validar días disponibles para vacaciones
        if (formData.type === AbsenceType.VACATION && vacationBalance) {
            const availableDays = vacationBalance.totalDays - vacationBalance.usedDays;
            if (calculatedDays > availableDays) {
                setError(`No tienes suficientes días de vacaciones disponibles. Tienes ${availableDays} días disponibles y solicitas ${calculatedDays} días.`);
                return;
            }
        }

        try {
            setSubmitting(true);
            setError(null);
            setSuccess(null);

            const absenceData: CreateAbsenceData = {
                employeeId: employee.id,
                type: formData.type,
                startDate: formData.startDate,
                endDate: formData.endDate,
                startHalfDay: formData.startHalfDay,
                endHalfDay: formData.endHalfDay,
                reason: formData.reason.trim(),
                emergencyContact: formData.emergencyContact?.trim() || undefined,
                backupEmployeeId: formData.backupEmployeeId || undefined
            };

            await absencesApi.createAbsence(absenceData);

            setSuccess('Solicitud de ausencia enviada correctamente. Será revisada por un administrador.');

            // Resetear formulario
            setFormData({
                type: AbsenceType.VACATION,
                startDate: format(new Date(), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
                startHalfDay: undefined,
                endHalfDay: undefined,
                reason: '',
                emergencyContact: '',
                backupEmployeeId: ''
            });

            // Recargar ausencias
            const absencesResponse = await absencesApi.getMyAbsences();
            setMyAbsences(absencesResponse);

            // Recargar balance si es vacaciones
            if (formData.type === AbsenceType.VACATION) {
                const balanceResponse = await absencesApi.getVacationBalance(employee.id);
                setVacationBalance(balanceResponse);
            }
        } catch (err) {
            console.error('Error al enviar solicitud:', err);
            setError('Error al enviar la solicitud. Por favor, inténtalo de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeLabel = (type: string) => {
        const types = {
            'VACATION': 'Vacaciones',
            'SICK_LEAVE': 'Baja médica',
            'PERSONAL': 'Personal',
            'MATERNITY': 'Maternidad',
            'PATERNITY': 'Paternidad',
            'OTHER': 'Otro'
        };
        return types[type as keyof typeof types] || type;
    };

    const getStatusLabel = (status: string) => {
        const statuses = {
            'PENDING': 'Pendiente',
            'APPROVED': 'Aprobada',
            'REJECTED': 'Rechazada'
        };
        return statuses[status as keyof typeof statuses] || status;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'APPROVED':
                return 'bg-green-100 text-green-800';
            case 'REJECTED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando datos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">Solicitar Ausencia</h1>

                        {/* Balance de vacaciones */}
                        {vacationBalance && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h3 className="text-lg font-medium text-blue-900 mb-2">Balance de Vacaciones</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-blue-700">Días totales:</span>
                                        <span className="ml-2 font-medium text-blue-900">{vacationBalance.totalDays}</span>
                                    </div>
                                    <div>
                                        <span className="text-blue-700">Días usados:</span>
                                        <span className="ml-2 font-medium text-blue-900">{vacationBalance.usedDays}</span>
                                    </div>
                                    <div>
                                        <span className="text-blue-700">Días disponibles:</span>
                                        <span className="ml-2 font-medium text-blue-900">
                                            {vacationBalance.totalDays - vacationBalance.usedDays}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Alertas */}
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-800">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-green-800">{success}</p>
                            </div>
                        )}

                        {/* Formulario de solicitud */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                                        Tipo de ausencia *
                                    </label>
                                    <select
                                        id="type"
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value={AbsenceType.VACATION}>Vacaciones</option>
                                        <option value={AbsenceType.SICK_LEAVE}>Baja médica</option>
                                        <option value={AbsenceType.PERSONAL}>Personal</option>
                                        <option value={AbsenceType.MATERNITY}>Maternidad</option>
                                        <option value={AbsenceType.PATERNITY}>Paternidad</option>
                                        <option value="UNPAID">Otro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Días calculados
                                    </label>
                                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md">
                                        <span className="font-medium text-gray-900">{calculatedDays} días</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                                        Fecha de inicio *
                                    </label>
                                    <Input
                                        id="startDate"
                                        name="startDate"
                                        type="date"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                                        Fecha de fin *
                                    </label>
                                    <Input
                                        id="endDate"
                                        name="endDate"
                                        type="date"
                                        value={formData.endDate}
                                        onChange={handleInputChange}
                                        min={formData.startDate}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="startHalfDay" className="block text-sm font-medium text-gray-700 mb-2">
                                        Primer día
                                    </label>
                                    <select
                                        id="startHalfDay"
                                        name="startHalfDay"
                                        value={formData.startHalfDay}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Día completo</option>
                                        <option value="morning">Primera mitad (mañana)</option>
                                        <option value="afternoon">Segunda mitad (tarde)</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="endHalfDay" className="block text-sm font-medium text-gray-700 mb-2">
                                        Último día
                                    </label>
                                    <select
                                        id="endHalfDay"
                                        name="endHalfDay"
                                        value={formData.endHalfDay}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Día completo</option>
                                        <option value="morning">Primera mitad (mañana)</option>
                                        <option value="afternoon">Segunda mitad (tarde)</option>
                                    </select>
                                </div>
                            </div>

                            {formData.type !== AbsenceType.VACATION && (
                                <div>
                                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                                        Motivo *
                                    </label>
                                    <textarea
                                        id="reason"
                                        name="reason"
                                        value={formData.reason}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Describe el motivo de tu ausencia..."
                                        required
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">
                                        Contacto de emergencia (opcional)
                                    </label>
                                    <Input
                                        id="emergencyContact"
                                        name="emergencyContact"
                                        type="text"
                                        value={formData.emergencyContact}
                                        onChange={handleInputChange}
                                        placeholder="Nombre y teléfono"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="backupEmployeeId" className="block text-sm font-medium text-gray-700 mb-2">
                                        Empleado de respaldo (opcional)
                                    </label>
                                    <Input
                                        id="backupEmployeeId"
                                        name="backupEmployeeId"
                                        type="text"
                                        value={formData.backupEmployeeId}
                                        onChange={handleInputChange}
                                        placeholder="ID del empleado"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Mis solicitudes de ausencia */}
                {myAbsences.length > 0 && (
                    <div className="mt-8 bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Solicitudes de Ausencia</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tipo
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Fechas
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Días
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Estado
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Motivo
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {myAbsences.map((absence) => (
                                            <tr key={absence.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {getTypeLabel(absence.type)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {format(new Date(absence.startDate), 'dd/MM/yyyy', { locale: es })}
                                                    {absence.startDate !== absence.endDate && (
                                                        <> - {format(new Date(absence.endDate), 'dd/MM/yyyy', { locale: es })}</>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {absence.days}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(absence.status)}`}>
                                                        {getStatusLabel(absence.status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    {absence.reason || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};