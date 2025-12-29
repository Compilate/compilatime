import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { superadminApi } from '../../lib/superadminApi';
import { Company, Plan, CreateSubscriptionRequest } from '../../lib/superadminApi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const CrearSuscripcionPage: React.FC = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState<CreateSubscriptionRequest & { trialEndsAt?: string }>({
        companyId: '',
        planId: '',
        startDate: '',
        endDate: '',
        renewsAutomatically: true,
        paymentMethod: 'MANUAL',
        trialEndsAt: ''
    });

    // Cargar empresas y planes
    useEffect(() => {
        const loadData = async () => {
            try {
                const [companiesResponse, plansResponse] = await Promise.all([
                    superadminApi.getCompanies(),
                    superadminApi.getPlans()
                ]);

                if (companiesResponse.success) {
                    setCompanies(companiesResponse.data || []);
                } else {
                    setError(companiesResponse.message || 'Error al cargar las empresas');
                }

                if (plansResponse.success) {
                    setPlans(plansResponse.data || []);
                } else {
                    setError(plansResponse.message || 'Error al cargar los planes');
                }
            } catch (error) {
                console.error('Error al cargar datos:', error);
                setError('Error de conexión al cargar los datos');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsSaving(true);

        try {
            // Validaciones básicas
            if (!formData.companyId || !formData.planId || !formData.startDate || !formData.endDate) {
                setError('Por favor, completa todos los campos obligatorios');
                setIsSaving(false);
                return;
            }

            // Validar que la fecha de fin sea posterior a la de inicio
            if (new Date(formData.endDate) <= new Date(formData.startDate)) {
                setError('La fecha de fin debe ser posterior a la fecha de inicio');
                setIsSaving(false);
                return;
            }

            // Preparar datos para enviar, solo incluir trialEndsAt si tiene un valor válido
            const subscriptionData: CreateSubscriptionRequest = {
                companyId: formData.companyId,
                planId: formData.planId,
                startDate: formData.startDate,
                endDate: formData.endDate,
                renewsAutomatically: formData.renewsAutomatically,
                paymentMethod: formData.paymentMethod
            };

            // Solo agregar trialEndsAt si tiene un valor
            if (formData.trialEndsAt && formData.trialEndsAt.trim() !== '') {
                subscriptionData.trialEndsAt = formData.trialEndsAt;
            }

            const response = await superadminApi.createSubscription(subscriptionData);

            if (response.success) {
                setSuccess('Suscripción creada correctamente');
                setTimeout(() => {
                    navigate('/admin/suscripciones');
                }, 2000);
            } else {
                setError(response.message || 'Error al crear la suscripción');
            }
        } catch (error) {
            console.error('Error al crear suscripción:', error);
            setError('Error de conexión al crear la suscripción');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando datos...</p>
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
                        variant="outline"
                        onClick={() => navigate('/admin/suscripciones')}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a suscripciones
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Crear Nueva Suscripción</h1>
                    <p className="text-gray-600 mt-2">
                        Registra una nueva suscripción para una empresa
                    </p>
                </div>

                {/* Alertas */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <X className="h-5 w-5 text-red-400 mr-2" />
                            <div className="text-red-700">{error}</div>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="text-green-700">{success}</div>
                    </div>
                )}

                {/* Formulario */}
                <div className="bg-white shadow rounded-lg">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Empresa */}
                            <div>
                                <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-2">
                                    Empresa *
                                </label>
                                <select
                                    id="companyId"
                                    name="companyId"
                                    value={formData.companyId}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                >
                                    <option value="">Selecciona una empresa</option>
                                    {companies.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {company.name} ({company.slug})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Plan */}
                            <div>
                                <label htmlFor="planId" className="block text-sm font-medium text-gray-700 mb-2">
                                    Plan *
                                </label>
                                <select
                                    id="planId"
                                    name="planId"
                                    value={formData.planId}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                >
                                    <option value="">Selecciona un plan</option>
                                    {plans.map((plan) => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.name} - €{plan.priceMonthly}/mes
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Fecha de inicio */}
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha de inicio *
                                </label>
                                <Input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            {/* Fecha de fin */}
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha de fin *
                                </label>
                                <Input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            {/* Fecha de fin de trial (opcional) */}
                            <div>
                                <label htmlFor="trialEndsAt" className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha de fin de trial (opcional)
                                </label>
                                <Input
                                    id="trialEndsAt"
                                    name="trialEndsAt"
                                    type="date"
                                    value={formData.trialEndsAt}
                                    onChange={handleInputChange}
                                />
                            </div>

                            {/* Método de pago */}
                            <div>
                                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                                    Método de pago
                                </label>
                                <select
                                    id="paymentMethod"
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="MANUAL">Manual</option>
                                    <option value="STRIPE">Stripe</option>
                                    <option value="PAYPAL">PayPal</option>
                                    <option value="BANK_TRANSFER">Transferencia bancaria</option>
                                </select>
                            </div>
                        </div>

                        {/* Renovación automática */}
                        <div className="flex items-center">
                            <input
                                id="renewsAutomatically"
                                name="renewsAutomatically"
                                type="checkbox"
                                checked={formData.renewsAutomatically}
                                onChange={handleInputChange}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor="renewsAutomatically" className="ml-2 block text-sm text-gray-700">
                                Renovación automática
                            </label>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/admin/suscripciones')}
                                disabled={isSaving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {isSaving ? 'Guardando...' : 'Crear Suscripción'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CrearSuscripcionPage;