import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { superadminApi, Company } from '../../lib/superadminApi';
import Button from '../../components/common/Button';
import CompanyForm from '../../components/admin/CompanyForm';
import Loader from '../../components/common/Loader';

const EditarEmpresaPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        loadCompany();
    }, [id]);

    const loadCompany = async () => {
        if (!id) {
            setError('ID de empresa no proporcionado');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError('');

            const response = await superadminApi.getCompany(id);

            if (response.success && response.data) {
                setCompany(response.data);
                setShowForm(true);
            } else {
                setError(response.message || 'Error al cargar la empresa');
            }
        } catch (error) {
            console.error('Error cargando empresa:', error);
            setError('Error de conexión al cargar la empresa');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuccess = () => {
        setShowForm(false);
        navigate('/admin/empresas');
    };

    const handleClose = () => {
        navigate('/admin/empresas');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader size="lg" text="Cargando empresa..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-md">
                    <div className="text-center">
                        <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button onClick={() => navigate('/admin/empresas')}>
                            Volver a Empresas
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

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
                        <h1 className="text-3xl font-bold text-gray-900">Editar Empresa</h1>
                        <p className="mt-2 text-gray-600">
                            Modifica la información de la empresa seleccionada
                        </p>
                    </div>
                </div>

                {/* Form */}
                {company && (
                    <CompanyForm
                        company={company}
                        isOpen={showForm}
                        onClose={handleClose}
                        onSuccess={handleSuccess}
                    />
                )}
            </div>
        </div>
    );
};

export default EditarEmpresaPage;