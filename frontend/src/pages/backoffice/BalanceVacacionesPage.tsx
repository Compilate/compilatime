import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { absencesApi, VacationBalance } from '../../lib/api/absences.api';
import { employeesApi } from '../../lib/api/employees.api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';

interface Employee {
    id: string;
    name: string;
    dni: string;
}

const BalanceVacacionesPage: React.FC = () => {
    useAuth();
    const [balances, setBalances] = useState<VacationBalance[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedEmployee, setSelectedEmployee] = useState<string>('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingBalance, setEditingBalance] = useState<VacationBalance | null>(null);
    const [formData, setFormData] = useState({
        totalDays: 0,
        carriedOverDays: 0,
    });

    // Años disponibles para selección
    const currentYear = new Date().getFullYear();
    const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        loadBalances();
    }, [selectedYear, selectedEmployee]);

    const loadEmployees = async () => {
        try {
            const response = await employeesApi.getEmployees();
            setEmployees(response.employees);
        } catch (err) {
            console.error('Error al cargar empleados:', err);
        }
    };

    const loadBalances = async () => {
        try {
            setLoading(true);
            const params: any = { year: selectedYear };
            if (selectedEmployee) {
                params.employeeId = selectedEmployee;
            }

            const response = await absencesApi.getVacationBalances(params);

            // Obtener información de empleados para mostrar nombres
            const enrichedBalances = await Promise.all(
                response.map(async (balance) => {
                    const employee = employees.find(emp => emp.id === balance.employeeId);
                    return {
                        ...balance,
                        availableDays: balance.totalDays + balance.carriedOverDays - balance.usedDays - balance.pendingDays,
                        employee: employee || {
                            id: balance.employeeId,
                            name: 'Empleado no encontrado',
                            dni: 'N/A'
                        }
                    };
                })
            );

            setBalances(enrichedBalances);
        } catch (err: any) {
            setError(err.message || 'Error al cargar balances de vacaciones');
        } finally {
            setLoading(false);
        }
    };

    const handleEditBalance = (balance: VacationBalance) => {
        setEditingBalance(balance);
        setFormData({
            totalDays: balance.totalDays,
            carriedOverDays: balance.carriedOverDays,
        });
        setShowEditModal(true);
    };

    const handleSaveBalance = async () => {
        if (!editingBalance) return;

        try {
            await absencesApi.updateVacationBalance(editingBalance.id, selectedYear, {
                totalDays: formData.totalDays,
                carriedOverDays: formData.carriedOverDays,
            });

            await loadBalances();
            setShowEditModal(false);
            setEditingBalance(null);
        } catch (err: any) {
            setError(err.message || 'Error al actualizar balance de vacaciones');
        }
    };

    const handleInitializeBalance = async (employeeId: string) => {
        try {
            await absencesApi.initializeVacationBalance(employeeId, selectedYear);
            await loadBalances();
        } catch (err: any) {
            setError(err.message || 'Error al inicializar balance de vacaciones');
        }
    };

    const getColumns = () => [
        {
            key: 'employee' as any,
            label: 'Empleado',
            render: (balance: any) => (
                <div>
                    <div className="font-medium text-gray-900">{balance.employee?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{balance.employee?.dni || 'N/A'}</div>
                </div>
            ),
        },
        {
            key: 'totalDays' as any,
            label: 'Días Totales',
            render: (balance: VacationBalance) => (
                <span className="font-medium text-blue-600">{balance.totalDays}</span>
            ),
        },
        {
            key: 'carriedOverDays' as any,
            label: 'Días Arrastrados',
            render: (balance: VacationBalance) => (
                <span className="font-medium text-purple-600">{balance.carriedOverDays}</span>
            ),
        },
        {
            key: 'usedDays' as any,
            label: 'Días Usados',
            render: (balance: VacationBalance) => (
                <span className="font-medium text-red-600">{balance.usedDays}</span>
            ),
        },
        {
            key: 'pendingDays' as any,
            label: 'Días Pendientes',
            render: (balance: VacationBalance) => (
                <span className="font-medium text-yellow-600">{balance.pendingDays}</span>
            ),
        },
        {
            key: 'availableDays' as any,
            label: 'Días Disponibles',
            render: (balance: any) => (
                <span className={`font-bold ${balance.availableDays > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {balance.availableDays}
                </span>
            ),
        },
        {
            key: 'actions' as any,
            label: 'Acciones',
            render: (balance: any) => (
                <div className="flex space-x-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditBalance(balance)}
                    >
                        Editar
                    </Button>
                </div>
            ),
        },
    ];

    const filteredEmployees = employees.filter(emp => {
        return !balances.some(balance => balance.employeeId === emp.id && balance.year === selectedYear);
    });

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Balance de Vacaciones</h1>
                <p className="text-gray-600 mt-1">
                    Gestiona el balance de vacaciones de los empleados
                </p>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Año
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Empleado
                        </label>
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Todos los empleados</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <Button
                            onClick={loadBalances}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? 'Cargando...' : 'Actualizar'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Empleados sin balance */}
            {filteredEmployees.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-medium text-yellow-800 mb-3">
                        Empleados sin balance de vacaciones para {selectedYear}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredEmployees.map(emp => (
                            <div key={emp.id} className="flex items-center justify-between bg-white p-3 rounded border border-yellow-200">
                                <div>
                                    <div className="font-medium text-gray-900">{emp.name}</div>
                                    <div className="text-sm text-gray-500">{emp.dni}</div>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleInitializeBalance(emp.id)}
                                >
                                    Inicializar
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabla de balances */}
            <div className="bg-white rounded-lg shadow">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader />
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
                        <div className="text-red-800">{error}</div>
                        <Button
                            variant="secondary"
                            onClick={() => setError(null)}
                            className="mt-2"
                        >
                            Cerrar
                        </Button>
                    </div>
                ) : balances.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-gray-500 mb-4">
                            No se encontraron balances de vacaciones para los filtros seleccionados
                        </div>
                        {selectedEmployee && (
                            <Button
                                variant="secondary"
                                onClick={() => handleInitializeBalance(selectedEmployee)}
                            >
                                Inicializar Balance
                            </Button>
                        )}
                    </div>
                ) : (
                    <Table
                        columns={getColumns()}
                        data={balances}
                    />
                )}
            </div>

            {/* Modal de edición */}
            {showEditModal && editingBalance && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">
                            Editar Balance de Vacaciones
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Empleado
                                </label>
                                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                                    {(editingBalance as any).employee?.name || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Año
                                </label>
                                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                                    {editingBalance.year}
                                </div>
                            </div>
                            <Input
                                label="Días Totales"
                                type="number"
                                min="0"
                                value={formData.totalDays}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                                    ...formData,
                                    totalDays: Number(e.target.value)
                                })}
                            />
                            <Input
                                label="Días Arrastrados"
                                type="number"
                                min="0"
                                value={formData.carriedOverDays}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                                    ...formData,
                                    carriedOverDays: Number(e.target.value)
                                })}
                            />
                            <div className="bg-blue-50 p-3 rounded-md">
                                <div className="text-sm text-blue-800">
                                    <div>Días usados: {editingBalance.usedDays}</div>
                                    <div>Días pendientes: {editingBalance.pendingDays}</div>
                                    <div className="font-bold">
                                        Días disponibles: {formData.totalDays + formData.carriedOverDays - editingBalance.usedDays - editingBalance.pendingDays}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingBalance(null);
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button onClick={handleSaveBalance}>
                                Guardar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BalanceVacacionesPage;