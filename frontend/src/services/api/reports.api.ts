import { apiClient } from '../../lib/api';

// Tipos para los reportes
export interface ReportFilters {
  employeeIds?: string[];
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  scheduleIds?: string[];
  departmentIds?: string[];
}

export interface ReportType {
  id: string;
  name: string;
  description: string;
  filters: string[];
  exportFormats: string[];
}

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  includeCharts?: boolean;
  includeDetails?: boolean;
  email?: string;
}

// Tipos para los datos de reportes
export interface TimeReportData {
  summary: {
    totalHours: string;
    totalEntries: number;
    totalEmployees: number;
    period: {
      start: string;
      end: string;
    };
  };
  details: TimeReportDetail[];
  filters: ReportFilters;
}

export interface TimeReportDetail {
  date: string;
  entries: any[];
  totalHours: number;
  employeeCount: number;
}

export interface AttendanceReportData {
  summary: {
    totalEmployees: number;
    totalWorkDays: number;
    totalWorkedDays: number;
    totalAbsences: number;
    overallAttendanceRate: number;
    period: {
      start: string;
      end: string;
    };
  };
  details: AttendanceDetail[];
  filters: ReportFilters;
}

export interface AttendanceDetail {
  employee: {
    id: string;
    name: string;
    dni: string;
  };
  statistics: {
    workDays: number;
    workedDays: number;
    absences: number;
    attendanceRate: number;
    lateEntries: number;
    totalHours: number;
  };
}

export interface EmployeeSummaryReportData {
  summary: {
    totalEmployees: number;
    totalHours: number;
    averageAttendanceRate: number;
    period: {
      start: string;
      end: string;
    };
  };
  details: EmployeeSummaryDetail[];
  filters: ReportFilters;
}

export interface EmployeeSummaryDetail {
  employee: {
    id: string;
    name: string;
    dni: string;
    active: boolean;
  };
  summary: {
    totalHours: number;
    workDays: number;
    workedDays: number;
    attendanceRate: number;
    lateEntries: number;
    averageHoursPerDay: number;
  };
  hoursBySchedule: HoursBySchedule[];
}

export interface HoursBySchedule {
  scheduleName: string;
  hours: number;
}

export interface MonthlyReportData {
  periodInfo: {
    startDate: string;
    endDate: string;
    daysInPeriod: number;
    workDays: number;
  };
  timeSummary: {
    totalHours: string;
    totalEntries: number;
    totalEmployees: number;
    period: {
      start: string;
      end: string;
    };
  };
  attendanceSummary: {
    totalEmployees: number;
    totalWorkDays: number;
    totalWorkedDays: number;
    totalAbsences: number;
    overallAttendanceRate: number;
    period: {
      start: string;
      end: string;
    };
  };
  employeeSummaries: {
    totalEmployees: number;
    totalHours: number;
    averageAttendanceRate: number;
    period: {
      start: string;
      end: string;
    };
  };
  analytics: {
    dayOfWeekDistribution: DayOfWeekDistribution[];
    hoursByScheduleType: HoursByScheduleType[];
    peakDays: PeakDay[];
    trends: Trends;
  };
  details: {
    timeDetails: TimeReportDetail[];
    attendanceDetails: AttendanceDetail[];
    employeeDetails: EmployeeSummaryDetail[];
  };
  filters: ReportFilters;
}

export interface DayOfWeekDistribution {
  day: string;
  hours: number;
  entries: number;
}

export interface HoursByScheduleType {
  scheduleName: string;
  hours: number;
}

export interface PeakDay {
  date: string;
  hours: number;
  employeeCount: number;
}

export interface Trends {
  trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  change: number;
}

export interface BreakTypeReportData {
  summary: {
    totalBreakMinutes: number;
    totalBreakHours: number;
    totalBreakEntries: number;
    averageBreakDuration: number;
    mostUsedBreakType: any;
  };
  details: BreakTypeReportDetail[];
  filters: ReportFilters;
}

export interface BreakTypeReportDetail {
  breakType: {
    id: string;
    name: string;
    description?: string;
    color: string;
  };
  totalMinutes: number;
  totalHours: number;
  entryCount: number;
  employeeCount: number;
  entries: BreakTypeEntry[];
}

export interface BreakTypeEntry {
  id: string;
  timestamp: string;
  employee: {
    id: string;
    name: string;
    dni: string;
  };
  duration: number | null;
}

export interface DelayReportData {
  summary: {
    totalEmployees: number;
    totalDelays: number;
    totalDelayMinutes: number;
    totalDelayHours: number;
    averageDelayMinutes: number;
    mostDelayedEmployee: {
      id: string;
      name: string;
      dni: string;
      totalDelayMinutes: number;
    } | null;
    period: {
      start: string;
      end: string;
    };
  };
  details: DelayReportDetail[];
  filters: ReportFilters;
}

export interface DelayReportDetail {
  employee: {
    id: string;
    name: string;
    dni: string;
  };
  delays: DelayEntry[];
  summary: {
    totalDelays: number;
    totalDelayMinutes: number;
    totalDelayHours: number;
    averageDelayMinutes: number;
  };
}

export interface DelayEntry {
  id: string;
  timestamp: string;
  scheduleStartTime: string;
  delayMinutes: number;
  delayHours: number;
}

