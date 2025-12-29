import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authApi, companyApi } from '../../lib/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useSecureNavigation } from '../../hooks/useSecureNavigation';
// import Loader from '../../components/common/Loader';

const LoginEmpleadoPage: React.FC = () => {
    const [formData, setFormData] = useState({
        companySlug: '',
        dni: '',
        pin: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { getCurrentCompanyCode } = useSecureNavigation();
    const { isAuthenticated, employee, login, setEmployee, setError } = useAuth();

    // Detectar si hay un código de empresa en la URL
    const companyCodeFromUrl = getCurrentCompanyCode();

    // Redirigir si ya está autenticado
    React.useEffect(() => {
        if (isAuthenticated && employee) {
            navigate('/area/profile');
        }
    }, [isAuthenticated, employee, navigate]);

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

        // Solo validar el código de empresa si no viene en la URL
        if (!companyCodeFromUrl && !formData.companySlug.trim()) {
            newErrors.companySlug = 'El código de empresa es obligatorio';
        }

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError(null);

        try {
            // Usar el código de empresa de la URL o del formulario
            const companySlug = companyCodeFromUrl || formData.companySlug;

            console.log('LoginEmpleadoPage: Iniciando login con:', {
                companySlug: companySlug,
                dni: formData.dni,
                fromUrl: !!companyCodeFromUrl
            });

            // Primero obtener el ID de la empresa desde el código
            const companyResponse = await companyApi.getCompanyBySlug(companySlug);

            if (!companyResponse.success || !companyResponse.data) {
                setErrors({ general: 'Empresa no encontrada' });
                return;
            }

            const company = companyResponse.data as any;
            console.log('LoginEmpleadoPage: Empresa encontrada:', {
                id: company.id,
                name: company.name,
                slug: company.slug
            });

            // Usar el endpoint multi-empresa con el ID de la empresa
            const loginData = {
                companyId: company.id,
                dni: formData.dni,
                pin: formData.pin
            };

            console.log('LoginEmpleadoPage: Enviando petición de login:', loginData);
            const response = await authApi.employeeLoginMultiCompany(loginData);

            console.log('LoginEmpleadoPage: Respuesta completa:', response);
            console.log('LoginEmpleadoPage: response.success:', response.success);
            console.log('LoginEmpleadoPage: response.data:', response.data);

            if (response.success && response.data) {
                const data = response.data as any;
                const { user, company: userCompany, accessToken, expiresIn } = data;

                // El refreshToken viene en la cookie HTTP-only, no en el response
                const refreshToken = ''; // Se obtendrá de la cookie cuando sea necesario

                console.log('LoginEmpleadoPage: Login exitoso:', {
                    user: user.name,
                    company: userCompany?.name,
                    hasToken: !!accessToken,
                    hasRefreshToken: !!refreshToken,
                    expiresIn
                });

                // Para login de empleado, usamos el employee como "user" y la company como null
                console.log('LoginEmpleadoPage: Llamando a login() con:', {
                    userName: user.name,
                    companyName: userCompany?.name,
                    hasToken: !!accessToken,
                    hasRefreshToken: !!refreshToken
                });

                login(user as any, userCompany, accessToken, refreshToken);
                setEmployee(user);

                // Redirigir usando el código de empresa correcto
                const companyCode = companyCodeFromUrl || formData.companySlug;
                if (companyCode) {
                    navigate(`/${companyCode}/area/profile`);
                } else {
                    navigate('/area/profile');
                }
            } else {
                console.error('LoginEmpleadoPage: Error en respuesta:', response);
                setErrors({ general: response.error || 'Error al iniciar sesión' });
            }
        } catch (error: any) {
            console.error('Error de login:', error);
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
                    Acceso Empleado
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Accede a tu zona personal
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
                        {/* Solo mostrar el campo de código de empresa si no viene en la URL */}
                        {!companyCodeFromUrl && (
                            <Input
                                label="Código de Empresa"
                                name="companySlug"
                                type="text"
                                value={formData.companySlug}
                                onChange={handleChange}
                                error={errors.companySlug}
                                placeholder="ej: demo"
                                required
                                leftIcon={
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                }
                            />
                        )}

                        {/* Mostrar información de la empresa detectada */}
                        {companyCodeFromUrl && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <div className="flex">
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="ml-3">
                                        <p className="text-sm text-blue-800">
                                            Accediendo a la empresa: <span className="font-medium">{companyCodeFromUrl}</span>
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">
                                            El código de empresa se ha detectado automáticamente desde la URL
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                    ¿Olvidaste tu PIN?
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
                                <span className="px-2 bg-white text-gray-500">¿Solo quieres fichar?</span>
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
                                Fichaje rápido
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginEmpleadoPage;