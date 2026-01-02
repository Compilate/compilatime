import { PrismaClient, TimeEntryType } from '@prisma/client';
import {
  ReportFilters,
  TimeReportData,
  AttendanceReportData,
  EmployeeSummaryReportData,
  MonthlyReportData,
  ReportResponse,
  BreakTypeReportData,
  DelayReportData
} from '../types/reports.types';

const prisma = new PrismaClient();

class ReportsService {
  /**
   * Genera un reporte de horas trabajadas
   */
  async getTimeReport(filters: ReportFilters): Promise<ReportResponse<TimeReportData>> {
    try {
      const { companyId, employeeIds, startDate, endDate, groupBy = 'day' } = filters;

      // Ajustar la fecha final para incluir todo el día (hasta las 23:59:59.999Z)
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);

      // Construir where clause para TimeEntries
      const timeEntryWhere: any = {
        companyId,
        timestamp: {
          gte: new Date(startDate),
          lte: endDateObj
        }
      };

      if (employeeIds && employeeIds.length > 0) {
        timeEntryWhere.employeeId = {
          in: employeeIds
        };
      }

      // Obtener todos los fichajes del período
      const timeEntries = await prisma.timeEntry.findMany({
        where: timeEntryWhere,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              dni: true
            }
          },
          breakType: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true
            }
          }
        },
        orderBy: [
          { employeeId: 'asc' },
          { timestamp: 'asc' }
        ]
      });

      // Agrupar y calcular horas
      const groupedData = this.groupTimeEntries(timeEntries, groupBy);

      // Calcular totales
      const totalMinutes = this.calculateTotalMinutes(timeEntries);

      const reportData: TimeReportData = {
        summary: {
          totalHours: totalMinutes / 60,
          totalEntries: timeEntries.length,
          totalEmployees: new Set(timeEntries.map(e => e.employeeId)).size,
          period: {
            start: startDate,
            end: endDate
          }
        },
        details: groupedData,
        filters
      };

      return {
        success: true,
        data: reportData,
        message: 'Reporte de horas generado exitosamente'
      };

    } catch (error) {
      console.error('Error en getTimeReport:', error);
      return {
        success: false,
        message: 'Error al generar reporte de horas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Genera un reporte de asistencia
   */
  async getAttendanceReport(filters: ReportFilters): Promise<ReportResponse<AttendanceReportData>> {
    try {
      const { companyId, employeeIds, startDate, endDate } = filters;

      // Ajustar la fecha final para incluir todo el día (hasta las 23:59:59.999Z)
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);

      // Obtener empleados
      const employeeWhere: any = {
        active: true,
        employeeCompanies: {
          some: {
            companyId,
            active: true
          }
        }
      };
      if (employeeIds && employeeIds.length > 0) {
        employeeWhere.id = { in: employeeIds };
      }

      const employees = await prisma.employee.findMany({
        where: employeeWhere,
        include: {
          employeeSchedules: {
            include: {
              schedule: true
            }
          }
        }
      });

      // Para cada empleado, calcular asistencia en el período
      const attendanceDetails = await Promise.all(
        employees.map(async (employee) => {
          // Obtener fichajes del empleado en el período
          const timeEntries = await prisma.timeEntry.findMany({
            where: {
              employeeId: employee.id,
              timestamp: {
                gte: new Date(startDate),
                lte: endDateObj
              }
            },
            orderBy: { timestamp: 'asc' },
            include: {
              breakType: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  color: true
                }
              }
            }
          });

          // Calcular días trabajados, ausencias, tardanzas, etc.
          const workDays = this.calculateWorkDays(startDate, endDate, employee.employeeSchedules);
          const workedDays = this.calculateWorkedDays(timeEntries);
          const absences = workDays - workedDays;
          const lateEntriesResult = this.calculateLateEntries(timeEntries, employee.employeeSchedules);

          return {
            employee: {
              id: employee.id,
              name: employee.name,
              dni: employee.dni
            },
            statistics: {
              workDays,
              workedDays,
              absences,
              attendanceRate: workDays > 0 ? (workedDays / workDays) * 100 : 0,
              lateEntries: lateEntriesResult.count,
              totalDelayMinutes: lateEntriesResult.totalMinutes,
              totalHours: this.calculateTotalHours(timeEntries)
            }
          };
        })
      );

      // Calcular totales generales
      const totalWorkDays = attendanceDetails.reduce((sum, emp) => sum + emp.statistics.workDays, 0);
      const totalWorkedDays = attendanceDetails.reduce((sum, emp) => sum + emp.statistics.workedDays, 0);
      const totalAbsences = attendanceDetails.reduce((sum, emp) => sum + emp.statistics.absences, 0);
      const overallAttendanceRate = totalWorkDays > 0 ? (totalWorkedDays / totalWorkDays) * 100 : 0;

      const reportData: AttendanceReportData = {
        summary: {
          totalEmployees: employees.length,
          totalWorkDays,
          totalWorkedDays,
          totalAbsences,
          overallAttendanceRate,
          period: {
            start: startDate,
            end: endDate
          }
        },
        details: attendanceDetails,
        filters
      };

      return {
        success: true,
        data: reportData,
        message: 'Reporte de asistencia generado exitosamente'
      };

    } catch (error) {
      console.error('Error en getAttendanceReport:', error);
      return {
        success: false,
        message: 'Error al generar reporte de asistencia',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Genera un reporte resumido por empleado
   */
  async getEmployeeSummaryReport(filters: ReportFilters): Promise<ReportResponse<EmployeeSummaryReportData>> {
    try {
      const { companyId, employeeIds, startDate, endDate } = filters;

      // Ajustar la fecha final para incluir todo el día (hasta las 23:59:59.999Z)
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);

      // Obtener empleados
      const employeeWhere: any = {
        employeeCompanies: {
          some: {
            companyId,
            active: true
          }
        }
      };
      if (employeeIds && employeeIds.length > 0) {
        employeeWhere.id = { in: employeeIds };
      }

      const employees = await prisma.employee.findMany({
        where: employeeWhere,
        include: {
          employeeSchedules: {
            include: {
              schedule: true
            }
          },
          timeEntries: {
            where: {
              timestamp: {
                gte: new Date(startDate),
                lte: endDateObj
              }
            },
            orderBy: { timestamp: 'asc' },
            include: {
              breakType: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  color: true
                }
              }
            }
          }
        }
      });

      // Procesar datos de cada empleado
      const employeeSummaries = employees.map(employee => {
        const timeEntries = employee.timeEntries;
        const totalHours = this.calculateTotalHours(timeEntries);
        const workDays = this.calculateWorkDays(startDate, endDate, employee.employeeSchedules);
        const workedDays = this.calculateWorkedDays(timeEntries);
        const attendanceRate = workDays > 0 ? (workedDays / workDays) * 100 : 0;
        const lateEntriesResult = this.calculateLateEntries(timeEntries, employee.employeeSchedules);

        // Agrupar horas por tipo de turno
        const hoursBySchedule = this.calculateHoursBySchedule(timeEntries, employee.employeeSchedules);

        return {
          employee: {
            id: employee.id,
            name: employee.name,
            dni: employee.dni,
            active: employee.active
          },
          summary: {
            totalHours,
            workDays,
            workedDays,
            attendanceRate,
            lateEntries: lateEntriesResult.count,
            totalDelayMinutes: lateEntriesResult.totalMinutes,
            averageHoursPerDay: workedDays > 0 ? totalHours / workedDays : 0
          },
          hoursBySchedule
        };
      });

      // Ordenar por nombre
      employeeSummaries.sort((a, b) => a.employee.name.localeCompare(b.employee.name));

      const reportData: EmployeeSummaryReportData = {
        summary: {
          totalEmployees: employees.length,
          totalHours: employeeSummaries.reduce((sum, emp) => sum + emp.summary.totalHours, 0),
          averageAttendanceRate: employeeSummaries.reduce((sum, emp) => sum + emp.summary.attendanceRate, 0) / employees.length,
          period: {
            start: startDate,
            end: endDate
          }
        },
        details: employeeSummaries,
        filters
      };

      return {
        success: true,
        data: reportData,
        message: 'Reporte resumido por empleado generado exitosamente'
      };

    } catch (error) {
      console.error('Error en getEmployeeSummaryReport:', error);
      return {
        success: false,
        message: 'Error al generar reporte resumido por empleado',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Genera un reporte de retrasos
   */
  async getDelayReport(filters: ReportFilters): Promise<ReportResponse<DelayReportData>> {
    try {
      const { companyId, employeeIds, startDate, endDate } = filters;

      console.log('📊 Generando reporte de retrasos');
      console.log('📊 Filtros:', { companyId, employeeIds, startDate, endDate });

      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      // Ajustar la fecha final para incluir todo el día (hasta las 23:59:59.999Z)
      endDateObj.setHours(23, 59, 59, 999);

      console.log('📊 Fecha inicio:', startDate, '- Objeto:', startDateObj.toISOString());
      console.log('📊 Fecha fin:', endDate, '- Objeto:', endDateObj.toISOString());

      // Verificar si hay fichajes de tiempo en la empresa sin filtrar por fecha
      const allTimeEntries = await prisma.timeEntry.findMany({
        where: {
          companyId
        },
        select: {
          id: true,
          type: true,
          timestamp: true,
          employeeId: true,
          companyId: true
        },
        orderBy: { timestamp: 'desc' },
        take: 20 // Solo los últimos 20 fichajes
      });

      console.log('📊 Últimos 20 fichajes de la empresa:', allTimeEntries.length);
      console.log('📊 Fichajes:', JSON.stringify(allTimeEntries.map(e => ({
        id: e.id,
        type: e.type,
        timestamp: e.timestamp,
        employeeId: e.employeeId,
        companyId: e.companyId
      })), null, 2));

      // Verificar si hay fichajes de tiempo en la empresa en el período
      const allCompanyTimeEntries = await prisma.timeEntry.findMany({
        where: {
          companyId,
          timestamp: {
            gte: startDateObj,
            lte: endDateObj
          }
        },
        select: {
          id: true,
          type: true,
          timestamp: true,
          employeeId: true,
          companyId: true
        },
        orderBy: { timestamp: 'asc' }
      });

      console.log('📊 Todos los fichajes de la empresa en el período:', allCompanyTimeEntries.length);
      console.log('📊 Fichajes de la empresa:', JSON.stringify(allCompanyTimeEntries.map(e => ({
        id: e.id,
        type: e.type,
        timestamp: e.timestamp,
        employeeId: e.employeeId,
        companyId: e.companyId
      })), null, 2));

      // Obtener empleados
      const employeeWhere: any = {
        active: true,
        employeeCompanies: {
          some: {
            companyId,
            active: true
          }
        }
      };
      if (employeeIds && employeeIds.length > 0) {
        employeeWhere.id = { in: employeeIds };
      }

      const employees = await prisma.employee.findMany({
        where: employeeWhere,
        select: {
          id: true,
          name: true,
          dni: true
        }
      });

      console.log('📊 Empleados encontrados:', employees.length);

      // Para cada empleado, calcular retrasos en el período
      const delayDetails = await Promise.all(
        employees.map(async (employee) => {
          // Obtener fichajes del empleado en el período
          const timeEntryWhere: any = {
            companyId,
            employeeId: employee.id,
            timestamp: {
              gte: startDateObj,
              lte: endDateObj
            }
          };

          console.log('📊 Buscando fichajes para empleado:', employee.name, 'ID:', employee.id);
          console.log('📊 Where clause:', JSON.stringify(timeEntryWhere, null, 2));

          const timeEntries = await prisma.timeEntry.findMany({
            where: timeEntryWhere,
            orderBy: { timestamp: 'asc' }
          });

          console.log('📊 Empleado:', employee.name, '- Fichajes encontrados:', timeEntries.length);
          console.log('📊 Fichajes:', JSON.stringify(timeEntries.map(e => ({
            id: e.id,
            type: e.type,
            timestamp: e.timestamp,
            employeeId: e.employeeId,
            companyId: e.companyId
          })), null, 2));

          // Calcular retrasos usando horarios específicos para cada fecha
          const delays = await this.calculateDelaysWithSchedules(timeEntries, employee.id, companyId);

          return {
            employee: {
              id: employee.id,
              name: employee.name,
              dni: employee.dni
            },
            delays,
            summary: {
              totalDelays: delays.length,
              totalDelayMinutes: delays.reduce((sum, d) => sum + d.delayMinutes, 0),
              totalDelayHours: delays.reduce((sum, d) => sum + d.delayHours, 0),
              averageDelayMinutes: delays.length > 0 ? delays.reduce((sum, d) => sum + d.delayMinutes, 0) / delays.length : 0
            }
          };
        })
      );

      // Filtrar empleados que tienen retrasos
      const employeesWithDelays = delayDetails.filter(detail => detail.delays.length > 0);

      console.log('📊 Empleados con retrasos:', employeesWithDelays.length);

      // Calcular totales generales
      const totalDelays = employeesWithDelays.reduce((sum, emp) => sum + emp.summary.totalDelays, 0);
      const totalDelayMinutes = employeesWithDelays.reduce((sum, emp) => sum + emp.summary.totalDelayMinutes, 0);
      const totalDelayHours = employeesWithDelays.reduce((sum, emp) => sum + emp.summary.totalDelayHours, 0);
      const averageDelayMinutes = totalDelays > 0 ? totalDelayMinutes / totalDelays : 0;

      // Encontrar el empleado con más retrasos
      const mostDelayedEmployee = employeesWithDelays.length > 0
        ? employeesWithDelays.reduce((max, emp) =>
          emp.summary.totalDelayMinutes > max.summary.totalDelayMinutes ? emp : max
        )
        : null;

      const reportData: DelayReportData = {
        summary: {
          totalEmployees: employees.length,
          totalDelays,
          totalDelayMinutes,
          totalDelayHours,
          averageDelayMinutes,
          mostDelayedEmployee: mostDelayedEmployee
            ? {
              id: mostDelayedEmployee.employee.id,
              name: mostDelayedEmployee.employee.name,
              dni: mostDelayedEmployee.employee.dni,
              totalDelayMinutes: mostDelayedEmployee.summary.totalDelayMinutes
            }
            : null,
          period: {
            start: startDate,
            end: endDate
          }
        },
        details: employeesWithDelays,
        filters
      };

      console.log('📊 Resumen del reporte de retrasos:', reportData.summary);

      return {
        success: true,
        data: reportData,
        message: 'Reporte de retrasos generado exitosamente'
      };

    } catch (error) {
      console.error('Error en getDelayReport:', error);
      return {
        success: false,
        message: 'Error al generar reporte de retrasos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Genera un reporte de tipos de pausa
   */
  async getBreakTypeReport(filters: ReportFilters): Promise<ReportResponse<BreakTypeReportData>> {
    try {
      const { companyId, employeeIds, startDate, endDate } = filters;

      console.log('📊 Generando reporte de tipos de pausa');
      console.log('📊 Filtros:', { companyId, employeeIds, startDate, endDate });

      // Primero, obtener todos los fichajes de la empresa sin filtrar por fecha
      const allCompanyEntries = await prisma.timeEntry.findMany({
        where: {
          companyId
        },
        select: {
          id: true,
          type: true,
          timestamp: true,
          employeeId: true,
          breakTypeId: true
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 10 // Solo los últimos 10 fichajes
      });

      console.log('📊 Últimos 10 fichajes de la empresa:', allCompanyEntries.length);
      console.log('📊 Tipos de fichajes de la empresa:', [...new Set(allCompanyEntries.map(e => e.type))]);
      console.log('📊 Fichajes de la empresa con breakTypeId:', allCompanyEntries.filter(e => e.breakTypeId).length);
      console.log('📊 Detalles de los últimos fichajes:', JSON.stringify(allCompanyEntries, null, 2));

      // Ahora, obtener todos los fichajes de la empresa en el rango de fechas
      // Incluir todo el día de la fecha final (hasta las 23:59:59.999Z)
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);

      console.log('📊 Fecha final ajustada:', endDateObj.toISOString());

      const companyEntriesWhere: any = {
        companyId,
        timestamp: {
          gte: new Date(startDate),
          lte: endDateObj
        }
      };

      const companyEntries = await prisma.timeEntry.findMany({
        where: companyEntriesWhere,
        select: {
          id: true,
          type: true,
          timestamp: true,
          employeeId: true,
          breakTypeId: true
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      console.log('📊 Todos los fichajes de la empresa en el rango de fechas encontrados:', companyEntries.length);
      console.log('📊 Tipos de fichajes de la empresa en el rango de fechas:', [...new Set(companyEntries.map(e => e.type))]);
      console.log('📊 Fichajes de la empresa en el rango de fechas con breakTypeId:', companyEntries.filter(e => e.breakTypeId).length);
      console.log('📊 IDs de empleados con fichajes en el rango de fechas:', [...new Set(companyEntries.map(e => e.employeeId))]);

      // Ahora, obtener todos los fichajes de los empleados en el rango de fechas
      const allEntriesWhere: any = {
        companyId,
        timestamp: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };

      if (employeeIds && employeeIds.length > 0) {
        allEntriesWhere.employeeId = {
          in: employeeIds
        };
      }

      const allEntries = await prisma.timeEntry.findMany({
        where: allEntriesWhere,
        select: {
          id: true,
          type: true,
          timestamp: true,
          employeeId: true,
          breakTypeId: true
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      console.log('📊 Todos los fichajes de los empleados encontrados:', allEntries.length);
      console.log('📊 Tipos de fichajes de los empleados:', [...new Set(allEntries.map(e => e.type))]);
      console.log('📊 Fichajes de los empleados con breakTypeId:', allEntries.filter(e => e.breakTypeId).length);

      // Construir where clause para TimeEntries
      const timeEntryWhere: any = {
        companyId,
        type: TimeEntryType.BREAK,
        timestamp: {
          gte: new Date(startDate),
          lte: endDateObj
        }
      };

      if (employeeIds && employeeIds.length > 0) {
        timeEntryWhere.employeeId = {
          in: employeeIds
        };
      }

      console.log('📊 Where clause:', JSON.stringify(timeEntryWhere, null, 2));

      // Obtener todos los fichajes de pausa
      const breakEntries = await prisma.timeEntry.findMany({
        where: timeEntryWhere,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              dni: true
            }
          },
          breakType: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true
            }
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      console.log('📊 Fichajes de pausa encontrados:', breakEntries.length);
      console.log('📊 Fichajes de pausa:', JSON.stringify(breakEntries, null, 2));

      // Agrupar por tipo de pausa y calcular tiempo total
      const statsByType: { [key: string]: any } = {};

      for (const entry of breakEntries) {
        // Verificar si tiene breakTypeId
        if (!entry.breakTypeId || !entry.breakType) {
          console.log('⚠️ Fichaje de pausa sin tipo de pausa:', entry.id);
          continue;
        }

        const typeId = entry.breakType.id;
        if (!statsByType[typeId]) {
          statsByType[typeId] = {
            breakType: entry.breakType,
            totalMinutes: 0,
            entryCount: 0,
            employees: new Set<string>(),
            entries: []
          };
        }

        // Buscar el fichaje RESUME correspondiente para calcular la duración
        const resumeEntry = await prisma.timeEntry.findFirst({
          where: {
            employeeId: entry.employeeId,
            companyId: entry.companyId,
            type: TimeEntryType.RESUME,
            timestamp: {
              gt: entry.timestamp
            }
          },
          orderBy: {
            timestamp: 'asc'
          },
        });

        if (resumeEntry) {
          const duration = Math.round(
            (new Date(resumeEntry.timestamp).getTime() - new Date(entry.timestamp).getTime()) / (1000 * 60)
          );
          statsByType[typeId].totalMinutes += duration;
        }

        statsByType[typeId].entryCount++;
        statsByType[typeId].employees.add(entry.employeeId);
        statsByType[typeId].entries.push({
          id: entry.id,
          timestamp: entry.timestamp,
          employee: entry.employee,
          duration: resumeEntry ? Math.round(
            (new Date(resumeEntry.timestamp).getTime() - new Date(entry.timestamp).getTime()) / (1000 * 60)
          ) : null
        });
      }

      console.log('📊 Estadísticas por tipo de pausa:', Object.keys(statsByType).length);

      // Convertir a array y formatear
      const reportData = Object.values(statsByType).map((stat: any) => ({
        breakType: stat.breakType,
        totalMinutes: stat.totalMinutes,
        totalHours: Math.round(stat.totalMinutes / 60 * 100) / 100,
        entryCount: stat.entryCount,
        employeeCount: stat.employees.size,
        entries: stat.entries
      }));

      console.log('📊 Datos del reporte:', reportData);

      // Calcular totales generales
      const totalBreakMinutes = reportData.reduce((sum, stat) => sum + stat.totalMinutes, 0);
      const totalBreakHours = Math.round(totalBreakMinutes / 60 * 100) / 100;
      const totalBreakEntries = reportData.reduce((sum, stat) => sum + stat.entryCount, 0);

      const summary = {
        totalBreakMinutes,
        totalBreakHours,
        totalBreakEntries,
        averageBreakDuration: totalBreakEntries > 0 ? Math.round(totalBreakMinutes / totalBreakEntries) : 0,
        mostUsedBreakType: reportData.length > 0 ? reportData.reduce((max, stat) =>
          stat.totalMinutes > max.totalMinutes ? stat : max
        ) : null
      };

      console.log('📊 Resumen del reporte:', summary);

      return {
        success: true,
        data: {
          summary,
          details: reportData,
          filters
        },
        message: 'Reporte de tipos de pausa generado exitosamente'
      };

    } catch (error) {
      console.error('Error en getBreakTypeReport:', error);
      return {
        success: false,
        message: 'Error al generar reporte de tipos de pausa',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Genera un reporte mensual consolidado
   */
  async getMonthlyReport(filters: ReportFilters): Promise<ReportResponse<MonthlyReportData>> {
    try {
      const { startDate, endDate } = filters;

      // Obtener datos del período
      const timeReport = await this.getTimeReport(filters);
      const attendanceReport = await this.getAttendanceReport(filters);
      const employeeSummaryReport = await this.getEmployeeSummaryReport(filters);

      if (!timeReport.success || !attendanceReport.success || !employeeSummaryReport.success) {
        throw new Error('Error al generar sub-reportes para el reporte mensual');
      }

      // Calcular estadísticas adicionales
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Obtener distribución por día de la semana
      const dayOfWeekDistribution = this.calculateDayOfWeekDistribution(
        timeReport.data?.details || [],
        start,
        end
      );

      // Obtener horas por tipo de turno
      const hoursByScheduleType = this.calculateHoursByScheduleType(employeeSummaryReport.data?.details || []);

      const reportData: MonthlyReportData = {
        periodInfo: {
          startDate,
          endDate,
          daysInPeriod,
          workDays: this.countWorkDays(start, end)
        },
        timeSummary: timeReport.data?.summary || {
          totalHours: 0,
          totalEntries: 0,
          totalEmployees: 0,
          period: { start: startDate, end: endDate }
        },
        attendanceSummary: attendanceReport.data?.summary || {
          totalEmployees: 0,
          totalWorkDays: 0,
          totalWorkedDays: 0,
          totalAbsences: 0,
          overallAttendanceRate: 0,
          period: { start: startDate, end: endDate }
        },
        employeeSummaries: employeeSummaryReport.data?.summary || {
          totalEmployees: 0,
          totalHours: 0,
          averageAttendanceRate: 0,
          period: { start: startDate, end: endDate }
        },
        analytics: {
          dayOfWeekDistribution,
          hoursByScheduleType,
          peakDays: this.findPeakDays(timeReport.data?.details || []),
          trends: this.calculateTrends(timeReport.data?.details || [])
        },
        details: {
          timeDetails: timeReport.data?.details || [],
          attendanceDetails: attendanceReport.data?.details || [],
          employeeDetails: employeeSummaryReport.data?.details || []
        },
        filters
      };

      return {
        success: true,
        data: reportData,
        message: 'Reporte mensual generado exitosamente'
      };

    } catch (error) {
      console.error('Error en getMonthlyReport:', error);
      return {
        success: false,
        message: 'Error al generar reporte mensual',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Agrupa las entradas de tiempo según el criterio especificado
   */
  private groupTimeEntries(timeEntries: any[], _groupBy: string): any[] {
    // Implementación simplificada - agrupar por día
    const grouped: { [key: string]: any[] } = {};

    timeEntries.forEach(entry => {
      const date = entry.timestamp.toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });

    return Object.entries(grouped).map(([date, entries]) => ({
      date,
      entries,
      totalHours: this.calculateTotalHours(entries),
      employeeCount: new Set(entries.map((e: any) => e.employeeId)).size
    }));
  }

  /**
   * Calcula los días laborables para un empleado en un período
   */
  private calculateWorkDays(startDate: string, endDate: string, _employeeSchedules: any[]): number {
    // Implementación simplificada - contar días de semana (lunes a viernes)
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lunes a viernes
        workDays++;
      }
    }

    return workDays;
  }

  /**
   * Calcula los días trabajados basados en las entradas de tiempo
   */
  private calculateWorkedDays(timeEntries: any[]): number {
    const workedDates = new Set<string>();

    timeEntries.forEach(entry => {
      if (entry.type === 'IN') {
        workedDates.add(entry.timestamp.toISOString().split('T')[0]);
      }
    });

    return workedDates.size;
  }

  /**
   * Calcula las entradas tardías y el tiempo total de retraso
   */
  private calculateLateEntries(timeEntries: any[], _employeeSchedules: any[]): { count: number; totalMinutes: number } {
    // Implementación mejorada
    let lateCount = 0;
    let totalDelayMinutes = 0;

    timeEntries.forEach(entry => {
      if (entry.type === 'IN' && _employeeSchedules && _employeeSchedules.length > 0) {
        // Filtrar schedules que tienen startTime válido
        const validSchedules = _employeeSchedules.filter((es: any) =>
          es.schedule && es.schedule.startTime
        );

        if (validSchedules.length === 0) {
          return;
        }

        // Encontrar el turno más temprano
        const earliestSchedule = validSchedules.reduce((earliest: any, es: any) => {
          const [startHour, startMinute] = es.schedule.startTime.split(':').map(Number);
          const earliestStartHour = earliest.schedule.startTime.split(':')[0];
          const earliestStartMinute = earliest.schedule.startTime.split(':')[1];
          const startMinutes = startHour * 60 + startMinute;
          const earliestStartMinutes = parseInt(earliestStartHour) * 60 + parseInt(earliestStartMinute);
          return startMinutes < earliestStartMinutes ? es : earliest;
        }, validSchedules[0]);

        const [scheduleStartHour, scheduleStartMinute] = earliestSchedule.schedule.startTime.split(':').map(Number);
        const scheduleStartMinutes = scheduleStartHour * 60 + scheduleStartMinute;

        const entryTime = new Date(entry.timestamp);
        const entryMinutes = entryTime.getHours() * 60 + entryTime.getMinutes();

        // Calcular el retraso
        if (entryMinutes > scheduleStartMinutes) {
          lateCount++;
          totalDelayMinutes += (entryMinutes - scheduleStartMinutes);
        }
      }
    });

    return { count: lateCount, totalMinutes: totalDelayMinutes };
  }

  /**
   * Calcula el total de horas trabajadas
   */
  private calculateTotalHours(timeEntries: any[]): number {
    const totalMinutes = this.calculateTotalMinutes(timeEntries);
    return totalMinutes / 60; // Convertir a horas
  }

  /**
   * Calcula el total de minutos trabajados
   */
  private calculateTotalMinutes(timeEntries: any[]): number {
    let totalMinutes = 0;
    const sortedEntries = [...timeEntries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 0; i < sortedEntries.length; i++) {
      if (sortedEntries[i].type === 'IN') {
        // Buscar el OUT correspondiente
        for (let j = i + 1; j < sortedEntries.length; j++) {
          if (sortedEntries[j].type === 'OUT') {
            totalMinutes += this.calculateWorkedMinutesForDay([sortedEntries[i], sortedEntries[j]]);
            break;
          }
        }
      }
    }

    return totalMinutes;
  }

  /**
   * Calcula horas por tipo de horario
   */
  private calculateHoursBySchedule(timeEntries: any[], employeeSchedules: any[]): any[] {
    // Implementación simplificada
    const scheduleHours: { [key: string]: number } = {};

    employeeSchedules.forEach(es => {
      scheduleHours[es.schedule.name] = 0;
    });

    // Asignar horas a horarios (lógica simplificada)
    let currentSchedule = employeeSchedules[0];
    if (currentSchedule) {
      scheduleHours[currentSchedule.schedule.name] = this.calculateTotalHours(timeEntries);
    }

    return Object.entries(scheduleHours).map(([scheduleName, hours]) => ({
      scheduleName,
      hours
    }));
  }

  /**
   * Calcula distribución por día de la semana
   */
  private calculateDayOfWeekDistribution(groupedData: any[], _startDate: Date, _endDate: Date): any[] {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const distribution = dayNames.map(day => ({ day, hours: 0, entries: 0 }));

    groupedData.forEach((dayData: any) => {
      const date = new Date(dayData.date);
      const dayOfWeek = date.getDay();
      distribution[dayOfWeek].hours += dayData.totalHours;
      distribution[dayOfWeek].entries += dayData.entries.length;
    });

    return distribution;
  }

  /**
   * Calcula horas por tipo de horario
   */
  private calculateHoursByScheduleType(employeeDetails: any[]): any[] {
    const scheduleTypes: { [key: string]: number } = {};

    employeeDetails.forEach((employee: any) => {
      employee.hoursBySchedule.forEach((schedule: any) => {
        if (!scheduleTypes[schedule.scheduleName]) {
          scheduleTypes[schedule.scheduleName] = 0;
        }
        scheduleTypes[schedule.scheduleName] += schedule.hours;
      });
    });

    return Object.entries(scheduleTypes).map(([scheduleName, hours]) => ({
      scheduleName,
      hours
    }));
  }

  /**
   * Encuentra los días con mayor actividad
   */
  private findPeakDays(groupedData: any[]): any[] {
    return groupedData
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 5)
      .map(day => ({
        date: day.date,
        hours: day.totalHours,
        employeeCount: day.employeeCount
      }));
  }

  /**
   * Calcula tendencias (implementación básica)
   */
  private calculateTrends(groupedData: any[]): any {
    if (groupedData.length < 2) {
      return { trend: 'insufficient_data', change: 0 };
    }

    const firstHalf = groupedData.slice(0, Math.floor(groupedData.length / 2));
    const secondHalf = groupedData.slice(Math.floor(groupedData.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.totalHours, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.totalHours, 0) / secondHalf.length;

    const change = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    return {
      trend: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      change: Math.round(change * 100) / 100
    };
  }

  /**
   * Cuenta días laborables en un rango de fechas
   */
  private countWorkDays(startDate: Date, endDate: Date): number {
    let workDays = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lunes a viernes
        workDays++;
      }
    }
    return workDays;
  }

  /**
   * Calcula minutos trabajados para un conjunto de entradas
   */
  private calculateWorkedMinutesForDay(entries: any[]): number {
    let totalMinutes = 0;
    let inTime: Date | null = null;

    for (const entry of entries) {
      if (entry.type === TimeEntryType.IN) {
        inTime = entry.timestamp;
      } else if (entry.type === TimeEntryType.OUT && inTime) {
        totalMinutes += (entry.timestamp.getTime() - inTime.getTime()) / (1000 * 60);
        inTime = null;
      }
    }

    return totalMinutes;
  }

  /**
   * Calcula los retrasos de un empleado usando horarios específicos para cada fecha
   */
  private async calculateDelaysWithSchedules(timeEntries: any[], employeeId: string, companyId: string): Promise<any[]> {
    const delays: any[] = [];

    console.log('📊 calculateDelaysWithSchedules - timeEntries:', timeEntries.length);
    console.log('📊 calculateDelaysWithSchedules - employeeId:', employeeId, '- companyId:', companyId);

    // Agrupar fichajes por fecha
    const entriesByDate: { [key: string]: any[] } = {};
    timeEntries.forEach(entry => {
      const date = entry.timestamp.toISOString().split('T')[0];
      if (!entriesByDate[date]) {
        entriesByDate[date] = [];
      }
      entriesByDate[date].push(entry);
    });

    console.log('📊 calculateDelaysWithSchedules - Fechas con fichajes:', Object.keys(entriesByDate).length);

    // Para cada fecha, obtener los horarios del empleado y calcular retrasos
    for (const date of Object.keys(entriesByDate)) {
      console.log('📊 Procesando fecha:', date);

      // Obtener horarios del empleado para esta fecha usando la lógica de getDailySchedule
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay(); // 0 = Domingo, 6 = Sábado

      console.log('📊 Fecha:', date, '- dayOfWeek:', dayOfWeek);

      // Obtener asignaciones semanales para esta fecha
      const weekStart = new Date(targetDate);
      const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      const weekDay = weekStart.getDay();
      const mondayDiff = weekDay === 0 ? -6 : 1 - weekDay;
      weekStart.setDate(weekStart.getDate() + mondayDiff);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weeklyAssignments = await prisma.weeklySchedule.findMany({
        where: {
          employeeId,
          weekStart: {
            gte: weekStart,
            lte: weekEnd,
          },
          dayOfWeek: dayOfWeek,
          scheduleId: {
            not: null,
          },
        },
        include: {
          schedule: true,
        },
      });

      console.log('📊 WeeklyAssignments encontrados para fecha', date, ':', weeklyAssignments.length);

      // Convertir weeklyAssignments al formato esperado por calculateDelays
      const employeeSchedules = weeklyAssignments.map(wa => ({
        schedule: wa.schedule
      }));

      console.log('📊 EmployeeSchedules para fecha', date, ':', employeeSchedules.length);

      // Calcular retrasos para esta fecha usando los horarios específicos
      const dateDelays = this.calculateDelays(entriesByDate[date], employeeSchedules);

      console.log('📊 Retrasos para fecha', date, ':', dateDelays.length);

      delays.push(...dateDelays);
    }

    console.log('📊 calculateDelaysWithSchedules - delays encontrados:', delays.length);
    return delays;
  }

  /**
   * Calcula los retrasos de un empleado
   */
  private calculateDelays(timeEntries: any[], employeeSchedules: any[]): any[] {
    const delays: any[] = [];

    console.log('📊 calculateDelays - timeEntries:', timeEntries.length);
    console.log('📊 calculateDelays - employeeSchedules:', employeeSchedules.length);

    timeEntries.forEach(entry => {
      if (entry.type === 'IN' && employeeSchedules && employeeSchedules.length > 0) {
        console.log('📊 Procesando entrada IN:', entry.id, new Date(entry.timestamp).toISOString());

        // Filtrar schedules que tienen startTime válido
        const validSchedules = employeeSchedules.filter((es: any) =>
          es.schedule && es.schedule.startTime
        );

        if (validSchedules.length === 0) {
          console.log('📊 No hay schedules válidos para este empleado');
          return;
        }

        const entryTime = new Date(entry.timestamp);
        // Usar hora UTC para evitar problemas con zonas horarias
        const entryHour = entryTime.getUTCHours();
        const entryMinutes = entryHour * 60 + entryTime.getUTCMinutes();

        console.log('📊 Hora entrada (UTC):', entryHour, ':', entryTime.getUTCMinutes(), '(', entryMinutes, 'minutos)');
        console.log('📊 Hora entrada (local):', entryTime.getHours(), ':', entryTime.getMinutes());

        // Determinar si el fichaje pertenece a un turno nocturno
        // Un fichaje después de las 22:00 puede pertenecer a un turno nocturno del mismo día
        // Un fichaje antes de las 06:00 puede pertenecer a un turno nocturno del día anterior
        let targetSchedule: any = null;
        let scheduleStartMinutes: number = 0;

        // Buscar el turno nocturno más cercano
        console.log('📊 Buscando turnos nocturnos...');
        validSchedules.forEach((es: any) => {
          const [startHour, startMinute] = es.schedule.startTime.split(':').map(Number);
          const [endHour, endMinute] = es.schedule.endTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;
          console.log('📊   Horario:', es.schedule.name, '- Inicio:', startHour, ':', startMinute, '(', startMinutes, 'minutos)', '- Fin:', endHour, ':', endMinute, '(', endMinutes, 'minutos)', '- Es nocturno:', endMinutes < startMinutes);
        });

        const nightShifts = validSchedules.filter((es: any) => {
          const [startHour, startMinute] = es.schedule.startTime.split(':').map(Number);
          const [endHour, endMinute] = es.schedule.endTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;
          // Un turno nocturno cruza medianoche (endTime < startTime)
          return endMinutes < startMinutes;
        });

        console.log('📊 Turnos nocturnos encontrados:', nightShifts.length);

        if (nightShifts.length > 0) {
          // Hay turnos nocturnos, verificar si el fichaje pertenece a uno de ellos
          for (const es of nightShifts) {
            const [startHour, startMinute] = es.schedule.startTime.split(':').map(Number);
            const [endHour, endMinute] = es.schedule.endTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;

            // Convertir las horas de los horarios a UTC (restar 1 hora para UTC+1)
            const startMinutesUTC = startMinutes - 60; // UTC+1
            const endMinutesUTC = endMinutes - 60; // UTC+1

            console.log('📊 Horario nocturno:', es.schedule.name);
            console.log('📊   Hora inicio (local):', startHour, ':', startMinute, '(', startMinutes, 'minutos)');
            console.log('📊   Hora inicio (UTC):', startMinutesUTC, 'minutos');
            console.log('📊   Hora fin (local):', endHour, ':', endMinute, '(', endMinutes, 'minutos)');
            console.log('📊   Hora fin (UTC):', endMinutesUTC, 'minutos');

            // Para turnos nocturnos, el turno abarca desde el día anterior hasta el día siguiente
            // Si el fichaje es después de las 22:00 (21:00 UTC), puede pertenecer a un turno nocturno del mismo día
            // Si el fichaje es antes de las 06:00 (05:00 UTC), puede pertenecer a un turno nocturno del día anterior
            if (entryHour >= 21) {
              // Fichaje después de las 21:00 UTC (22:00 local), verificar si está dentro del turno nocturno
              if (entryMinutes >= startMinutesUTC) {
                targetSchedule = es;
                scheduleStartMinutes = startMinutesUTC;
                console.log('📊 Fichaje pertenece a turno nocturno (después de 21:00 UTC):', es.schedule.name);
                break;
              }
            } else if (entryHour < 5) {
              // Fichaje antes de las 05:00 UTC (06:00 local), verificar si está dentro del turno nocturno extendido
              // El turno nocturno se extiende hasta las 05:00 UTC (06:00 local) o hasta la hora predefinida
              const extendedEndMinutesUTC = Math.max(endMinutesUTC + 24 * 60, 300); // 300 minutos = 05:00 UTC
              const adjustedEntryMinutes = entryMinutes + 24 * 60;
              if (adjustedEntryMinutes <= extendedEndMinutesUTC) {
                targetSchedule = es;
                scheduleStartMinutes = startMinutesUTC;
                console.log('📊 Fichaje pertenece a turno nocturno (antes de 05:00 UTC):', es.schedule.name);
                break;
              }
            }
          }
        }

        // Si no se encontró un turno nocturno, buscar el turno normal más temprano
        if (!targetSchedule) {
          const dayShifts = validSchedules.filter((es: any) => {
            const [startHour, startMinute] = es.schedule.startTime.split(':').map(Number);
            const [endHour, endMinute] = es.schedule.endTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;
            // Un turno normal no cruza medianoche (endTime >= startTime)
            return endMinutes >= startMinutes;
          });

          if (dayShifts.length > 0) {
            targetSchedule = dayShifts.reduce((earliest: any, es: any) => {
              const [startHour, startMinute] = es.schedule.startTime.split(':').map(Number);
              const earliestStartHour = earliest.schedule.startTime.split(':')[0];
              const earliestStartMinute = earliest.schedule.startTime.split(':')[1];
              const startMinutes = startHour * 60 + startMinute;
              const earliestStartMinutes = parseInt(earliestStartHour) * 60 + parseInt(earliestStartMinute);
              return startMinutes < earliestStartMinutes ? es : earliest;
            }, dayShifts[0]);

            const [scheduleStartHour, scheduleStartMinute] = targetSchedule.schedule.startTime.split(':').map(Number);
            const scheduleStartMinutesLocal = scheduleStartHour * 60 + scheduleStartMinute;
            // Convertir a UTC (restar 1 hora para UTC+1)
            scheduleStartMinutes = scheduleStartMinutesLocal - 60;
            console.log('📊 Fichaje pertenece a turno normal:', targetSchedule.schedule.name);
            console.log('📊   Hora inicio (local):', scheduleStartHour, ':', scheduleStartMinute, '(', scheduleStartMinutesLocal, 'minutos)');
            console.log('📊   Hora inicio (UTC):', scheduleStartMinutes, 'minutos');
          }
        }

        if (!targetSchedule) {
          console.log('📊 No se encontró un turno válido para este fichaje');
          return;
        }

        console.log('📊 Hora turno (UTC):', scheduleStartMinutes, 'minutos');
        console.log('📊 Diferencia:', entryMinutes - scheduleStartMinutes, 'minutos');

        // Calcular el retraso
        if (entryMinutes > scheduleStartMinutes) {
          const delayMinutes = entryMinutes - scheduleStartMinutes;
          console.log('📊 ¡Retraso detectado!:', delayMinutes, 'minutos');
          delays.push({
            id: entry.id,
            timestamp: entry.timestamp,
            scheduleStartTime: targetSchedule.schedule.startTime,
            delayMinutes,
            delayHours: delayMinutes / 60
          });
        }
      }
    });

    console.log('📊 calculateDelays - delays encontrados:', delays.length);
    return delays;
  }

}

export const reportsService = new ReportsService();