import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { employeeApi } from '../../lib/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import EmployeeForm from '../../components/backoffice/EmployeeForm';

import { Employee } from '../../types/weeklySchedule';

const EmpleadosPage: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterActive, setFilterActive] = useState<string>('all');
    const [_pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });

    const { isAuthenticated, token } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Solo cargar empleados si está autenticado y hay token
        if (isAuthenticated && token) {
            console.log('EmpleadosPage: Usuario autenticado, cargando empleados...');
            loadEmployees();
        } else {
            console.log('EmpleadosPage: Usuario no autenticado o sin token, redirigiendo...');
            navigate('/portal/login');
        }
    }, [isAuthenticated, token, navigate]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('EmpleadosPage: Haciendo petición a employeeApi.getEmployees()...');
            const response = await employeeApi.getEmployees();
            console.log('EmpleadosPage: Respuesta recibida:', response);

            if (response.success && response.data) {
                setEmployees(response.data.employees || []);
                setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
                console.log('EmpleadosPage: Empleados cargados:', response.data.employees?.length || 0);
            } else {
                console.error('EmpleadosPage: Error en respuesta:', response.error);
                setError(response.error || 'Error al cargar los empleados');
            }
        } catch (error: any) {
            console.error('EmpleadosPage: Error en loadEmployees:', error);
            setError(error.message || 'Error al cargar los empleados');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEmployee = () => {
        setEditingEmployee(null);
        setShowForm(true);
    };

    const handleEditEmployee = (employee: Employee) => {
        setEditingEmployee(employee);
        setShowForm(true);
    };


    const handleDeleteEmployee = async (employee: Employee) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar a ${employee.name}?`)) {
            return;
        }

        try {
            await employeeApi.deleteEmployee(employee.id);
            await loadEmployees();
        } catch (error: any) {
            setError(error.message || 'Error al eliminar el empleado');
        }
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingEmployee(null);
        loadEmployees();
    };

    const handleFormCancel = () => {
        setShowForm(false);
        setEditingEmployee(null);
    };

    const filteredEmployees = employees.filter(employee => {
        const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesActive = filterActive === 'all' ||
            (filterActive === 'active' && employee.active) ||
            (filterActive === 'inactive' && !employee.active);

        return matchesSearch && matchesActive;
    });


    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    if (showForm) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
                    </h1>
                    <Button
                        onClick={handleFormCancel}
                        variant="secondary"
                    >
                        Cancelar
                    </Button>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <EmployeeForm
                        employee={editingEmployee || undefined}
                        onSuccess={handleFormSuccess}
                        onCancel={handleFormCancel}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Empleados</h1>
                    <p className="text-gray-600">
                        Administra los empleados de tu empresa, sus horarios y permisos.
                    </p>
                </div>
                <Button onClick={handleCreateEmployee}>
                    Nuevo Empleado
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Input
                        placeholder="Buscar por nombre, DNI o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        leftIcon="🔍"
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Estado
                        </label>
                        <select
                            value={filterActive}
                            onChange={(e) => setFilterActive(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Todos</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <Button
                            onClick={loadEmployees}
                            variant="secondary"
                            className="w-full"
                        >
                            Actualizar
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader size="lg" />
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-lg mb-2">👥</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm || filterActive !== 'all'
                                ? 'No se encontraron empleados'
                                : 'No hay empleados registrados'}
                        </h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm || filterActive !== 'all'
                                ? 'Intenta ajustar los filtros de búsqueda'
                                : 'Crea tu primer empleado para comenzar'}
                        </p>
                        {!searchTerm && filterActive === 'all' && (
                            <Button onClick={handleCreateEmployee}>
                                Crear Primer Empleado
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Empleado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contacto
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Departamento
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha de creación
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEmployees.map((employee) => (
                                    <tr key={employee.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {employee.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    DNI: {employee.dni}
                                                </div>
                                                {employee.position && (
                                                    <div className="text-sm text-gray-500">
                                                        {employee.position}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {employee.email || '-'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {employee.phone || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {employee.department || '-'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {employee.position || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${employee.active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {employee.active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(employee.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    onClick={() => handleEditEmployee(employee)}
                                                    variant="secondary"
                                                    size="sm"
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    onClick={() => handleDeleteEmployee(employee)}
                                                    variant="danger"
                                                    size="sm"
                                                >
                                                    Eliminar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmpleadosPage;