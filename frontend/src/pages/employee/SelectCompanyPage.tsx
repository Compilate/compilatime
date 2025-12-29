import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const SelectCompanyPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { getEmployeeCompanies, loginEmployeeMultiCompany } = useAuth();

    const [formData, setFormData] = useState({
        dni: '',
        pin: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [, setLoading] = useState(false);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
    const [showCompanies, setShowCompanies] = useState(false);

    // Obtener el DNI de los parámetros de la URL si existe
    useEffect(() => {
        const dni = searchParams.get('dni');
        if (dni) {
            setFormData(prev => ({ ...prev, dni }));
        }
    }, [searchParams]);

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

    const handleGetCompanies = async () => {
        if (!validateForm()) return;

        setLoadingCompanies(true);
        setErrors({});

        try {
            const companies = await getEmployeeCompanies(formData.dni);

            if (companies.companies.length === 0) {
                setErrors({ general: 'No se encontraron empresas asignadas a este empleado' });
                return;
            }

            setAvailableCompanies(companies.companies);
            setShowCompanies(true);
        } catch (error: any) {
            console.error('Error al obtener empresas:', error);
            setErrors({ general: error.message || 'Error al obtener las empresas del empleado' });
        } finally {
            setLoadingCompanies(false);
        }
    };

    const handleSelectCompany = async (company: any) => {
        setLoading(true);
        setErrors({});

        try {
            // Autenticar al empleado en la empresa seleccionada
            await loginEmployeeMultiCompany({
                dni: formData.dni,
                pin: formData.pin,
                companyId: company.id,
            });

            // Redirigir al área personal del empleado
            navigate('/portal/dashboard');
        } catch (error: any) {
            console.error('Error al seleccionar empresa:', error);
            setErrors({ general: error.message || 'Error al autenticar en la empresa seleccionada' });
        } finally {
            setLoading(false);
        }
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
                        <p className="text-lg text-gray-600">Selecciona tu empresa</p>
                    </div>

                    <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
                        <div className="grid md:grid-cols-2 gap-0">
                            {/* Panel izquierdo - Formulario */}
                            <div className="p-8 bg-gray-50">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    {showCompanies ? 'Selecciona tu empresa' : 'Identifícate'}
                                </h2>

                                {errors.general && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-600">{errors.general}</p>
                                    </div>
                                )}

                                {!showCompanies ? (
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

                                        <Button
                                            onClick={handleGetCompanies}
                                            loading={loadingCompanies}
                                            fullWidth
                                            size="lg"
                                            className="py-4 text-lg font-semibold bg-primary-600 hover:bg-primary-700 focus:ring-primary-500"
                                            icon={
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            }
                                        >
                                            Buscar Empresas
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-600 mb-4">
                                            Hemos encontrado {availableCompanies.length} empresa(s) asignadas a tu DNI. Selecciona a cuál quieres acceder:
                                        </p>

                                        {availableCompanies.map((company) => (
                                            <div
                                                key={company.id}
                                                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                                onClick={() => handleSelectCompany(company)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                                                        <p className="text-sm text-gray-500">
                                                            {company.department} - {company.position}
                                                        </p>
                                                    </div>
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        ))}

                                        <Button
                                            onClick={() => setShowCompanies(false)}
                                            variant="secondary"
                                            fullWidth
                                            size="lg"
                                            className="mt-4"
                                        >
                                            Volver
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Panel derecho - Información */}
                            <div className="p-8 bg-gradient-to-br from-primary-600 to-indigo-700 flex flex-col justify-center items-center text-white">
                                <div className="text-center">
                                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <h3 className="text-xl font-semibold mb-2">Acceso Multi-Empresa</h3>
                                    <p className="text-sm opacity-90 mb-4">
                                        Si trabajas en múltiples empresas, selecciona a cuál quieres acceder para gestionar tu fichaje y horarios.
                                    </p>
                                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                                        <p className="text-sm">
                                            <span className="font-semibold">¿Necesitas ayuda?</span><br />
                                            Contacta con el administrador de tu empresa si tienes problemas para acceder.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        <p>© 2024 CompilaTime. Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelectCompanyPage;