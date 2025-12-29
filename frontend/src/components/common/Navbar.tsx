import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../lib/utils';
import Button from './Button';
// import { useSecureNavigation } from '../../hooks/useSecureNavigation';

interface NavbarProps {
    title?: string;
    onMenuToggle?: () => void;
    showMenuButton?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
    title = 'CompilaTime',
    onMenuToggle,
    showMenuButton = false,
}) => {
    const { user, company, logout } = useAuth();
    const navigate = useNavigate();
    // const { secureNavigate } = useSecureNavigation(); // Temporalmente desactivado
    const [showUserMenu, setShowUserMenu] = useState(false);

    const handleLogout = async () => {
        try {
            console.log('Navbar: Cerrando sesión...');
            logout();
            console.log('Navbar: Sesión cerrada, redirigiendo a login');
            navigate('/portal/login');
        } catch (error) {
            console.error('Navbar: Error al cerrar sesión:', error);
        }
    };

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Izquierda: Logo y título */}
                    <div className="flex items-center">
                        {showMenuButton && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onMenuToggle}
                                className="mr-4 lg:hidden"
                                icon={
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                }
                            />
                        )}

                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">CT</span>
                                </div>
                            </div>
                            <div className="ml-3">
                                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                                {company && (
                                    <p className="text-sm text-gray-500">{company.name}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Derecha: Usuario y acciones */}
                    <div className="flex items-center space-x-4">
                        {/* Botón de cerrar sesión siempre visible */}
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                            icon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4 4m4-4H4m16 0v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1m-6 0h.01M9 16h.01" />
                                </svg>
                            }
                        >
                            Cerrar sesión
                        </Button>

                        {/* Notificaciones */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="relative"
                            icon={
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
                                </>
                            }
                        />

                        {/* Menú de usuario */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center space-x-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                <div className="text-right hidden sm:block">
                                    <div className="text-sm font-medium text-gray-900">
                                        {user?.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {user?.role}
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-700">
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </button>

                            {/* Dropdown menu */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                                    <div className="px-4 py-2 border-b border-gray-100">
                                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                                        <p className="text-xs text-gray-500">{user?.email}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Último acceso: {user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Nunca'}
                                        </p>
                                    </div>

                                    <a
                                        href="#"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigate('/portal/profile');
                                        }}
                                    >
                                        Mi perfil
                                    </a>
                                    <a
                                        href="#"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigate('/portal/settings');
                                        }}
                                    >
                                        Configuración
                                    </a>
                                    <div className="border-t border-gray-100">
                                        <button
                                            onClick={handleLogout}
                                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                        >
                                            Cerrar sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;