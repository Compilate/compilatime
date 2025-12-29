import React from 'react';
// import { employeeApi } from '../../lib/api';

interface ReportFiltersProps {
    filters: {
        employeeIds: string[];
        startDate: string;
        endDate: string;
        groupBy?: 'day' | 'week' | 'month';
    };
    onFiltersChange: (filters: any) => void;
    employees: Array<{
        id: string;
        name: string;
        dni: string;
    }>;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
    filters,
    onFiltersChange,
    employees
}) => {
    const handleEmployeeChange = (employeeId: string, checked: boolean) => {
        let newEmployeeIds: string[];

        if (checked) {
            newEmployeeIds = [...filters.employeeIds, employeeId];
        } else {
            newEmployeeIds = filters.employeeIds.filter(id => id !== employeeId);
        }

        onFiltersChange({
            ...filters,
            employeeIds: newEmployeeIds
        });
    };

    const handleSelectAll = () => {
        const allEmployeeIds = employees.map(emp => emp.id);
        onFiltersChange({
            ...filters,
            employeeIds: allEmployeeIds
        });
    };

    const handleSelectNone = () => {
        onFiltersChange({
            ...filters,
            employeeIds: []
        });
    };

    const handleGroupByChange = (groupBy: 'day' | 'week' | 'month') => {
        onFiltersChange({
            ...filters,
            groupBy
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros de Reporte</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Filtro de fechas */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de inicio
                        </label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => onFiltersChange({
                                ...filters,
                                startDate: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de fin
                        </label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => onFiltersChange({
                                ...filters,
                                endDate: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Filtro de agrupación */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agrupar por
                    </label>
                    <select
                        value={filters.groupBy || 'day'}
                        onChange={(e) => handleGroupByChange(e.target.value as 'day' | 'week' | 'month')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="day">Día</option>
                        <option value="week">Semana</option>
                        <option value="month">Mes</option>
                    </select>
                </div>

                {/* Selección de empleados */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Empleados ({filters.employeeIds.length} seleccionados)
                        </label>
                        <div className="space-x-2">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="text-xs text-blue-600 hover:text-blue-800"
                            >
                                Todos
                            </button>
                            <button
                                type="button"
                                onClick={handleSelectNone}
                                className="text-xs text-gray-600 hover:text-gray-800"
                            >
                                Ninguno
                            </button>
                        </div>
                    </div>

                    <div className="border border-gray-300 rounded-md p-2 h-32 overflow-y-auto">
                        {employees.length === 0 ? (
                            <p className="text-sm text-gray-500">No hay empleados disponibles</p>
                        ) : (
                            <div className="space-y-1">
                                {employees.map((employee) => (
                                    <label key={employee.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            checked={filters.employeeIds.includes(employee.id)}
                                            onChange={(e) => handleEmployeeChange(employee.id, e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">
                                            {employee.name} ({employee.dni})
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportFilters;