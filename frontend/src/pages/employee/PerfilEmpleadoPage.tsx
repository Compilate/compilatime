import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import { employeeApi, timeEntryApi } from '../../lib/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';

const PerfilEmpleadoPage: React.FC = () => {
    const { employee, updateEmployee } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'timeEntries' | 'reports' | 'absences' | 'pin'>('profile');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Estados para edición de perfil
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        name: employee?.name || '',
        surname: employee?.surname || '',
        email: employee?.email || '',
        phone: employee?.phone || ''
    });

    // Estados para cambio de PIN
    const [pinData, setPinData] = useState({
        currentPin: '',
        newPin: '',
        confirmPin: ''
    });

    // Estados para historial de fichajes
    const [timeEntries, setTimeEntries] = useState<any[]>([]);
    const [timeEntriesLoading, setTimeEntriesLoading] = useState(false);

    // Estados para informes
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

    // Manejar cambios en el formulario de perfil
    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Guardar cambios en el perfil
    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            await employeeApi.updateMyProfile({
                name: formData.name,
                surname: formData.surname,
                email: formData.email,
                phone: formData.phone
            });

            // Actualizar el contexto con los nuevos datos
            if (updateEmployee) {
                updateEmployee({
                    ...employee,
                    ...formData
                });
            }

            setSuccess('Perfil actualizado correctamente');
            setEditMode(false);
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el perfil');
        } finally {
            setLoading(false);
        }
    };

    // Manejar cambios en el formulario de PIN
    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPinData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Cambiar PIN
    const handleChangePin = async () => {
        if (pinData.newPin !== pinData.confirmPin) {
            setError('Los PINs nuevos no coinciden');
            return;
        }

        if (pinData.newPin.length < 4) {
            setError('El PIN debe tener al menos 4 dígitos');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            await employeeApi.changeMyPin({
                currentPin: pinData.currentPin,
                newPin: pinData.newPin
            });

            setSuccess('PIN cambiado correctamente');
            setPinData({
                currentPin: '',
                newPin: '',
                confirmPin: ''
            });
        } catch (err: any) {
            setError(err.message || 'Error al cambiar el PIN');
        } finally {
            setLoading(false);
        }
    };

    // Cargar historial de fichajes
    const loadTimeEntries = async () => {
        try {
            setTimeEntriesLoading(true);
            const response = await timeEntryApi.getMyTimeEntries();
            if (response.success && response.data) {
                setTimeEntries(response.data.timeEntries);
            }
        } catch (err: any) {
            setError(err.message || 'Error al cargar el historial de fichajes');
        } finally {
            setTimeEntriesLoading(false);
        }
    };

    // Descargar informe mensual
    const downloadMonthlyReport = () => {
        // Usar el endpoint de reportsApi para descargar el informe
        // const [year, month] = reportMonth.split('-');
        // const startDate = `${year}-${month}-01`;
        // const endDate = `${year}-${month}-31`;

        // Aquí se llamaría al endpoint de descarga de informes
        // reportsApi.exportReport('monthly', { startDate, endDate }, 'pdf');
        alert('Funcionalidad de descarga de informes en desarrollo');
    };

    // Limpiar mensajes
    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    // Cargar datos cuando se cambia a la pestaña de fichajes
    React.useEffect(() => {
        if (activeTab === 'timeEntries' && timeEntries.length === 0) {
            loadTimeEntries();
        }
    }, [activeTab]);

    // Limpiar mensajes cuando se cambia de pestaña
    React.useEffect(() => {
        clearMessages();
    }, [activeTab]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
                <p className="text-gray-600">
                    Consulta tus datos personales y tu información de empleado.
                </p>
            </div>

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

            {/* Pestañas de navegación */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'profile', label: 'Datos Personales' },
                        { id: 'timeEntries', label: 'Historial de Fichajes' },
                        { id: 'reports', label: 'Informes Mensuales' },
                        { id: 'absences', label: 'Permisos y Vacaciones' },
                        { id: 'pin', label: 'Cambiar PIN' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                py-2 px-1 border-b-2 font-medium text-sm
                                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Contenido de las pestañas */}
            <div className="mt-6">
                {/* Pestaña de Datos Personales */}
                {activeTab === 'profile' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Datos Personales</h2>
                            <Button
                                onClick={() => editMode ? handleSaveProfile() : setEditMode(true)}
                                disabled={loading}
                                variant={editMode ? 'primary' : 'secondary'}
                            >
                                {editMode ? 'Guardar' : 'Editar'}
                            </Button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre
                                    </label>
                                    {editMode ? (
                                        <Input
                                            name="name"
                                            value={formData.name}
                                            onChange={handleProfileChange}
                                            disabled={loading}
                                        />
                                    ) : (
                                        <p className="text-gray-900">{employee?.name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Apellidos
                                    </label>
                                    {editMode ? (
                                        <Input
                                            name="surname"
                                            value={formData.surname}
                                            onChange={handleProfileChange}
                                            disabled={loading}
                                        />
                                    ) : (
                                        <p className="text-gray-900">{employee?.surname}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    {editMode ? (
                                        <Input
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleProfileChange}
                                            disabled={loading}
                                        />
                                    ) : (
                                        <p className="text-gray-900">{employee?.email || 'No especificado'}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teléfono
                                    </label>
                                    {editMode ? (
                                        <Input
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleProfileChange}
                                            disabled={loading}
                                        />
                                    ) : (
                                        <p className="text-gray-900">{employee?.phone || 'No especificado'}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        DNI
                                    </label>
                                    <p className="text-gray-900">{employee?.dni}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Departamento
                                    </label>
                                    <p className="text-gray-900">{employee?.department || 'No asignado'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Posición
                                    </label>
                                    <p className="text-gray-900">{employee?.position || 'No asignada'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo de Contrato
                                    </label>
                                    <p className="text-gray-900">{employee?.contractType || 'No especificado'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha de Contratación
                                    </label>
                                    <p className="text-gray-900">
                                        {employee?.hireDate ? formatDate(employee.hireDate) : 'No especificada'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pestaña de Historial de Fichajes */}
                {activeTab === 'timeEntries' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Historial de Fichajes</h2>
                        </div>
                        <div className="p-6">
                            {timeEntriesLoading ? (
                                <Loader />
                            ) : timeEntries.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Fecha
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Tipo
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Hora
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Origen
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {timeEntries.map((entry) => (
                                                <tr key={entry.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('es-ES') : 'Sin fecha'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${entry.type === 'IN' ? 'bg-green-100 text-green-800' :
                                                            entry.type === 'OUT' ? 'bg-red-100 text-red-800' :
                                                                entry.type === 'BREAK' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-blue-100 text-blue-800'
                                                            }`}>
                                                            {entry.type === 'IN' ? 'Entrada' :
                                                                entry.type === 'OUT' ? 'Salida' :
                                                                    entry.type === 'BREAK' ? 'Pausa' :
                                                                        entry.type === 'RESUME' ? 'Reanudar' : entry.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {new Date(entry.timestamp).toLocaleTimeString('es-ES')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {entry.source}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No hay fichajes registrados
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Pestaña de Informes Mensuales */}
                {activeTab === 'reports' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Informes Mensuales</h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Seleccionar mes
                                    </label>
                                    <Input
                                        type="month"
                                        value={reportMonth}
                                        onChange={(e) => setReportMonth(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={downloadMonthlyReport}
                                    className="w-full"
                                >
                                    Descargar Informe Mensual
                                </Button>
                                <div className="text-sm text-gray-500 text-center">
                                    Los informes incluyen resumen de horas trabajadas, ausencias y tardanzas.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pestaña de Permisos y Vacaciones */}
                {activeTab === 'absences' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Permisos y Vacaciones</h2>
                        </div>
                        <div className="p-6">
                            <div className="text-center py-8">
                                <div className="text-gray-400 text-lg mb-4">📅</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Gestión de Ausencias
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    Próximamente podrás solicitar permisos y vacaciones desde aquí.
                                </p>
                                <Button
                                    onClick={() => window.location.href = '/area/solicitar-ausencia'}
                                    variant="primary"
                                >
                                    Solicitar Ausencia
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pestaña de Cambiar PIN */}
                {activeTab === 'pin' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Cambiar PIN de Acceso</h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4 max-w-md mx-auto">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        PIN Actual
                                    </label>
                                    <Input
                                        name="currentPin"
                                        type="password"
                                        value={pinData.currentPin}
                                        onChange={handlePinChange}
                                        disabled={loading}
                                        placeholder="Ingresa tu PIN actual"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nuevo PIN
                                    </label>
                                    <Input
                                        name="newPin"
                                        type="password"
                                        value={pinData.newPin}
                                        onChange={handlePinChange}
                                        disabled={loading}
                                        placeholder="Ingresa tu nuevo PIN"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirmar Nuevo PIN
                                    </label>
                                    <Input
                                        name="confirmPin"
                                        type="password"
                                        value={pinData.confirmPin}
                                        onChange={handlePinChange}
                                        disabled={loading}
                                        placeholder="Confirma tu nuevo PIN"
                                    />
                                </div>
                                <Button
                                    onClick={handleChangePin}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    {loading ? <Loader size="sm" /> : 'Cambiar PIN'}
                                </Button>
                                <div className="text-sm text-gray-500 text-center">
                                    El PIN debe tener al menos 4 dígitos.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerfilEmpleadoPage;