import React, { useState, useEffect } from 'react';
import { reportsApi } from '../../services/api/reports.api';
import { employeeApi } from '../../lib/api';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import ReportFilters from '../../components/backoffice/ReportFilters';

interface Employee {
    id: string;
    name: string;
    dni: string;
}

interface ReportData {
    type: 'time' | 'attendance' | 'employee-summary' | 'monthly' | 'break-types' | 'delays';
    data: any;
    loading: boolean;
    error: string | null;
}

const ReportesPage: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [currentReport, setCurrentReport] = useState<ReportData['type']>('time');
    const [reportData, setReportData] = useState<ReportData>({
        type: 'time',
        data: null,
        loading: false,
        error: null
    });

    const [filters, setFilters] = useState({
        employeeIds: [] as string[],
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Últimos 30 días
        endDate: new Date().toISOString().split('T')[0],
        groupBy: 'day' as 'day' | 'week' | 'month'
    });

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        if (employees.length > 0) {
            // Por defecto, seleccionar todos los empleados
            setFilters(prev => ({
                ...prev,
                employeeIds: employees.map(emp => emp.id)
            }));
        }
    }, [employees]);

    useEffect(() => {
        if (filters.employeeIds.length > 0) {
            generateReport();
        }
    }, [filters, currentReport]);

    const loadEmployees = async () => {
        try {
            setLoadingEmployees(true);
            const response = await employeeApi.getEmployees();
            if (response.success && response.data) {
                setEmployees(response.data.employees || []);
            }
        } catch (error: any) {
            console.error('Error cargando empleados:', error);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const generateReport = async () => {
        if (filters.employeeIds.length === 0) {
            setReportData(prev => ({
                ...prev,
                error: 'Seleccione al menos un empleado para generar el reporte'
            }));
            return;
        }

        try {
            setReportData(prev => ({
                ...prev,
                loading: true,
                error: null
            }));

            let response: any;
            const reportFilters = {
                ...filters,
                // El companyId se obtendrá del token en el backend
            };

            console.log('Generando reporte tipo:', currentReport);
            console.log('Filtros enviados:', reportFilters);

            switch (currentReport) {
                case 'time':
                    response = await reportsApi.getTimeReport(reportFilters);
                    break;
                case 'attendance':
                    response = await reportsApi.getAttendanceReport(reportFilters);
                    break;
                case 'employee-summary':
                    response = await reportsApi.getEmployeeSummaryReport(reportFilters);
                    break;
                case 'monthly':
                    response = await reportsApi.getMonthlyReport(reportFilters);
                    break;
                case 'break-types':
                    response = await reportsApi.getBreakTypeReport(reportFilters);
                    break;
                case 'delays':
                    response = await reportsApi.getDelayReport(reportFilters);
                    break;
                default:
                    throw new Error('Tipo de reporte no válido');
            }

            console.log('Respuesta recibida:', response);
            console.log('¿Tiene response.data?', !!response.data);
            console.log('¿response.success?', response.success);

            if (response && (response.data || response.summary || response.details)) {
                console.log('Datos del reporte:', response);
                // El API client devuelve directamente los datos del reporte
                const reportData = response.data || response;
                setReportData({
                    type: currentReport,
                    data: reportData,
                    loading: false,
                    error: null
                });
            } else {
                console.error('La respuesta no tiene la estructura esperada:', response);
                throw new Error(response?.message || 'Error al generar el reporte');
            }
        } catch (error: any) {
            console.error('Error en generateReport:', error);
            setReportData(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Error al generar el reporte'
            }));
        }
    };

    const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
        try {
            // El método exportReport ahora maneja la descarga del archivo directamente
            await reportsApi.exportReport(currentReport, format, filters);
        } catch (error: any) {
            setReportData(prev => ({
                ...prev,
                error: error.message || 'Error al exportar el reporte'
            }));
        }
    };

    const renderReportContent = () => {
        if (reportData.loading) {
            return (
                <div className="flex justify-center py-8">
                    <Loader size="lg" />
                </div>
            );
        }

        if (reportData.error) {
            return (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {reportData.error}
                </div>
            );
        }

        if (!reportData.data) {
            return (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                    Configure los filtros y genere un reporte para ver los resultados.
                </div>
            );
        }

        switch (currentReport) {
            case 'time':
                return renderTimeReport();
            case 'attendance':
                return renderAttendanceReport();
            case 'employee-summary':
                return renderEmployeeSummaryReport();
            case 'monthly':
                return renderMonthlyReport();
            case 'break-types':
                return renderBreakTypeReport();
            case 'delays':
                return renderDelayReport();
            default:
                return null;
        }
    };

    const renderTimeReport = () => {
        const { summary, details } = reportData.data;

        // Verificar que details existe y es un array
        if (!details || !Array.isArray(details)) {
            return (
                <div className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                        No hay datos disponibles para el reporte de horas.
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">Resumen de Horas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-blue-600">{summary.totalHours ? Number(summary.totalHours).toFixed(2) : '0.00'}h</div>
                            <div className="text-sm text-gray-600">Total Horas</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-green-600">{summary.totalEntries}</div>
                            <div className="text-sm text-gray-600">Total Fichajes</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-purple-600">{summary.totalEmployees}</div>
                            <div className="text-sm text-gray-600">Empleados</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-sm text-gray-600">Período</div>
                            <div className="text-sm font-medium">
                                {new Date(summary.period.start).toLocaleDateString('es-ES')} - {new Date(summary.period.end).toLocaleDateString('es-ES')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detalles */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 p-6 pb-0">Detalles por Día</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fichajes</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleados</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {details.map((day: any, index: number) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(day.date).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {Number(day.totalHours).toFixed(2)}h
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {day.entries.length}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {day.employeeCount}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderAttendanceReport = () => {
        const { summary, details } = reportData.data;

        return (
            <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-green-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-4">Resumen de Asistencia</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-green-600">{summary.totalEmployees}</div>
                            <div className="text-sm text-gray-600">Total Empleados</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-blue-600">{summary.overallAttendanceRate ? Number(summary.overallAttendanceRate).toFixed(1) : '0.0'}%</div>
                            <div className="text-sm text-gray-600">Tasa Asistencia</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-yellow-600">{summary.totalAbsences}</div>
                            <div className="text-sm text-gray-600">Ausencias</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-purple-600">{summary.totalWorkedDays}</div>
                            <div className="text-sm text-gray-600">Días Trabajados</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-gray-600">{summary.totalWorkDays}</div>
                            <div className="text-sm text-gray-600">Días Laborables</div>
                        </div>
                    </div>
                </div>

                {/* Detalles por empleado */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 p-6 pb-0">Detalles por Empleado</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días Trabajados</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ausencias</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasa Asistencia</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tardanzas</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Horas</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {details.map((employee: any, index: number) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{employee.employee?.name || 'Empleado sin nombre'}</div>
                                                <div className="text-sm text-gray-500">({employee.employee?.dni || 'Sin DNI'})</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{employee.statistics?.workedDays || 0}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{employee.statistics?.absences || 0}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${employee.statistics?.attendanceRate >= 95 ? 'bg-green-100 text-green-800' :
                                                employee.statistics?.attendanceRate >= 85 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {employee.statistics?.attendanceRate ? Number(employee.statistics.attendanceRate).toFixed(1) : '0.0'}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{employee.statistics?.lateEntries || 0}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{employee.statistics?.totalHours ? Number(employee.statistics.totalHours).toFixed(2) : '0.00'}h</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderEmployeeSummaryReport = () => {
        const { summary, details } = reportData.data;

        return (
            <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-purple-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4">Resumen por Empleado</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-purple-600">{summary.totalEmployees}</div>
                            <div className="text-sm text-gray-600">Total Empleados</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-blue-600">{summary.totalHours ? Number(summary.totalHours).toFixed(2) : '0.00'}h</div>
                            <div className="text-sm text-gray-600">Total Horas</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-green-600">{summary.averageAttendanceRate ? Number(summary.averageAttendanceRate).toFixed(1) : '0.0'}%</div>
                            <div className="text-sm text-gray-600">Asistencia Promedio</div>
                        </div>
                    </div>
                </div>

                {/* Detalles */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 p-6 pb-0">Detalles de Empleados</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Horas</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días Trabajados</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asistencia</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promedio Diario</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tardanzas</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {details.map((employee: any, index: number) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{employee.employee?.name || 'Empleado sin nombre'}</div>
                                                <div className="text-sm text-gray-500">({employee.employee?.dni || 'Sin DNI'})</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{employee.summary?.totalHours ? Number(employee.summary.totalHours).toFixed(2) : '0.00'}h</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{employee.summary?.workedDays || 0}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${employee.summary?.attendanceRate >= 95 ? 'bg-green-100 text-green-800' :
                                                employee.summary?.attendanceRate >= 85 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {employee.summary?.attendanceRate ? Number(employee.summary.attendanceRate).toFixed(1) : '0.0'}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{employee.summary?.averageHoursPerDay ? Number(employee.summary.averageHoursPerDay).toFixed(2) : '0.00'}h</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{employee.summary?.lateEntries || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderMonthlyReport = () => {
        const { periodInfo, timeSummary, analytics } = reportData.data || {};

        // Verificar si hay datos para mostrar
        if (!periodInfo || !timeSummary || !analytics) {
            return (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                    No hay datos disponibles para el reporte mensual. Intente con un rango de fechas diferente.
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Información del período */}
                <div className="bg-indigo-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-4">Información del Período</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded p-4">
                            <div className="text-sm text-gray-600">Período</div>
                            <div className="text-sm font-medium">
                                {periodInfo?.startDate ? new Date(periodInfo.startDate).toLocaleDateString('es-ES') : 'N/A'} - {periodInfo?.endDate ? new Date(periodInfo.endDate).toLocaleDateString('es-ES') : 'N/A'}
                            </div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-indigo-600">{periodInfo?.daysInPeriod || 0}</div>
                            <div className="text-sm text-gray-600">Días Totales</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-blue-600">{periodInfo?.workDays || 0}</div>
                            <div className="text-sm text-gray-600">Días Laborables</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-green-600">{timeSummary?.totalHours ? Number(timeSummary.totalHours).toFixed(2) : '0.00'}h</div>
                            <div className="text-sm text-gray-600">Total Horas</div>
                        </div>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Distribución por día de semana */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Distribución por Día de Semana</h4>
                        <div className="space-y-2">
                            {analytics?.dayOfWeekDistribution?.map((day: any, index: number) => (
                                <div key={index} className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{day?.day || 'Desconocido'}</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{ width: `${day?.hours ? Math.min((Number(day.hours) / Math.max(...(analytics.dayOfWeekDistribution?.map((d: any) => d.hours) || [1]))) * 100, 100) : 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-medium w-12 text-right">{day?.hours ? Number(day.hours).toFixed(1) : '0.0'}h</span>
                                    </div>
                                </div>
                            )) || <div className="text-sm text-gray-500">No hay datos de distribución disponibles</div>}
                        </div>
                    </div>

                    {/* Tendencias */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Tendencias</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Tendencia</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${analytics?.trends?.trend === 'increasing' ? 'bg-green-100 text-green-800' :
                                    analytics?.trends?.trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {analytics?.trends?.trend === 'increasing' ? 'Alza' :
                                        analytics?.trends?.trend === 'decreasing' ? 'Baja' :
                                            'Estable'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Cambio</span>
                                <span className={`text-sm font-medium ${analytics?.trends?.change > 0 ? 'text-green-600' :
                                    analytics?.trends?.change < 0 ? 'text-red-600' :
                                        'text-gray-600'
                                    }`}>
                                    {analytics?.trends?.change ? (analytics.trends.change > 0 ? '+' : '') + Number(analytics.trends.change).toFixed(1) : '0.0'}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Días pico */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Días con Mayor Actividad</h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleados</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {analytics?.peakDays?.map((day: any, index: number) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {day?.date ? new Date(day.date).toLocaleDateString('es-ES') : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{day?.hours ? Number(day.hours).toFixed(2) : '0.00'}h</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{day?.employeeCount || 0}</td>
                                    </tr>
                                )) || <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No hay datos de días pico disponibles</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderBreakTypeReport = () => {
        const { summary, details } = reportData.data || {};

        // Verificar si hay datos para mostrar
        if (!summary || !details) {
            return (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                    No hay datos de tipos de pausa disponibles para el período seleccionado.
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-orange-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-orange-900 mb-4">Resumen de Tipos de Pausa</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-orange-600">{summary.totalBreakHours ? Number(summary.totalBreakHours).toFixed(2) : '0.00'}h</div>
                            <div className="text-sm text-gray-600">Total Horas Pausa</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-blue-600">{summary.totalBreakEntries || 0}</div>
                            <div className="text-sm text-gray-600">Total Pausas</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-green-600">{summary.averageBreakDuration ? Math.floor(summary.averageBreakDuration / 60) : 0}h {summary.averageBreakDuration ? summary.averageBreakDuration % 60 : 0}min</div>
                            <div className="text-sm text-gray-600">Promedio Duración</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-sm text-gray-600">Tipo Más Usado</div>
                            <div className="text-sm font-medium text-orange-700">
                                {summary.mostUsedBreakType?.breakType?.name || 'N/A'}
                            </div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-sm text-gray-600">Horas del Tipo Más Usado</div>
                            <div className="text-sm font-medium text-orange-700">
                                {summary.mostUsedBreakType?.totalHours ? Number(summary.mostUsedBreakType.totalHours).toFixed(2) : '0.00'}h
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detalles por tipo de pausa */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 p-6 pb-0">Detalles por Tipo de Pausa</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de Pausa</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Horas</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Minutos</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleados</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {details.map((detail: any, index: number) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <div
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: detail.breakType?.color || '#ccc' }}
                                                />
                                                <span className="font-medium text-gray-900">{detail.breakType?.name || 'Desconocido'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{detail.totalHours ? Number(detail.totalHours).toFixed(2) : '0.00'}h</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{detail.totalMinutes || 0}min</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{detail.entryCount || 0}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{detail.employeeCount || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderDelayReport = () => {
        const { summary, details } = reportData.data || {};

        // Verificar si hay datos para mostrar
        if (!summary || !details) {
            return (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                    No hay datos de retrasos disponibles para el período seleccionado.
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-red-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-4">Resumen de Retrasos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-red-600">{summary.totalDelays || 0}</div>
                            <div className="text-sm text-gray-600">Total Retrasos</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-orange-600">{summary.totalDelayHours ? Number(summary.totalDelayHours).toFixed(2) : '0.00'}h</div>
                            <div className="text-sm text-gray-600">Total Horas Retraso</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-2xl font-bold text-yellow-600">{summary.averageDelayMinutes ? Math.floor(summary.averageDelayMinutes) : 0}min</div>
                            <div className="text-sm text-gray-600">Promedio Retraso</div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-sm text-gray-600">Empleado con Más Retrasos</div>
                            <div className="text-sm font-medium text-red-700">
                                {summary.mostDelayedEmployee?.name || 'N/A'}
                            </div>
                        </div>
                        <div className="bg-white rounded p-4">
                            <div className="text-sm text-gray-600">Horas del Empleado con Más Retrasos</div>
                            <div className="text-sm font-medium text-red-700">
                                {summary.mostDelayedEmployee?.totalDelayMinutes ? (Number(summary.mostDelayedEmployee.totalDelayMinutes) / 60).toFixed(2) : '0.00'}h
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detalles por empleado */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 p-6 pb-0">Detalles por Empleado</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Retrasos</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Minutos</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Horas</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promedio Minutos</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {details.map((detail: any, index: number) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{detail.employee?.name || 'Empleado sin nombre'}</div>
                                                <div className="text-sm text-gray-500">({detail.employee?.dni || 'Sin DNI'})</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{detail.summary?.totalDelays || 0}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{detail.summary?.totalDelayMinutes || 0}min</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {detail.summary?.totalDelayMinutes ?
                                                `${Math.floor(detail.summary.totalDelayMinutes / 60)}h ${detail.summary.totalDelayMinutes % 60}min` :
                                                '0h 0min'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{detail.summary?.averageDelayMinutes ? Math.floor(detail.summary.averageDelayMinutes) : 0}min</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detalles de retrasos individuales */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 p-6 pb-0">Detalles de Retrasos Individuales</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora Entrada</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora Turno</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retraso (min)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retraso (horas)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {details.map((detail: any, empIndex: number) =>
                                    detail.delays?.map((delay: any, delayIndex: number) => (
                                        <tr key={`${empIndex}-${delayIndex}`} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{detail.employee?.name || 'Empleado sin nombre'}</div>
                                                    <div className="text-sm text-gray-500">({detail.employee?.dni || 'Sin DNI'})</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(delay.timestamp).toLocaleDateString('es-ES')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(delay.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">{delay.scheduleStartTime}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium">{delay.delayMinutes}min</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium">
                                                {Math.floor(delay.delayMinutes / 60)}h {delay.delayMinutes % 60}min
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    if (loadingEmployees) {
        return (
            <div className="flex justify-center py-8">
                <Loader size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
                <p className="text-gray-600">
                    Genera y visualiza reportes detallados de tiempo, asistencia y productividad.
                </p>
            </div>

            {/* Selector de tipo de reporte */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tipo de Reporte</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => setCurrentReport('time')}
                        className={`p-4 rounded-lg border-2 transition-colors ${currentReport === 'time'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                    >
                        <div className="font-medium">Reporte de Horas</div>
                        <div className="text-sm mt-1">Horas trabajadas por período</div>
                    </button>

                    <button
                        onClick={() => setCurrentReport('attendance')}
                        className={`p-4 rounded-lg border-2 transition-colors ${currentReport === 'attendance'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                    >
                        <div className="font-medium">Reporte de Asistencia</div>
                        <div className="text-sm mt-1">Asistencia y ausencias</div>
                    </button>

                    <button
                        onClick={() => setCurrentReport('employee-summary')}
                        className={`p-4 rounded-lg border-2 transition-colors ${currentReport === 'employee-summary'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                    >
                        <div className="font-medium">Resumen por Empleado</div>
                        <div className="text-sm mt-1">Estadísticas individuales</div>
                    </button>

                    <button
                        onClick={() => setCurrentReport('monthly')}
                        className={`p-4 rounded-lg border-2 transition-colors ${currentReport === 'monthly'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                    >
                        <div className="font-medium">Reporte Mensual</div>
                        <div className="text-sm mt-1">Análisis consolidado</div>
                    </button>

                    <button
                        onClick={() => setCurrentReport('break-types')}
                        className={`p-4 rounded-lg border-2 transition-colors ${currentReport === 'break-types'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                    >
                        <div className="font-medium">Tipos de Pausa</div>
                        <div className="text-sm mt-1">Tiempo por tipo de pausa</div>
                    </button>

                    <button
                        onClick={() => setCurrentReport('delays')}
                        className={`p-4 rounded-lg border-2 transition-colors ${currentReport === 'delays'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                    >
                        <div className="font-medium">Reporte de Retrasos</div>
                        <div className="text-sm mt-1">Detalle de retrasos</div>
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <ReportFilters
                filters={filters}
                onFiltersChange={setFilters}
                employees={employees}
            />

            {/* Botones de exportación */}
            <div className="flex justify-end space-x-2">
                <Button
                    onClick={() => handleExport('csv')}
                    disabled={reportData.loading || !reportData.data}
                    variant="secondary"
                >
                    Exportar CSV
                </Button>
                <Button
                    onClick={() => handleExport('pdf')}
                    disabled={reportData.loading || !reportData.data}
                    variant="secondary"
                >
                    Exportar PDF
                </Button>
                <Button
                    onClick={() => handleExport('excel')}
                    disabled={reportData.loading || !reportData.data}
                    variant="secondary"
                >
                    Exportar Excel
                </Button>
            </div>

            {/* Contenido del reporte */}
            {renderReportContent()}
        </div>
    );
};

export default ReportesPage;