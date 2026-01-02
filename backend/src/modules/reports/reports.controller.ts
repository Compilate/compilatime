import { Request, Response } from 'express';
import { reportsService } from './reports.service';
import { ReportFilters, ExportOptions } from '../types/reports.types';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

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
  private async exportToCSV(data: any, reportType: string): Promise<{ success: boolean; data: string; message: string }> {
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
        case 'break-types':
          csv = this.breakTypeReportToCSV(data);
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
   * Exporta a formato PDF
   */
  private async exportToPDF(data: any, _options: ExportOptions, reportType: string): Promise<{ success: boolean; data?: any; message: string; error?: string }> {
    try {
      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            success: true,
            data: buffer,
            message: 'PDF generado exitosamente'
          });
        });
        doc.on('error', (error) => {
          reject(error);
        });

        // Título del reporte
        doc.fontSize(20).font('Helvetica-Bold').text(`Reporte: ${this.getReportTypeName(reportType)}`, { align: 'center' });
        doc.moveDown();

        // Período
        if (data.summary?.period) {
          doc.fontSize(12).font('Helvetica').text(`Período: ${data.summary.period.start} - ${data.summary.period.end}`, { align: 'center' });
        } else if (data.periodInfo) {
          doc.fontSize(12).font('Helvetica').text(`Período: ${data.periodInfo.startDate} - ${data.periodInfo.endDate}`, { align: 'center' });
        }
        doc.moveDown();

        // Contenido según el tipo de reporte
        switch (reportType) {
          case 'time':
            this.addTimeReportToPDF(doc, data);
            break;
          case 'attendance':
            this.addAttendanceReportToPDF(doc, data);
            break;
          case 'employee-summary':
            this.addEmployeeSummaryReportToPDF(doc, data);
            break;
          case 'monthly':
            this.addMonthlyReportToPDF(doc, data);
            break;
          case 'delays':
            this.addDelayReportToPDF(doc, data);
            break;
          case 'break-types':
            this.addBreakTypeReportToPDF(doc, data);
            break;
          default:
            this.addGenericReportToPDF(doc, data);
        }

        doc.end();
      });
    } catch (error) {
      return {
        success: false,
        message: 'Error al generar PDF',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Exporta a formato Excel
   */
  private async exportToExcel(data: any, reportType: string): Promise<{ success: boolean; data?: any; message: string; error?: string }> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte');

      // Título del reporte
      worksheet.mergeCells('A1:E1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Reporte: ${this.getReportTypeName(reportType)}`;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center' };

      // Período
      if (data.summary?.period) {
        worksheet.mergeCells('A2:E2');
        const periodCell = worksheet.getCell('A2');
        periodCell.value = `Período: ${data.summary.period.start} - ${data.summary.period.end}`;
        periodCell.alignment = { horizontal: 'center' };
      } else if (data.periodInfo) {
        worksheet.mergeCells('A2:E2');
        const periodCell = worksheet.getCell('A2');
        periodCell.value = `Período: ${data.periodInfo.startDate} - ${data.periodInfo.endDate}`;
        periodCell.alignment = { horizontal: 'center' };
      }

      // Contenido según el tipo de reporte
      switch (reportType) {
        case 'time':
          this.addTimeReportToExcel(worksheet, data);
          break;
        case 'attendance':
          this.addAttendanceReportToExcel(worksheet, data);
          break;
        case 'employee-summary':
          this.addEmployeeSummaryReportToExcel(worksheet, data);
          break;
        case 'monthly':
          this.addMonthlyReportToExcel(worksheet, data);
          break;
        case 'delays':
          this.addDelayReportToExcel(worksheet, data);
          break;
        case 'break-types':
          this.addBreakTypeReportToExcel(worksheet, data);
          break;
        default:
          this.addGenericReportToExcel(worksheet, data);
      }

      // Generar buffer
      const buffer = await workbook.xlsx.writeBuffer() as unknown as Buffer;

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

  /**
   * Convierte reporte de tipos de pausa a CSV
   */
  private breakTypeReportToCSV(data: any): string {
    const headers = ['Tipo de Pausa', 'Descripción', 'Total Horas', 'Total Minutos', 'Cantidad', 'Empleados'];
    const rows = [headers.join(',')];

    data.details?.forEach((detail: any) => {
      const row = [
        detail.breakType?.name || '',
        detail.breakType?.description || '',
        detail.totalHours ? Number(detail.totalHours).toFixed(2) : '0.00',
        detail.totalMinutes || 0,
        detail.entryCount || 0,
        detail.employeeCount || 0
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Obtiene el nombre del tipo de reporte
   */
  private getReportTypeName(reportType: string): string {
    const names: { [key: string]: string } = {
      'time': 'Reporte de Horas',
      'attendance': 'Reporte de Asistencia',
      'employee-summary': 'Reporte Resumido por Empleado',
      'monthly': 'Reporte Mensual Consolidado',
      'delays': 'Reporte de Retrasos',
      'break-types': 'Reporte de Tipos de Pausa'
    };
    return names[reportType] || 'Reporte';
  }

  /**
   * Agrega reporte de tiempo a PDF
   */
  private addTimeReportToPDF(doc: PDFKit.PDFDocument, data: any): void {
    // Resumen
    doc.fontSize(14).font('Helvetica-Bold').text('Resumen');
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Total Horas: ${data.summary?.totalHours?.toFixed(2) || '0.00'}h`);
    doc.text(`Total Fichajes: ${data.summary?.totalEntries || 0}`);
    doc.text(`Total Empleados: ${data.summary?.totalEmployees || 0}`);
    doc.moveDown();

    // Detalles
    doc.fontSize(14).font('Helvetica-Bold').text('Detalles por Día');
    doc.moveDown();

    // Tabla
    const tableTop = doc.y;
    const headers = ['Fecha', 'Horas', 'Fichajes', 'Empleados'];
    const colWidths = [150, 80, 80, 80];
    const rowHeight = 25;

    // Encabezados
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, { width: colWidths[i] });
    });

    // Filas
    doc.fontSize(10).font('Helvetica');
    data.details?.forEach((detail: any, index: number) => {
      const y = tableTop + rowHeight + (index * rowHeight);
      doc.text(new Date(detail.date).toLocaleDateString('es-ES'), 50, y, { width: colWidths[0] });
      doc.text(`${detail.totalHours?.toFixed(2) || '0.00'}h`, 50 + colWidths[0], y, { width: colWidths[1] });
      doc.text(detail.entries?.length || 0, 50 + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
      doc.text(detail.employeeCount || 0, 50 + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
    });
  }

  /**
   * Agrega reporte de asistencia a PDF
   */
  private addAttendanceReportToPDF(doc: PDFKit.PDFDocument, data: any): void {
    // Resumen
    doc.fontSize(14).font('Helvetica-Bold').text('Resumen');
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Total Empleados: ${data.summary?.totalEmployees || 0}`);
    doc.text(`Tasa de Asistencia: ${data.summary?.overallAttendanceRate?.toFixed(1) || '0.0'}%`);
    doc.text(`Total Ausencias: ${data.summary?.totalAbsences || 0}`);
    doc.text(`Días Trabajados: ${data.summary?.totalWorkedDays || 0}`);
    doc.moveDown();

    // Detalles
    doc.fontSize(14).font('Helvetica-Bold').text('Detalles por Empleado');
    doc.moveDown();

    // Tabla
    const tableTop = doc.y;
    const headers = ['Empleado', 'DNI', 'Trabajados', 'Ausencias', 'Asistencia', 'Tardanzas', 'Horas'];
    const colWidths = [120, 80, 60, 60, 60, 60, 60];
    const rowHeight = 25;

    // Encabezados
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, { width: colWidths[i] });
    });

    // Filas
    doc.fontSize(10).font('Helvetica');
    data.details?.forEach((detail: any, index: number) => {
      const y = tableTop + rowHeight + (index * rowHeight);
      doc.text(detail.employee?.name || '', 50, y, { width: colWidths[0] });
      doc.text(detail.employee?.dni || '', 50 + colWidths[0], y, { width: colWidths[1] });
      doc.text(detail.statistics?.workedDays || 0, 50 + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
      doc.text(detail.statistics?.absences || 0, 50 + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
      doc.text(`${detail.statistics?.attendanceRate?.toFixed(1) || '0.0'}%`, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4] });
      doc.text(detail.statistics?.lateEntries || 0, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y, { width: colWidths[5] });
      doc.text(`${detail.statistics?.totalHours?.toFixed(2) || '0.00'}h`, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5], y, { width: colWidths[6] });
    });
  }

  /**
   * Agrega reporte resumido por empleado a PDF
   */
  private addEmployeeSummaryReportToPDF(doc: PDFKit.PDFDocument, data: any): void {
    // Resumen
    doc.fontSize(14).font('Helvetica-Bold').text('Resumen');
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Total Empleados: ${data.summary?.totalEmployees || 0}`);
    doc.text(`Total Horas: ${data.summary?.totalHours?.toFixed(2) || '0.00'}h`);
    doc.text(`Asistencia Promedio: ${data.summary?.averageAttendanceRate?.toFixed(1) || '0.0'}%`);
    doc.moveDown();

    // Detalles
    doc.fontSize(14).font('Helvetica-Bold').text('Detalles de Empleados');
    doc.moveDown();

    // Tabla
    const tableTop = doc.y;
    const headers = ['Empleado', 'DNI', 'Horas', 'Trabajados', 'Asistencia', 'Promedio', 'Tardanzas'];
    const colWidths = [120, 80, 60, 60, 60, 60, 60];
    const rowHeight = 25;

    // Encabezados
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, { width: colWidths[i] });
    });

    // Filas
    doc.fontSize(10).font('Helvetica');
    data.details?.forEach((detail: any, index: number) => {
      const y = tableTop + rowHeight + (index * rowHeight);
      doc.text(detail.employee?.name || '', 50, y, { width: colWidths[0] });
      doc.text(detail.employee?.dni || '', 50 + colWidths[0], y, { width: colWidths[1] });
      doc.text(`${detail.summary?.totalHours?.toFixed(2) || '0.00'}h`, 50 + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
      doc.text(detail.summary?.workedDays || 0, 50 + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
      doc.text(`${detail.summary?.attendanceRate?.toFixed(1) || '0.0'}%`, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4] });
      doc.text(`${detail.summary?.averageHoursPerDay?.toFixed(2) || '0.00'}h`, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y, { width: colWidths[5] });
      doc.text(detail.summary?.lateEntries || 0, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5], y, { width: colWidths[6] });
    });
  }

  /**
   * Agrega reporte mensual a PDF
   */
  private addMonthlyReportToPDF(doc: PDFKit.PDFDocument, data: any): void {
    // Información del período
    doc.fontSize(14).font('Helvetica-Bold').text('Información del Período');
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Días Totales: ${data.periodInfo?.daysInPeriod || 0}`);
    doc.text(`Días Laborables: ${data.periodInfo?.workDays || 0}`);
    doc.text(`Total Horas: ${data.timeSummary?.totalHours?.toFixed(2) || '0.00'}h`);
    doc.text(`Tasa de Asistencia: ${data.attendanceSummary?.overallAttendanceRate?.toFixed(1) || '0.0'}%`);
    doc.moveDown();

    // Distribución por día de semana
    doc.fontSize(14).font('Helvetica-Bold').text('Distribución por Día de Semana');
    doc.moveDown();
    data.analytics?.dayOfWeekDistribution?.forEach((day: any) => {
      doc.fontSize(10).font('Helvetica').text(`${day.day}: ${day.hours?.toFixed(1) || '0.0'}h (${day.entries || 0} fichajes)`);
    });
    doc.moveDown();

    // Tendencias
    doc.fontSize(14).font('Helvetica-Bold').text('Tendencias');
    doc.moveDown();
    const trend = data.analytics?.trends?.trend || 'stable';
    const trendText = trend === 'increasing' ? 'Alza' : trend === 'decreasing' ? 'Baja' : 'Estable';
    doc.fontSize(10).font('Helvetica').text(`Tendencia: ${trendText}`);
    doc.text(`Cambio: ${data.analytics?.trends?.change?.toFixed(1) || '0.0'}%`);
  }

  /**
   * Agrega reporte de retrasos a PDF
   */
  private addDelayReportToPDF(doc: PDFKit.PDFDocument, data: any): void {
    // Resumen
    doc.fontSize(14).font('Helvetica-Bold').text('Resumen');
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Total Retrasos: ${data.summary?.totalDelays || 0}`);
    doc.text(`Total Horas Retraso: ${data.summary?.totalDelayHours?.toFixed(2) || '0.00'}h`);
    doc.text(`Promedio Retraso: ${data.summary?.averageDelayMinutes?.toFixed(0) || '0'}min`);
    doc.moveDown();

    // Detalles
    doc.fontSize(14).font('Helvetica-Bold').text('Detalles por Empleado');
    doc.moveDown();

    // Tabla
    const tableTop = doc.y;
    const headers = ['Empleado', 'DNI', 'Retrasos', 'Minutos', 'Horas', 'Promedio'];
    const colWidths = [120, 80, 60, 60, 60, 60];
    const rowHeight = 25;

    // Encabezados
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, { width: colWidths[i] });
    });

    // Filas
    doc.fontSize(10).font('Helvetica');
    data.details?.forEach((detail: any, index: number) => {
      const y = tableTop + rowHeight + (index * rowHeight);
      doc.text(detail.employee?.name || '', 50, y, { width: colWidths[0] });
      doc.text(detail.employee?.dni || '', 50 + colWidths[0], y, { width: colWidths[1] });
      doc.text(detail.summary?.totalDelays || 0, 50 + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
      doc.text(detail.summary?.totalDelayMinutes || 0, 50 + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
      doc.text(`${detail.summary?.totalDelayHours?.toFixed(2) || '0.00'}h`, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4] });
      doc.text(`${detail.summary?.averageDelayMinutes?.toFixed(0) || '0'}min`, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y, { width: colWidths[5] });
    });
  }

  /**
   * Agrega reporte de tipos de pausa a PDF
   */
  private addBreakTypeReportToPDF(doc: PDFKit.PDFDocument, data: any): void {
    // Resumen
    doc.fontSize(14).font('Helvetica-Bold').text('Resumen');
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Total Horas Pausa: ${data.summary?.totalBreakHours?.toFixed(2) || '0.00'}h`);
    doc.text(`Total Pausas: ${data.summary?.totalBreakEntries || 0}`);
    doc.text(`Promedio Duración: ${Math.floor(data.summary?.averageBreakDuration / 60) || 0}h ${data.summary?.averageBreakDuration % 60 || 0}min`);
    doc.moveDown();

    // Detalles
    doc.fontSize(14).font('Helvetica-Bold').text('Detalles por Tipo de Pausa');
    doc.moveDown();

    // Tabla
    const tableTop = doc.y;
    const headers = ['Tipo de Pausa', 'Descripción', 'Horas', 'Minutos', 'Cantidad', 'Empleados'];
    const colWidths = [120, 120, 60, 60, 60, 60];
    const rowHeight = 25;

    // Encabezados
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, { width: colWidths[i] });
    });

    // Filas
    doc.fontSize(10).font('Helvetica');
    data.details?.forEach((detail: any, index: number) => {
      const y = tableTop + rowHeight + (index * rowHeight);
      doc.text(detail.breakType?.name || '', 50, y, { width: colWidths[0] });
      doc.text(detail.breakType?.description || '', 50 + colWidths[0], y, { width: colWidths[1] });
      doc.text(`${detail.totalHours?.toFixed(2) || '0.00'}h`, 50 + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
      doc.text(detail.totalMinutes || 0, 50 + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
      doc.text(detail.entryCount || 0, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4] });
      doc.text(detail.employeeCount || 0, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y, { width: colWidths[5] });
    });
  }

  /**
   * Agrega reporte genérico a PDF
   */
  private addGenericReportToPDF(doc: PDFKit.PDFDocument, data: any): void {
    doc.fontSize(10).font('Helvetica').text(JSON.stringify(data, null, 2));
  }

  /**
   * Agrega reporte de tiempo a Excel
   */
  private addTimeReportToExcel(worksheet: ExcelJS.Worksheet, data: any): void {
    let row = 4;

    // Resumen
    worksheet.getCell(`A${row}`).value = 'Resumen';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Horas';
    worksheet.getCell(`B${row}`).value = data.summary?.totalHours?.toFixed(2) || '0.00';
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Fichajes';
    worksheet.getCell(`B${row}`).value = data.summary?.totalEntries || 0;
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Empleados';
    worksheet.getCell(`B${row}`).value = data.summary?.totalEmployees || 0;
    row += 2;

    // Detalles
    worksheet.getCell(`A${row}`).value = 'Detalles por Día';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    // Encabezados
    const headers = ['Fecha', 'Horas', 'Fichajes', 'Empleados'];
    headers.forEach((header, i) => {
      const cell = worksheet.getCell(row, i + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    row++;

    // Filas
    data.details?.forEach((detail: any) => {
      worksheet.getCell(row, 1).value = new Date(detail.date).toLocaleDateString('es-ES');
      worksheet.getCell(row, 2).value = detail.totalHours?.toFixed(2) || '0.00';
      worksheet.getCell(row, 3).value = detail.entries?.length || 0;
      worksheet.getCell(row, 4).value = detail.employeeCount || 0;
      row++;
    });

    // Ajustar columnas
    worksheet.columns.forEach((column) => {
      column.width = 20;
    });
  }

  /**
   * Agrega reporte de asistencia a Excel
   */
  private addAttendanceReportToExcel(worksheet: ExcelJS.Worksheet, data: any): void {
    let row = 4;

    // Resumen
    worksheet.getCell(`A${row}`).value = 'Resumen';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Empleados';
    worksheet.getCell(`B${row}`).value = data.summary?.totalEmployees || 0;
    row++;
    worksheet.getCell(`A${row}`).value = 'Tasa de Asistencia';
    worksheet.getCell(`B${row}`).value = `${data.summary?.overallAttendanceRate?.toFixed(1) || '0.0'}%`;
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Ausencias';
    worksheet.getCell(`B${row}`).value = data.summary?.totalAbsences || 0;
    row++;
    worksheet.getCell(`A${row}`).value = 'Días Trabajados';
    worksheet.getCell(`B${row}`).value = data.summary?.totalWorkedDays || 0;
    row += 2;

    // Detalles
    worksheet.getCell(`A${row}`).value = 'Detalles por Empleado';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    // Encabezados
    const headers = ['Empleado', 'DNI', 'Trabajados', 'Ausencias', 'Asistencia', 'Tardanzas', 'Horas'];
    headers.forEach((header, i) => {
      const cell = worksheet.getCell(row, i + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    row++;

    // Filas
    data.details?.forEach((detail: any) => {
      worksheet.getCell(row, 1).value = detail.employee?.name || '';
      worksheet.getCell(row, 2).value = detail.employee?.dni || '';
      worksheet.getCell(row, 3).value = detail.statistics?.workedDays || 0;
      worksheet.getCell(row, 4).value = detail.statistics?.absences || 0;
      worksheet.getCell(row, 5).value = `${detail.statistics?.attendanceRate?.toFixed(1) || '0.0'}%`;
      worksheet.getCell(row, 6).value = detail.statistics?.lateEntries || 0;
      worksheet.getCell(row, 7).value = detail.statistics?.totalHours?.toFixed(2) || '0.00';
      row++;
    });

    // Ajustar columnas
    worksheet.columns.forEach((column) => {
      column.width = 18;
    });
  }

  /**
   * Agrega reporte resumido por empleado a Excel
   */
  private addEmployeeSummaryReportToExcel(worksheet: ExcelJS.Worksheet, data: any): void {
    let row = 4;

    // Resumen
    worksheet.getCell(`A${row}`).value = 'Resumen';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Empleados';
    worksheet.getCell(`B${row}`).value = data.summary?.totalEmployees || 0;
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Horas';
    worksheet.getCell(`B${row}`).value = data.summary?.totalHours?.toFixed(2) || '0.00';
    row++;
    worksheet.getCell(`A${row}`).value = 'Asistencia Promedio';
    worksheet.getCell(`B${row}`).value = `${data.summary?.averageAttendanceRate?.toFixed(1) || '0.0'}%`;
    row += 2;

    // Detalles
    worksheet.getCell(`A${row}`).value = 'Detalles de Empleados';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    // Encabezados
    const headers = ['Empleado', 'DNI', 'Horas', 'Trabajados', 'Asistencia', 'Promedio', 'Tardanzas'];
    headers.forEach((header, i) => {
      const cell = worksheet.getCell(row, i + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    row++;

    // Filas
    data.details?.forEach((detail: any) => {
      worksheet.getCell(row, 1).value = detail.employee?.name || '';
      worksheet.getCell(row, 2).value = detail.employee?.dni || '';
      worksheet.getCell(row, 3).value = detail.summary?.totalHours?.toFixed(2) || '0.00';
      worksheet.getCell(row, 4).value = detail.summary?.workedDays || 0;
      worksheet.getCell(row, 5).value = `${detail.summary?.attendanceRate?.toFixed(1) || '0.0'}%`;
      worksheet.getCell(row, 6).value = detail.summary?.averageHoursPerDay?.toFixed(2) || '0.00';
      worksheet.getCell(row, 7).value = detail.summary?.lateEntries || 0;
      row++;
    });

    // Ajustar columnas
    worksheet.columns.forEach((column) => {
      column.width = 18;
    });
  }

  /**
   * Agrega reporte mensual a Excel
   */
  private addMonthlyReportToExcel(worksheet: ExcelJS.Worksheet, data: any): void {
    let row = 4;

    // Información del período
    worksheet.getCell(`A${row}`).value = 'Información del Período';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;
    worksheet.getCell(`A${row}`).value = 'Días Totales';
    worksheet.getCell(`B${row}`).value = data.periodInfo?.daysInPeriod || 0;
    row++;
    worksheet.getCell(`A${row}`).value = 'Días Laborables';
    worksheet.getCell(`B${row}`).value = data.periodInfo?.workDays || 0;
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Horas';
    worksheet.getCell(`B${row}`).value = data.timeSummary?.totalHours?.toFixed(2) || '0.00';
    row++;
    worksheet.getCell(`A${row}`).value = 'Tasa de Asistencia';
    worksheet.getCell(`B${row}`).value = `${data.attendanceSummary?.overallAttendanceRate?.toFixed(1) || '0.0'}%`;
    row += 2;

    // Distribución por día de semana
    worksheet.getCell(`A${row}`).value = 'Distribución por Día de Semana';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    // Encabezados
    const headers = ['Día', 'Horas', 'Fichajes'];
    headers.forEach((header, i) => {
      const cell = worksheet.getCell(row, i + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    row++;

    // Filas
    data.analytics?.dayOfWeekDistribution?.forEach((day: any) => {
      worksheet.getCell(row, 1).value = day.day || '';
      worksheet.getCell(row, 2).value = day.hours?.toFixed(1) || '0.0';
      worksheet.getCell(row, 3).value = day.entries || 0;
      row++;
    });

    // Tendencias
    row += 2;
    worksheet.getCell(`A${row}`).value = 'Tendencias';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;
    const trend = data.analytics?.trends?.trend || 'stable';
    const trendText = trend === 'increasing' ? 'Alza' : trend === 'decreasing' ? 'Baja' : 'Estable';
    worksheet.getCell(`A${row}`).value = 'Tendencia';
    worksheet.getCell(`B${row}`).value = trendText;
    row++;
    worksheet.getCell(`A${row}`).value = 'Cambio';
    worksheet.getCell(`B${row}`).value = `${data.analytics?.trends?.change?.toFixed(1) || '0.0'}%`;

    // Ajustar columnas
    worksheet.columns.forEach((column) => {
      column.width = 20;
    });
  }

  /**
   * Agrega reporte de retrasos a Excel
   */
  private addDelayReportToExcel(worksheet: ExcelJS.Worksheet, data: any): void {
    let row = 4;

    // Resumen
    worksheet.getCell(`A${row}`).value = 'Resumen';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Retrasos';
    worksheet.getCell(`B${row}`).value = data.summary?.totalDelays || 0;
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Horas Retraso';
    worksheet.getCell(`B${row}`).value = data.summary?.totalDelayHours?.toFixed(2) || '0.00';
    row++;
    worksheet.getCell(`A${row}`).value = 'Promedio Retraso';
    worksheet.getCell(`B${row}`).value = `${data.summary?.averageDelayMinutes?.toFixed(0) || '0'}min`;
    row += 2;

    // Detalles
    worksheet.getCell(`A${row}`).value = 'Detalles por Empleado';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    // Encabezados
    const headers = ['Empleado', 'DNI', 'Retrasos', 'Minutos', 'Horas', 'Promedio'];
    headers.forEach((header, i) => {
      const cell = worksheet.getCell(row, i + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    row++;

    // Filas
    data.details?.forEach((detail: any) => {
      worksheet.getCell(row, 1).value = detail.employee?.name || '';
      worksheet.getCell(row, 2).value = detail.employee?.dni || '';
      worksheet.getCell(row, 3).value = detail.summary?.totalDelays || 0;
      worksheet.getCell(row, 4).value = detail.summary?.totalDelayMinutes || 0;
      worksheet.getCell(row, 5).value = detail.summary?.totalDelayHours?.toFixed(2) || '0.00';
      worksheet.getCell(row, 6).value = `${detail.summary?.averageDelayMinutes?.toFixed(0) || '0'}min`;
      row++;
    });

    // Ajustar columnas
    worksheet.columns.forEach((column) => {
      column.width = 18;
    });
  }

  /**
   * Agrega reporte de tipos de pausa a Excel
   */
  private addBreakTypeReportToExcel(worksheet: ExcelJS.Worksheet, data: any): void {
    let row = 4;

    // Resumen
    worksheet.getCell(`A${row}`).value = 'Resumen';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Horas Pausa';
    worksheet.getCell(`B${row}`).value = data.summary?.totalBreakHours?.toFixed(2) || '0.00';
    row++;
    worksheet.getCell(`A${row}`).value = 'Total Pausas';
    worksheet.getCell(`B${row}`).value = data.summary?.totalBreakEntries || 0;
    row++;
    worksheet.getCell(`A${row}`).value = 'Promedio Duración';
    worksheet.getCell(`B${row}`).value = `${Math.floor(data.summary?.averageBreakDuration / 60) || 0}h ${data.summary?.averageBreakDuration % 60 || 0}min`;
    row += 2;

    // Detalles
    worksheet.getCell(`A${row}`).value = 'Detalles por Tipo de Pausa';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    // Encabezados
    const headers = ['Tipo de Pausa', 'Descripción', 'Horas', 'Minutos', 'Cantidad', 'Empleados'];
    headers.forEach((header, i) => {
      const cell = worksheet.getCell(row, i + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    row++;

    // Filas
    data.details?.forEach((detail: any) => {
      worksheet.getCell(row, 1).value = detail.breakType?.name || '';
      worksheet.getCell(row, 2).value = detail.breakType?.description || '';
      worksheet.getCell(row, 3).value = detail.totalHours?.toFixed(2) || '0.00';
      worksheet.getCell(row, 4).value = detail.totalMinutes || 0;
      worksheet.getCell(row, 5).value = detail.entryCount || 0;
      worksheet.getCell(row, 6).value = detail.employeeCount || 0;
      row++;
    });

    // Ajustar columnas
    worksheet.columns.forEach((column) => {
      column.width = 20;
    });
  }

  /**
   * Agrega reporte genérico a Excel
   */
  private addGenericReportToExcel(worksheet: ExcelJS.Worksheet, data: any): void {
    let row = 4;
    worksheet.getCell(`A${row}`).value = 'Datos del Reporte';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;
    worksheet.getCell(`A${row}`).value = JSON.stringify(data, null, 2);
  }
}

export const reportsController = new ReportsController();