import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSecureNavigation } from '../hooks/useSecureNavigation';
import FicharPage from '../pages/employee/FicharPage';
import FicharAutenticadoPage from '../pages/employee/FicharAutenticadoPage';
import PerfilEmpleadoPage from '../pages/employee/PerfilEmpleadoPage';
import MisRegistrosPage from '../pages/employee/MisRegistrosPage';
import HorarioPage from '../pages/employee/HorarioPage';
import SelectCompanyPage from '../pages/employee/SelectCompanyPage';
import EmployeeSidebar from '../components/employee/EmployeeSidebar';

const EmployeeLayout: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, employee, employeeCompanies, getEmployeeCompanies, company } = useAuth();
    const { getCurrentCompanyCode } = useSecureNavigation();

    const [showCompanySelection, setShowCompanySelection] = useState(false);
    const [loading, setLoading] = useState(true);

    // Obtener el código de empresa de la URL
    useEffect(() => {
        const code = getCurrentCompanyCode();

        // Si no hay código de empresa y el empleado está autenticado, verificar si tiene múltiples empresas
        if (isAuthenticated && employee && !code) {
            checkEmployeeCompanies();
        }

        setLoading(false);
    }, [isAuthenticated, employee, getCurrentCompanyCode]);

    // Verificar si el empleado tiene múltiples empresas
    const checkEmployeeCompanies = async () => {
        try {
            if (!employee?.dni) return;

            const companies = await getEmployeeCompanies(employee.dni);

            if (companies.companies.length > 1) {
                // Si tiene múltiples empresas, mostrar selección
                setShowCompanySelection(true);
            } else if (companies.companies.length === 1) {
                // Si solo tiene una empresa, redirigir automáticamente
                const companyCode = companies.companies[0].slug;
                navigate(`/${companyCode}/area/profile`);
            }
        } catch (error) {
            console.error('Error al verificar empresas del empleado:', error);
        }
    };

    // Manejar selección de empresa
    const handleCompanySelect = (company: any) => {
        navigate(`/${company.slug}/area/profile`);
        setShowCompanySelection(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirigir al login si no está autenticado
        navigate('/area/login');
        return null;
    }

    // Mostrar selección de empresa si es necesario
    if (showCompanySelection && employeeCompanies) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                    <h2 className="text-xl font-semibold mb-4">Selecciona tu empresa</h2>
                    <p className="text-gray-600 mb-4">
                        Estás asignado a múltiples empresas. Selecciona a cuál quieres acceder:
                    </p>
                    <div className="space-y-2">
                        {employeeCompanies.companies.map((company) => (
                            <button
                                key={company.id}
                                onClick={() => handleCompanySelect(company)}
                                className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="font-medium">{company.name}</div>
                                <div className="text-sm text-gray-500">
                                    {company.department} - {company.position}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar para empleados */}
            <EmployeeSidebar />

            {/* Main content */}
            <main className="flex-1">
                {/* Header simple para empleados */}
                <header className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">CT</span>
                                </div>
                                <span className="ml-2 text-xl font-semibold text-gray-900">CompilaTime</span>
                            </div>

                            <div className="flex items-center space-x-4">
                                {company && (
                                    <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                                        Empresa: {company.name}
                                    </span>
                                )}
                                <span className="text-sm text-gray-600">
                                    Bienvenido, {employee?.name}
                                </span>
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-700">
                                        {employee?.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Routes>
                            <Route path="/area/fichar" element={<FicharPage />} />
                            <Route path="/area/fichar-auth" element={<FicharAutenticadoPage />} />
                            <Route path="/area/profile" element={<PerfilEmpleadoPage />} />
                            <Route path="/area/my-records" element={<MisRegistrosPage />} />
                            <Route path="/area/schedule" element={<HorarioPage />} />
                            <Route path="/portal/select-company" element={<SelectCompanyPage />} />
                        </Routes>
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EmployeeLayout;