import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { useSuperadminAuth } from './contexts/SuperadminAuthContext';

// Layouts
import BackofficeLayout from './routes/BackofficeLayout';
import EmployeeLayout from './routes/EmployeeLayout';

// Páginas públicas
import LoginEmpresaPage from './pages/backoffice/LoginEmpresaPage';
import FicharPage from './pages/employee/FicharPage';
import LoginEmpleadoPage from './pages/employee/LoginEmpleadoPage';
import SelectCompanyPage from './pages/employee/SelectCompanyPage';

// Páginas del backoffice
import DashboardEmpresaPage from './pages/backoffice/DashboardEmpresaPage';
import EmpleadosPage from './pages/backoffice/EmpleadosPage';
import HorariosPage from './pages/backoffice/HorariosPage';
import EmpleadoHorariosPage from './pages/backoffice/EmpleadoHorariosPage';
import AusenciasPage from './pages/backoffice/AusenciasPage';
import PoliticasVacacionesPage from './pages/backoffice/PoliticasVacacionesPage';
import BalanceVacacionesPage from './pages/backoffice/BalanceVacacionesPage';
import FestivosPage from './pages/backoffice/FestivosPage';
import SolicitudesAusenciaPage from './pages/backoffice/SolicitudesAusenciaPage';
import RegistrosPage from './pages/backoffice/RegistrosPage';
import ReportesPage from './pages/backoffice/ReportesPage';
import MiPerfilPage from './pages/backoffice/MiPerfilPage';
import ConfiguracionPage from './pages/backoffice/ConfiguracionPage';
import TiposPausaPage from './pages/backoffice/TiposPausaPage';

// Páginas de empleado
import PerfilEmpleadoPage from './pages/employee/PerfilEmpleadoPage';
import MisRegistrosPage from './pages/employee/MisRegistrosPage';
import HorarioPage from './pages/employee/HorarioPage';

// Páginas de Superadmin
import LoginAdminPage from './pages/admin/LoginAdminPage';
import AdminLayout from './routes/AdminLayout';
import DashboardAdminPage from './pages/admin/DashboardAdminPage';
import EmpresasAdminPage from './pages/admin/EmpresasAdminPage';
import DetallesEmpresaPage from './pages/admin/DetallesEmpresaPage';
import CrearEmpresaPage from './pages/admin/CrearEmpresaPage';
import EditarEmpresaPage from './pages/admin/EditarEmpresaPage';
import PlanesAdminPage from './pages/admin/PlanesAdminPage';
import PagosAdminPage from './pages/admin/PagosAdminPage';
import SuscripcionesAdminPage from './pages/admin/SuscripcionesAdminPage';
import EditarSuscripcionPage from './pages/admin/EditarSuscripcionPage';
import CrearSuscripcionPage from './pages/admin/CrearSuscripcionPage';
import { SuperadminAuthProvider } from './contexts/SuperadminAuthContext';

// Componentes de seguridad
// import SecureRedirect from './components/common/SecureRedirect';

// Componentes
import Loader from './components/common/Loader';

// Componente de protección de rutas
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({
    children,
    requiredRole
}) => {
    const { isAuthenticated, userRole, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader size="lg" text="Cargando..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/portal/login" replace />;
    }

    if (requiredRole && userRole !== requiredRole) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
                    <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

// Componente de protección para rutas de empleado
const EmployeeProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, employee, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader size="lg" text="Cargando..." />
            </div>
        );
    }

    if (!isAuthenticated || !employee) {
        return <Navigate to="/area/login" replace />;
    }

    return <>{children}</>;
};

// Componente de protección para rutas de Superadmin
const SuperadminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isLoading } = useSuperadminAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader size="lg" text="Cargando..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    return <>{children}</>;
};

