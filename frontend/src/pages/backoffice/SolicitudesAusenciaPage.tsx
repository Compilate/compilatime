import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { absencesApi } from '../../lib/api/absences.api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import type { AbsenceRequest, AbsenceStatus } from '../../lib/api/absences.api';

const SolicitudesAusenciaPage: React.FC = () => {
    useAuth(); // Solo para verificar que el componente esté dentro del contexto
    const [solicitudes, setSolicitudes] = useState<AbsenceRequest[]>([]);
    const [filteredSolicitudes, setFilteredSolicitudes] = useState<AbsenceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Filtros
    const [statusFilter, setStatusFilter] = useState<AbsenceStatus | 'TODOS'>('PENDING' as AbsenceStatus | 'TODOS');
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para modales
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<AbsenceRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadSolicitudes();
    }, []);

    useEffect(() => {
        // Aplicar filtros
        let filtered = solicitudes;

        // Filtrar por estado
        if (statusFilter !== 'TODOS') {
            filtered = filtered.filter(s => s.status === statusFilter);
        }

        // Filtrar por término de búsqueda
        if (searchTerm) {
            filtered = filtered.filter(s =>
                s.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.employee?.dni?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.type?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredSolicitudes(filtered);
    }, [solicitudes, statusFilter, searchTerm]);

    const loadSolicitudes = async () => {
        try {
            setLoading(true);
            const response = await absencesApi.getAbsenceRequests();
            if (response.requests) {
                setSolicitudes(response.requests);
            } else {
                setError('Error al cargar las solicitudes de ausencia');
            }
        } catch (error) {
            console.error('Error al cargar solicitudes:', error);
            setError('Error al cargar las solicitudes de ausencia');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId: string) => {
        try {
            setProcessing(requestId);
            await absencesApi.approveAbsenceRequest(requestId);

            setSuccess('Solicitud aprobada correctamente');
            loadSolicitudes(); // Recargar la lista
        } catch (error) {
            console.error('Error al aprobar solicitud:', error);
            setError('Error al aprobar la solicitud');
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectClick = (request: AbsenceRequest) => {
        setSelectedRequest(request);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!selectedRequest || !rejectReason.trim()) {
            setError('El motivo de rechazo es obligatorio');
            return;
        }

        try {
            setProcessing(selectedRequest.id);
            await absencesApi.rejectAbsenceRequest(selectedRequest.id, rejectReason);

            setSuccess('Solicitud rechazada correctamente');
            setShowRejectModal(false);
            setSelectedRequest(null);
            setRejectReason('');
            loadSolicitudes(); // Recargar la lista
        } catch (error) {
            console.error('Error al rechazar solicitud:', error);
            setError('Error al rechazar la solicitud');
        } finally {
            setProcessing(null);
        }
    };

    const getStatusBadge = (status: AbsenceStatus) => {
        const styles: Record<AbsenceStatus, string> = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            APPROVED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800',
            CANCELLED: 'bg-gray-100 text-gray-800'
        };

        const labels: Record<AbsenceStatus, string> = {
            PENDING: 'Pendiente',
            APPROVED: 'Aprobada',
            REJECTED: 'Rechazada',
            CANCELLED: 'Cancelada'
        };

        return (
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    const getTypeLabel = (type: string) => {
        const labels: { [key: string]: string } = {
            VACATION: 'Vacaciones',
            SICK: 'Baja médica',
            PERSONAL: 'Personal',
            MATERNITY: 'Maternidad',
            PATERNITY: 'Paternidad',
            BEREAVEMENT: 'Duelo',
            OTHER: 'Otro'
        };
        return labels[type] || type;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const calculateDays = (startDate: string, endDate: string, includeHalfDay: boolean) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        return includeHalfDay ? `${diffDays - 0.5} días` : `${diffDays} días`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Ausencia</h1>
                <p className="text-gray-600">Gestiona las solicitudes de ausencia de los empleados</p>
            </div>

            {/* Alertas */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {success}
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estado
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as AbsenceStatus | 'TODOS')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="TODOS">Todos</option>
                            <option value="PENDING">Pendientes</option>
                            <option value="APPROVED">Aprobadas</option>
                            <option value="REJECTED">Rechazadas</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar
                        </label>
                        <Input
                            type="text"
                            placeholder="Buscar por empleado, DNI o tipo..."
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Lista de solicitudes */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {filteredSolicitudes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {solicitudes.length === 0
                            ? 'No hay solicitudes de ausencia'
                            : 'No hay solicitudes que coincidan con los filtros'
                        }
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Empleado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fechas
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Duración
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Motivo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha solicitud
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredSolicitudes.map((solicitud) => (
                                    <tr key={solicitud.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {solicitud.employee?.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {solicitud.employee?.dni}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-900">
                                                {getTypeLabel(solicitud.type)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {formatDate(solicitud.startDate)}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {solicitud.startDate !== solicitud.endDate && `al ${formatDate(solicitud.endDate)}`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {calculateDays(solicitud.startDate, solicitud.endDate, false)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 max-w-xs truncate">
                                                {solicitud.reason || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(solicitud.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(solicitud.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {solicitud.status === 'PENDING' && (
                                                <div className="flex justify-end space-x-2">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handleApprove(solicitud.id)}
                                                        disabled={processing === solicitud.id}
                                                        loading={processing === solicitud.id}
                                                    >
                                                        Aprobar
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleRejectClick(solicitud)}
                                                        disabled={processing === solicitud.id}
                                                    >
                                                        Rechazar
                                                    </Button>
                                                </div>
                                            )}
                                            {solicitud.status === 'APPROVED' && (
                                                <span className="text-green-600 text-sm">Aprobada</span>
                                            )}
                                            {solicitud.status === 'REJECTED' && (
                                                <div>
                                                    <span className="text-red-600 text-sm">Rechazada</span>
                                                    {solicitud.rejectionReason && (
                                                        <div className="text-xs text-gray-500 mt-1 max-w-xs">
                                                            Motivo: {solicitud.rejectionReason}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de rechazo */}
            {showRejectModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Rechazar Solicitud de Ausencia</h3>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Empleado:</strong> {selectedRequest.employee?.name}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Tipo:</strong> {getTypeLabel(selectedRequest.type)}
                            </p>
                            <p className="text-sm text-gray-600">
                                <strong>Periodo:</strong> {formatDate(selectedRequest.startDate)}
                                {selectedRequest.startDate !== selectedRequest.endDate &&
                                    ` al ${formatDate(selectedRequest.endDate)}`
                                }
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Motivo del rechazo *
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Indica el motivo por el que se rechaza esta solicitud..."
                                required
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setSelectedRequest(null);
                                    setRejectReason('');
                                }}
                                disabled={processing === selectedRequest.id}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleReject}
                                disabled={processing === selectedRequest.id || !rejectReason.trim()}
                                loading={processing === selectedRequest.id}
                            >
                                Rechazar Solicitud
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SolicitudesAusenciaPage;