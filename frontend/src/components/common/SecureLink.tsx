import React from 'react';
import { Link } from 'react-router-dom';
import { storeEncryptedRoute, initializeSession } from '../../lib/routeEncryption';

interface SecureLinkProps {
    to: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    replace?: boolean;
}

const SecureLink: React.FC<SecureLinkProps> = ({
    to,
    children,
    className,
    onClick,
    replace = false
}) => {
    const handleClick = () => {
        // Inicializar sesión si no existe
        initializeSession();

        // Almacenar la ruta encriptada
        storeEncryptedRoute(to);

        // Ejecutar onClick personalizado si existe
        if (onClick) {
            onClick();
        }
    };

    return (
        <Link
            to={to}
            className={className}
            onClick={handleClick}
            replace={replace}
        >
            {children}
        </Link>
    );
};

export default SecureLink;