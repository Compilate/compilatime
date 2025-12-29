import { config, env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { verifyEmailConnection } from './config/email';
import app from './app';
import { AutoPunchoutService } from './modules/autoPunchout/autoPunchout.service';

// Función para iniciar el servidor
const startServer = async (): Promise<void> => {
    try {
        // Conectar a la base de datos
        await connectDB();

        // Verificar conexión de email (si está configurado)
        if (config.email.enabled) {
            await verifyEmailConnection();
        } else {
            console.warn('⚠️ Email no configurado. Las funciones de email estarán deshabilitadas.');
        }

        // Iniciar servicio de cierre automático de fichajes
        AutoPunchoutService.startAutoPunchoutCron();

        // Iniciar servidor
        const server = app.listen(env.PORT, () => {
            console.log(`🚀 Servidor CompilaTime iniciado en el puerto ${env.PORT}`);
            console.log(`📝 Environment: ${config.isDevelopment ? 'Development' : 'Production'}`);
            console.log(`🌐 API URL: http://localhost:${env.PORT}`);
            console.log(`🏥 Health Check: http://localhost:${env.PORT}/health`);
            console.log(`📚 API Info: http://localhost:${env.PORT}/api`);
        });

        // Manejo de cierre graceful
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n📡 Recibida señal ${signal}. Iniciando cierre graceful...`);

            server.close(async () => {
                console.log('🔌 Servidor HTTP cerrado');

                try {
                    await disconnectDB();
                    console.log('✅ Cierre graceful completado');
                    process.exit(0);
                } catch (error) {
                    console.error('❌ Error durante el cierre graceful:', error);
                    process.exit(1);
                }
            });

            // Forzar cierre después de 10 segundos
            setTimeout(() => {
                console.error('⏰ Tiempo de cierre agotado. Forzando cierre...');
                process.exit(1);
            }, 10000);
        };

        // Escuchar señales del sistema
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Manejo de errores no capturados
        process.on('uncaughtException', (error) => {
            console.error('❌ Error no capturado:', error);
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Promesa rechazada no manejada:', reason);
            console.error('Promise:', promise);
            gracefulShutdown('unhandledRejection');
        });

    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Iniciar el servidor
startServer().catch((error) => {
    console.error('❌ Error crítico al iniciar la aplicación:', error);
    process.exit(1);
});

export default startServer;