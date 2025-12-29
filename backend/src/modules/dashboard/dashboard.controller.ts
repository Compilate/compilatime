import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {
    async getStats(req: Request, res: Response) {
        try {
            const stats = await dashboardService.getDashboardStats(req);
            res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            console.error('Error en DashboardController.getStats:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas del dashboard',
                error: error.message
            });
        }
    }

    async getRecentTimeEntries(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 10;
            const recentEntries = await dashboardService.getRecentTimeEntries(req, limit);
            res.json({
                success: true,
                data: recentEntries
            });
        } catch (error: any) {
            console.error('Error en DashboardController.getRecentTimeEntries:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener fichajes recientes',
                error: error.message
            });
        }
    }
}

export default DashboardController;