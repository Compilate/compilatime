import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
// import { superadminApi } from '../../lib/superadminApi';
import { useSuperadminAuth } from '../../contexts/SuperadminAuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
// import { useSecureNavigation } from '../../hooks/useSecureNavigation';

const LoginAdminPage: React.FC = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    // const { secureNavigate } = useSecureNavigation(); // Temporalmente desactivado
    const { login } = useSuperadminAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Limpiar error al cambiar el valor
        if (error) {
            setError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            setError('Por favor, completa todos los campos');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Usar el método login del contexto que maneja la autenticación completa
            const result = await login(formData.email, formData.password);

            if (result.success) {
                navigate('/admin/dashboard');
            } else {
                setError(result.message || 'Error en el login');
            }
        } catch (error) {
            setError('Error de conexión. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Shield className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Panel de Administración
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        CompilaTime - Acceso de Superadmin
                    </p>
                </div>

                {/* Form */}
                <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
                    <form className="space-y-6" onSubmit={handleSubmit} id="loginForm" method="POST">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="pl-10"
                                    placeholder="admin@compilatime.com"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="pl-10 pr-10"
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <Shield className="h-5 w-5 text-red-400" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-800">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <div>
                            <Button
                                type="submit"
                                form="loginForm"
                                className="w-full"
                                disabled={isLoading}
                                loading={isLoading}
                                onClick={() => console.log('Botón de login clickeado')}
                            >
                                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                            </Button>
                        </div>

                        {/* Botón de prueba para depuración */}
                        <div className="mt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full"
                                onClick={() => {
                                    console.log('Botón de prueba clickeado');
                                    console.log('Estado actual del formulario:', {
                                        email: formData.email,
                                        password: formData.password,
                                        isLoading
                                    });
                                }}
                            >
                                Probar Formulario
                            </Button>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            <button
                                onClick={() => navigate('/portal/login')}
                                className="font-medium text-indigo-600 hover:text-indigo-500"
                            >
                                Volver al login de empresa
                            </button>
                        </p>
                    </div>
                </div>

                {/* Info */}
                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        Acceso restringido al personal administrativo
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginAdminPage;