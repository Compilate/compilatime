import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, AlertCircle, Download, DollarSign, Eye, TrendingDown, Search } from 'lucide-react';
import { superadminApi, Payment } from '../../lib/superadminApi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';

const PagosAdminPage: React.FC = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [methodFilter, setMethodFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        paid: 0,
        pending: 0,
        failed: 0,
        refunded: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        failedAmount: 0,
        refundedAmount: 0
    });

    // Formulario de creación de pago
    const [formData, setFormData] = useState({
        subscriptionId: '',
        amount: '',
        currency: 'EUR',
        method: 'MANUAL',
        stripePaymentId: '',
        invoiceUrl: ''
    });

    // Cargar pagos y estadísticas
    useEffect(() => {
        loadPayments();
        loadStats();
    }, []);

    // Filtrar pagos
    useEffect(() => {
        let filtered = payments;

        // Filtrar por término de búsqueda
        if (searchTerm) {
            filtered = filtered.filter(payment =>
                payment.subscription?.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.subscription?.company?.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.subscription?.plan?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.stripePaymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.invoiceUrl?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtrar por estado
        if (statusFilter !== 'all') {
            filtered = filtered.filter(payment => payment.status === statusFilter);
        }

        // Filtrar por método
        if (methodFilter !== 'all') {
            filtered = filtered.filter(payment => payment.method === methodFilter);
        }

        // Filtrar por fecha
        if (dateFilter) {
            filtered = filtered.filter(payment => {
                const paymentDate = new Date(payment.createdAt).toISOString().split('T')[0];
                return paymentDate === dateFilter;
            });
        }

        setFilteredPayments(filtered);
    }, [payments, searchTerm, statusFilter, methodFilter, dateFilter]);

    const loadPayments = async () => {
        try {
            setLoading(true);
            const response = await superadminApi.getPayments();

            if (response.success && response.data) {
                setPayments(response.data);
            } else {
                setError(response.message || 'Error al cargar los pagos');
            }
        } catch (err) {
            setError('Error de conexión al cargar los pagos');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await superadminApi.getPaymentStats();

            if (response.success && response.data) {
                setStats(response.data);
            }
        } catch (err) {
            console.error('Error al cargar estadísticas de pagos:', err);
        }
    };

    const handleCreatePayment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.subscriptionId || !formData.amount) {
            setError('Por favor, completa todos los campos obligatorios');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const paymentData = {
                subscriptionId: formData.subscriptionId,
                amount: parseFloat(formData.amount),
                currency: formData.currency,
                method: formData.method as any,
                stripePaymentId: formData.stripePaymentId || undefined,
                invoiceUrl: formData.invoiceUrl || undefined
            };

            const response = await superadminApi.createPayment(paymentData);

            if (response.success) {
                setSuccess('Pago creado correctamente');
                setShowCreateModal(false);
                setFormData({
                    subscriptionId: '',
                    amount: '',
                    currency: 'EUR',
                    method: 'MANUAL',
                    stripePaymentId: '',
                    invoiceUrl: ''
                });
                loadPayments();
                loadStats();
            } else {
                setError(response.message || 'Error al crear el pago');
            }
        } catch (err) {
            setError('Error de conexión al crear el pago');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayment = async (paymentId: string) => {
        if (!confirm('¿Estás seguro de que quieres confirmar este pago?')) {
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await superadminApi.confirmPayment(paymentId);

            if (response.success) {
                setSuccess('Pago confirmado correctamente');
                loadPayments();
                loadStats();
            } else {
                setError(response.message || 'Error al confirmar el pago');
            }
        } catch (err) {
            setError('Error de conexión al confirmar el pago');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsFailed = async (paymentId: string, reason?: string) => {
        const failureReason = reason || prompt('Motivo del fallo (opcional):');

        try {
            setLoading(true);
            setError('');

            const response = await superadminApi.failPayment(paymentId, failureReason || '');

            if (response.success) {
                setSuccess('Pago marcado como fallido correctamente');
                loadPayments();
                loadStats();
            } else {
                setError(response.message || 'Error al marcar el pago como fallido');
            }
        } catch (err) {
            setError('Error de conexión al marcar el pago como fallido');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este pago? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await superadminApi.deletePayment(paymentId);

            if (response.success) {
                setSuccess('Pago eliminado correctamente');
                loadPayments();
                loadStats();
            } else {
                setError(response.message || 'Error al eliminar el pago');
            }
        } catch (err) {
            setError('Error de conexión al eliminar el pago');
        } finally {
            setLoading(false);
        }
    };

    const handleViewPayment = (payment: Payment) => {
        setSelectedPayment(payment);
        setShowViewModal(true);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Pendiente' },
            PAID: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Pagado' },
            FAILED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Fallido' },
            REFUNDED: { color: 'bg-gray-100 text-gray-800', icon: TrendingDown, label: 'Reembolsado' }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
            </span>
        );
    };

    const getMethodBadge = (method: string) => {
        const methodConfig = {
            STRIPE: { color: 'bg-purple-100 text-purple-800', label: 'Stripe' },
            PAYPAL: { color: 'bg-blue-100 text-blue-800', label: 'PayPal' },
            BANK_TRANSFER: { color: 'bg-green-100 text-green-800', label: 'Transferencia' },
            MANUAL: { color: 'bg-gray-100 text-gray-800', label: 'Manual' }
        };

        const config = methodConfig[method as keyof typeof methodConfig] || methodConfig.MANUAL;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                {config.label}
            </span>
        );
    };

    const formatCurrency = (amount: number | undefined | null, currency: string = 'EUR') => {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return `${currency} 0,00`;
        }
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const exportToCSV = () => {
        const headers = [
            'ID',
            'Empresa',
            'Plan',
            'Cantidad',
            'Moneda',
            'Estado',
            'Método',
            'Fecha de pago',
            'Fecha de creación',
            'ID de Stripe',
            'URL de factura'
        ];

        const csvData = filteredPayments.map(payment => [
            payment.id,
            payment.subscription?.company?.name || 'N/A',
            payment.subscription?.plan?.name || 'N/A',
            payment.amount.toString(),
            payment.currency,
            payment.status,
            payment.method,
            payment.paidAt ? formatDate(payment.paidAt) : 'N/A',
            formatDate(payment.createdAt),
            payment.stripePaymentId || 'N/A',
            payment.invoiceUrl || 'N/A'
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `pagos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const columns = [
        {
            key: 'company' as keyof Payment,
            label: 'Empresa',
            render: (payment: Payment) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {payment.subscription?.company?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                        {payment.subscription?.company?.slug || 'N/A'}
                    </div>
                </div>
            )
        },
        {
            key: 'plan' as keyof Payment,
            label: 'Plan',
            render: (payment: Payment) => (
                <div className="text-sm text-gray-900">
                    {payment.subscription?.plan?.name || 'N/A'}
                </div>
            )
        },
        {
            key: 'amount' as keyof Payment,
            label: 'Cantidad',
            render: (payment: Payment) => (
                <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount, payment.currency || 'EUR')}
                </div>
            )
        },
        {
            key: 'status' as keyof Payment,
            label: 'Estado',
            render: (payment: Payment) => getStatusBadge(payment.status)
        },
        {
            key: 'method' as keyof Payment,
            label: 'Método',
            render: (payment: Payment) => getMethodBadge(payment.method)
        },
        {
            key: 'paidAt' as keyof Payment,
            label: 'Fecha de pago',
            render: (payment: Payment) => (
                <div className="text-sm text-gray-900">
                    {payment.paidAt ? formatDate(payment.paidAt) : 'N/A'}
                </div>
            )
        },
        {
            key: 'createdAt' as keyof Payment,
            label: 'Fecha de creación',
            render: (payment: Payment) => (
                <div className="text-sm text-gray-900">
                    {formatDate(payment.createdAt)}
                </div>
            )
        },
        {
            key: 'id' as keyof Payment,
            label: 'Acciones',
            render: (payment: Payment) => (
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handleViewPayment(payment)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                    >
                        <Eye className="w-4 h-4" />
                    </button>

                    {payment.status === 'PENDING' && (
                        <>
                            <button
                                onClick={() => handleConfirmPayment(payment.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Confirmar pago"
                            >
                                <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleMarkAsFailed(payment.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Marcar como fallido"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => handleDeletePayment(payment.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar pago"
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    if (loading && payments.length === 0) {
        return <Loader />;
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Pagos</h1>
                <p className="text-gray-600 mt-2">
                    Administra todos los pagos del sistema
                </p>
            </div>

            {/* Alertas */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <XCircle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <button
                                onClick={() => setError('')}
                                className="text-red-400 hover:text-red-600"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-green-800">{success}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <button
                                onClick={() => setSuccess('')}
                                className="text-green-400 hover:text-green-600"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 bg-blue-100 rounded-full">
                            <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Pagos</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            <p className="text-sm text-gray-500">{formatCurrency(stats.totalAmount)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 bg-green-100 rounded-full">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Pagados</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.paid}</p>
                            <p className="text-sm text-gray-500">{formatCurrency(stats.paidAmount)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 bg-yellow-100 rounded-full">
                            <AlertCircle className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Pendientes</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                            <p className="text-sm text-gray-500">{formatCurrency(stats.pendingAmount)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="p-3 bg-red-100 rounded-full">
                            <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Fallidos</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
                            <p className="text-sm text-gray-500">{formatCurrency(stats.failedAmount)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros y acciones */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Buscar pagos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 w-full sm:w-64"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="PENDING">Pendientes</option>
                            <option value="PAID">Pagados</option>
                            <option value="FAILED">Fallidos</option>
                            <option value="REFUNDED">Reembolsados</option>
                        </select>

                        <select
                            value={methodFilter}
                            onChange={(e) => setMethodFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Todos los métodos</option>
                            <option value="STRIPE">Stripe</option>
                            <option value="PAYPAL">PayPal</option>
                            <option value="BANK_TRANSFER">Transferencia</option>
                            <option value="MANUAL">Manual</option>
                        </select>

                        <Input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex space-x-2">
                        <Button
                            onClick={exportToCSV}
                            variant="secondary"
                            className="inline-flex items-center"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Exportar CSV
                        </Button>

                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Pago
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabla de pagos */}
            <div className="bg-white rounded-lg shadow">
                <Table
                    columns={columns}
                    data={filteredPayments}
                    emptyMessage="No se encontraron pagos"
                    loading={loading}
                />
            </div>

            {/* Modal de creación de pago */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Crear Nuevo Pago</h2>

                        <form onSubmit={handleCreatePayment}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ID de Suscripción *
                                    </label>
                                    <Input
                                        value={formData.subscriptionId}
                                        onChange={(e) => setFormData({ ...formData, subscriptionId: e.target.value })}
                                        placeholder="ID de la suscripción"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cantidad (€) *
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Moneda
                                    </label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="EUR">EUR</option>
                                        <option value="USD">USD</option>
                                        <option value="GBP">GBP</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Método de pago
                                    </label>
                                    <select
                                        value={formData.method}
                                        onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="MANUAL">Manual</option>
                                        <option value="STRIPE">Stripe</option>
                                        <option value="PAYPAL">PayPal</option>
                                        <option value="BANK_TRANSFER">Transferencia</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ID de Stripe (opcional)
                                    </label>
                                    <Input
                                        value={formData.stripePaymentId}
                                        onChange={(e) => setFormData({ ...formData, stripePaymentId: e.target.value })}
                                        placeholder="ID del pago en Stripe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        URL de factura (opcional)
                                    </label>
                                    <Input
                                        type="url"
                                        value={formData.invoiceUrl}
                                        onChange={(e) => setFormData({ ...formData, invoiceUrl: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 mt-6">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? 'Creando...' : 'Crear Pago'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de detalles de pago */}
            {showViewModal && selectedPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Detalles del Pago</h2>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Información General</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">ID:</span>
                                        <span className="font-medium">{selectedPayment.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Cantidad:</span>
                                        <span className="font-medium">{formatCurrency(selectedPayment.amount, selectedPayment.currency || 'EUR')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Moneda:</span>
                                        <span className="font-medium">{selectedPayment.currency}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Estado:</span>
                                        <div>{getStatusBadge(selectedPayment.status)}</div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Método:</span>
                                        <div>{getMethodBadge(selectedPayment.method)}</div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Fecha de creación:</span>
                                        <span className="font-medium">{formatDate(selectedPayment.createdAt)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Fecha de pago:</span>
                                        <span className="font-medium">
                                            {selectedPayment.paidAt ? formatDate(selectedPayment.paidAt) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">Información de Suscripción</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Empresa:</span>
                                        <span className="font-medium">
                                            {selectedPayment.subscription?.company?.name || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Código:</span>
                                        <span className="font-medium">
                                            {selectedPayment.subscription?.company?.slug || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Plan:</span>
                                        <span className="font-medium">
                                            {selectedPayment.subscription?.plan?.name || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Precio del plan:</span>
                                        <span className="font-medium">
                                            {selectedPayment.subscription?.plan && 'priceMonthly' in selectedPayment.subscription.plan
                                                ? formatCurrency((selectedPayment.subscription.plan as any).priceMonthly, 'EUR')
                                                : 'N/A'
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <h3 className="text-lg font-semibold mb-3">Información de Pago</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">ID de Stripe:</span>
                                        <span className="font-medium">
                                            {selectedPayment.stripePaymentId || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">URL de factura:</span>
                                        <span className="font-medium">
                                            {selectedPayment.invoiceUrl ? (
                                                <a
                                                    href={selectedPayment.invoiceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    Ver factura
                                                </a>
                                            ) : 'N/A'}
                                        </span>
                                    </div>
                                    {selectedPayment.failureReason && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Motivo del fallo:</span>
                                            <span className="font-medium text-red-600">
                                                {selectedPayment.failureReason}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 mt-6">
                            {selectedPayment.status === 'PENDING' && (
                                <>
                                    <Button
                                        onClick={() => {
                                            handleConfirmPayment(selectedPayment.id);
                                            setShowViewModal(false);
                                        }}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Confirmar Pago
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            handleMarkAsFailed(selectedPayment.id);
                                            setShowViewModal(false);
                                        }}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Marcar como Fallido
                                    </Button>
                                </>
                            )}
                            <Button
                                variant="secondary"
                                onClick={() => setShowViewModal(false)}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PagosAdminPage;