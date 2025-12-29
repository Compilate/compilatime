import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
// import { useSecureNavigation } from '../hooks/useSecureNavigation';

const BackofficeLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const { isAuthenticated, token } = useAuth();
    const navigate = useNavigate();
    // const { secureNavigate } = useSecureNavigation(); // Temporalmente desactivado

    // Esperar a que el contexto esté hidratado
    useEffect(() => {
        console.log('BackofficeLayout: Inicializando...', {
            isAuthenticated,
            hasToken: !!token,
            hasLocalStorage: !!localStorage.getItem('compilatime-auth')
        });

        // Pequeño delay para asegurar que el contexto esté completamente inicializado
        const timer = setTimeout(() => {
            setIsHydrated(true);
            console.log('BackofficeLayout: Hidratación completada');
        }, 100);

        return () => {
            clearTimeout(timer);
        };
    }, [isAuthenticated, token]);

    // Redirigir si no está autenticado después de la hidratación
    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            console.log('BackofficeLayout: Usuario no autenticado, redirigiendo a login');
            navigate('/portal/login');
        }
    }, [isHydrated, isAuthenticated, navigate]);

    // Escuchar errores de autenticación
    useEffect(() => {
        const handleAuthError = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail === 'AUTH_ERROR') {
                console.log('BackofficeLayout: Error de autenticación detectado, redirigiendo a login');
                navigate('/portal/login');
            }
        };

        window.addEventListener('AUTH_ERROR', handleAuthError);

        return () => {
            window.removeEventListener('AUTH_ERROR', handleAuthError);
        };
    }, [navigate]);

    if (!isHydrated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando aplicación...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">No autenticado. Redirigiendo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar fija a la izquierda */}
            <div className="hidden lg:block lg:flex-shrink-0">
                <Sidebar
                    isOpen={true}
                    onClose={() => setSidebarOpen(false)}
                />
            </div>

            {/* Sidebar móvil (overlay) */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
                    <Sidebar
                        isOpen={true}
                        onClose={() => setSidebarOpen(false)}
                    />
                </div>
            )}

            {/* Contenido principal que ocupa el resto del espacio */}
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar
                    title="Panel de Control"
                    onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
                    showMenuButton={true}
                />

                <main className="flex-1 overflow-auto">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default BackofficeLayout;