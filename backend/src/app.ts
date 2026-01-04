import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimit';
import { companyCodeMiddleware } from './middlewares/companyCodeMiddleware';

// Importar rutas
import authRoutes from './modules/auth/auth.routes';
import timeEntryRoutes from './modules/timeEntry/timeEntry.routes';
import employeeRoutes from './modules/employee/employee.routes';
import scheduleRoutes from './modules/schedule/schedule.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import { weeklyScheduleRoutes } from './modules/weeklySchedule/weeklySchedule.routes';
import reportsRoutes from './modules/reports/reports.routes';
import absenceRoutes from './modules/absence/absence.routes';
import meRoutes from './modules/me/me.routes';
import { superadminRoutes } from './modules/superadmin/superadmin.routes';
import { planRoutes } from './modules/plan/plan.routes';
import { subscriptionRoutes } from './modules/subscription/subscription.routes';
import { paymentRoutes } from './modules/payment/payment.routes';
import { companyRoutes, companySettingsRouterForAdmin } from './modules/company/company.routes';
import autoPunchoutRoutes from './modules/autoPunchout/autoPunchout.routes';
import breakTypeRoutes from './modules/breakType/breakType.routes';
import versionRoutes from './modules/version/version.routes';

// Crear aplicación Express
const app = express();

// Middleware de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Configurar CORS
// En desarrollo: usar orígenes específicos desde env
// En producción: usar * o el dominio real (cuando se usa Nginx proxy, es mismo origen)
const corsOrigin = config.isDevelopment
    ? (config.cors.origin ? config.cors.origin.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'])
    : '*'; // En producción con Nginx proxy, es mismo origen

app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Middleware para parsear JSON y cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting general
app.use(generalLimiter);

// Middleware para logging de requests (solo en desarrollo)
if (config.isDevelopment) {
    app.use((req, _res, next) => {
        console.log(`📝 ${req.method} ${req.path} - ${new Date().toISOString()}`);
        next();
    });
}

// Ruta raíz para health check
app.get('/', (_req, res) => {
    res.json({
        message: 'CompilaTime API - Sistema de Registro Horario',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            timeEntries: '/api/time-entries',
            health: '/health'
        }
    });
});

// Rutas de la API - Rutas específicas primero (sin companyCodeMiddleware)
// IMPORTANTE: Las rutas más específicas deben ir primero
app.use('/api/auth', authRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/weekly-schedules', weeklyScheduleRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/absences', absenceRoutes);
app.use('/api/me', meRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/admin', superadminRoutes); // Añadir ruta /admin para compatibilidad con frontend
app.use('/api/admin', superadminRoutes); // Añadir ruta /api/admin para compatibilidad con frontend
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auto-punchout', autoPunchoutRoutes);
app.use('/api/break-types', breakTypeRoutes);
app.use('/api/version', versionRoutes);
// Las rutas de companies deben ir después de superadmin para evitar conflictos
app.use('/api/companies', companyRoutes);
app.use('/api/company', companySettingsRouterForAdmin);

// Rutas con código de empresa en la URL (para empleados multi-empresa)
// Estas rutas permiten acceder a funcionalidades de empleados usando un código corto
// IMPORTANTE: Esta ruta debe ir al final para no interferir con las rutas específicas de la API
// Se usa un middleware personalizado para evitar conflictos con las rutas de la API
app.use((req, res, next) => {
    // Ignorar rutas que empiezan con /api o /admin
    if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
        return next();
    }
    // Aplicar el middleware de código de empresa solo a rutas que no son de la API
    companyCodeMiddleware(req, res, next);
});
app.use(employeeRoutes); // Rutas con código de empresa en la URL

// Ruta de salud del sistema
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'CompilaTime API is running',
        timestamp: new Date().toISOString(),
        environment: config.isDevelopment ? 'development' : config.isProduction ? 'production' : 'test',
        version: '1.0.0',
    });
});

// Ruta de información de la API
app.get('/api', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'CompilaTime API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            timeEntries: '/api/time-entries',
            employees: '/api/employees',
            schedules: '/api/schedules',
            dashboard: '/api/dashboard',
            weeklySchedules: '/api/weekly-schedules',
            reports: '/api/reports',
            absences: '/api/absences',
            superadmin: '/api/superadmin',
            plans: '/api/plans',
            subscriptions: '/api/subscriptions',
            payments: '/api/payments',
            breakTypes: '/api/break-types',
        },
        documentation: '/api/docs',
    });
});

// Manejo de rutas no encontradas
app.use(notFoundHandler);

// Middleware de manejo de errores
app.use(errorHandler);

export default app;