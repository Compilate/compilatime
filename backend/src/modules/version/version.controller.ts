import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Controlador para el endpoint de versión
 * Lee la versión desde el archivo VERSION en la release actual
 */
export class VersionController {
    /**
     * Obtiene la versión actual de la aplicación
     * GET /api/version
     */
    async getVersion(_req: Request, res: Response): Promise<void> {
        try {
            // Intentar leer el archivo VERSION desde el directorio de la release
            const versionFilePath = path.join(process.cwd(), 'VERSION');

            let version = 'unknown';
            let deployDate = 'unknown';
            let gitCommit = 'unknown';

            // Leer versión del archivo VERSION si existe
            if (fs.existsSync(versionFilePath)) {
                version = fs.readFileSync(versionFilePath, 'utf-8').trim();
            }

            // Obtener fecha de despliegue del archivo VERSION
            if (fs.existsSync(versionFilePath)) {
                const stats = fs.statSync(versionFilePath);
                deployDate = stats.mtime.toISOString();
            }

            // Intentar obtener el commit de Git si está disponible
            try {
                const { execSync } = require('child_process');
                gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
            } catch (error) {
                // Git no disponible, usar valor por defecto
                gitCommit = 'not-available';
            }

            res.status(200).json({
                success: true,
                version: version,
                deployDate: deployDate,
                gitCommit: gitCommit,
                environment: process.env.NODE_ENV || 'unknown',
                nodeVersion: process.version,
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error al obtener versión:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener versión de la aplicación',
                version: 'error',
            });
        }
    }

    /**
     * Obtiene información detallada del sistema
     * GET /api/version/info
     */
    async getSystemInfo(_req: Request, res: Response): Promise<void> {
        try {
            const versionFilePath = path.join(process.cwd(), 'VERSION');
            let version = 'unknown';

            if (fs.existsSync(versionFilePath)) {
                version = fs.readFileSync(versionFilePath, 'utf-8').trim();
            }

            res.status(200).json({
                success: true,
                application: {
                    name: 'CompilaTime',
                    version: version,
                    description: 'Sistema de Registro Horario',
                },
                environment: {
                    nodeEnv: process.env.NODE_ENV || 'unknown',
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch,
                },
                system: {
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    cpuUsage: process.cpuUsage(),
                },
                deployment: {
                    currentDirectory: process.cwd(),
                    versionFile: versionFilePath,
                    versionFileExists: fs.existsSync(versionFilePath),
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error al obtener información del sistema:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener información del sistema',
            });
        }
    }
}

export const versionController = new VersionController();
