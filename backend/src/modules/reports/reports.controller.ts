import { Request, Response } from 'express';
import { reportsService } from './reports.service';
import { ReportFilters, ExportOptions } from '../types/reports.types';

class ReportsController {
  /**
   * Genera un reporte de horas trabajadas
   */
  async getTimeReport(req: Request, res: Response) {
    try {
      const { companyId } = req.user!;
      const filters: ReportFilters = {
        companyId,
        ...req.query,
        employeeIds: req.query.employeeIds ? (req.query.employeeIds as string).split(',') : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        groupBy: (req.query.groupBy as 'day' | 'week' | 'month') || 'day'
      };

      // Validar fechas
      if (!filters.startDate || !filters.endDate) {
        return res.status(400).json({
          success: false,
          message: 'Las fechas de inicio y fin son obligatorias'
        });
      }

      const result = await reportsService.getTimeReport(filters);

      console.log('Backend - Resultado de getTimeReport:', result);

      if (result.success) {
        console.log('Backend - Enviando respuesta exitosa:', result);
        res.json(result);
      } else {
        console.log('Backend - Enviando respuesta de error:', result);
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Error en getTimeReport controller:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Genera un reporte de asistencia
   */
  async getAttendanceReport(req: Request, res: Response) {
    try {
      const { companyId } = req.user!;
      const filters: ReportFilters = {
        companyId,
        ...req.query,
        employeeIds: req.query.employeeIds ? (req.query.employeeIds as string).split(',') : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      // Validar fechas
      if (!filters.startDate || !filters.endDate) {
        return res.status(400).json({
          success: false,
          message: 'Las fechas de inicio y fin son obligatorias'
        });
      }

      const result = await reportsService.getAttendanceReport(filters);

      console.log('Backend - Resultado de getAttendanceReport:', result);

      if (result.success) {
        console.log('Backend - Enviando respuesta exitosa:', result);
        res.json(result);
      } else {
        console.log('Backend - Enviando respuesta de error:', result);
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Error en getAttendanceReport controller:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Genera un reporte resumido por empleado
   */
  async getEmployeeSummaryReport(req: Request, res: Response) {
    try {
      const { companyId } = req.user!;
      const filters: ReportFilters = {
        companyId,
        ...req.query,
        employeeIds: req.query.employeeIds ? (req.query.employeeIds as string).split(',') : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      // Validar fechas
      if (!filters.startDate || !filters.endDate) {
        return res.status(400).json({
          success: false,
          message: 'Las fechas de inicio y fin son obligatorias'
        });
      }

      const result = await reportsService.getEmployeeSummaryReport(filters);

      console.log('Backend - Resultado de getEmployeeSummaryReport:', result);

      if (result.success) {
        console.log('Backend - Enviando respuesta exitosa:', result);
        res.json(result);
      } else {
        console.log('Backend - Enviando respuesta de error:', result);
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Error en getEmployeeSummaryReport controller:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Genera un reporte mensual consolidado
   */
  async getMonthlyReport(req: Request, res: Response) {
    try {
      const { companyId } = req.user!;
      const filters: ReportFilters = {
        companyId,
        ...req.query,
        employeeIds: req.query.employeeIds ? (req.query.employeeIds as string).split(',') : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      // Validar fechas
      if (!filters.startDate || !filters.endDate) {
        return res.status(400).json({
          success: false,
          message: 'Las fechas de inicio y fin son obligatorias'
        });
      }

      const result = await reportsService.getMonthlyReport(filters);

      console.log('Backend - Resultado de getMonthlyReport:', result);

      if (result.success) {
        console.log('Backend - Enviando respuesta exitosa:', result);
        res.json(result);
      } else {
        console.log('Backend - Enviando respuesta de error:', result);
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Error en getMonthlyReport controller:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Exporta un reporte en el formato especificado
   */
  async exportReport(req: Request, res: Response) {
    try {
      const { companyId } = req.user!;
      const { reportType, format } = req.params;
      const exportOptions: ExportOptions = {
        format: format as 'csv' | 'pdf' | 'excel',
        includeCharts: req.query.includeCharts === 'true',
        includeDetails: req.query.includeDetails !== 'false',
        email: req.query.email as string
      };

      const filters: ReportFilters = {
        companyId,
        ...req.query,
        employeeIds: req.query.employeeIds ? (req.query.employeeIds as string).split(',') : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      // Validar fechas
      if (!filters.startDate || !filters.endDate) {
        return res.status(400).json({
          success: false,
          message: 'Las fechas de inicio y fin son obligatorias'
        });
      }

      // Generar el reporte según el tipo
      let reportResult;
      switch (reportType) {
        case 'time':
          reportResult = await reportsService.getTimeReport(filters);
          break;
        case 'attendance':
          reportResult = await reportsService.getAttendanceReport(filters);
          break;
        case 'employee-summary':
          reportResult = await reportsService.getEmployeeSummaryReport(filters);
          break;
        case 'monthly':
          reportResult = await reportsService.getMonthlyReport(filters);
          break;
        case 'delays':
          reportResult = await reportsService.getDelayReport(filters);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Tipo de reporte no válido'
          });
      }

      if (!reportResult.success || !reportResult.data) {
        return res.status(500).json(reportResult);
      }

      // Exportar según el formato
      const exportResult = await this.exportData(reportResult.data, exportOptions, reportType);

      if (exportResult.success) {
        if (exportOptions.email) {
          // Enviar por email
          res.json({
            success: true,
            message: `Reporte enviado exitosamente a ${exportOptions.email}`
          });
        } else {
          // Descargar directamente
          const filename = `reporte-${reportType}-${new Date().toISOString().split('T')[0]}.${exportOptions.format}`;

          if (exportOptions.format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(exportResult.data);
          } else if (exportOptions.format === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(exportResult.data);
          } else if (exportOptions.format === 'excel') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(exportResult.data);
          }
        }
      } else {
        res.status(500).json(exportResult);
      }
    } catch (error) {
      console.error('Error en exportReport controller:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Obtiene los tipos de reportes disponibles
   */
  async getReportTypes(_req: Request, res: Response) {
    try {
      const reportTypes = [
        {
          id: 'time',
          name: 'Reporte de Horas',
          description: 'Detalle de horas trabajadas por empleado y período',
          filters: ['employeeIds', 'startDate', 'endDate', 'groupBy'],
          exportFormats: ['csv', 'pdf', 'excel']
        },
        {
          id: 'attendance',
          name: 'Reporte de Asistencia',
          description: 'Estadísticas de asistencia, ausencias y tardanzas',
          filters: ['employeeIds', 'startDate', 'endDate'],
          exportFormats: ['csv', 'pdf', 'excel']
        },
        {
          id: 'employee-summary',
          name: 'Reporte Resumido por Empleado',
          description: 'Resumen individual de cada empleado con horas y asistencia',
          filters: ['employeeIds', 'startDate', 'endDate'],
          exportFormats: ['csv', 'pdf', 'excel']
        },
        {
          id: 'monthly',
          name: 'Reporte Mensual Consolidado',
          description: 'Reporte completo con análisis y tendencias del período',
          filters: ['employeeIds', 'startDate', 'endDate'],
          exportFormats: ['csv', 'pdf', 'excel']
        },
        {
          id: 'break-types',
          name: 'Reporte de Tipos de Pausa',
          description: 'Estadísticas de tiempo por tipo de pausa',
          filters: ['employeeIds', 'startDate', 'endDate'],
          exportFormats: ['csv', 'pdf', 'excel']
        },
        {
          id: 'delays',
          name: 'Reporte de Retrasos',
          description: 'Detalle de retrasos por empleado y período',
          filters: ['employeeIds', 'startDate', 'endDate'],
          exportFormats: ['csv', 'pdf', 'excel']
        }
      ];

      res.json({
        success: true,
        data: reportTypes
      });
    } catch (error) {
      console.error('Error en getReportTypes controller:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Genera un reporte de tipos de pausa
   */
  async getBreakTypeReport(req: Request, res: Response) {
    try {
      const { companyId } = req.user!;
      const filters = {
        companyId,
        employeeIds: req.query.employeeIds ? (req.query.employeeIds as string).split(',') : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await reportsService.getBreakTypeReport(filters);

      console.log('Backend - Resultado de getBreakTypeReport:', result);

      if (result.success) {
        console.log('Backend - Enviando respuesta exitosa:', result);
        res.json(result);
      } else {
        console.log('Backend - Enviando respuesta de error:', result);
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Error en getBreakTypeReport controller:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Genera un reporte de retrasos
   */
  async getDelayReport(req: Request, res: Response) {
    try {
      const { companyId } = req.user!;
      const filters = {
        companyId,
        employeeIds: req.query.employeeIds ? (req.query.employeeIds as string).split(',') : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await reportsService.getDelayReport(filters);

      console.log('Backend - Resultado de getDelayReport:', result);

      if (result.success) {
        console.log('Backend - Enviando respuesta exitosa:', result);
        res.json(result);
      } else {
        console.log('Backend - Enviando respuesta de error:', result);
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Error en getDelayReport controller:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Exporta datos en diferentes formatos
   */
  private async exportData(data: any, options: ExportOptions, reportType: string): Promise<{ success: boolean; data?: any; message: string; error?: string }> {
    try {
      switch (options.format) {
        case 'csv':
          return this.exportToCSV(data, reportType);
        case 'pdf':
          return this.exportToPDF(data, options, reportType);
        case 'excel':
          return this.exportToExcel(data, reportType);
        default:
          return {
            success: false,
            message: 'Formato de exportación no válido'
          };
      }
    } catch (error) {
      console.error('Error en exportData:', error);
      return {
        success: false,
        message: 'Error al exportar datos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Exporta a formato CSV
   */
  private exportToCSV(data: any, reportType: string): { success: boolean; data: string; message: string } {
    try {
      let csv = '';

      switch (reportType) {
        case 'time':
          csv = this.timeReportToCSV(data);
          break;
        case 'attendance':
          csv = this.attendanceReportToCSV(data);
          break;
        case 'employee-summary':
          csv = this.employeeSummaryReportToCSV(data);
          break;
        case 'monthly':
          csv = this.monthlyReportToCSV(data);
          break;
        case 'delays':
          csv = this.delayReportToCSV(data);
          break;
        default:
          csv = this.genericToCSV(data);
      }

      return {
        success: true,
        data: csv,
        message: 'CSV generado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        data: '',
        message: 'Error al generar CSV'
      };
    }
  }

  /**
   * Exporta a formato PDF (implementación básica)
   */
  private async exportToPDF(data: any, _options: ExportOptions, reportType: string): Promise<{ success: boolean; data?: Buffer; message: string; error?: string }> {
    try {
      // Implementación básica - en un proyecto real se usaría una librería como puppeteer o jsPDF
      const pdfContent = `Reporte ${reportType}\n\n${JSON.stringify(data, null, 2)}`;
      const buffer = Buffer.from(pdfContent, 'utf-8');

      return {
        success: true,
        data: buffer,
        message: 'PDF generado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al generar PDF',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Exporta a formato Excel (implementación básica)
   */
  private async exportToExcel(data: any, reportType: string): Promise<{ success: boolean; data?: Buffer; message: string; error?: string }> {
    try {
      // Implementación básica - en un proyecto real se usaría una librería como exceljs
      const excelContent = `Reporte ${reportType}\n\n${JSON.stringify(data, null, 2)}`;
      const buffer = Buffer.from(excelContent, 'utf-8');

      return {
        success: true,
        data: buffer,
        message: 'Excel generado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al generar Excel',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Convierte reporte de tiempo a CSV
   */
  private timeReportToCSV(data: any): string {
    const headers = ['Fecha', 'Empleado', 'Tipo', 'Hora'];
    const rows = [headers.join(',')];

    data.details?.forEach((detail: any) => {
      detail.entries?.forEach((entry: any) => {
        const row = [
          detail.date,
          entry.employee?.name || '',
          entry.type,
          entry.timestamp
        ];
        rows.push(row.join(','));
      });
    });

    return rows.join('\n');
  }

  /**
   * Convierte reporte de asistencia a CSV
   */
  private attendanceReportToCSV(data: any): string {
    const headers = ['Empleado', 'DNI', 'Días Laborables', 'Días Trabajados', 'Ausencias', 'Tasa de Asistencia', 'Tardanzas', 'Horas Totales'];
    const rows = [headers.join(',')];

    data.details?.forEach((detail: any) => {
      const row = [
        detail.employee?.name || '',
        detail.employee?.dni || '',
        detail.statistics?.workDays || 0,
        detail.statistics?.workedDays || 0,
        detail.statistics?.absences || 0,
        `${detail.statistics?.attendanceRate || 0}%`,
        detail.statistics?.lateEntries || 0,
        detail.statistics?.totalHours || 0
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Convierte reporte resumido por empleado a CSV
   */
  private employeeSummaryReportToCSV(data: any): string {
    const headers = ['Empleado', 'DNI', 'Activo', 'Horas Totales', 'Días Laborables', 'Días Trabajados', 'Tasa de Asistencia', 'Tardanzas', 'Promedio Horas/Día'];
    const rows = [headers.join(',')];

    data.details?.forEach((detail: any) => {
      const row = [
        detail.employee?.name || '',
        detail.employee?.dni || '',
        detail.employee?.active ? 'Sí' : 'No',
        detail.summary?.totalHours || 0,
        detail.summary?.workDays || 0,
        detail.summary?.workedDays || 0,
        `${detail.summary?.attendanceRate || 0}%`,
        detail.summary?.lateEntries || 0,
        detail.summary?.averageHoursPerDay || 0
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Convierte reporte mensual a CSV
   */
  private monthlyReportToCSV(data: any): string {
    // Combinar información de diferentes secciones
    let csv = 'REPORTE MENSUAL CONSOLIDADO\n\n';

    csv += 'RESUMEN GENERAL\n';
    csv += `Período: ${data.periodInfo?.startDate} - ${data.periodInfo?.endDate}\n`;
    csv += `Días en el período: ${data.periodInfo?.daysInPeriod}\n`;
    csv += `Días laborables: ${data.periodInfo?.workDays}\n`;
    csv += `Total empleados: ${data.employeeSummaries?.totalEmployees}\n`;
    csv += `Total horas: ${data.timeSummary?.totalHours}\n`;
    csv += `Tasa de asistencia general: ${data.attendanceSummary?.overallAttendanceRate}%\n\n`;

    csv += 'DETALLE POR EMPLEADO\n';
    csv += 'Empleado,DNI,Horas Totales,Tasa de Asistencia,Tardanzas\n';

    data.details?.employeeDetails?.forEach((detail: any) => {
      csv += `${detail.employee?.name},${detail.employee?.dni},${detail.summary?.totalHours},${detail.summary?.attendanceRate}%,${detail.summary?.lateEntries}\n`;
    });

    return csv;
  }

  /**
   * Convierte reporte de retrasos a CSV
   */
  private delayReportToCSV(data: any): string {
    const headers = ['Empleado', 'DNI', 'Fecha', 'Hora Entrada', 'Hora Turno', 'Retraso (min)', 'Retraso (horas)'];
    const rows = [headers.join(',')];

    data.details?.forEach((detail: any) => {
      detail.delays?.forEach((delay: any) => {
        const row = [
          detail.employee?.name || '',
          detail.employee?.dni || '',
          new Date(delay.timestamp).toISOString().split('T')[0],
          new Date(delay.timestamp).toISOString().split('T')[1].split('.')[0],
          delay.scheduleStartTime,
          delay.delayMinutes.toString(),
          delay.delayHours.toFixed(2)
        ];
        rows.push(row.join(','));
      });
    });

    return rows.join('\n');
  }

  /**
   * Convierte datos genéricos a CSV
   */
  private genericToCSV(data: any): string {
    return JSON.stringify(data, null, 2);
  }
}

export const reportsController = new ReportsController();