// Componente App interno que usa el contexto
const AppContent: React.FC = () => {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader size="lg" text="Iniciando aplicación..." />
            </div>
        );
    }

    return (
        <Router>
            <div className="App">
                <Routes>
                    {/* Rutas públicas */}
                    <Route path="/portal/login" element={<LoginEmpresaPage />} />
                    <Route path="/area/fichar" element={<FicharPage />} />
                    <Route path="/area/login" element={<LoginEmpleadoPage />} />
                    <Route path="/portal/select-company" element={<SelectCompanyPage />} />

                    {/* Rutas con código de empresa encriptado */}
                    <Route path="/:encryptedCode/area/login" element={<LoginEmpleadoPage />} />
                    <Route path="/:encryptedCode/area/fichar" element={<FicharPage />} />
                    <Route path="/:encryptedCode/portal/login" element={<LoginEmpresaPage />} />
                    <Route path="/:encryptedCode/portal/select-company" element={<SelectCompanyPage />} />

                    {/* Rutas del backoffice (protegidas) */}
                    <Route
                        path="/portal"
                        element={
                            <ProtectedRoute>
                                <BackofficeLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="/portal/dashboard" replace />} />
                        <Route path="dashboard" element={<DashboardEmpresaPage />} />
                        <Route path="team" element={<EmpleadosPage />} />
                        <Route path="schedules" element={<HorariosPage />} />
                        <Route path="absences" element={<AusenciasPage />} />
                        <Route path="vacation-policies" element={<PoliticasVacacionesPage />} />
                        <Route path="vacation-balance" element={<BalanceVacacionesPage />} />
                        <Route path="holidays" element={<FestivosPage />} />
                        <Route path="absence-requests" element={<SolicitudesAusenciaPage />} />
                        <Route path="team/:employeeId/schedules" element={<EmpleadoHorariosPage />} />
                        <Route path="profile" element={<MiPerfilPage />} />
                        <Route path="settings" element={<ConfiguracionPage />} />
                        <Route path="records" element={<RegistrosPage />} />
                        <Route path="reports" element={<ReportesPage />} />
                        <Route path="break-types" element={<TiposPausaPage />} />
                    </Route>

                    {/* Rutas de empleado (protegidas) */}
                    <Route
                        path="/area"
                        element={
                            <EmployeeProtectedRoute>
                                <EmployeeLayout />
                            </EmployeeProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="/area/profile" replace />} />
                        <Route path="profile" element={<PerfilEmpleadoPage />} />
                        <Route path="my-records" element={<MisRegistrosPage />} />
                        <Route path="schedule" element={<HorarioPage />} />
                        <Route path="select-company" element={<SelectCompanyPage />} />
                    </Route>

                    {/* Rutas de empleado con código de empresa encriptado (protegidas) */}
                    <Route
                        path="/:encryptedCode/area"
                        element={
                            <EmployeeProtectedRoute>
                                <EmployeeLayout />
                            </EmployeeProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="/:encryptedCode/area/profile" replace />} />
                        <Route path="profile" element={<PerfilEmpleadoPage />} />
                        <Route path="my-records" element={<MisRegistrosPage />} />
                        <Route path="schedule" element={<HorarioPage />} />
                        <Route path="select-company" element={<SelectCompanyPage />} />
                    </Route>

                    {/* Rutas de portal con código de empresa encriptado (protegidas) */}
                    <Route
                        path="/:encryptedCode/portal"
                        element={
                            <ProtectedRoute>
                                <BackofficeLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="/:encryptedCode/portal/dashboard" replace />} />
                        <Route path="dashboard" element={<DashboardEmpresaPage />} />
                        <Route path="team" element={<EmpleadosPage />} />
                        <Route path="schedules" element={<HorariosPage />} />
                        <Route path="absences" element={<AusenciasPage />} />
                        <Route path="vacation-policies" element={<PoliticasVacacionesPage />} />
                        <Route path="vacation-balance" element={<BalanceVacacionesPage />} />
                        <Route path="holidays" element={<FestivosPage />} />
                        <Route path="absence-requests" element={<SolicitudesAusenciaPage />} />
                        <Route path="team/:employeeId/schedules" element={<EmpleadoHorariosPage />} />
                        <Route path="profile" element={<MiPerfilPage />} />
                        <Route path="settings" element={<ConfiguracionPage />} />
                        <Route path="records" element={<RegistrosPage />} />
                        <Route path="reports" element={<ReportesPage />} />
                        <Route path="break-types" element={<TiposPausaPage />} />
                        <Route path="select-company" element={<SelectCompanyPage />} />
                    </Route>

                    {/* Rutas de Superadmin */}
                    <Route path="/admin/login" element={
                        <SuperadminAuthProvider>
                            <LoginAdminPage />
                        </SuperadminAuthProvider>
                    } />

                    <Route path="/admin/*" element={
                        <SuperadminAuthProvider>
                            <SuperadminProtectedRoute>
                                <AdminLayout />
                            </SuperadminProtectedRoute>
                        </SuperadminAuthProvider>
                    }>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<DashboardAdminPage />} />
                        <Route path="empresas" element={<EmpresasAdminPage />} />
                        <Route path="empresas/:id" element={<DetallesEmpresaPage />} />
                        <Route path="empresas/create" element={<CrearEmpresaPage />} />
                        <Route path="empresas/:id/edit" element={<EditarEmpresaPage />} />
                        <Route path="planes" element={<PlanesAdminPage />} />
                        <Route path="pagos" element={<PagosAdminPage />} />
                        <Route path="suscripciones" element={<SuscripcionesAdminPage />} />
                        <Route path="suscripciones/nueva" element={<CrearSuscripcionPage />} />
                        <Route path="suscripciones/:id/edit" element={<EditarSuscripcionPage />} />
                    </Route>

                    {/* Rutas de redirección segura - TEMPORALMENTE DESACTIVADAS */}
                    {/* <Route path="/secure-redirect/:routeKey" element={<SecureRedirect routeKey=":routeKey" />} /> */}

                    {/* Redirección por defecto */}
                    <Route path="/" element={<Navigate to="/portal/login" replace />} />

                    {/* Página 404 */}
                    <Route
                        path="*"
                        element={
                            <div className="min-h-screen flex items-center justify-center">
                                <div className="text-center">
                                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                                    <p className="text-gray-600 mb-4">Página no encontrada</p>
                                    <a
                                        href="/portal/login"
                                        className="text-primary-600 hover:text-primary-800"
                                    >
                                        Ir al inicio
                                    </a>
                                </div>
                            </div>
                        }
                    />
                </Routes>
            </div>
        </Router>
    );
};

// Componente App principal que envuelve con el AuthProvider
const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;