import { PrismaClient } from '@prisma/client';
import { config } from './env';

// Configuración del cliente Prisma
const prismaClient = new PrismaClient({
    log: config.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
    errorFormat: 'pretty',
});

// Conexión a la base de datos
export const connectDB = async (): Promise<void> => {
    try {
        await prismaClient.$connect();
        console.log('✅ Conectado a la base de datos PostgreSQL');
    } catch (error) {
        console.error('❌ Error al conectar a la base de datos:', error);
        process.exit(1);
    }
};

// Desconexión de la base de datos
export const disconnectDB = async (): Promise<void> => {
    try {
        await prismaClient.$disconnect();
        console.log('🔌 Desconectado de la base de datos');
    } catch (error) {
        console.error('❌ Error al desconectar de la base de datos:', error);
    }
};

// Verificación de la conexión
export const checkDBConnection = async (): Promise<boolean> => {
    try {
        await prismaClient.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error('❌ Error en la verificación de la conexión:', error);
        return false;
    }
};

// Función para ejecutar migraciones (si es necesario)
export const runMigrations = async (): Promise<void> => {
    try {
        // Esto se ejecutaría normalmente con `prisma migrate deploy`
        // pero lo incluimos como referencia
        console.log('📊 Verificando migraciones...');
        // La lógica de migraciones se maneja con Prisma CLI
    } catch (error) {
        console.error('❌ Error en migraciones:', error);
    }
};

// Exportar el cliente de Prisma
export { prismaClient as prisma };

// Middleware para logging de queries (solo en desarrollo)
if (config.isDevelopment) {
    prismaClient.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();

        console.log(`📊 Query ${params.model}.${params.action} took ${after - before}ms`);

        return result;
    });
}

export default prismaClient;