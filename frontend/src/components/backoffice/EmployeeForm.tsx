import React, { useState, useEffect } from 'react';
import { employeeApi, scheduleApi } from '../../lib/api';
import Button from '../common/Button';
import Input from '../common/Input';
import Loader from '../common/Loader';
import EmployeeWeeklyCalendar from './EmployeeWeeklyCalendar';
import { Employee as EmployeeType } from '../../types/weeklySchedule';

interface Employee {
    id?: string;
    dni: string;
    name: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string;
    active: boolean;
    pin?: string;
    password?: string;
    scheduleIds?: string[];
}


interface EmployeeFormProps {
    employee?: Employee;
    onSuccess: () => void;
    onCancel: () => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState<Employee>({
        dni: '',
        name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        active: true,
        pin: '',
        password: '',
        scheduleIds: [],
    });

    const [loading, setLoading] = useState(false);
    const [loadingSchedules, setLoadingSchedules] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSchedules();
        if (employee && employee.id) {
            // Cargar los horarios asignados al empleado
            loadEmployeeSchedules(employee.id);
            // No cargar el PIN cuando se edita un empleado, ya que es un hash de bcrypt
            setFormData({
                ...employee,
                pin: '', // No cargar el PIN, ya que es un hash de bcrypt
                password: '', // No cargar la contraseña, ya que es un hash de bcrypt
            });
        }
    }, [employee]);

    const loadSchedules = async () => {
        try {
            setLoadingSchedules(true);
            const response = await scheduleApi.getSchedules();
            console.log('Schedules response:', response);
            if (response.success && response.data) {
                console.log('Schedules data:', response.data);
                // Los horarios se cargan pero no se necesitan almacenar localmente
                // ya que usamos el EmployeeWeeklyCalendar para gestionarlos
            }
        } catch (error) {
            console.error('Error loading schedules:', error);
        } finally {
            setLoadingSchedules(false);
        }
    };

    const loadEmployeeSchedules = async (employeeId: string) => {
        try {
            console.log('Cargando horarios del empleado:', employeeId);
            const response = await employeeApi.getEmployeeSchedules(employeeId);
            console.log('Respuesta de horarios del empleado:', response);

            if (response.success && response.data) {
                const scheduleIds = response.data.map((es: any) => es.scheduleId);
                console.log('ScheduleIds del empleado:', scheduleIds);
                setFormData(prev => ({
                    ...prev,
                    scheduleIds
                }));
            }
        } catch (error) {
            console.error('Error cargando horarios del empleado:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };


    const generatePin = () => {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        setFormData(prev => ({ ...prev, pin }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        console.log('EmployeeForm - Datos del formulario a enviar:', formData);

        try {
            if (employee?.id) {
                console.log('EmployeeForm - Actualizando empleado existente con ID:', employee.id);
                await employeeApi.updateEmployee(employee.id, formData);
            } else {
                console.log('EmployeeForm - Creando nuevo empleado');
                await employeeApi.createEmployee(formData);
            }
            onSuccess();
        } catch (error: any) {
            console.error('EmployeeForm - Error completo:', error);
            console.error('EmployeeForm - Detalles del error:', error.errors);

            // Mostrar errores de validación específicos
            if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
                const errorDetails = error.errors.map((err: any) =>
                    `${err.path?.join('.') || 'campo'}: ${err.message}`
                ).join(', ');
                setError(`Error de validación: ${errorDetails}`);
            } else {
                setError(error.message || 'Error al guardar el empleado');
            }
        } finally {
            setLoading(false);
        }
    };


    if (loadingSchedules) {
        return <Loader />;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                    label="DNI *"
                    name="dni"
                    value={formData.dni}
                    onChange={handleInputChange}
                    required
                    disabled={!!employee?.id}
                    placeholder="12345678A"
                />

                <Input
                    label="Nombre completo *"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Juan García"
                />

                <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="juan@empresa.com"
                />

                <Input
                    label="Teléfono"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+34 600 000 000"
                />

                <Input
                    label="Departamento"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Ventas"
                />

                <Input
                    label="Posición"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    placeholder="Commercial"
                />

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        name="active"
                        checked={formData.active}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                        Empleado activo
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Input
                        label="PIN (4 dígitos)"
                        name="pin"
                        value={formData.pin}
                        onChange={handleInputChange}
                        placeholder="1234"
                        maxLength={4}
                    />
                </div>

                <Input
                    label="Contraseña (para acceso a zona personal)"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Dejar en blanco para usar el PIN"
                />
            </div>

            {!employee?.id && (
                <div className="flex justify-center mt-4">
                    <Button
                        type="button"
                        onClick={generatePin}
                        variant="secondary"
                    >
                        Generar PIN automático
                    </Button>
                </div>
            )}

            {employee?.id && (
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Horarios asignados</h3>
                    <EmployeeWeeklyCalendar
                        employee={employee as EmployeeType}
                        onScheduleChange={() => {
                            // Recargar los horarios del empleado cuando haya cambios
                            if (employee.id) {
                                loadEmployeeSchedules(employee.id);
                            }
                        }}
                    />
                </div>
            )}

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
                    {loading ? <Loader size="sm" /> : null}
                    {employee?.id ? 'Actualizar Empleado' : 'Crear Empleado'}
                </Button>
            </div>
        </form>
    );
};

export default EmployeeForm;