// API de Reportes
export const reportsApi = {
  // Obtener tipos de reportes disponibles
  getReportTypes: async () => {
    const response = await apiClient.get('/api/reports/options');
    return response.data;
  },

  // Generar reporte de horas trabajadas
  getTimeReport: async (filters: ReportFilters) => {
    const params = new URLSearchParams();

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      params.append('employeeIds', filters.employeeIds.join(','));
    }

    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);

    if (filters.groupBy) {
      params.append('groupBy', filters.groupBy);
    }

    if (filters.scheduleIds && filters.scheduleIds.length > 0) {
      params.append('scheduleIds', filters.scheduleIds.join(','));
    }

    if (filters.departmentIds && filters.departmentIds.length > 0) {
      params.append('departmentIds', filters.departmentIds.join(','));
    }

    console.log('API Client - Llamando a:', `/api/reports/hours-worked?${params.toString()}`);
    const response = await apiClient.get(`/api/reports/hours-worked?${params.toString()}`);
    console.log('API Client - Respuesta completa:', response);
    console.log('API Client - response.data:', response.data);
    return response.data;
  },

  // Generar reporte de asistencia
  getAttendanceReport: async (filters: ReportFilters) => {
    const params = new URLSearchParams();

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      params.append('employeeIds', filters.employeeIds.join(','));
    }

    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);

    if (filters.scheduleIds && filters.scheduleIds.length > 0) {
      params.append('scheduleIds', filters.scheduleIds.join(','));
    }

    if (filters.departmentIds && filters.departmentIds.length > 0) {
      params.append('departmentIds', filters.departmentIds.join(','));
    }

    console.log('API Client - Llamando a:', `/api/reports/attendance?${params.toString()}`);
    const response = await apiClient.get(`/api/reports/attendance?${params.toString()}`);
    console.log('API Client - Respuesta completa:', response);
    console.log('API Client - response.data:', response.data);
    return response.data;
  },

  // Generar reporte resumido por empleado
  getEmployeeSummaryReport: async (filters: ReportFilters) => {
    const params = new URLSearchParams();

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      params.append('employeeIds', filters.employeeIds.join(','));
    }

    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);

    if (filters.scheduleIds && filters.scheduleIds.length > 0) {
      params.append('scheduleIds', filters.scheduleIds.join(','));
    }

    if (filters.departmentIds && filters.departmentIds.length > 0) {
      params.append('departmentIds', filters.departmentIds.join(','));
    }

    console.log('API Client - Llamando a:', `/api/reports/employee-summary?${params.toString()}`);
    const response = await apiClient.get(`/api/reports/employee-summary?${params.toString()}`);
    console.log('API Client - Respuesta completa:', response);
    console.log('API Client - response.data:', response.data);
    return response.data;
  },

  // Generar reporte de tipos de pausa
  getBreakTypeReport: async (filters: ReportFilters) => {
    const params = new URLSearchParams();

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      params.append('employeeIds', filters.employeeIds.join(','));
    }

    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);

    if (filters.scheduleIds && filters.scheduleIds.length > 0) {
      params.append('scheduleIds', filters.scheduleIds.join(','));
    }

    if (filters.departmentIds && filters.departmentIds.length > 0) {
      params.append('departmentIds', filters.departmentIds.join(','));
    }

    console.log('API Client - Llamando a:', `/api/reports/break-types?${params.toString()}`);
    const response = await apiClient.get(`/api/reports/break-types?${params.toString()}`);
    console.log('API Client - Respuesta completa:', response);
    console.log('API Client - response.data:', response.data);
    return response.data;
  },

  // Generar reporte de retrasos
  getDelayReport: async (filters: ReportFilters) => {
    const params = new URLSearchParams();

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      params.append('employeeIds', filters.employeeIds.join(','));
    }

    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);

    if (filters.scheduleIds && filters.scheduleIds.length > 0) {
      params.append('scheduleIds', filters.scheduleIds.join(','));
    }

    if (filters.departmentIds && filters.departmentIds.length > 0) {
      params.append('departmentIds', filters.departmentIds.join(','));
    }

    console.log('API Client - Llamando a:', `/api/reports/delays?${params.toString()}`);
    const response = await apiClient.get(`/api/reports/delays?${params.toString()}`);
    console.log('API Client - Respuesta completa:', response);
    console.log('API Client - response.data:', response.data);
    return response.data;
  },

  // Generar reporte mensual consolidado
  getMonthlyReport: async (filters: ReportFilters) => {
    const params = new URLSearchParams();

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      params.append('employeeIds', filters.employeeIds.join(','));
    }

    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);

    if (filters.scheduleIds && filters.scheduleIds.length > 0) {
      params.append('scheduleIds', filters.scheduleIds.join(','));
    }

    if (filters.departmentIds && filters.departmentIds.length > 0) {
      params.append('departmentIds', filters.departmentIds.join(','));
    }

    console.log('API Client - Llamando a:', `/api/reports/monthly-consolidated?${params.toString()}`);
    const response = await apiClient.get(`/api/reports/monthly-consolidated?${params.toString()}`);
    console.log('API Client - Respuesta completa:', response);
    console.log('API Client - response.data:', response.data);
    return response.data;
  },

  // Exportar reporte
  exportReport: async (
    reportType: string,
    format: 'csv' | 'pdf' | 'excel',
    filters: ReportFilters,
    exportOptions?: Partial<ExportOptions>
  ) => {
    const params = new URLSearchParams();

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      params.append('employeeIds', filters.employeeIds.join(','));
    }

    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);

    if (filters.groupBy) {
      params.append('groupBy', filters.groupBy);
    }

    if (filters.scheduleIds && filters.scheduleIds.length > 0) {
      params.append('scheduleIds', filters.scheduleIds.join(','));
    }

    if (filters.departmentIds && filters.departmentIds.length > 0) {
      params.append('departmentIds', filters.departmentIds.join(','));
    }

    if (exportOptions?.includeCharts !== undefined) {
      params.append('includeCharts', exportOptions.includeCharts.toString());
    }

    if (exportOptions?.includeDetails !== undefined) {
      params.append('includeDetails', exportOptions.includeDetails.toString());
    }

    if (exportOptions?.email) {
      params.append('email', exportOptions.email);
    }

    const response = await apiClient.get(
      `/api/reports/export/${reportType}/${format}?${params.toString()}`,
      {
        responseType: 'blob' // Para manejar la descarga de archivos
      }
    );

    return response;
  }
};