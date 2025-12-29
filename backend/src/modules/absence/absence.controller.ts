import { Request, Response } from 'express';
import { AbsenceService } from './absence.service';
import { ApiResponse } from '../../types/express';

const absenceService = new AbsenceService();

export class AbsenceController {
    // ==================== AUSENCIAS ====================

    /**
     * Obtener todas las ausencias de una empresa
     */
    async getAbsences(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const filters = req.query;

            const result = await absenceService.getAbsences(companyId, filters);

            res.json({
                success: true,
                data: result,
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al obtener ausencias:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener ausencias',
            } as ApiResponse);
        }
    }

    /**
     * Obtener una ausencia por ID
     */
    async getAbsenceById(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { id } = req.params;

            const absence = await absenceService.getAbsenceById(companyId, id);

            if (!absence) {
                res.status(404).json({
                    success: false,
                    error: 'Ausencia no encontrada',
                } as ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: absence,
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al obtener ausencia:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener ausencia',
            } as ApiResponse);
        }
    }

    /**
     * Crear una nueva ausencia
     */
    async createAbsence(req: Request, res: Response): Promise<void> {
        try {
            const { companyId, id: userId } = req.user!;
            const data = req.body;

            const absence = await absenceService.createAbsence(companyId, data, userId);

            res.status(201).json({
                success: true,
                data: absence,
                message: 'Ausencia creada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al crear ausencia:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al crear ausencia',
            } as ApiResponse);
        }
    }

    /**
     * Actualizar una ausencia
     */
    async updateAbsence(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { id } = req.params;
            const data = req.body;

            const absence = await absenceService.updateAbsence(companyId, id, data);

            res.json({
                success: true,
                data: absence,
                message: 'Ausencia actualizada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al actualizar ausencia:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al actualizar ausencia',
            } as ApiResponse);
        }
    }

    /**
     * Eliminar una ausencia
     */
    async deleteAbsence(req: Request, res: Response): Promise<void> {
        try {
            const { companyId, id: userId } = req.user!;
            const { id } = req.params;

            const result = await absenceService.deleteAbsence(companyId, id, userId);

            res.json({
                success: true,
                data: result,
                message: 'Ausencia eliminada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al eliminar ausencia:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al eliminar ausencia',
            } as ApiResponse);
        }
    }

    /**
     * Aprobar una ausencia
     */
    async approveAbsence(req: Request, res: Response): Promise<void> {
        try {
            const { companyId, id: userId } = req.user!;
            const { id } = req.params;
            const { reason } = req.body;

            const absence = await absenceService.approveAbsence(companyId, id, userId, reason);

            res.json({
                success: true,
                data: absence,
                message: 'Ausencia aprobada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al aprobar ausencia:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al aprobar ausencia',
            } as ApiResponse);
        }
    }

    /**
     * Rechazar una ausencia
     */
    async rejectAbsence(req: Request, res: Response): Promise<void> {
        try {
            const { companyId, id: userId } = req.user!;
            const { id } = req.params;
            const { rejectionReason } = req.body;

            const absence = await absenceService.rejectAbsence(companyId, id, userId, rejectionReason);

            res.json({
                success: true,
                data: absence,
                message: 'Ausencia rechazada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al rechazar ausencia:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al rechazar ausencia',
            } as ApiResponse);
        }
    }

    // ==================== SOLICITUDES DE AUSENCIA ====================

    /**
     * Obtener solicitudes de ausencia
     */
    async getAbsenceRequests(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const filters = req.query;

            const result = await absenceService.getAbsenceRequests(companyId, filters);

            res.json({
                success: true,
                data: result,
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al obtener solicitudes de ausencia:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener solicitudes de ausencia',
            } as ApiResponse);
        }
    }

    /**
     * Crear una solicitud de ausencia
     */
    async createAbsenceRequest(req: Request, res: Response): Promise<void> {
        try {
            const { companyId, id: userId } = req.user!;
            const data = req.body;

            const request = await absenceService.createAbsenceRequest(companyId, data, userId);

            res.status(201).json({
                success: true,
                data: request,
                message: 'Solicitud de ausencia creada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al crear solicitud de ausencia:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al crear solicitud de ausencia',
            } as ApiResponse);
        }
    }

    /**
     * Actualizar una solicitud de ausencia
     */
    async updateAbsenceRequest(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { id } = req.params;
            const data = req.body;

            const request = await absenceService.updateAbsenceRequest(companyId, id, data);

            res.json({
                success: true,
                data: request,
                message: 'Solicitud de ausencia actualizada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al actualizar solicitud de ausencia:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al actualizar solicitud de ausencia',
            } as ApiResponse);
        }
    }

    /**
     * Aprobar una solicitud de ausencia
     */
    async approveAbsenceRequest(req: Request, res: Response): Promise<void> {
        try {
            const { companyId, id: userId } = req.user!;
            const { id } = req.params;
            const { reason } = req.body;

            const request = await absenceService.approveAbsenceRequest(companyId, id, userId, reason);

            res.json({
                success: true,
                data: request,
                message: 'Solicitud de ausencia aprobada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al aprobar solicitud de ausencia:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al aprobar solicitud de ausencia',
            } as ApiResponse);
        }
    }

    /**
     * Rechazar una solicitud de ausencia
     */
    async rejectAbsenceRequest(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { id } = req.params;
            const { rejectionReason } = req.body;

            const request = await absenceService.rejectAbsenceRequest(companyId, id, rejectionReason);

            res.json({
                success: true,
                data: request,
                message: 'Solicitud de ausencia rechazada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al rechazar solicitud de ausencia:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al rechazar solicitud de ausencia',
            } as ApiResponse);
        }
    }

    // ==================== POLÍTICAS DE VACACIONES ====================

    /**
     * Obtener políticas de vacaciones
     */
    async getVacationPolicies(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;

            const policies = await absenceService.getVacationPolicies(companyId);

            res.json({
                success: true,
                data: policies,
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al obtener políticas de vacaciones:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener políticas de vacaciones',
            } as ApiResponse);
        }
    }

    /**
     * Crear una política de vacaciones
     */
    async createVacationPolicy(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const data = req.body;

            const policy = await absenceService.createVacationPolicy(companyId, data);

            res.status(201).json({
                success: true,
                data: policy,
                message: 'Política de vacaciones creada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al crear política de vacaciones:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al crear política de vacaciones',
            } as ApiResponse);
        }
    }

    /**
     * Actualizar una política de vacaciones
     */
    async updateVacationPolicy(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { id } = req.params;
            const data = req.body;

            const policy = await absenceService.updateVacationPolicy(companyId, id, data);

            res.json({
                success: true,
                data: policy,
                message: 'Política de vacaciones actualizada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al actualizar política de vacaciones:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al actualizar política de vacaciones',
            } as ApiResponse);
        }
    }

    /**
     * Eliminar una política de vacaciones
     */
    async deleteVacationPolicy(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { id } = req.params;

            const result = await absenceService.deleteVacationPolicy(companyId, id);

            res.json({
                success: true,
                data: result,
                message: 'Política de vacaciones eliminada correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al eliminar política de vacaciones:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al eliminar política de vacaciones',
            } as ApiResponse);
        }
    }

    // ==================== BALANCE DE VACACIONES ====================

    /**
     * Obtener balance de vacaciones de un empleado
     */
    async getVacationBalance(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { employeeId } = req.params;
            const { year } = req.query;

            const balance = await absenceService.getVacationBalance(companyId, employeeId, year ? parseInt(year as string) : undefined);

            res.json({
                success: true,
                data: balance,
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al obtener balance de vacaciones:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener balance de vacaciones',
            } as ApiResponse);
        }
    }

    /**
     * Inicializar balance de vacaciones para un empleado
     */
    async initializeVacationBalance(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { employeeId, policyId, year } = req.body;

            const balance = await absenceService.initializeVacationBalance(companyId, employeeId, policyId, year);

            res.status(201).json({
                success: true,
                data: balance,
                message: 'Balance de vacaciones inicializado correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al inicializar balance de vacaciones:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al inicializar balance de vacaciones',
            } as ApiResponse);
        }
    }

    /**
     * Actualizar balance de vacaciones
     */
    async updateVacationBalance(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { employeeId } = req.params;
            const { days, type } = req.body;

            const balance = await absenceService.updateVacationBalance(companyId, employeeId, days, type);

            res.json({
                success: true,
                data: balance,
                message: 'Balance de vacaciones actualizado correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al actualizar balance de vacaciones:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al actualizar balance de vacaciones',
            } as ApiResponse);
        }
    }

    // ==================== FESTIVOS DE LA EMPRESA ====================

    /**
     * Obtener festivos de la empresa
     */
    async getCompanyHolidays(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const filters = req.query as any;

            const holidays = await absenceService.getCompanyHolidays(companyId, filters);

            res.json({
                success: true,
                data: holidays
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al obtener festivos:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error interno del servidor'
            } as ApiResponse);
        }
    }

    /**
     * Crear un festivo de la empresa
     */
    async createCompanyHoliday(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const holidayData = req.body;

            const holiday = await absenceService.createCompanyHoliday(companyId, holidayData);

            res.status(201).json({
                success: true,
                data: holiday
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al crear festivo:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error interno del servidor'
            } as ApiResponse);
        }
    }

    /**
     * Actualizar un festivo de la empresa
     */
    async updateCompanyHoliday(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { id } = req.params;
            const holidayData = req.body;

            const holiday = await absenceService.updateCompanyHoliday(companyId, id, holidayData);

            res.json({
                success: true,
                data: holiday
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al actualizar festivo:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error interno del servidor'
            } as ApiResponse);
        }
    }

    /**
     * Eliminar un festivo de la empresa
     */
    async deleteCompanyHoliday(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { id } = req.params;

            await absenceService.deleteCompanyHoliday(companyId, id);

            res.json({
                success: true,
                message: 'Festivo eliminado correctamente'
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al eliminar festivo:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error interno del servidor'
            } as ApiResponse);
        }
    }

    // ==================== COMENTARIOS DE AUSENCIA ====================

    /**
     * Agregar un comentario a una ausencia
     */
    async addAbsenceComment(req: Request, res: Response): Promise<void> {
        try {
            const { companyId, id: userId } = req.user!;
            const { absenceId } = req.params;
            const { comment, isInternal } = req.body;

            const authorType = 'manager'; // Por defecto, los usuarios del backoffice son managers

            const absenceComment = await absenceService.addAbsenceComment(
                companyId,
                absenceId,
                userId,
                authorType,
                comment,
                isInternal
            );

            res.status(201).json({
                success: true,
                data: absenceComment,
                message: 'Comentario agregado correctamente',
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al agregar comentario:', error);
            res.status(400).json({
                success: false,
                error: error.message || 'Error al agregar comentario',
            } as ApiResponse);
        }
    }

    /**
     * Obtener comentarios de una ausencia
     */
    async getAbsenceComments(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const { absenceId } = req.params;

            const comments = await absenceService.getAbsenceComments(companyId, absenceId);

            res.json({
                success: true,
                data: comments,
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al obtener comentarios:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener comentarios',
            } as ApiResponse);
        }
    }

    // ==================== ESTADÍSTICAS ====================

    /**
     * Obtener estadísticas de ausencias
     */
    async getAbsenceStats(req: Request, res: Response): Promise<void> {
        try {
            const { companyId } = req.user!;
            const filters = req.query;

            const stats = await absenceService.getAbsenceStats(companyId, filters);

            res.json({
                success: true,
                data: stats,
            } as ApiResponse);
        } catch (error: any) {
            console.error('Error al obtener estadísticas de ausencias:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener estadísticas de ausencias',
            } as ApiResponse);
        }
    }
}