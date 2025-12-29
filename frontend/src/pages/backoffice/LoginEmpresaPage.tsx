import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../lib/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
// import { useSecureNavigation } from '../../hooks/useSecureNavigation';
// import Loader from '../../components/common/Loader';

const LoginEmpresaPage: React.FC = () => {
    const [formData, setFormData] = useState({
        companySlug: '',
        email: '',
        password: '',
    });
    const [useCompanySlug, setUseCompanySlug] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    // const { secureNavigate } = useSecureNavigation(); // Temporalmente desactivado
    const { isAuthenticated, login, setError } = useAuth();

    // Redirigir si ya está autenticado
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/portal/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Limpiar error del campo cuando el usuario empieza a escribir
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (useCompanySlug && !formData.companySlug.trim()) {
            newErrors.companySlug = 'El código de empresa es obligatorio';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'El email es obligatorio';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'El email no es válido';
        }

        if (!formData.password.trim()) {
            newErrors.password = 'La contraseña es obligatoria';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError(null);

        try {
            console.log('LoginEmpresaPage: Iniciando login con:', {
                companySlug: useCompanySlug ? formData.companySlug : 'no requerido',
                email: formData.email
            });

            let response;
            if (useCompanySlug) {
                // Usar el endpoint tradicional con código de empresa
                response = await authApi.companyLogin(formData);
            } else {
                // Usar el nuevo endpoint sin código de empresa
                const { companySlug, ...loginData } = formData;
                response = await authApi.companyLoginWithoutSlug(loginData);
            }

            if (response.success && response.data) {
                const data = response.data as any;
                const { user, company, accessToken } = data;

                console.log('LoginEmpresaPage: Login exitoso:', {
                    user: user.name,
                    company: company?.name,
                    hasToken: !!accessToken
                });

                // Usar el nuevo contexto de autenticación
                // Nota: El refreshToken está en una cookie HTTPOnly
                login(user, company, accessToken, '');

                console.log('LoginEmpresaPage: Estado de autenticación actualizado');
            } else {
                setErrors({ general: response.error || 'Error al iniciar sesión' });
            }
        } catch (error: any) {
            console.error('LoginEmpresaPage: Error de login:', error);
            setErrors({
                general: error.message || 'Error de conexión. Inténtalo de nuevo.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">CT</span>
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Acceso Empresa
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Inicia sesión para gestionar tu empresa
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {errors.general && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{errors.general}</p>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="flex items-center mb-4">
                            <input
                                id="useCompanySlug"
                                name="useCompanySlug"
                                type="checkbox"
                                checked={useCompanySlug}
                                onChange={(e) => setUseCompanySlug(e.target.checked)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="useCompanySlug" className="ml-2 block text-sm text-gray-900">
                                Usar código de empresa
                            </label>
                        </div>

                        {useCompanySlug && (
                            <Input
                                label="Código de Empresa"
                                name="companySlug"
                                type="text"
                                value={formData.companySlug}
                                onChange={handleChange}
                                error={errors.companySlug}
                                placeholder="ej: demo"
                                required={useCompanySlug}
                                leftIcon={
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                }
                            />
                        )}

                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            error={errors.email}
                            placeholder="admin@empresa.com"
                            required
                            leftIcon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                </svg>
                            }
                        />

                        <Input
                            label="Contraseña"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            error={errors.password}
                            placeholder="••••••••"
                            required
                            leftIcon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            }
                        />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                    Recordarme
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            fullWidth
                            loading={loading}
                            className="py-3"
                        >
                            Iniciar Sesión
                        </Button>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">¿Eres empleado?</span>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => {
                                    // Obtener el primer segmento de la URL (código encriptado)
                                    const pathSegments = location.pathname.split('/').filter(Boolean);
                                    const encryptedCode = pathSegments.length > 0 ? pathSegments[0] : null;

                                    // Si hay un código encriptado, usarlo; si no, usar la ruta sin código
                                    if (encryptedCode && encryptedCode !== 'area' && encryptedCode !== 'portal') {
                                        navigate(`/${encryptedCode}/area/fichar`);
                                    } else {
                                        navigate('/area/fichar');
                                    }
                                }}
                                className="font-medium text-primary-600 hover:text-primary-500"
                            >
                                Acceso para fichar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginEmpresaPage;