import { createClient, RedisClientType } from 'redis';
import { config } from './env';

// Cliente de Redis para caché y sesiones
let redisClient: RedisClientType | null;

export const getRedisClient = (): RedisClientType | null => {
    if (!config.redis.enabled || !config.redis.url) {
        console.warn('⚠️ Redis no configurado. Las funciones de caché estarán deshabilitadas.');
        return null;
    }

    if (!redisClient) {
        redisClient = createClient({
            url: config.redis.url,
            password: config.redis.password,
            socket: {
                connectTimeout: 5000,
            },
        });

        // Manejo de errores de conexión
        redisClient.on('error', (error) => {
            console.error('❌ Error de conexión a Redis:', error);
        });

        redisClient.on('connect', () => {
            console.log('✅ Conectado a Redis');
        });

        redisClient.on('ready', () => {
            console.log('🚀 Redis listo para usar');
        });

        redisClient.on('end', () => {
            console.log('🔌 Conexión a Redis cerrada');
        });

        redisClient.on('reconnecting', () => {
            console.log('🔄 Reconectando a Redis...');
        });
    }

    return redisClient;
};

// Funciones de caché
export const cache = {
    // Obtener valor de caché
    get: async (key: string): Promise<string | null> => {
        const client = getRedisClient();
        if (!client) return null;

        try {
            const value = await client.get(key);
            return value;
        } catch (error) {
            console.error(`❌ Error obteniendo caché para ${key}:`, error);
            return null;
        }
    },

    // Establecer valor en caché con TTL
    set: async (key: string, value: string, ttl: number = 3600): Promise<boolean> => {
        const client = getRedisClient();
        if (!client) return false;

        try {
            await client.setEx(key, ttl, value);
            console.log(`✅ Caché establecido para ${key} (TTL: ${ttl}s)`);
            return true;
        } catch (error) {
            console.error(`❌ Error estableciendo caché para ${key}:`, error);
            return false;
        }
    },

    // Eliminar valor de caché
    del: async (key: string): Promise<boolean> => {
        const client = getRedisClient();
        if (!client) return false;

        try {
            await client.del(key);
            console.log(`✅ Caché eliminado para ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Error eliminando caché para ${key}:`, error);
            return false;
        }
    },

    // Verificar si existe en caché
    exists: async (key: string): Promise<boolean> => {
        const client = getRedisClient();
        if (!client) return false;

        try {
            const result = await client.exists(key);
            return result === 1;
        } catch (error) {
            console.error(`❌ Error verificando caché para ${key}:`, error);
            return false;
        }
    },

    // Limpiar caché por patrón
    clearPattern: async (pattern: string): Promise<boolean> => {
        const client = getRedisClient();
        if (!client) return false;

        try {
            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(keys);
                console.log(`✅ Limpiando caché con patrón ${pattern}: ${keys.length} claves eliminadas`);
            }
            return true;
        } catch (error) {
            console.error(`❌ Error limpiando caché con patrón ${pattern}:`, error);
            return false;
        }
    },
};

// Funciones de sesión
export const session = {
    // Crear sesión de usuario
    create: async (sessionId: string, userId: string, userType: string, data: any): Promise<boolean> => {
        const client = getRedisClient();
        if (!client) return false;

        try {
            const sessionData = {
                userId,
                userType,
                data,
                createdAt: new Date().toISOString(),
                lastAccess: new Date().toISOString(),
            };

            await client.setEx(
                `session:${sessionId}`,
                24 * 60 * 60, // 24 horas en segundos
                JSON.stringify(sessionData)
            );

            console.log(`✅ Sesión creada: ${sessionId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error creando sesión ${sessionId}:`, error);
            return false;
        }
    },

    // Obtener sesión
    get: async (sessionId: string): Promise<any | null> => {
        const client = getRedisClient();
        if (!client) return null;

        try {
            const sessionData = await client.get(`session:${sessionId}`);
            if (!sessionData) return null;

            const session = JSON.parse(sessionData);

            // Actualizar último acceso
            await client.setEx(
                `session:${sessionId}`,
                24 * 60 * 60,
                JSON.stringify({
                    ...session,
                    lastAccess: new Date().toISOString(),
                })
            );

            return session;
        } catch (error) {
            console.error(`❌ Error obteniendo sesión ${sessionId}:`, error);
            return null;
        }
    },

    // Actualizar sesión
    update: async (sessionId: string, data: any): Promise<boolean> => {
        const client = getRedisClient();
        if (!client) return false;

        try {
            const sessionData = await client.get(`session:${sessionId}`);
            if (!sessionData) return false;

            const session = {
                ...JSON.parse(sessionData),
                ...data,
                lastAccess: new Date().toISOString(),
            };

            await client.setEx(
                `session:${sessionId}`,
                24 * 60 * 60,
                JSON.stringify(session)
            );

            return true;
        } catch (error) {
            console.error(`❌ Error actualizando sesión ${sessionId}:`, error);
            return false;
        }
    },

    // Eliminar sesión
    delete: async (sessionId: string): Promise<boolean> => {
        const client = getRedisClient();
        if (!client) return false;

        try {
            await client.del(`session:${sessionId}`);
            console.log(`✅ Sesión eliminada: ${sessionId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error eliminando sesión ${sessionId}:`, error);
            return false;
        }
    },

    // Limpiar sesiones expiradas
    clearExpired: async (): Promise<number> => {
        const client = getRedisClient();
        if (!client) return 0;

        try {
            const pattern = 'session:*';
            const keys = await client.keys(pattern);

            let deletedCount = 0;
            for (const key of keys) {
                const ttl = await client.ttl(key);
                if (ttl <= 0) {
                    await client.del(key);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                console.log(`✅ Limpiadas ${deletedCount} sesiones expiradas`);
            }

            return deletedCount;
        } catch (error) {
            console.error('❌ Error limpiando sesiones expiradas:', error);
            return 0;
        }
    },
};

// Funciones de cola para tareas asíncronas
export const queue = {
    // Añadir tarea a la cola
    add: async (queueName: string, data: any, options: { delay?: number; priority?: number } = {}): Promise<boolean> => {
        const client = getRedisClient();
        if (!client) return false;

        try {
            const taskData = {
                id: Date.now().toString(),
                data,
                createdAt: new Date().toISOString(),
                ...options,
            };

            await client.lPush(queueName, JSON.stringify(taskData));

            if (options.delay) {
                await client.expire(queueName, options.delay);
            }

            console.log(`✅ Tarea añadida a cola ${queueName}: ${taskData.id}`);
            return true;
        } catch (error) {
            console.error(`❌ Error añadiendo tarea a cola ${queueName}:`, error);
            return false;
        }
    },

    // Obtener siguiente tarea de la cola
    getNext: async (queueName: string): Promise<any | null> => {
        const client = getRedisClient();
        if (!client) return null;

        try {
            const taskResult = await client.brPop(queueName, 0);
            if (!taskResult) return null;

            const task = JSON.parse(taskResult.element);
            console.log(`✅ Tarea obtenida de cola ${queueName}: ${task.id}`);
            return task;
        } catch (error) {
            console.error(`❌ Error obteniendo tarea de cola ${queueName}:`, error);
            return null;
        }
    },

    // Marcar tarea como completada
    complete: async (queueName: string, taskId: string): Promise<boolean> => {
        const client = getRedisClient();
        if (!client) return false;

        try {
            // Mover la tarea a una cola de completadas
            await client.lPush(`completed:${queueName}`, taskId);
            console.log(`✅ Tarea marcada como completada: ${taskId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error marcando tarea como completada ${taskId}:`, error);
            return false;
        }
    },
};

// Función para cerrar conexión
export const closeRedisConnection = async (): Promise<void> => {
    const client = getRedisClient();
    if (client) {
        await client.quit();
        console.log('🔌 Conexión a Redis cerrada');
    }
};

export default {
    getRedisClient,
    cache,
    session,
    queue,
    closeRedisConnection,
};