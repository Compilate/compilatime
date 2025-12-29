import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
// import { superadminApi } from '../../lib/superadminApi';
import Button from '../../components/common/Button';
import CompanyForm from '../../components/admin/CompanyForm';
// import { useSecureNavigation } from '../../hooks/useSecureNavigation';

const CrearEmpresaPage: React.FC = () => {
    const navigate = useNavigate();
    // const { secureNavigate } = useSecureNavigation(); // Temporalmente desactivado
    const [showForm, setShowForm] = useState(true);

    const handleSuccess = () => {
        setShowForm(false);
        navigate('/admin/empresas');
    };

    const handleClose = () => {
        navigate('/admin/empresas');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/admin/empresas')}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a Empresas
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Crear Nueva Empresa</h1>
                        <p className="mt-2 text-gray-600">
                            Registra una nueva empresa en el sistema CompilaTime
                        </p>
                    </div>
                </div>

                {/* Form */}
                <CompanyForm
                    isOpen={showForm}
                    onClose={handleClose}
                    onSuccess={handleSuccess}
                />
            </div>
        </div>
    );
};

export default CrearEmpresaPage;