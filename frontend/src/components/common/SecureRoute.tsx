import React from 'react';
import { Navigate } from 'react-router-dom';
import { isSessionValid } from '../../lib/routeEncryption';

interface SecureRouteProps {
    children: React.ReactNode;
    fallbackRoute?: string;
    requireAuth?: boolean;
}

const SecureRoute: React.FC<SecureRouteProps> = ({
    children,
    fallbackRoute = '/portal/login',
    requireAuth = true
}) => {
    console.log('🔐 [SecureRoute] Verificando ruta protegida:', {
        requireAuth,
        fallbackRoute,
        currentPath: typeof window !== 'undefined' ? window.location.pathname : 'N/A'
    });

    // Si no requiere autenticación, mostrar directamente
    if (!requireAuth) {
        console.log('✅ [SecureRoute] Ruta no requiere autenticación, mostrando children');
        return <>{children}</>;
    }

    // Verificar si la sesión es válida
    const sessionValid = isSessionValid();
    console.log('🔍 [SecureRoute] Sesión válida:', sessionValid);

    if (!sessionValid) {
        console.log('❌ [SecureRoute] Sesión no válida, redirigiendo a:', fallbackRoute);
        return <Navigate to={fallbackRoute} replace />;
    }

    console.log('✅ [SecureRoute] Sesión válida, mostrando children');
    return <>{children}</>;
};

export default SecureRoute;