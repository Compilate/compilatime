import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import { apiClient } from '../../lib/api';
import { breakTypesApi, BreakType } from '../../lib/api/breakTypes.api';

interface CompanySettings {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    timezone: string;
    locale: string;
    latitude?: number | null;
    longitude?: number | null;
    geofenceRadius?: number | null;
    requireGeolocation?: boolean;
    autoPunchoutEnabled?: boolean;
    autoPunchoutMaxMinutes?: number;
    autoPunchoutMarginBefore?: number;
    autoPunchoutMarginAfter?: number;
    enableEmployeePortal?: boolean;
    settings?: {
        workingHours?: {
            start: string;
            end: string;
        };
        overtime?: {
            enabled: boolean;
            rate: number;
        };
        notifications?: {
            email: boolean;
            push: boolean;
        };
    };
}

const ConfiguracionPage: React.FC = () => {
    const { company, user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState<CompanySettings>({
        id: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        timezone: 'Europe/Madrid',
        locale: 'es-ES',
        latitude: null,
        longitude: null,
        geofenceRadius: 100,
        requireGeolocation: false,
        autoPunchoutEnabled: false,
        autoPunchoutMaxMinutes: 480,
        autoPunchoutMarginBefore: 15,
        autoPunchoutMarginAfter: 30,
        enableEmployeePortal: true,
        settings: {
            workingHours: {
                start: '09:00',
                end: '18:00'
            },
            overtime: {
                enabled: false,
                rate: 1.25
            },
            notifications: {
                email: true,
                push: true
            }
        }
    });

    const [activeTab, setActiveTab] = useState<'general' | 'working' | 'notifications' | 'geolocation' | 'autoPunchout' | 'breakTypes'>('general');
    const [gettingLocation, setGettingLocation] = useState(false);
    const [breakTypes, setBreakTypes] = useState<BreakType[]>([]);
    const [loadingBreakTypes, setLoadingBreakTypes] = useState(false);

    useEffect(() => {
        if (company) {
            console.log('🔧 [ConfiguracionPage] useEffect - company recibido:', company);
            console.log('🔧 [ConfiguracionPage] useEffect - autoPunchoutEnabled:', (company as any).autoPunchoutEnabled);

            const autoPunchoutEnabled = (company as any).autoPunchoutEnabled || false;
            console.log('🔧 [ConfiguracionPage] useEffect - autoPunchoutEnabled final:', autoPunchoutEnabled);

            setFormData(prev => {
                const newData = {
                    ...prev,
                    id: company.id,
                    name: company.name,
                    email: company.email,
                    phone: company.phone || '',
                    address: company.address || '',
                    timezone: company.timezone,
                    locale: company.locale,
                    latitude: company.latitude || null,
                    longitude: company.longitude || null,
                    geofenceRadius: company.geofenceRadius || 100,
                    requireGeolocation: company.requireGeolocation || false,
                    autoPunchoutEnabled,
                    autoPunchoutMaxMinutes: (company as any).autoPunchoutMaxMinutes || 480,
                    autoPunchoutMarginBefore: (company as any).autoPunchoutMarginBefore || 15,
                    autoPunchoutMarginAfter: (company as any).autoPunchoutMarginAfter || 30,
                    enableEmployeePortal: (company as any).enableEmployeePortal !== undefined ? (company as any).enableEmployeePortal : true,
                    settings: company.settings || prev.settings
                };

                console.log('🔧 [ConfiguracionPage] useEffect - formData actualizado:', newData);
                return newData;
            });
            setLoading(false);
        }
    }, [company]);

    // Cargar tipos de pausa
    useEffect(() => {
        const fetchBreakTypes = async () => {
            try {
                setLoadingBreakTypes(true);
                const response = await breakTypesApi.getBreakTypes();

                if (response.success && response.data) {
                    setBreakTypes(response.data.breakTypes);
                }
            } catch (error: any) {
                console.error('Error al cargar tipos de pausa:', error);
            } finally {
                setLoadingBreakTypes(false);
            }
        };

        fetchBreakTypes();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        // Convertir a número si el tipo es number o si es un campo numérico específico
        const numericFields = ['latitude', 'longitude', 'geofenceRadius', 'autoPunchoutMaxMinutes', 'autoPunchoutMarginBefore', 'autoPunchoutMarginAfter'];
        const shouldConvertToNumber = type === 'number' || numericFields.includes(name);
        const processedValue = shouldConvertToNumber ? (value === '' ? null : parseFloat(value)) : value;

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...(prev as any)[parent],
                    [child]: processedValue
                }
            }));
        } else if (name.includes('settings.')) {
            const parts = name.split('.');
            setFormData(prev => {
                const newData = { ...prev };
                let current: any = newData;

                for (let i = 0; i < parts.length - 1; i++) {
                    current = current[parts[i]];
                }

                current[parts[parts.length - 1]] = processedValue;
                return newData;
            });
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: processedValue
            }));
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;

        if (name.includes('settings.')) {
            const parts = name.split('.');
            setFormData(prev => {
                const newData = { ...prev };
                let current: any = newData;

                for (let i = 0; i < parts.length - 1; i++) {
                    current = current[parts[i]];
                }

                current[parts[parts.length - 1]] = checked;
                return newData;
            });
        } else {
            // Manejar checkboxes que no son de settings (como requireGeolocation y autoPunchoutEnabled)
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
        }
    };

    const handleGetLocation = async () => {
        setGettingLocation(true);
        setError(null);

        try {
            if (!navigator.geolocation) {
                throw new Error('Tu navegador no soporta geolocalización');
            }

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            setFormData(prev => ({
                ...prev,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }));

            setSuccess('Coordenadas obtenidas correctamente');
        } catch (error: any) {
            setError(error.message || 'Error al obtener las coordenadas');
        } finally {
            setGettingLocation(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        console.log('🔧 [ConfiguracionPage] Iniciando guardado de configuración');
        console.log('🔧 [ConfiguracionPage] FormData a guardar:', formData);

        try {
            const response = await apiClient.put('/api/company/settings', formData);

            console.log('🔧 [ConfiguracionPage] Respuesta de la API:', response);

            if (response.success) {
                setSuccess('Configuración guardada correctamente');
                console.log('✅ [ConfiguracionPage] Configuración guardada exitosamente');

                // Actualizar el contexto de autenticación con los nuevos datos de la empresa
                if (response.data) {
                    const updatedCompany = response.data;
                    console.log('🔧 [ConfiguracionPage] Empresa actualizada:', updatedCompany);

                    // Actualizar el localStorage con los nuevos datos
                    try {
                        const stored = localStorage.getItem('compilatime-auth');
                        console.log('🔧 [ConfiguracionPage] Datos actuales en localStorage:', stored);

                        if (stored) {
                            const parsedData = JSON.parse(stored);
                            console.log('🔧 [ConfiguracionPage] Datos parseados:', parsedData);

                            // Combinar los datos existentes con los actualizados para no perder nada
                            parsedData.company = {
                                ...parsedData.company,
                                ...updatedCompany
                            };
                            localStorage.setItem('compilatime-auth', JSON.stringify(parsedData));
                            console.log('✅ [ConfiguracionPage] localStorage actualizado con datos combinados');
                            console.log('🔧 [ConfiguracionPage] Empresa final en localStorage:', parsedData.company);

                            // Forzar una actualización del contexto recargando la página
                            // Esto es una solución temporal hasta que implementemos
                            // una función para actualizar la empresa en el contexto
                            setTimeout(() => {
                                console.log('🔄 [ConfiguracionPage] Recargando página para actualizar contexto');
                                window.location.reload();
                            }, 1000);
                        }
                    } catch (error) {
                        console.error('❌ [ConfiguracionPage] Error al actualizar localStorage:', error);
                    }
                } else {
                    console.warn('⚠️ [ConfiguracionPage] No hay datos de empresa en la respuesta');
                }
            } else {
                const errorMessage = response.message || 'Error al guardar la configuración';
                console.error('❌ [ConfiguracionPage] Error en la respuesta:', errorMessage);
                setError(errorMessage);
            }
        } catch (err: any) {
            console.error('❌ [ConfiguracionPage] Error en la petición:', err);
            console.error('❌ [ConfiguracionPage] Detalles del error:', {
                message: err.message,
                response: err.response,
                response_data: err.response?.data,
                status: err.response?.status
            });
            setError(err.response?.data?.message || err.message || 'Error al guardar la configuración');
        } finally {
            setSaving(false);
            console.log('🔧 [ConfiguracionPage] Proceso de guardado finalizado');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader size="lg" text="Cargando configuración..." />
            </div>
        );
    }

    // Solo administradores pueden acceder a esta página
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
                    <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
                <p className="text-gray-600">Gestiona la configuración de tu empresa</p>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-600">{success}</p>
                </div>
            )}

            <form onSubmit={handleSave}>
                {/* Tabs de navegación */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            type="button"
                            onClick={() => setActiveTab('general')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'general'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            General
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('working')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'working'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Horario Laboral
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('notifications')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'notifications'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Notificaciones
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('geolocation')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'geolocation'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Geolocalización
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('autoPunchout')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'autoPunchout'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Cierre Automático
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('breakTypes')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'breakTypes'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Tipos de Pausa
                        </button>
                    </nav>
                </div>

                {/* Contenido de los tabs */}
                <div className="bg-white shadow rounded-lg">
                    {activeTab === 'general' && (
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Información de la Empresa</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nombre de la empresa
                                        </label>
                                        <Input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email de contacto
                                        </label>
                                        <Input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Teléfono
                                        </label>
                                        <Input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Dirección
                                        </label>
                                        <Input
                                            type="text"
                                            name="address"
                                            value={formData.address || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Zona horaria
                                        </label>
                                        <select
                                            name="timezone"
                                            value={formData.timezone}
                                            onChange={handleInputChange}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                        >
                                            <option value="Europe/Madrid">Europe/Madrid</option>
                                            <option value="Europe/Paris">Europe/Paris</option>
                                            <option value="Europe/London">Europe/London</option>
                                            <option value="Europe/Berlin">Europe/Berlin</option>
                                            <option value="America/New_York">America/New_York</option>
                                            <option value="America/Los_Angeles">America/Los_Angeles</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Idioma
                                        </label>
                                        <select
                                            name="locale"
                                            value={formData.locale}
                                            onChange={handleInputChange}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                        >
                                            <option value="es-ES">Español</option>
                                            <option value="en-US">English</option>
                                            <option value="fr-FR">Français</option>
                                            <option value="de-DE">Deutsch</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Acceso de Empleados</h3>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="enableEmployeePortal"
                                        id="enableEmployeePortal"
                                        checked={formData.enableEmployeePortal || false}
                                        onChange={handleCheckboxChange}
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="enableEmployeePortal" className="ml-2 block text-sm text-gray-900">
                                        Habilitar acceso a zona personal de empleados
                                    </label>
                                </div>
                                <p className="mt-2 text-sm text-gray-500">
                                    Si esta opción está desactivada, los empleados no podrán acceder a su zona personal desde el fichaje rápido.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'working' && (
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Horario Laboral</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Hora de inicio
                                        </label>
                                        <Input
                                            type="time"
                                            name="settings.workingHours.start"
                                            value={formData.settings?.workingHours?.start || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Hora de fin
                                        </label>
                                        <Input
                                            type="time"
                                            name="settings.workingHours.end"
                                            value={formData.settings?.workingHours?.end || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Horas Extraordinarias</h3>

                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="settings.overtime.enabled"
                                            checked={formData.settings?.overtime?.enabled || false}
                                            onChange={handleCheckboxChange}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <label className="ml-2 block text-sm text-gray-900">
                                            Habilitar horas extraordinarias
                                        </label>
                                    </div>

                                    {formData.settings?.overtime?.enabled && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Tarifa de horas extraordinarias (multiplicador)
                                            </label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="1"
                                                max="3"
                                                name="settings.overtime.rate"
                                                value={formData.settings?.overtime?.rate || ''}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Notificaciones</h3>

                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="settings.notifications.email"
                                            checked={formData.settings?.notifications?.email || false}
                                            onChange={handleCheckboxChange}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <label className="ml-2 block text-sm text-gray-900">
                                            Notificaciones por email
                                        </label>
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="settings.notifications.push"
                                            checked={formData.settings?.notifications?.push || false}
                                            onChange={handleCheckboxChange}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <label className="ml-2 block text-sm text-gray-900">
                                            Notificaciones push
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'geolocation' && (
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Geolocalización</h3>

                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="requireGeolocation"
                                            checked={formData.requireGeolocation || false}
                                            onChange={handleCheckboxChange}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <label className="ml-2 block text-sm text-gray-900">
                                            Requerir geolocalización para fichaje
                                        </label>
                                    </div>

                                    {formData.requireGeolocation && (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Latitud
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        name="latitude"
                                                        value={formData.latitude || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Ej: 40.4168"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Longitud
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        name="longitude"
                                                        value={formData.longitude || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Ej: -3.7038"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Radio de geovalla (metros)
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min="10"
                                                        max="1000"
                                                        name="geofenceRadius"
                                                        value={formData.geofenceRadius || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Ej: 100"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleGetLocation}
                                                    disabled={gettingLocation}
                                                    loading={gettingLocation}
                                                >
                                                    {gettingLocation ? 'Obteniendo...' : 'Obtener coordenadas actuales'}
                                                </Button>
                                                <p className="mt-2 text-sm text-gray-500">
                                                    Al hacer clic en este botón, se usarán las coordenadas de tu ubicación actual como la ubicación de la empresa.
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'autoPunchout' && (
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Cierre Automático</h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    El sistema de cierre automático detecta cuando un empleado olvida fichar la salida y crea un registro automáticamente.
                                </p>

                                <div className="space-y-6">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="autoPunchoutEnabled"
                                            checked={formData.autoPunchoutEnabled || false}
                                            onChange={handleCheckboxChange}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <label className="ml-2 block text-sm text-gray-900">
                                            Activar cierre automático de fichajes
                                        </label>
                                    </div>

                                    {formData.autoPunchoutEnabled && (
                                        <div className="space-y-6 pl-6 border-l-2 border-gray-200">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Tiempo máximo antes del cierre automático (minutos)
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="60"
                                                    max="1440"
                                                    name="autoPunchoutMaxMinutes"
                                                    value={formData.autoPunchoutMaxMinutes || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="480"
                                                />
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Máximo tiempo que un empleado puede permanecer fichado antes de que el sistema cierre automáticamente (default: 480 minutos = 8 horas)
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Margen antes del fin de turno (minutos)
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="60"
                                                    name="autoPunchoutMarginBefore"
                                                    value={formData.autoPunchoutMarginBefore || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="15"
                                                />
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Minutos antes del fin programado del turno para activar el cierre automático (default: 15 minutos)
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Margen después del fin de turno (minutos)
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="120"
                                                    name="autoPunchoutMarginAfter"
                                                    value={formData.autoPunchoutMarginAfter || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="30"
                                                />
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Minutos después del fin programado del turno para activar el cierre automático (default: 30 minutos)
                                                </p>
                                            </div>

                                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                                <h4 className="text-sm font-medium text-blue-900 mb-2">¿Cómo funciona?</h4>
                                                <ul className="text-sm text-blue-800 space-y-1">
                                                    <li>• El sistema se ejecuta cada 5 minutos para buscar fichajes pendientes de cierre</li>
                                                    <li>• Si un empleado fichó entrada pero no salida, se crea un registro automático</li>
                                                    <li>• El cierre se basa en el horario asignado al empleado</li>
                                                    <li>• Se registra el motivo del cierre automático en la auditoría</li>
                                                    <li>• Solo afecta a empresas con esta opción activada</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'breakTypes' && (
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Tipos de Pausa</h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Gestiona los tipos de pausa disponibles para los empleados. Los empleados podrán seleccionar un tipo de pausa al fichar.
                                </p>
                            </div>

                            {loadingBreakTypes ? (
                                <div className="flex justify-center py-8">
                                    <Loader size="lg" text="Cargando tipos de pausa..." />
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white shadow rounded-lg border border-gray-200">
                                        <div className="p-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-lg font-medium text-gray-900">Tipos de Pausa Disponibles</h4>
                                                <Button
                                                    onClick={() => {
                                                        console.log('🔧 [ConfiguracionPage] Botón "Gestionar Tipos de Pausa" pulsado');
                                                        console.log('🔧 [ConfiguracionPage] URL actual:', window.location.href);
                                                        console.log('🔧 [ConfiguracionPage] Pathname actual:', window.location.pathname);
                                                        console.log('🔧 [ConfiguracionPage] Navegando a:', '/portal/break-types');
                                                        console.log('🔧 [ConfiguracionPage] Estado de autenticación:', {
                                                            isAuthenticated: !!localStorage.getItem('compilatime-auth'),
                                                            hasToken: !!JSON.parse(localStorage.getItem('compilatime-auth') || '{}')?.token,
                                                            hasUser: !!JSON.parse(localStorage.getItem('compilatime-auth') || '{}')?.user,
                                                            hasCompany: !!JSON.parse(localStorage.getItem('compilatime-auth') || '{}')?.company
                                                        });
                                                        console.log('🔧 [ConfiguracionPage] Datos de localStorage:', localStorage.getItem('compilatime-auth'));
                                                        navigate('/portal/break-types');
                                                        console.log('🔧 [ConfiguracionPage] Navegación iniciada');
                                                    }}
                                                    variant="primary"
                                                >
                                                    Gestionar Tipos de Pausa
                                                </Button>
                                            </div>
                                        </div>

                                        {breakTypes.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                <p>No hay tipos de pausa configurados.</p>
                                                <p>Ve a la página de gestión para crear nuevos tipos de pausa.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {breakTypes.map((breakType) => (
                                                    <div key={breakType.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center space-x-3">
                                                            <div
                                                                className="w-10 h-10 rounded-full"
                                                                style={{ backgroundColor: breakType.color }}
                                                            />
                                                            <div>
                                                                <div className="font-medium text-gray-900">{breakType.name}</div>
                                                                {breakType.description && (
                                                                    <div className="text-sm text-gray-600">{breakType.description}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${breakType.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                {breakType.active ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                            {breakType.requiresReason && (
                                                                <span className="text-xs text-gray-500">Requiere motivo</span>
                                                            )}
                                                            {breakType.maxMinutes && (
                                                                <span className="text-xs text-gray-500">
                                                                    Máx: {Math.floor(breakType.maxMinutes / 60)}h {breakType.maxMinutes % 60}min
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Botones de acción */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (company) {
                                    setFormData(prev => ({
                                        ...prev,
                                        name: company.name,
                                        email: company.email,
                                        phone: company.phone || '',
                                        address: company.address || '',
                                        timezone: company.timezone,
                                        locale: company.locale,
                                        autoPunchoutEnabled: (company as any).autoPunchoutEnabled || false,
                                        autoPunchoutMaxMinutes: (company as any).autoPunchoutMaxMinutes || 480,
                                        autoPunchoutMarginBefore: (company as any).autoPunchoutMarginBefore || 15,
                                        autoPunchoutMarginAfter: (company as any).autoPunchoutMarginAfter || 30,
                                        enableEmployeePortal: (company as any).enableEmployeePortal !== undefined ? (company as any).enableEmployeePortal : true,
                                        settings: company.settings || prev.settings
                                    }));
                                }
                            }}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            loading={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar cambios'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ConfiguracionPage;