/**
 * Ecosystem configuration for PM2
 * 
 * Este archivo configura cómo PM2 ejecuta el backend de Compilatime.
 * 
 * Uso:
 * - pm2 start ecosystem.config.cjs
 * - pm2 reload compilatime
 * - pm2 stop compilatime
 * - pm2 delete compilatime
 * - pm2 logs compilatime
 * - pm2 monit
 */

module.exports = {
    apps: [
        {
            // Nombre de la aplicación
            name: 'compilatime',

            // Script principal a ejecutar
            script: './dist/server.js',

            // Directorio de trabajo (relativo a este archivo)
            cwd: __dirname,

            // Modo de ejecución: 'fork' (single instance) o 'cluster' (multiple instances)
            exec_mode: 'fork',

            // Número de instancias (solo relevante en modo cluster)
            instances: 1,

            // Variables de entorno
            env: {
                NODE_ENV: 'production',
                PORT: 4000,
            },

            // Variables de entorno para desarrollo
            env_development: {
                NODE_ENV: 'development',
                PORT: 4000,
            },

            // Variables de entorno para staging
            env_staging: {
                NODE_ENV: 'staging',
                PORT: 4000,
            },

            // Variables de entorno para producción
            env_production: {
                NODE_ENV: 'production',
                PORT: 4000,
            },

            // Auto-restart en caso de error
            autorestart: true,

            // Retraso antes de reiniciar (ms)
            restart_delay: 4000,

            // Máximo número de reinicios en 1 minuto antes de detener la app
            max_memory_restart: '1G',

            // Tiempo máximo de escucha antes de considerar que la app no inició (ms)
            listen_timeout: 10000,

            // Tiempo de gracia antes de matar la app en reload (ms)
            kill_timeout: 5000,

            // Tiempo de espera antes de forzar el shutdown (ms)
            wait_ready: true,

            // Min uptime para considerar la app estable (ms)
            min_uptime: '10s',

            // Máximo número de reinicios en 1 minuto
            max_restarts: 10,

            // Logs
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_file: './logs/pm2-combined.log',

            // Rotación de logs
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            // Watch para desarrollo (no usar en producción)
            watch: false,
            ignore_watch: [
                'node_modules',
                'logs',
                'dist',
                '.git',
            ],

            // Instancias en modo cluster (solo si exec_mode es 'cluster')
            // instances: 'max', // o un número específico

            // Balanceo de carga en modo cluster
            // instance_var: 'INSTANCE_ID',

            // Tiempo de inactividad antes de reiniciar (ms)
            // max_restarts: 10,

            // Opciones avanzadas
            // node_args: '--max-old-space-size=1024',

            // Interpretador
            interpreter: 'node',

            // Tiempo de espera para el inicio (ms)
            exp_backoff_restart_delay: 100,
        },
    ],

    // Configuración de despliegue (opcional, para despliegue remoto)
    deploy: {
        production: {
            user: 'deploy',
            host: 'your-server.com',
            ref: 'origin/main',
            repo: 'git@github.com:your-username/compilatime.git',
            path: '/opt/compilatime',
            'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.cjs --env production',
            'pre-setup': 'apt-get install git',
        },
        staging: {
            user: 'deploy',
            host: 'staging-server.com',
            ref: 'origin/develop',
            repo: 'git@github.com:your-username/compilatime.git',
            path: '/opt/compilatime-staging',
            'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.cjs --env staging',
        },
    },
};
