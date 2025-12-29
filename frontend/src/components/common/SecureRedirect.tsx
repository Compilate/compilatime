import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredRoute } from '../../lib/routeEncryption';

interface SecureRedirectProps {
    routeKey: string;
}

const SecureRedirect: React.FC<SecureRedirectProps> = ({ routeKey }) => {
    const navigate = useNavigate();
    const isRedirecting = useRef(false);

    useEffect(() => {
        // Prevenir múltiples redirecciones
        if (isRedirecting.current) return;

        // Marcar como redirigiendo
        isRedirecting.current = true;

        // Obtener la ruta real desencriptada
        const actualRoute = getStoredRoute();

        // Pequeño delay para asegurar que el componente se monte completamente
        const timeoutId = setTimeout(() => {
            if (actualRoute) {
                navigate(actualRoute, { replace: true });
            } else {
                navigate('/portal/login', { replace: true });
            }
        }, 100);

        // Cleanup
        return () => {
            clearTimeout(timeoutId);
        };
    }, [navigate, routeKey]);

    // Mostrar un loader mínimo
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Redirigiendo...</p>
            </div>
        </div>
    );
};

export default SecureRedirect;