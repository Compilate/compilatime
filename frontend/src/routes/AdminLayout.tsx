import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
// import { useSecureNavigation } from '../hooks/useSecureNavigation';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronDown,
    Building2,
    DollarSign,
    BarChart3
} from 'lucide-react';

const AdminLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    // const { secureNavigate } = useSecureNavigation(); // Temporalmente desactivado

    const handleLogout = async () => {
        try {
            // Eliminar token de superadmin
            document.cookie = 'superadmin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            localStorage.removeItem('superadmin_token');
            navigate('/admin/login');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    const menuItems = [
        {
            title: 'Panel de Control',
            icon: LayoutDashboard,
            items: [
                { title: 'Dashboard', path: '/admin/dashboard', icon: BarChart3 },
            ]
        },
        {
            title: 'Gestión',
            icon: Settings,
            items: [
                { title: 'Empresas', path: '/admin/empresas', icon: Building2 },
                { title: 'Planes', path: '/admin/planes', icon: CreditCard },
                { title: 'Suscripciones', path: '/admin/suscripciones', icon: FileText },
                { title: 'Pagos', path: '/admin/pagos', icon: DollarSign },
            ]
        }
    ];

    const isActivePath = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-indigo-900 transition-all duration-300 ease-in-out flex-shrink-0`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-center h-16 bg-indigo-800">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            {sidebarOpen && (
                                <span className="ml-3 text-white font-bold text-lg">CompilaTime Admin</span>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-2 py-4 space-y-2">
                        {menuItems.map((section, sectionIndex) => (
                            <div key={sectionIndex} className="mb-6">
                                {sidebarOpen && (
                                    <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        {section.title}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {section.items.map((item) => (
                                        <button
                                            key={item.path}
                                            onClick={() => navigate(item.path)}
                                            className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActivePath(item.path)
                                                ? 'bg-indigo-700 text-white'
                                                : 'text-gray-300 hover:bg-indigo-700 hover:text-white'
                                                }`}
                                        >
                                            <item.icon className="mr-3 h-5 w-5" />
                                            {sidebarOpen && item.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* User menu */}
                    <div className="relative">
                        <div className="px-2 py-4">
                            <button
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-indigo-700 hover:text-white transition-colors"
                            >
                                <Users className="mr-3 h-5 w-5" />
                                {sidebarOpen && 'Superadmin'}
                                <ChevronDown className="ml-auto h-4 w-4" />
                            </button>
                        </div>

                        {/* Profile dropdown */}
                        {profileMenuOpen && (
                            <div className="absolute bottom-16 left-2 right-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                                <button
                                    onClick={() => {
                                        navigate('/admin/perfil');
                                        setProfileMenuOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <div className="flex items-center">
                                        <Settings className="mr-3 h-4 w-4" />
                                        Mi Perfil
                                    </div>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                    <LogOut className="mr-3 h-4 w-4" />
                                    Cerrar Sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="bg-white shadow-sm border-b border-gray-200">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                            <h1 className="ml-4 text-xl font-semibold text-gray-900">
                                Panel de Administración
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-500">
                                Superadmin
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto">
                    <div className="py-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;