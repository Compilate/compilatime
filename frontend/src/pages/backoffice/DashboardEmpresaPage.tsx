import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardApi } from '../../lib/api';
import { formatDateTime, formatTime } from '../../lib/utils';
import Loader from '../../components/common/Loader';

interface DashboardStats {
    totalEmployees: number;
    activeEmployees: number;
    todayEntries: number;
    todayExits: number;
    weeklyHours: number;
    monthlyHours: number;
}

interface RecentTimeEntry {
    id: string;
    type: 'IN' | 'OUT' | 'BREAK' | 'RESUME';
    timestamp: string;
    employee: {
        name: string;
        surname: string;
        dni: string;
    };
}

const DashboardEmpresaPage: React.FC = () => {
    const { user, company } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentEntries, setRecentEntries] = useState<RecentTimeEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Cargar estadísticas
            const statsResponse = await dashboardApi.getDashboardStats();
            console.log('Dashboard - Respuesta de getDashboardStats:', statsResponse);
            if (statsResponse.success && statsResponse.data) {
                // Mapear la estructura del backend a la que espera el frontend
                const backendData = statsResponse.data as any;
                const mappedStats = {
                    totalEmployees: backendData.employees?.total || 0,
                    activeEmployees: backendData.employees?.activeToday || 0,
                    todayEntries: backendData.timeEntries?.today?.total || 0,
                    todayExits: backendData.timeEntries?.today?.outs || 0,
                    weeklyHours: backendData.hours?.weekly || 0,
                    monthlyHours: backendData.hours?.monthly || 0,
                };
                console.log('Dashboard - Estadísticas mapeadas:', mappedStats);
                setStats(mappedStats);
            }

            // Cargar fichajes recientes (manejar error 404)
            try {
                const recentResponse = await dashboardApi.getRecentTimeEntries(10);
                console.log('Dashboard - Respuesta de getRecentTimeEntries:', recentResponse);
                if (recentResponse.success && recentResponse.data) {
                    setRecentEntries(recentResponse.data as any || []);
                }
            } catch (error) {
                console.warn('No se pudieron cargar los fichajes recientes (ruta no implementada):', error);
                setRecentEntries([]);
            }
        } catch (error) {
            console.error('Error al cargar datos del dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEntryTypeLabel = (type: string) => {
        switch (type) {
            case 'IN': return 'Entrada';
            case 'OUT': return 'Salida';
            case 'BREAK': return 'Pausa';
            case 'RESUME': return 'Reanudar';
            default: return type;
        }
    };

    const getEntryTypeColor = (type: string) => {
        switch (type) {
            case 'IN': return 'bg-green-100 text-green-800';
            case 'OUT': return 'bg-red-100 text-red-800';
            case 'BREAK': return 'bg-yellow-100 text-yellow-800';
            case 'RESUME': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader size="lg" text="Cargando dashboard..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">
                    Bienvenido, {user?.name}. Aquí tienes un resumen de {company?.name}.
                </p>
            </div>

            {/* Tarjetas de estadísticas */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Empleados</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Activos Ahora</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.activeEmployees}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Fichajes Hoy</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.todayEntries}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Horas Semana</p>
                                <p className="text-2xl font-bold text-gray-900">{(stats.weeklyHours || 0).toFixed(1)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fichajes recientes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Fichajes Recientes</h2>
                </div>
                <div className="p-6">
                    {recentEntries.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-gray-400 text-lg mb-2">📊</div>
                            <p className="text-gray-500">No hay fichajes recientes</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentEntries.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getEntryTypeColor(entry.type)}`}>
                                            {getEntryTypeLabel(entry.type)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {entry.employee.name} {entry.employee.surname}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                DNI: {entry.employee.dni}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">
                                            {formatTime(entry.timestamp)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {formatDateTime(entry.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardEmpresaPage;