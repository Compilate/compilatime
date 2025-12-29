import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import { apiClient } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';

// interface CompanyUserData {
//     id: string;
//     name: string;
//     email: string;
//     role: string;
//     createdAt: string;
//     updatedAt: string;
//     lastLoginAt?: string;
// }

const MiPerfilPage: React.FC = () => {
    const { user, company, updateUser, logout } = useAuth();
    // const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showPasswordForm, setShowPasswordForm] = useState(false);

    // Timer para cerrar sesión automáticamente después de inactividad
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos en milisegundos

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || ''
            }));
            setLoading(false);
        }

        // Configurar temporizador de inactividad
        const resetInactivityTimer = () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
            inactivityTimerRef.current = setTimeout(() => {
                console.log('⏰ Cerrando sesión por inactividad (5 minutos)');
                logout();
            }, INACTIVITY_TIMEOUT);
        };

        // Detectar actividad del usuario
        const handleUserActivity = () => {
            resetInactivityTimer();
        };

        // Configurar eventos de actividad
        useEffect(() => {
            const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

            events.forEach(event => {
                document.addEventListener(event, handleUserActivity);
            });

            // Iniciar temporizador al cargar la página
            resetInactivityTimer();

            // Limpiar eventos al desmontar
            return () => {
                events.forEach(event => {
                    document.removeEventListener(event, handleUserActivity);
                });
                if (inactivityTimerRef.current) {
                    clearTimeout(inactivityTimerRef.current);
                }
            };
        }, [logout]);
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await apiClient.put('/api/auth/company/profile', {
                name: formData.name,
                email: formData.email
            });

            if ((response.data as any).success) {
                setSuccess('Perfil actualizado correctamente');
                // Actualizar el usuario en el contexto
                updateUser({
                    name: formData.name,
                    email: formData.email
                });
            } else {
                setError((response.data as any).message || 'Error al actualizar el perfil');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al actualizar el perfil');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Las contraseñas nuevas no coinciden');
            setSaving(false);
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres');
            setSaving(false);
            return;
        }

        try {
            const response = await apiClient.put('/api/auth/company/password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });

            if ((response.data as any).success) {
                setSuccess('Contraseña actualizada correctamente');
                setShowPasswordForm(false);
                setFormData(prev => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                }));
            } else {
                setError((response.data as any).message || 'Error al actualizar la contraseña');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al actualizar la contraseña');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader size="lg" text="Cargando perfil..." />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
                <p className="text-gray-600">Gestiona tu información personal y de acceso</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Información del perfil */}
                <div className="lg:col-span-2">
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">Información Personal</h2>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre completo
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
                                        Correo electrónico
                                    </label>
                                    <Input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="flex items-center space-x-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Rol
                                        </label>
                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                                            <span className="text-sm text-gray-900">
                                                {user?.role === 'ADMIN' ? 'Administrador' :
                                                    user?.role === 'MANAGER' ? 'Gestor' :
                                                        user?.role === 'HR' ? 'RRHH' :
                                                            user?.role === 'SUPER_ADMIN' ? 'Super Administrador' : user?.role}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Empresa
                                        </label>
                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                                            <span className="text-sm text-gray-900">{company?.name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        disabled={saving}
                                        loading={saving}
                                    >
                                        {saving ? 'Guardando...' : 'Actualizar perfil'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Información de la cuenta y cambio de contraseña */}
                <div className="space-y-6">
                    {/* Información de la cuenta */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">Información de la Cuenta</h2>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <span className="text-sm font-medium text-gray-500">ID de usuario:</span>
                                <p className="text-sm text-gray-900">{user?.id}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-gray-500">Fecha de creación:</span>
                                <p className="text-sm text-gray-900">
                                    {user?.createdAt ? formatDateTime(user.createdAt) : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-gray-500">Último acceso:</span>
                                <p className="text-sm text-gray-900">
                                    {user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Nunca'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Cambio de contraseña */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">Seguridad</h2>
                        </div>
                        <div className="p-6">
                            {!showPasswordForm ? (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowPasswordForm(true)}
                                    className="w-full"
                                >
                                    Cambiar contraseña
                                </Button>
                            ) : (
                                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Contraseña actual
                                        </label>
                                        <Input
                                            type="password"
                                            name="currentPassword"
                                            value={formData.currentPassword}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nueva contraseña
                                        </label>
                                        <Input
                                            type="password"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleInputChange}
                                            required
                                            minLength={6}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Confirmar nueva contraseña
                                        </label>
                                        <Input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            required
                                            minLength={6}
                                        />
                                    </div>

                                    <div className="flex space-x-2">
                                        <Button
                                            type="submit"
                                            disabled={saving}
                                            loading={saving}
                                            className="flex-1"
                                        >
                                            {saving ? 'Actualizando...' : 'Actualizar contraseña'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setShowPasswordForm(false);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    currentPassword: '',
                                                    newPassword: '',
                                                    confirmPassword: ''
                                                }));
                                            }}
                                            disabled={saving}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MiPerfilPage;