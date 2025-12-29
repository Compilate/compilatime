import { Request, Response } from 'express';
import AutoPunchoutService from './autoPunchout.service';

class AutoPunchoutController {
    // Iniciar el servicio de cierre automático
    static async startService(_req: Request, res: Response) {
        try {
            await AutoPunchoutService.startAutoPunchoutCron();

            res.json({
                success: true,
                message: 'Servicio de cierre automático iniciado correctamente',
            });
        } catch (error: any) {
            console.error('❌ Error iniciando servicio de cierre automático:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al iniciar el servicio de cierre automático',
            });
        }
    }

    // Procesar manualmente los fichajes pendientes
    static async processPending(_req: Request, res: Response) {
        try {
            await AutoPunchoutService.processPendingPunchouts();

            res.json({
                success: true,
                message: 'Fichajes pendientes procesados correctamente',
            });
        } catch (error: any) {
            console.error('❌ Error procesando fichajes pendientes:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al procesar fichajes pendientes',
            });
        }
    }

    // Obtener estado del servicio
    static async getStatus(_req: Request, res: Response) {
        try {
            res.json({
                success: true,
                data: {
                    status: 'running',
                    message: 'Servicio de cierre automático en ejecución',
                    lastCheck: new Date().toISOString(),
                },
            });
        } catch (error: any) {
            console.error('❌ Error obteniendo estado del servicio:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener estado del servicio',
            });
        }
    }
}

export default AutoPunchoutController;