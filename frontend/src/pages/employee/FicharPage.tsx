import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { timeEntryApi, companyApi } from '../../lib/api';
import { breakTypesApi, BreakType } from '../../lib/api/breakTypes.api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ClockWidget from '../../components/employee/ClockWidget';
import GeolocationService, { GeolocationPosition } from '../../services/geolocation.service';
import { useSecureNavigation } from '../../hooks/useSecureNavigation';

const FicharPage: React.FC = () => {
    const { getEmployeeCompanies } = useAuth();
    const { getCurrentCompanyCode } = useSecureNavigation();
    const location = useLocation();

    const [formData, setFormData] = useState({
        dni: '',
        pin: '',
        isRemoteWork: false,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [lastPunchType, setLastPunchType] = useState<'IN' | 'OUT' | 'BREAK' | 'RESUME' | null>(null);
    const [, setGeolocationStatus] = useState<'checking' | 'granted' | 'denied' | 'unsupported'>('checking');
    const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
    const [, setCompanyLocation] = useState<{ latitude: number; longitude: number; radius: number } | null>(null);

    // Estados para el sistema multi-empresa
    const [showCompanySelection, setShowCompanySelection] = useState(false);
    const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [companyCode, setCompanyCode] = useState<string>('');
    const [enableEmployeePortal, setEnableEmployeePortal] = useState<boolean>(true);

    // Estados para tipos de pausa
    const [breakTypes, setBreakTypes] = useState<BreakType[]>([]);
    const [showBreakTypeModal, setShowBreakTypeModal] = useState(false);
    const [selectedBreakType, setSelectedBreakType] = useState<BreakType | null>(null);
    const [breakReason, setBreakReason] = useState('');

    useEffect(() => {
        // Verificar si la geolocalización está disponible
        const checkGeolocation = async () => {
            if (!GeolocationService.getInstance().isSupported()) {
                setGeolocationStatus('unsupported');
                return;
            }

            try {
                const permission = await GeolocationService.getInstance().requestPermission();
                setGeolocationStatus(permission as 'granted' | 'denied');

                if (permission === 'granted') {
                    try {
                        const position = await GeolocationService.getInstance().getCurrentPosition();
                        setCurrentPosition(position);
                    } catch (error) {
                        console.warn('Error al obtener posición:', error);
                    }
                }
            } catch (error) {
                console.warn('Error al verificar permisos:', error);
                setGeolocationStatus('denied');
            }
        };

        checkGeolocation();
    }, []);

    // Obtener el código de empresa de la URL si existe
    useEffect(() => {
        const code = getCurrentCompanyCode();
        if (code) {
            setCompanyCode(code);
        }
    }, [getCurrentCompanyCode]);

    // Obtener la configuración de la empresa para verificar si el acceso a la zona personal está habilitado
    useEffect(() => {
        const fetchCompanySettings = async () => {
            if (companyCode) {
                try {
                    const response = await companyApi.getCompanyBySlug(companyCode);
                    if (response.success && response.data) {
                        const companyData = response.data as any;
                        setEnableEmployeePortal(companyData.enableEmployeePortal !== undefined ? companyData.enableEmployeePortal : true);
                        console.log('🔧 [FicharPage] Acceso a zona personal:', companyData.enableEmployeePortal);
                    }
                } catch (error) {
                    console.error('Error al obtener configuración de la empresa:', error);
                }
            }
        };

        fetchCompanySettings();
    }, [companyCode]);

    // Cargar tipos de pausa activos
    const fetchBreakTypes = async () => {
        try {
            const response = await breakTypesApi.getBreakTypes();

            if (response.success && response.data) {
                // Filtrar solo los tipos de pausa activos
                const activeBreakTypes = response.data.breakTypes.filter(bt => bt.active);
                setBreakTypes(activeBreakTypes);
                console.log('📋 Tipos de pausa cargados:', activeBreakTypes);
            }
        } catch (error: any) {
            console.error('Error al cargar tipos de pausa:', error);
        }
    };

    // Cargar tipos de pausa al montar el componente
    useEffect(() => {
        fetchBreakTypes();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: newValue }));
        // Limpiar error del campo cuando el usuario empieza a escribir
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        // Limpiar mensaje de éxito cuando el usuario cambia algo
        if (successMessage) {
            setSuccessMessage('');
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.dni.trim()) {
            newErrors.dni = 'El DNI es obligatorio';
        } else if (!/^[0-9]{8}[A-Z]$/i.test(formData.dni)) {
            newErrors.dni = 'El formato del DNI no es válido (8 números + 1 letra)';
        }

        if (!formData.pin.trim()) {
            newErrors.pin = 'El PIN es obligatorio';
        } else if (!/^\d{4}$/.test(formData.pin)) {
            newErrors.pin = 'El PIN debe tener 4 dígitos';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Obtener empresas disponibles para un empleado
    const getAvailableCompanies = async () => {
        if (!formData.dni.trim()) {
            setErrors({ dni: 'El DNI es obligatorio para buscar empresas' });
            return;
        }

        try {
            setLoading(true);
            const companies = await getEmployeeCompanies(formData.dni);

            if (companies.companies.length === 0) {
                setErrors({ general: 'No se encontraron empresas asignadas a este empleado' });
                return;
            }

            if (companies.companies.length === 1) {
                // Si solo hay una empresa, seleccionarla automáticamente
                setSelectedCompany(companies.companies[0]);
                setShowCompanySelection(false);
            } else {
                // Si hay múltiples empresas, mostrar selección
                setAvailableCompanies(companies.companies);
                setShowCompanySelection(true);
            }
        } catch (error: any) {
            console.error('Error al obtener empresas:', error);
            setErrors({ general: error.message || 'Error al obtener las empresas del empleado' });
        } finally {
            setLoading(false);
        }
    };

    // Seleccionar empresa
    const selectCompany = (company: any) => {
        setSelectedCompany(company);
        setShowCompanySelection(false);
    };

    const handlePunch = async (type: 'IN' | 'OUT' | 'BREAK' | 'RESUME', breakTypeId?: string, breakReason?: string) => {
        if (!validateForm()) return;

        // Si no hay empresa seleccionada y no hay código en la URL, obtener empresas
        if (!selectedCompany && !companyCode) {
            await getAvailableCompanies();
            return;
        }

        setLoading(true);
        setErrors({});
        setSuccessMessage('');

        try {
            // Determinar el ID de la empresa
            let companyId: string | undefined;

            if (selectedCompany) {
                // Si hay una empresa seleccionada, usar su ID
                companyId = selectedCompany.id;
            } else if (companyCode) {
                // Si tenemos un código de empresa, obtener el ID desde el slug
                try {
                    const companyResponse = await companyApi.getCompanyBySlug(companyCode);
                    if (companyResponse.success && companyResponse.data) {
                        companyId = (companyResponse.data as any).id;
                    } else {
                        setErrors({ general: 'Empresa no encontrada' });
                        return;
                    }
                } catch (error) {
                    console.error('Error al obtener empresa por slug:', error);
                    setErrors({ general: 'Error al validar la empresa' });
                    return;
                }
            }

            // Verificar que tenemos un companyId válido
            if (!companyId) {
                setErrors({ general: 'No se pudo determinar la empresa' });
                return;
            }

            // Preparar datos del fichaje
            const punchData: any = {
                type,
                isRemoteWork: formData.isRemoteWork,
                dni: formData.dni,
                pin: formData.pin,
                companySlug: companyCode, // Enviar el slug/código de empresa, no el ID
            };

            // Si es una pausa y se ha seleccionado un tipo de pausa
            if (type === 'BREAK' && breakTypeId) {
                punchData.breakTypeId = breakTypeId;
                if (breakReason) {
                    punchData.breakReason = breakReason;
                }
            }

            // Si no es teletrabajo y tenemos geolocalización, añadirla
            if (!formData.isRemoteWork && currentPosition) {
                punchData.latitude = currentPosition.latitude;
                punchData.longitude = currentPosition.longitude;
            }

            const response = await timeEntryApi.punch(punchData);

            if (response.success) {
                let message = '';
                switch (type) {
                    case 'IN':
                        message = '✅ Entrada registrada correctamente';
                        break;
                    case 'OUT':
                        message = '✅ Salida registrada correctamente';
                        break;
                    case 'BREAK':
                        message = '⏸️ Pausa iniciada correctamente';
                        break;
                    case 'RESUME':
                        message = '▶️ Trabajo reanudado correctamente';
                        break;
                }
                setSuccessMessage(message);
                setLastPunchType(type);

                // Si la respuesta incluye información de la empresa, guardarla
                if (response.data && (response.data as any).company) {
                    const { latitude, longitude, geofenceRadius } = (response.data as any).company;
                    if (latitude && longitude) {
                        setCompanyLocation({ latitude, longitude, radius: geofenceRadius || 100 });
                    }
                }

                // Limpiar formulario después de un fichaje exitoso
                setTimeout(() => {
                    setFormData({
                        dni: '',
                        pin: '',
                        isRemoteWork: false,
                    });
                    setSuccessMessage('');
                    setSelectedCompany(null);
                }, 3000);
            } else {
                setErrors({ general: response.error || 'Error al fichar' });
            }
        } catch (error: any) {
            console.error('Error al fichar:', error);
            setErrors({
                general: error.message || 'Error de conexión. Inténtalo de nuevo.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleStartBreak = () => {
        console.log('🔍 handleStartBreak llamado');
        console.log('🔍 showBreakTypeModal antes:', showBreakTypeModal);
        console.log('🔍 breakTypes:', breakTypes);
        console.log('🔍 breakTypes.length:', breakTypes.length);
        // Siempre mostrar el modal de selección de tipo de pausa
        // Si no hay tipos de pausa, el usuario podrá ver que no hay tipos disponibles
        setShowBreakTypeModal(true);
        console.log('🔍 showBreakTypeModal después:', true);
    };

    const handleBreakTypeConfirm = () => {
        if (!selectedBreakType) {
            setErrors({ general: 'Debes seleccionar un tipo de pausa' });
            return;
        }

        // Si el tipo de pausa requiere motivo y no se ha proporcionado
        if (selectedBreakType.requiresReason && !breakReason.trim()) {
            setErrors({ general: 'Debes proporcionar un motivo para este tipo de pausa' });
            return;
        }

        handlePunch('BREAK', selectedBreakType.id, breakReason);
        setShowBreakTypeModal(false);
        setSelectedBreakType(null);
        setBreakReason('');
    };

    const handleBreakTypeCancel = () => {
        setShowBreakTypeModal(false);
        setSelectedBreakType(null);
        setBreakReason('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100">
            <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-3xl">CT</span>
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">CompilaTime</h1>
                        <p className="text-lg text-gray-600">Sistema de Registro Horario</p>
                    </div>

                    <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
                        <div className="grid md:grid-cols-2 gap-0">
                            {/* Panel izquierdo - Formulario */}
                            <div className="p-8 bg-gray-50">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Fichar</h2>

                                {errors.general && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-600">{errors.general}</p>
                                    </div>
                                )}

                                {successMessage && (
                                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                        <p className="text-sm text-green-600 font-medium">{successMessage}</p>
                                    </div>
                                )}

                                <div className="space-y-4">

                                    <Input
                                        label="DNI"
                                        name="dni"
                                        type="text"
                                        value={formData.dni}
                                        onChange={handleChange}
                                        error={errors.dni}
                                        placeholder="12345678A"
                                        required
                                        maxLength={9}
                                        leftIcon={
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                            </svg>
                                        }
                                    />

                                    <Input
                                        label="PIN"
                                        name="pin"
                                        type="password"
                                        value={formData.pin}
                                        onChange={handleChange}
                                        error={errors.pin}
                                        placeholder="••••"
                                        required
                                        maxLength={4}
                                        leftIcon={
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        }
                                    />

                                    {/* Mostrar empresa seleccionada si hay una */}
                                    {selectedCompany && (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                            <p className="text-sm text-blue-800">
                                                <span className="font-semibold">Empresa seleccionada:</span> {selectedCompany.name}
                                            </p>
                                        </div>
                                    )}

                                    {/* Mostrar información de la empresa detectada */}
                                    {companyCode && !selectedCompany && (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                            <div className="flex">
                                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div className="ml-3">
                                                    <p className="text-sm text-blue-800">
                                                        <span className="font-semibold">Fichando en empresa:</span> {companyCode}
                                                    </p>
                                                    <p className="text-xs text-blue-600 mt-1">
                                                        El código de empresa se ha detectado automáticamente desde la URL
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Modal de selección de empresa */}
                                {showCompanySelection && (
                                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                                            <h3 className="text-lg font-semibold mb-4">Selecciona tu empresa</h3>
                                            <div className="space-y-2">
                                                {availableCompanies.map((company) => (
                                                    <button
                                                        key={company.id}
                                                        onClick={() => selectCompany(company)}
                                                        className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                                                    >
                                                        <div className="font-medium">{company.name}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {company.department} - {company.position}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setShowCompanySelection(false)}
                                                className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-8 space-y-3">
                                    <Button
                                        onClick={() => handlePunch('IN')}
                                        loading={loading}
                                        fullWidth
                                        size="lg"
                                        className="py-4 text-lg font-semibold bg-green-600 hover:bg-green-700 focus:ring-green-500"
                                        icon={
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                            </svg>
                                        }
                                    >
                                        Fichar Entrada
                                    </Button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            onClick={handleStartBreak}
                                            loading={loading}
                                            size="lg"
                                            variant="secondary"
                                            className="py-3 text-lg font-semibold bg-yellow-500 hover:bg-yellow-600 text-white"
                                            icon={
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            }
                                        >
                                            Iniciar Pausa
                                        </Button>

                                        <Button
                                            onClick={() => handlePunch('RESUME')}
                                            loading={loading}
                                            size="lg"
                                            variant="primary"
                                            className="py-3 text-lg font-semibold bg-blue-500 hover:bg-blue-600"
                                            icon={
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            }
                                        >
                                            Reanudar
                                        </Button>
                                    </div>

                                    <Button
                                        onClick={() => handlePunch('OUT')}
                                        loading={loading}
                                        fullWidth
                                        size="lg"
                                        variant="danger"
                                        className="py-4 text-lg font-semibold"
                                        icon={
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 8l-4 4m0 0l4 4m-4-4h14M5 20a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                            </svg>
                                        }
                                    >
                                        Fichar Salida
                                    </Button>
                                </div>

                                <div className="mt-6 text-center">
                                    {enableEmployeePortal && (
                                        <Link
                                            to={
                                                // Obtener el primer segmento de la URL (código encriptado)
                                                (() => {
                                                    const pathSegments = location.pathname.split('/').filter(Boolean);
                                                    const encryptedCode = pathSegments.length > 0 ? pathSegments[0] : null;

                                                    // Si hay un código encriptado, usarlo; si no, usar la ruta sin código
                                                    if (encryptedCode && encryptedCode !== 'area' && encryptedCode !== 'portal') {
                                                        return `/${encryptedCode}/area/login`;
                                                    }
                                                    return '/area/login';
                                                })()
                                            }
                                            className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                                        >
                                            Acceder a mi zona personal
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {/* Panel derecho - Reloj */}
                            <div className="p-8 bg-gradient-to-br from-primary-600 to-indigo-700 flex flex-col justify-center items-center text-white">
                                <ClockWidget className="text-white" />

                                <div className="mt-8 text-center">
                                    <div className="text-sm opacity-90 mb-2">Estado del sistema</div>
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-sm">Online</span>
                                    </div>
                                </div>

                                {lastPunchType && (
                                    <div className="mt-6 p-3 bg-white bg-opacity-20 rounded-lg">
                                        <p className="text-sm">
                                            Último fichaje: <span className="font-semibold">
                                                {lastPunchType === 'IN' ? 'Entrada' : 'Salida'}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        <p>© 2024 CompilaTime. Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>

            {/* Modal para seleccionar tipo de pausa */}
            {showBreakTypeModal && (
                <>
                    {console.log('🔍 Modal renderizado, showBreakTypeModal:', showBreakTypeModal)}
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Seleccionar Tipo de Pausa</h3>

                                {errors.general && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-600">{errors.general}</p>
                                    </div>
                                )}

                                {/* Lista de tipos de pausa */}
                                <div className="space-y-2 mb-4">
                                    {breakTypes.map((breakType) => (
                                        <button
                                            key={breakType.id}
                                            onClick={() => setSelectedBreakType(breakType)}
                                            className={`w-full p-3 rounded-lg border-2 text-left transition-all ${selectedBreakType?.id === breakType.id
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: breakType.color }}
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">{breakType.name}</div>
                                                    {breakType.description && (
                                                        <div className="text-sm text-gray-600">{breakType.description}</div>
                                                    )}
                                                    {breakType.maxMinutes && (
                                                        <div className="text-xs text-gray-500">
                                                            Máximo: {Math.floor(breakType.maxMinutes / 60)}h {breakType.maxMinutes % 60}min
                                                        </div>
                                                    )}
                                                </div>
                                                {selectedBreakType?.id === breakType.id && (
                                                    <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Campo de motivo si el tipo de pausa lo requiere */}
                                {selectedBreakType?.requiresReason && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Motivo de la pausa <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={breakReason}
                                            onChange={(e) => setBreakReason(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            placeholder="Describe el motivo de tu pausa..."
                                        />
                                    </div>
                                )}

                                {/* Botones de acción */}
                                <div className="flex space-x-3">
                                    <Button
                                        onClick={handleBreakTypeCancel}
                                        variant="secondary"
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleBreakTypeConfirm}
                                        loading={loading}
                                        className="flex-1"
                                        disabled={!selectedBreakType}
                                    >
                                        Iniciar Pausa
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FicharPage;