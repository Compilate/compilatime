import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
// import { useSecureNavigation } from '../../hooks/useSecureNavigation';

interface SidebarItem {
    name: string;
    href: string;
    icon: React.ReactNode;
    roles?: string[];
    children?: SidebarItem[];
}

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
    const { user, userRole } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    // const { secureNavigate } = useSecureNavigation();

    const menuItems: SidebarItem[] = [
        {
            name: 'Dashboard',
            href: '/portal/dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            name: 'Equipo',
            href: '/portal/team',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            roles: ['ADMIN', 'MANAGER', 'HR', 'SUPER_ADMIN'],
        },
        {
            name: 'Horarios',
            href: '/portal/schedules',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            roles: ['ADMIN', 'MANAGER', 'SUPER_ADMIN'],
        },
        {
            name: 'Ausencias y Vacaciones',
            href: '/portal/absences',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            roles: ['ADMIN', 'MANAGER', 'HR', 'SUPER_ADMIN'],
            children: [
                {
                    name: 'Ausencias',
                    href: '/portal/absences',
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    ),
                    roles: ['ADMIN', 'MANAGER', 'HR', 'SUPER_ADMIN'],
                },
                {
                    name: 'Políticas de Vacaciones',
                    href: '/portal/vacation-policies',
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    ),
                    roles: ['ADMIN', 'MANAGER', 'HR', 'SUPER_ADMIN'],
                },
                {
                    name: 'Festivos',
                    href: '/portal/holidays',
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    roles: ['ADMIN', 'MANAGER', 'HR', 'SUPER_ADMIN'],
                },
                {
                    name: 'Solicitudes',
                    href: '/portal/absence-requests',
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    ),
                    roles: ['ADMIN', 'MANAGER', 'HR', 'SUPER_ADMIN'],
                },
            ],
        },
        {
            name: 'Registros',
            href: '/portal/records',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            name: 'Reportes',
            href: '/portal/reports',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            roles: ['ADMIN', 'MANAGER', 'HR', 'SUPER_ADMIN'],
        },
        {
            name: 'Configuración',
            href: '/portal/settings',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            roles: ['ADMIN'],
        },
    ];

    // Filtrar elementos del menú según el rol del usuario
    const filteredMenuItems = menuItems.filter(item => {
        if (!item.roles) return true;
        return userRole && item.roles.includes(userRole);
    });

    const isActive = (href: string) => {
        return location.pathname === href || location.pathname.startsWith(href + '/');
    };

    return (
        <>
            {/* Overlay para móvil */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex-shrink-0 lg:inset-y-0',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 lg:hidden">
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">CT</span>
                        </div>
                        <span className="ml-2 text-xl font-semibold text-gray-900">CompilaTime</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex flex-col h-screen lg:h-full">
                    {/* Logo (solo en desktop) */}
                    <div className="hidden lg:flex items-center h-16 px-6 border-b border-gray-200">
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">CT</span>
                        </div>
                        <span className="ml-2 text-xl font-semibold text-gray-900">CompilaTime</span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {filteredMenuItems.map((item) => (
                            <div key={item.href}>
                                {item.children ? (
                                    // Menú con submenús
                                    <div className="space-y-1">
                                        <div
                                            className={cn(
                                                'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer',
                                                isActive(item.href)
                                                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            )}
                                            onClick={() => {
                                                // Toggle submenu
                                                const submenu = document.getElementById(`submenu-${item.href}`);
                                                if (submenu) {
                                                    submenu.classList.toggle('hidden');
                                                }
                                            }}
                                        >
                                            <span className="mr-3">{item.icon}</span>
                                            {item.name}
                                            <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                        <div id={`submenu-${item.href}`} className="hidden space-y-1 pl-8">
                                            {item.children.map((child) => (
                                                <button
                                                    key={child.href}
                                                    onClick={() => {
                                                        // secureNavigate(child.href);
                                                        navigate(child.href);
                                                        onClose?.();
                                                    }}
                                                    className={cn(
                                                        'flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 w-full text-left',
                                                        isActive(child.href)
                                                            ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                    )}
                                                >
                                                    <span className="mr-3">{child.icon}</span>
                                                    {child.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    // Menú sin submenús
                                    <button
                                        onClick={() => {
                                            // secureNavigate(item.href);
                                            navigate(item.href);
                                            onClose?.();
                                        }}
                                        className={cn(
                                            'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 w-full text-left',
                                            isActive(item.href)
                                                ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        )}
                                    >
                                        <span className="mr-3">{item.icon}</span>
                                        {item.name}
                                    </button>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* User info */}
                    <div className="px-6 py-4 border-t border-gray-200">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                                <p className="text-xs text-gray-500">{user?.role}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;