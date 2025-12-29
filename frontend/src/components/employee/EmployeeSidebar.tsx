import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSecureNavigation } from '../../hooks/useSecureNavigation';
import { useAuth } from '../../contexts/AuthContext';

const EmployeeSidebar: React.FC = () => {
    const location = useLocation();
    const { getCurrentCompanyCode, navigateToCompany } = useSecureNavigation();
    const { company } = useAuth();
    const navigate = useNavigate();

    // Obtener el código de empresa actual
    const currentCompanyCode = getCurrentCompanyCode();

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    return (
        <div className="w-64 bg-white shadow-lg h-full">
            <div className="flex items-center justify-center h-16 bg-primary-600">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-lg">CT</span>
                </div>
                <span className="ml-2 text-white font-semibold">CompilaTime</span>
            </div>

            <nav className="mt-8">
                <div className="px-4 space-y-2">
                    <button
                        onClick={() => currentCompanyCode ? navigateToCompany(currentCompanyCode, '/area/fichar') : navigate('/area/fichar')}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive('/area/fichar')
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m0 0l-3-3m3 3v4M3 21h18a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2z" />
                        </svg>
                        Fichar
                    </button>

                    <button
                        onClick={() => currentCompanyCode ? navigateToCompany(currentCompanyCode, '/area/fichar-auth') : navigate('/area/fichar-auth')}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive('/area/fichar-auth')
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Mi Fichaje
                    </button>

                    <button
                        onClick={() => currentCompanyCode ? navigateToCompany(currentCompanyCode, '/area/profile') : navigate('/area/profile')}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive('/area/profile')
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 00-8 0v12a4 4 0 008 0h-4a4 4 0 00-8 0v12a4 4 0 008 0h4a4 4 0 008 0v-12zM12 14a7 7 0 00-7-7h-1a7 7 0 00-7 7v-4a7 7 0 007-7h1a7 7 0 007 7v4a7 7 0 007 7z" />
                        </svg>
                        Mi Perfil
                    </button>

                    <button
                        onClick={() => currentCompanyCode ? navigateToCompany(currentCompanyCode, '/area/my-records') : navigate('/area/my-records')}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive('/area/my-records')
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6a2 2 0 002 2v6a2 2 0 002-2h-6a2 2 0 00-2-2v-6a2 2 0 00-2-2zm0 0h6a2 2 0 002 2v6a2 2 0 002 2h-6a2 2 0 00-2-2v-6a2 2 0 00-2-2z" />
                        </svg>
                        Mis Registros
                    </button>

                    <button
                        onClick={() => currentCompanyCode ? navigateToCompany(currentCompanyCode, '/area/schedule') : navigate('/area/schedule')}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive('/area/schedule')
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 4h10a2 2 0 002 2v6a2 2 0 002-2H7a2 2 0 00-2-2V5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 012 2z" />
                        </svg>
                        Mi Horario
                    </button>
                </div>

                {company && (
                    <div className="px-4 mt-2">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                            <p className="text-xs text-blue-800">
                                <span className="font-semibold">Empresa actual:</span> {company.name}
                            </p>
                        </div>
                    </div>
                )}

                <div className="px-4 mt-8">
                    <div className="border-t border-gray-200 pt-4">
                        <div className="px-3 py-2">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Ayuda
                            </h3>
                            <div className="mt-2 space-y-1">
                                <a
                                    href="#"
                                    className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    📖 Manual de Usuario
                                </a>
                                <a
                                    href="#"
                                    className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    📞 Soporte Técnico
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default EmployeeSidebar;