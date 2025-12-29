import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard, Users, Clock, AlertCircle } from 'lucide-react';
import { superadminApi, Plan, CreatePlanRequest, UpdatePlanRequest } from '../../lib/superadminApi';
import Button from '../common/Button';
import Input from '../common/Input';

interface PlanFormProps {
    plan?: Plan;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const PlanForm: React.FC<PlanFormProps> = ({ plan, isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priceMonthly: 0,
        priceYearly: 0,
        durationMonths: 1,
        maxEmployees: 10,
        maxTimeEntriesPerMonth: 500,
        features: {
            basicTimeTracking: true,
            basicReports: true,
            employeeManagement: true,
            scheduleManagement: true,
            absenceManagement: true,
            emailSupport: true,
            apiAccess: false,
            advancedReports: false,
            customBranding: false,
            prioritySupport: false,
            dedicatedAccountManager: false,
            slaGuarantee: false
        }
    });

    const [isFreePlan, setIsFreePlan] = useState(false);
    const [isCustomDuration, setIsCustomDuration] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (plan) {
                setIsEditing(true);
                setIsFreePlan(plan.priceMonthly === 0);
                setIsCustomDuration(plan.durationMonths !== 1);
                setFormData({
                    name: plan.name || '',
                    description: plan.description || '',
                    priceMonthly: plan.priceMonthly || 0,
                    priceYearly: plan.priceYearly || 0,
                    durationMonths: plan.durationMonths || 1,
                    maxEmployees: plan.maxEmployees || 10,
                    maxTimeEntriesPerMonth: plan.maxTimeEntriesPerMonth || 500,
                    features: plan.features || {
                        basicTimeTracking: true,
                        basicReports: true,
                        employeeManagement: true,
                        scheduleManagement: true,
                        absenceManagement: true,
                        emailSupport: true,
                        apiAccess: false,
                        advancedReports: false,
                        customBranding: false,
                        prioritySupport: false,
                        dedicatedAccountManager: false,
                        slaGuarantee: false
                    }
                });
            } else {
                setIsEditing(false);
                setIsFreePlan(false);
                setIsCustomDuration(false);
                setFormData({
                    name: '',
                    description: '',
                    priceMonthly: 0,
                    priceYearly: 0,
                    durationMonths: 1,
                    maxEmployees: 10,
                    maxTimeEntriesPerMonth: 500,
                    features: {
                        basicTimeTracking: true,
                        basicReports: true,
                        employeeManagement: true,
                        scheduleManagement: true,
                        absenceManagement: true,
                        emailSupport: true,
                        apiAccess: false,
                        advancedReports: false,
                        customBranding: false,
                        prioritySupport: false,
                        dedicatedAccountManager: false,
                        slaGuarantee: false
                    }
                });
            }
            setError('');
        }
    }, [isOpen, plan]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
        }));

        // Calcular precio anual automáticamente basado en el mensual (10% de descuento)
        if (name === 'priceMonthly' && !isEditing) {
            const monthlyPrice = Number(value);
            const yearlyPrice = monthlyPrice * 12 * 0.9; // 10% de descuento
            setFormData(prev => ({
                ...prev,
                priceYearly: yearlyPrice
            }));
        }

        // Limpiar error al cambiar el valor
        if (error) {
            setError('');
        }
    };

    const handleFreePlanChange = (checked: boolean) => {
        setIsFreePlan(checked);
        if (checked) {
            // Si es un plan gratuito, establecer precios en 0
            setFormData(prev => ({
                ...prev,
                priceMonthly: 0,
                priceYearly: 0
            }));
        }
    };

    const handleCustomDurationChange = (checked: boolean) => {
        setIsCustomDuration(checked);
        if (!checked) {
            // Si no es duración personalizada, establecer a 1 mes
            setFormData(prev => ({
                ...prev,
                durationMonths: 1
            }));
        }
    };

    const handleFeatureChange = (featureName: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            features: {
                ...prev.features,
                [featureName]: checked
            }
        }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('El nombre del plan es requerido');
            return false;
        }

        if (!isFreePlan && formData.priceMonthly <= 0) {
            setError('El precio mensual debe ser mayor que cero');
            return false;
        }

        if (!isFreePlan && formData.priceYearly <= 0) {
            setError('El precio anual debe ser mayor que cero');
            return false;
        }

        if (formData.maxEmployees < 1) {
            setError('El número máximo de empleados debe ser mayor que cero');
            return false;
        }

        if (formData.maxTimeEntriesPerMonth < 1) {
            setError('El número máximo de fichajes mensuales debe ser mayor que cero');
            return false;
        }

        // Validar que el precio anual sea razonable (debe ser menor que 12 veces el mensual)
        if (!isFreePlan && formData.priceYearly >= formData.priceMonthly * 12) {
            setError('El precio anual debe ser menor que 12 veces el precio mensual');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            let response;

            if (isEditing && plan) {
                const updateData: UpdatePlanRequest = {
                    name: formData.name,
                    description: formData.description || undefined,
                    priceMonthly: formData.priceMonthly,
                    priceYearly: formData.priceYearly,
                    durationMonths: formData.durationMonths,
                    maxEmployees: formData.maxEmployees,
                    maxTimeEntriesPerMonth: formData.maxTimeEntriesPerMonth,
                    features: formData.features
                };

                response = await superadminApi.updatePlan(plan.id, updateData);
            } else {
                const createData: CreatePlanRequest = {
                    name: formData.name,
                    description: formData.description || undefined,
                    priceMonthly: formData.priceMonthly,
                    priceYearly: formData.priceYearly,
                    durationMonths: formData.durationMonths,
                    maxEmployees: formData.maxEmployees,
                    maxTimeEntriesPerMonth: formData.maxTimeEntriesPerMonth,
                    features: formData.features
                };

                response = await superadminApi.createPlan(createData);
            }

            if (response.success) {
                onSuccess();
                onClose();
            } else {
                setError(response.message || 'Error al guardar el plan');
            }
        } catch (error) {
            console.error('Error al guardar plan:', error);
            setError('Error de conexión. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center">
                        <CreditCard className="w-6 h-6 text-indigo-600 mr-3" />
                        <h2 className="text-xl font-semibold text-gray-900">
                            {isEditing ? 'Editar Plan' : 'Nuevo Plan'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                            <span className="text-red-700 text-sm">{error}</span>
                        </div>
                    )}

                    {/* Información Básica */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre del Plan *
                                </label>
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Ej: Básico"
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Descripción
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Breve descripción del plan..."
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tipo de Plan */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Tipo de Plan</h3>
                        <div className="flex items-center mb-4">
                            <input
                                type="checkbox"
                                id="isFreePlan"
                                checked={isFreePlan}
                                onChange={(e) => handleFreePlanChange(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                disabled={isLoading || isEditing}
                            />
                            <label htmlFor="isFreePlan" className="ml-2 block text-sm text-gray-700">
                                Plan gratuito (limitado)
                            </label>
                        </div>
                        {isFreePlan && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    <strong>Limitaciones del plan gratuito:</strong>
                                </p>
                                <ul className="mt-2 text-sm text-blue-600 list-disc list-inside">
                                    <li>Máximo 1 empleado</li>
                                    <li>Máximo 50 fichajes mensuales</li>
                                    <li>Sin coste mensual ni anual</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Precios */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Precios</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Precio Mensual (€) *
                                </label>
                                <Input
                                    name="priceMonthly"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.priceMonthly}
                                    onChange={handleChange}
                                    placeholder="29.99"
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Precio Anual (€) *
                                </label>
                                <Input
                                    name="priceYearly"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.priceYearly}
                                    onChange={handleChange}
                                    placeholder="299.99"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>
                        {!isEditing && (
                            <p className="text-xs text-gray-500 mt-2">
                                El precio anual se calcula automáticamente con un 10% de descuento sobre el mensual
                            </p>
                        )}
                    </div>

                    {/* Duración */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Duración del Plan</h3>
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isCustomDuration"
                                    checked={isCustomDuration}
                                    onChange={(e) => handleCustomDurationChange(e.target.checked)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    disabled={isLoading || isEditing}
                                />
                                <label htmlFor="isCustomDuration" className="ml-2 block text-sm text-gray-700">
                                    Duración personalizada
                                </label>
                            </div>

                            {isCustomDuration && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Duración (meses) *
                                        </label>
                                        <select
                                            name="durationMonths"
                                            value={formData.durationMonths}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                durationMonths: Number(e.target.value)
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            disabled={isLoading}
                                            required
                                        >
                                            <option value={1}>1 mes</option>
                                            <option value={3}>3 meses</option>
                                            <option value={6}>6 meses</option>
                                            <option value={12}>12 meses</option>
                                            <option value={24}>24 meses</option>
                                            <option value={36}>36 meses</option>
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Selecciona la duración del plan en meses
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!isCustomDuration && (
                                <p className="text-sm text-gray-600">
                                    El plan tendrá una duración estándar de 1 mes
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Límites */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Límites</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Máximo de Empleados *
                                </label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        name="maxEmployees"
                                        type="number"
                                        min="1"
                                        value={isFreePlan ? 1 : formData.maxEmployees}
                                        onChange={handleChange}
                                        className="pl-10"
                                        placeholder="10"
                                        disabled={isLoading || isFreePlan}
                                        required
                                    />
                                </div>
                                {isFreePlan && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Los planes gratuitos están limitados a 1 empleado
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Máximo de Fichajes Mensuales *
                                </label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        name="maxTimeEntriesPerMonth"
                                        type="number"
                                        min="1"
                                        value={isFreePlan ? 50 : formData.maxTimeEntriesPerMonth}
                                        onChange={handleChange}
                                        className="pl-10"
                                        placeholder="500"
                                        disabled={isLoading || isFreePlan}
                                        required
                                    />
                                </div>
                                {isFreePlan && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Los planes gratuitos están limitados a 50 fichajes mensuales
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Características */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Características</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="basicTimeTracking"
                                        checked={formData.features.basicTimeTracking}
                                        onChange={(e) => handleFeatureChange('basicTimeTracking', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="basicTimeTracking" className="ml-2 block text-sm text-gray-700">
                                        Control de horario básico
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="basicReports"
                                        checked={formData.features.basicReports}
                                        onChange={(e) => handleFeatureChange('basicReports', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="basicReports" className="ml-2 block text-sm text-gray-700">
                                        Reportes básicos
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="employeeManagement"
                                        checked={formData.features.employeeManagement}
                                        onChange={(e) => handleFeatureChange('employeeManagement', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="employeeManagement" className="ml-2 block text-sm text-gray-700">
                                        Gestión de empleados
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="scheduleManagement"
                                        checked={formData.features.scheduleManagement}
                                        onChange={(e) => handleFeatureChange('scheduleManagement', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="scheduleManagement" className="ml-2 block text-sm text-gray-700">
                                        Gestión de horarios
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="absenceManagement"
                                        checked={formData.features.absenceManagement}
                                        onChange={(e) => handleFeatureChange('absenceManagement', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="absenceManagement" className="ml-2 block text-sm text-gray-700">
                                        Gestión de ausencias
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="emailSupport"
                                        checked={formData.features.emailSupport}
                                        onChange={(e) => handleFeatureChange('emailSupport', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="emailSupport" className="ml-2 block text-sm text-gray-700">
                                        Soporte por email
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="apiAccess"
                                        checked={formData.features.apiAccess}
                                        onChange={(e) => handleFeatureChange('apiAccess', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="apiAccess" className="ml-2 block text-sm text-gray-700">
                                        Acceso a API
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="advancedReports"
                                        checked={formData.features.advancedReports}
                                        onChange={(e) => handleFeatureChange('advancedReports', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="advancedReports" className="ml-2 block text-sm text-gray-700">
                                        Reportes avanzados
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="customBranding"
                                        checked={formData.features.customBranding}
                                        onChange={(e) => handleFeatureChange('customBranding', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="customBranding" className="ml-2 block text-sm text-gray-700">
                                        Marca personalizada
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="prioritySupport"
                                        checked={formData.features.prioritySupport}
                                        onChange={(e) => handleFeatureChange('prioritySupport', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="prioritySupport" className="ml-2 block text-sm text-gray-700">
                                        Soporte prioritario
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="dedicatedAccountManager"
                                        checked={formData.features.dedicatedAccountManager}
                                        onChange={(e) => handleFeatureChange('dedicatedAccountManager', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="dedicatedAccountManager" className="ml-2 block text-sm text-gray-700">
                                        Gestor de cuenta dedicado
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="slaGuarantee"
                                        checked={formData.features.slaGuarantee}
                                        onChange={(e) => handleFeatureChange('slaGuarantee', e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="slaGuarantee" className="ml-2 block text-sm text-gray-700">
                                        Garantía SLA
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isLoading}
                            className="flex items-center"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isLoading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PlanForm;