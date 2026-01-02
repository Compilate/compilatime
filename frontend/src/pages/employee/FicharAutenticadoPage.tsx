import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { timeEntryApi } from '../../lib/api';
import { breakTypesApi, BreakType } from '../../lib/api/breakTypes.api';
import Button from '../../components/common/Button';
import ClockWidget from '../../components/employee/ClockWidget';
import GeolocationService, { GeolocationPosition } from '../../services/geolocation.service';

interface PunchState {
    canPunchIn: boolean;
    canPunchOut: boolean;
    canStartBreak: boolean;
    canResumeBreak: boolean;
    currentState: 'IN' | 'OUT' | 'BREAK' | 'RESUME' | null;
    lastEntry: any | null;
    todayEntries: any[];
}

const FicharAutenticadoPage: React.FC = () => {
    const { user, isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [punchState, setPunchState] = useState<PunchState | null>(null);
    const [_loadingState, setLoadingState] = useState(false);
    const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
    const [isRemoteWork, setIsRemoteWork] = useState(false);

    // Estados para tipos de pausa
    const [breakTypes, setBreakTypes] = useState<BreakType[]>([]);
    const [_loadingBreakTypes, setLoadingBreakTypes] = useState(false);
    const [showBreakTypeModal, setShowBreakTypeModal] = useState(false);
    const [selectedBreakType, setSelectedBreakType] = useState<BreakType | null>(null);
    const [breakReason, setBreakReason] = useState('');
    const [showCustomBreakInput, setShowCustomBreakInput] = useState(false);
    const [customBreakName, setCustomBreakName] = useState('');

    // Obtener estado actual del fichaje
    const fetchPunchState = async () => {
        try {
            setLoadingState(true);
            const response = await timeEntryApi.getMyPunchState();

            if (response.success && response.data) {
                setPunchState(response.data);
                console.log('📊 Estado de fichaje:', response.data);
            } else {
                setError(response.message || 'Error al obtener el estado de fichaje');
            }
        } catch (error: any) {
            console.error('Error al obtener estado de fichaje:', error);
            setError(error.message || 'Error de conexión');
        } finally {
            setLoadingState(false);
        }
    };

    // Cargar tipos de pausa activos
    const fetchBreakTypes = async () => {
        try {
            setLoadingBreakTypes(true);
            const response = await breakTypesApi.getBreakTypes();

            if (response.success && response.data) {
                // Filtrar solo los tipos de pausa activos
                const activeBreakTypes = response.data.breakTypes.filter(bt => bt.active);
                setBreakTypes(activeBreakTypes);
                console.log('📋 Tipos de pausa cargados:', activeBreakTypes);
            }
        } catch (error: any) {
            console.error('Error al cargar tipos de pausa:', error);
        } finally {
            setLoadingBreakTypes(false);
        }
    };

    // Verificar geolocalización
    useEffect(() => {
        const checkGeolocation = async () => {
            if (!GeolocationService.getInstance().isSupported()) {
                return;
            }

            try {
                const permission = await GeolocationService.getInstance().requestPermission();
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
            }
        };

        checkGeolocation();
    }, []);

    // Cargar estado del fichaje al montar el componente
    useEffect(() => {
        if (isAuthenticated && user) {
            fetchPunchState();
            fetchBreakTypes();
        }
    }, [isAuthenticated, user]);

    // Depurar el estado showBreakTypeModal
    useEffect(() => {
        console.log('🔍 showBreakTypeModal cambió:', showBreakTypeModal);
    }, [showBreakTypeModal]);

    const handlePunch = async (type: 'IN' | 'OUT' | 'BREAK' | 'RESUME', breakTypeId?: string, breakReason?: string) => {
        setLoading(true);
        setError(null);
        setSuccessMessage('');

        try {
            // Preparar datos del fichaje
            const punchData: any = {
                type,
                isRemoteWork,
            };

            // Si es una pausa y se ha seleccionado un tipo de pausa
            if (type === 'BREAK' && breakTypeId) {
                punchData.breakTypeId = breakTypeId;
                if (breakReason) {
                    punchData.breakReason = breakReason;
                }
            }

            // Si no es teletrabajo y tenemos geolocalización, añadirla
            if (!isRemoteWork && currentPosition) {
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

                // Recargar estado del fichaje
                setTimeout(() => {
                    fetchPunchState();
                    setSuccessMessage('');
                }, 2000);
            } else {
                setError(response.message || 'Error al fichar');
            }
        } catch (error: any) {
            console.error('Error al fichar:', error);
            setError(error.message || 'Error de conexión. Inténtalo de nuevo.');
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
        setShowCustomBreakInput(false);
        setCustomBreakName('');
        console.log('🔍 showBreakTypeModal después:', true);
    };

    const handleBreakTypeConfirm = async () => {
        // Si se está mostrando el campo de nombre personalizado
        if (showCustomBreakInput) {
            if (!customBreakName.trim()) {
                setError('Debes escribir un nombre para el tipo de pausa');
                return;
            }

            if (customBreakName.length > 20) {
                setError('El nombre no puede exceder 20 caracteres');
                return;
            }

            try {
                setLoading(true);
                // Crear tipo de pausa personalizado
                const response = await breakTypesApi.createCustomBreakType({
                    customName: customBreakName.trim(),
                    description: 'Tipo de pausa personalizado por empleado',
                    color: '#6B7280',
                    requiresReason: false,
                });

                if (response.success && response.data) {
                    // Usar el tipo de pausa personalizado recién creado
                    handlePunch('BREAK', response.data.breakType.id, breakReason);
                    setShowBreakTypeModal(false);
                    setSelectedBreakType(null);
                    setBreakReason('');
                    setShowCustomBreakInput(false);
                    setCustomBreakName('');
                } else {
                    setError(response.message || 'Error al crear tipo de pausa personalizado');
                }
            } catch (error: any) {
                setError(error.message || 'Error al crear tipo de pausa personalizado');
            } finally {
                setLoading(false);
            }
            return;
        }

        // Si se ha seleccionado un tipo de pausa predefinido
        if (!selectedBreakType) {
            setError('Debes seleccionar un tipo de pausa');
            return;
        }

        // Si el tipo de pausa requiere motivo y no se ha proporcionado
        if (selectedBreakType.requiresReason && !breakReason.trim()) {
            setError('Debes proporcionar un motivo para este tipo de pausa');
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
        setShowCustomBreakInput(false);
        setCustomBreakName('');
    };

    const getStateMessage = () => {
        if (!punchState) return 'Cargando estado...';

        switch (punchState.currentState) {
            case 'IN':
                return '🟢 Has fichado entrada - Trabajando';
            case 'OUT':
                return '🔴 Has fichado salida - Fuera de trabajo';
            case 'BREAK':
                return '⏸️ Estás en pausa';
            case 'RESUME':
                return '▶️ Has reanudado el trabajo';
            default:
                return '⚪ Sin fichajes hoy';
        }
    };

    const getStateColor = () => {
        if (!punchState) return 'bg-gray-100 text-gray-800';

        switch (punchState.currentState) {
            case 'IN':
            case 'RESUME':
                return 'bg-green-100 text-green-800';
            case 'OUT':
                return 'bg-red-100 text-red-800';
            case 'BREAK':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso No Autorizado</h1>
                    <p className="text-gray-600">Debes iniciar sesión para acceder a esta página.</p>
                </div>
            </div>
        );
    }

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
                        <div className="mt-4">
                            <p className="text-sm text-gray-600">Bienvenido, <span className="font-semibold">{user.name}</span></p>
                        </div>
                    </div>

                    <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
                        <div className="grid md:grid-cols-2 gap-0">
                            {/* Panel izquierdo - Estado y acciones */}
                            <div className="p-8 bg-gray-50">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Mi Fichaje</h2>

                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-600">{error}</p>
                                    </div>
                                )}

                                {successMessage && (
                                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                        <p className="text-sm text-green-600 font-medium">{successMessage}</p>
                                    </div>
                                )}

                                {/* Estado actual */}
                                <div className={`mb-6 p-4 rounded-lg ${getStateColor()}`}>
                                    <div className="text-center">
                                        <div className="text-lg font-semibold mb-2">
                                            {getStateMessage()}
                                        </div>
                                        {punchState?.lastEntry && (
                                            <div className="text-sm">
                                                Último fichaje: {new Date(punchState.lastEntry.timestamp).toLocaleTimeString('es-ES', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Opciones de teletrabajo */}
                                <div className="mb-6">
                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={isRemoteWork}
                                            onChange={(e) => setIsRemoteWork(e.target.checked)}
                                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">
                                            Teletrabajo
                                        </span>
                                    </label>
                                </div>

                                {/* Botones de acción */}
                                <div className="space-y-3">
                                    {punchState?.canPunchIn && (
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
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        {punchState?.canStartBreak && (
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
                                        )}

                                        {punchState?.canResumeBreak && (
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
                                        )}
                                    </div>

                                    {punchState?.canPunchOut && (
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
                                    )}
                                </div>

                                {/* Resumen del día */}
                                {punchState?.todayEntries && punchState.todayEntries.length > 0 && (
                                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                        <h3 className="text-sm font-semibold text-blue-900 mb-2">Resumen de hoy</h3>
                                        <div className="space-y-1 text-sm text-blue-800">
                                            <div>Entradas: {punchState.todayEntries.filter(e => e.type === 'IN').length}</div>
                                            <div>Salidas: {punchState.todayEntries.filter(e => e.type === 'OUT').length}</div>
                                            <div>Pausas: {punchState.todayEntries.filter(e => e.type === 'BREAK').length}</div>
                                            <div>Reanudaciones: {punchState.todayEntries.filter(e => e.type === 'RESUME').length}</div>
                                        </div>
                                    </div>
                                )}
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
                            </div>
                        </div>

                        <div className="mt-8 text-center text-sm text-gray-500">
                            <p>© {new Date().getFullYear()} CompilaTime v1.0.0. Todos los derechos reservados.</p>
                        </div>
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

                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-600">{error}</p>
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

                                    {/* Opción para escribir tipo personalizado */}
                                    <button
                                        onClick={() => {
                                            setSelectedBreakType(null);
                                            setShowCustomBreakInput(true);
                                        }}
                                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${showCustomBreakInput
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: '#6B7280' }}
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">✏️ Escribir tipo personalizado</div>
                                                <div className="text-sm text-gray-600">Escribe un nombre para tu tipo de pausa</div>
                                            </div>
                                            {showCustomBreakInput && (
                                                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414-1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                    </button>
                                </div>

                                {/* Campo para escribir nombre personalizado */}
                                {showCustomBreakInput && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nombre del tipo de pausa <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={customBreakName}
                                            onChange={(e) => setCustomBreakName(e.target.value)}
                                            maxLength={20}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            placeholder="Ej: Médico, Trámite personal, etc."
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            {customBreakName.length}/20 caracteres
                                        </p>
                                    </div>
                                )}

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
                                        disabled={!selectedBreakType && !showCustomBreakInput}
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

export default FicharAutenticadoPage;