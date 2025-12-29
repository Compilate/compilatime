// Tipos para el módulo de reportes

export interface ReportFilters {
  companyId: string;
  employeeIds?: string[];
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  scheduleIds?: string[];
  departmentIds?: string[];
}

export type ReportType = 'time' | 'attendance' | 'employee-summary' | 'monthly' | 'delays';

export interface ReportResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

// Reporte de horas trabajadas
export interface TimeReportData {
  summary: {
    totalHours: number;
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

// Reporte de asistencia
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
    totalDelayMinutes: number;
  };
}

// Reporte resumido por empleado
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
    totalDelayMinutes: number;
    averageHoursPerDay: number;
  };
  hoursBySchedule: HoursBySchedule[];
}

export interface HoursBySchedule {
  scheduleName: string;
  hours: number;
}

// Reporte mensual consolidado
export interface MonthlyReportData {
  periodInfo: {
    startDate: string;
    endDate: string;
    daysInPeriod: number;
    workDays: number;
  };
  timeSummary: {
    totalHours: number;
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

// Opciones de exportación
export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  includeCharts?: boolean;
  includeDetails?: boolean;
  email?: string;
}

// Datos para gráficos
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

// Tipos de gráficos soportados
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar';

export interface ChartConfig {
  type: ChartType;
  data: ChartData;
  options?: any;
}

// Reporte de tipos de pausa
export interface BreakTypeReportData {
  summary: {
    totalBreakMinutes: number;
    totalBreakHours: number;
    totalBreakEntries: number;
    averageBreakDuration: number;
    mostUsedBreakType: any;
  };
  details: BreakTypeDetail[];
  filters: ReportFilters;
}

export interface BreakTypeDetail {
  breakType: {
    id: string;
    name: string;
    description?: string;
    color: string;
    active: boolean;
    requiresReason: boolean;
    maxMinutes?: number;
  };
  totalMinutes: number;
  totalHours: number;
  entryCount: number;
  employeeCount: number;
  entries: BreakEntryDetail[];
}

export interface BreakEntryDetail {
  id: string;
  timestamp: string;
  employee: {
    id: string;
    name: string;
    dni: string;
  };
  duration: number | null;
}

// Reporte de retrasos
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
  details: DelayDetail[];
  filters: ReportFilters;
}

export interface DelayDetail {
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