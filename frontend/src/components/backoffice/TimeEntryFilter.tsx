import React from 'react';
import Input from '../common/Input';

interface TimeEntryFilterProps {
    filters: {
        employeeId?: string;
        from?: string;
        to?: string;
        type?: string;
    };
    onFiltersChange: (filters: any) => void;
    employees: Array<{ id: string; name: string; dni: string; }>;
}

const TimeEntryFilter: React.FC<TimeEntryFilterProps> = ({ filters, onFiltersChange, employees }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onFiltersChange({
            ...filters,
            [name]: value,
        });
    };

    const handleClearFilters = () => {
        onFiltersChange({
            employeeId: '',
            from: '',
            to: '',
            type: '',
        });
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Empleado
                    </label>
                    <select
                        name="employeeId"
                        value={filters.employeeId}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todos los empleados</option>
                        {employees.map(employee => (
                            <option key={employee.id} value={employee.id}>
                                {employee.name} ({employee.dni})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo
                    </label>
                    <select
                        name="type"
                        value={filters.type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todos los tipos</option>
                        <option value="IN">Entrada</option>
                        <option value="OUT">Salida</option>
                        <option value="BREAK">Pausa</option>
                        <option value="RESUME">Reanudar</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha desde
                    </label>
                    <Input
                        type="date"
                        name="from"
                        value={filters.from}
                        onChange={handleInputChange}
                        max={today}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha hasta
                    </label>
                    <Input
                        type="date"
                        name="to"
                        value={filters.to}
                        onChange={handleInputChange}
                        max={today}
                    />
                </div>
            </div>

            <div className="flex justify-end mt-4">
                <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Limpiar filtros
                </button>
            </div>
        </div>
    );
};

export default TimeEntryFilter;