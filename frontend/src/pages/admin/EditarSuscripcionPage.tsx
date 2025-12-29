import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    AlertCircle
} from 'lucide-react';
import { superadminApi, Subscription, UpdateSubscriptionRequest } from '../../lib/superadminApi';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';

const EditarSuscripcionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState<UpdateSubscriptionRequest>({
        status: 'ACTIVE',
        paymentMethod: 'MANUAL',
        renewsAutomatically: true
    });

    useEffect(() => {
        if (id) {
            loadSubscription(id);
        }
    }, [id]);

    const loadSubscription = async (subscriptionId: string) => {
        try {
            setIsLoading(true);
            setError('');

            const response = await superadminApi.getSubscription(subscriptionId);

            if (response.success && response.data) {
                setSubscription(response.data);
                setFormData({
                    status: response.data.status,
                    paymentMethod: response.data.paymentMethod,
                    renewsAutomatically: response.data.renewsAutomatically
                });
            } else {
                setError(response.message || 'Error al cargar la suscripción');
            }
        } catch (error) {
            console.error('Error cargando suscripción:', error);
            setError('Error de conexión al cargar la suscripción');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!subscription) return;

        try {
            setIsSaving(true);
            setError('');
            setSuccess('');

            const response = await superadminApi.updateSubscription(subscription.id, formData);

            if (response.success) {
                setSuccess('Suscripción actualizada correctamente');
                setTimeout(() => {
                    navigate('/admin/suscripciones');
                }, 2000);
            } else {
                setError(response.message || 'Error al actualizar la suscripción');
            }
        } catch (error) {
            console.error('Error actualizando suscripción:', error);
            setError('Error de conexión al actualizar la suscripción');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value, type } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));

        // Limpiar mensajes al cambiar el valor
        if (error || success) {
            setError('');
            setSuccess('');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader size="lg" text="Cargando suscripción..." />
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Suscripción no encontrada</h1>
                    <p className="text-gray-600 mb-4">La suscripción que buscas no existe o ha sido eliminada.</p>
                    <Button onClick={() => navigate('/admin/suscripciones')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a suscripciones
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/admin/suscripciones')}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a suscripciones
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Editar Suscripción</h1>
                    <p className="text-gray-600 mt-2">
                        Modifica los datos de la suscripción para {subscription.company?.name}
                    </p>
                </div>

                {/* Mensajes */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
                        {success}
                    </div>
                )}

                {/* Información de la suscripción */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Información de la Suscripción</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Empresa</h3>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-sm text-gray-500">Nombre:</span>
                                    <p className="font-medium">{subscription.company?.name}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Email:</span>
                                    <p className="font-medium">{subscription.company?.email}</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Plan</h3>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-sm text-gray-500">Nombre:</span>
                                    <p className="font-medium">{subscription.plan?.name}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Precio mensual:</span>
                                    <p className="font-medium">€{subscription.plan?.priceMonthly}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        <div>
                            <span className="text-sm text-gray-500">Fecha de inicio:</span>
                            <p className="font-medium">{formatDate(subscription.startDate)}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-500">Fecha de fin:</span>
                            <p className="font-medium">{formatDate(subscription.endDate)}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-500">Estado actual:</span>
                            <p className="font-medium">{subscription.status}</p>
                        </div>
                    </div>
                </div>

                {/* Formulario de edición */}
                <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuración de la Suscripción</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Estado
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={isSaving}
                            >
                                <option value="ACTIVE">Activa</option>
                                <option value="CANCELLED">Cancelada</option>
                                <option value="EXPIRED">Expirada</option>
                                <option value="TRIAL">Prueba</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Método de pago
                            </label>
                            <select
                                name="paymentMethod"
                                value={formData.paymentMethod}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={isSaving}
                            >
                                <option value="STRIPE">Stripe</option>
                                <option value="PAYPAL">PayPal</option>
                                <option value="BANK_TRANSFER">Transferencia bancaria</option>
                                <option value="MANUAL">Manual</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="renewsAutomatically"
                                checked={formData.renewsAutomatically}
                                onChange={handleChange}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                disabled={isSaving}
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                Renovar automáticamente
                            </span>
                        </label>
                    </div>

                    <div className="flex justify-end mt-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/admin/suscripciones')}
                            disabled={isSaving}
                            className="mr-4"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Guardando...' : 'Guardar cambios'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditarSuscripcionPage;