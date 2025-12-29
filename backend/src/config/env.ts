import { z } from 'zod';
import dotenv from 'dotenv';

// Cargar variables de entorno desde archivo .env
dotenv.config();

const envSchema = z.object({
    // Base de datos
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerido'),

    // Servidor
    PORT: z.string().transform(Number).default('4000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

    // Email
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().transform(Number).default('587'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().default('CompilaTime <noreply@compilatime.com>'),

    // Redis
    REDIS_URL: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

    // Archivos
    UPLOAD_DIR: z.string().default('./uploads'),
    MAX_FILE_SIZE: z.string().transform(Number).default('5242880'),

    // Frontend
    FRONTEND_URL: z.string().default('http://localhost:3000'),

    // Logs
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FILE: z.string().default('./logs/app.log'),

    // Seguridad
    BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),

    // Notificaciones
    NOTIFICATION_QUEUE_ENABLED: z.string().transform(Boolean).default('true'),
    NOTIFICATION_RETRY_ATTEMPTS: z.string().transform(Number).default('3'),

    // Reportes
    REPORTS_DIR: z.string().default('./reports'),
    REPORTS_RETENTION_DAYS: z.string().transform(Number).default('30'),

    // Timezone
    DEFAULT_TIMEZONE: z.string().default('Europe/Madrid'),
});

// Validar variables de entorno
const envValidation = envSchema.safeParse(process.env);

if (!envValidation.success) {
    console.error('❌ Error en las variables de entorno:');
    console.error(envValidation.error.format());
    process.exit(1);
}

export const env = envValidation.data;

// Configuración adicional derivada
export const config = {
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',

    jwt: {
        secret: env.JWT_SECRET,
        expiresIn: env.JWT_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },

    database: {
        url: env.DATABASE_URL,
    },

    email: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.SMTP_FROM,
        enabled: !!env.SMTP_HOST && !!env.SMTP_USER && !!env.SMTP_PASS,
    },

    redis: {
        url: env.REDIS_URL,
        password: env.REDIS_PASSWORD,
        enabled: !!env.REDIS_URL,
    },

    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },

    upload: {
        dir: env.UPLOAD_DIR,
        maxFileSize: env.MAX_FILE_SIZE,
    },

    cors: {
        origin: env.CORS_ORIGIN,
    },

    notifications: {
        queueEnabled: env.NOTIFICATION_QUEUE_ENABLED,
        retryAttempts: env.NOTIFICATION_RETRY_ATTEMPTS,
    },

    reports: {
        dir: env.REPORTS_DIR,
        retentionDays: env.REPORTS_RETENTION_DAYS,
    },

    security: {
        bcryptRounds: env.BCRYPT_ROUNDS,
    },

    timezone: {
        default: env.DEFAULT_TIMEZONE,
    },
};

export default config;