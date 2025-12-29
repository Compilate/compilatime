import React, { useState, useEffect } from 'react';
import { X, Save, Building2, Mail, Globe, Calendar, Users, AlertCircle } from 'lucide-react';
import { superadminApi, Company, CreateCompanyRequest, UpdateCompanyRequest } from '../../lib/superadminApi';
import Button from '../common/Button';
import Input from '../common/Input';

interface CompanyFormProps {
    company?: Company;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CompanyForm: React.FC<CompanyFormProps> = ({ company, isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        email: '',
        description: '',
        address: '',
        phone: '',
        website: '',
        industry: '',
        taxId: '',
        maxEmployees: 50,
        subscriptionPlanId: '',
        trialEndDate: ''
    });

    const [plans, setPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadPlans();
            if (company) {
                setIsEditing(true);
                setFormData({
                    name: company.name || '',
                    slug: company.slug || '',
                    email: company.email || '',
                    description: '', // Campo no disponible en la API
                    address: company.address || '',
                    phone: company.phone || '',
                    website: '', // Campo no disponible en la API
                    industry: '', // Campo no disponible en la API
                    taxId: '', // Campo no disponible en la API
                    maxEmployees: 50, // Valor por defecto
                    subscriptionPlanId: company.currentSubscription?.plan?.id || '',
                    trialEndDate: '' // Campo no disponible en la API
                });
            } else {
                setIsEditing(false);
                setFormData({
                    name: '',
                    slug: '',
                    email: '',
                    description: '',
                    address: '',
                    phone: '',
                    website: '',
                    industry: '',
                    taxId: '',
                    maxEmployees: 50,
                    subscriptionPlanId: '',
                    trialEndDate: ''
                });
            }
            setError('');
        }
    }, [isOpen, company]);

    const loadPlans = async () => {
        try {
            const response = await superadminApi.getPlans();
            if (response.success && response.data) {
                setPlans(response.data.filter((plan: any) => plan.active));
            }
        } catch (error) {
            console.error('Error al cargar planes:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
        }));

        // Generar slug automáticamente a partir del nombre
        if (name === 'name' && !isEditing) {
            const slug = value
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            setFormData(prev => ({ ...prev, slug }));
        }

        // Limpiar error al cambiar el valor
        if (error) {
            setError('');
        }
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('El nombre de la empresa es requerido');
            return false;
        }

        if (!formData.slug.trim()) {
            setError('El código de empresa es requerido');
            return false;
        }

        if (!/^[a-z0-9-]+$/.test(formData.slug)) {
            setError('El código de empresa solo puede contener letras minúsculas, números y guiones');
            return false;
        }

        if (!formData.email.trim()) {
            setError('El correo electrónico es requerido');
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError('El correo electrónico no es válido');
            return false;
        }

        if (formData.maxEmployees < 1) {
            setError('El número máximo de empleados debe ser mayor que 0');
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

            if (isEditing && company) {
                const updateData: UpdateCompanyRequest = {
                    name: formData.name,
                    slug: formData.slug,
                    email: formData.email,
                    address: formData.address || undefined,
                    phone: formData.phone || undefined
                };

                response = await superadminApi.updateCompany(company.id, updateData);
            } else {
                const createData: CreateCompanyRequest = {
                    name: formData.name,
                    slug: formData.slug,
                    email: formData.email,
                    address: formData.address || undefined,
                    phone: formData.phone || undefined
                };

                response = await superadminApi.createCompany(createData);
            }

            if (response.success) {
                onSuccess();
                onClose();
            } else {
                setError(response.message || 'Error al guardar la empresa');
            }
        } catch (error) {
            console.error('Error al guardar empresa:', error);
            setError('Error de conexión. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center">
                        <Building2 className="w-6 h-6 text-indigo-600 mr-3" />
                        <h2 className="text-xl font-semibold text-gray-900">
                            {isEditing ? 'Editar Empresa' : 'Nueva Empresa'}
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
                                    Nombre de la Empresa *
                                </label>
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Ej: Mi Empresa S.L."
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Código de Empresa *
                                </label>
                                <Input
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleChange}
                                    placeholder="Ej: mi-empresa"
                                    disabled={isLoading || isEditing}
                                    required
                                />
                                {!isEditing && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Se genera automáticamente a partir del nombre
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Correo Electrónico *
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="empresa@ejemplo.com"
                                        className="pl-10"
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Teléfono
                                </label>
                                <Input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+34 900 123 456"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Descripción
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Breve descripción de la empresa..."
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Información Adicional */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Adicional</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dirección
                                </label>
                                <Input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Calle Principal 123, Madrid"
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sitio Web
                                </label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        name="website"
                                        value={formData.website}
                                        onChange={handleChange}
                                        placeholder="https://www.ejemplo.com"
                                        className="pl-10"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Industria
                                </label>
                                <Input
                                    name="industry"
                                    value={formData.industry}
                                    onChange={handleChange}
                                    placeholder="Tecnología, Retail, etc."
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    CIF/NIF
                                </label>
                                <Input
                                    name="taxId"
                                    value={formData.taxId}
                                    onChange={handleChange}
                                    placeholder="B12345678"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Configuración */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Número Máximo de Empleados *
                                </label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        name="maxEmployees"
                                        type="number"
                                        min="1"
                                        value={formData.maxEmployees}
                                        onChange={handleChange}
                                        className="pl-10"
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            </div>

                            {!isEditing && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Plan de Suscripción
                                        </label>
                                        <select
                                            name="subscriptionPlanId"
                                            value={formData.subscriptionPlanId}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            disabled={isLoading}
                                        >
                                            <option value="">Seleccionar plan...</option>
                                            {plans.map((plan) => (
                                                <option key={plan.id} value={plan.id}>
                                                    {plan.name} - €{plan.priceMonthly}/mes
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Fin del Período de Prueba
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input
                                                name="trialEndDate"
                                                type="date"
                                                value={formData.trialEndDate}
                                                onChange={handleChange}
                                                className="pl-10"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
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

export default CompanyForm;