import React from 'react';
import { cn } from '../../lib/utils';

export interface Column<T> {
    key: keyof T;
    label: string;
    sortable?: boolean;
    render?: (row: T, value: any, index: number) => React.ReactNode;
    className?: string;
    headerClassName?: string;
}

export interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    loading?: boolean;
    emptyMessage?: string;
    className?: string;
    onRowClick?: (row: T, index: number) => void;
    onSort?: (column: keyof T, direction: 'asc' | 'desc') => void;
    sortColumn?: keyof T;
    sortDirection?: 'asc' | 'desc';
    striped?: boolean;
    hoverable?: boolean;
}

function Table<T extends Record<string, any>>({
    data,
    columns,
    loading = false,
    emptyMessage = 'No hay datos disponibles',
    className,
    onRowClick,
    onSort,
    sortColumn,
    sortDirection,
    striped = true,
    hoverable = true,
}: TableProps<T>) {
    const handleSort = (column: Column<T>) => {
        if (!column.sortable || !onSort) return;

        const newDirection =
            sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc';

        onSort(column.key, newDirection);
    };

    const renderSortIcon = (column: Column<T>) => {
        if (!column.sortable || !onSort) return null;

        if (sortColumn !== column.key) {
            return (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }

        return (
            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sortDirection === 'asc' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
            </svg>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-gray-600">Cargando...</span>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">📊</div>
                <p className="text-gray-500">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className={cn('min-w-full divide-y divide-gray-200', className)}>
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={String(column.key)}
                                className={cn(
                                    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                                    column.sortable && onSort && 'cursor-pointer hover:bg-gray-100',
                                    column.headerClassName
                                )}
                                onClick={() => handleSort(column)}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>{column.label}</span>
                                    {renderSortIcon(column)}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className={cn('bg-white divide-y divide-gray-200', striped && 'divide-y divide-gray-200')}>
                    {data.map((row, index) => (
                        <tr
                            key={index}
                            className={cn(
                                hoverable && onRowClick && 'hover:bg-gray-50 cursor-pointer',
                                striped && index % 2 === 0 && 'bg-gray-50'
                            )}
                            onClick={() => onRowClick?.(row, index)}
                        >
                            {columns.map((column) => (
                                <td
                                    key={String(column.key)}
                                    className={cn('px-6 py-4 whitespace-nowrap text-sm text-gray-900', column.className)}
                                >
                                    {column.render ? (
                                        column.render(row, row[column.key], index)
                                    ) : (
                                        String(row[column.key] || '')
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default Table;