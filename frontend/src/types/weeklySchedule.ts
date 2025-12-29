// Tipos para el calendario semanal de horarios

export interface Employee {
    id: string;
    dni: string;
    name: string;
    surname?: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string;
    contractType?: string;
    hireDate?: string;
    salary?: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    employeeSchedules?: Array<{
        id: string;
        employeeId: string;
        scheduleId: string;
        schedule: {
            id: string;
            name: string;
            startTime: string;
            endTime: string;
            color?: string; // Color personalizado para el turno
            dayOfWeek?: number; // Para compatibilidad con datos antiguos
            daysOfWeek?: number[]; // Nuevo formato para múltiples días
            active: boolean;
        };
    }>;
}

export interface Schedule {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    color?: string; // Color personalizado para el turno
    dayOfWeek?: number; // Para compatibilidad con datos antiguos
    daysOfWeek?: number[]; // Nuevo formato para múltiples días
    active: boolean;
}

export interface WeeklySchedule {
    id: string;
    companyId: string;
    employeeId: string;
    weekStart: string;
    dayOfWeek: number;
    scheduleId: string;
    notes?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    schedule?: Schedule;
    employee?: {
        id: string;
        name: string;
        dni: string;
    };
}

export interface WeeklyTemplate {
    id: string;
    companyId: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface WeeklyHoursSummary {
    employeeId: string;
    employeeName: string;
    totalHours: number;
    dailyHours: Array<{
        dayOfWeek: number;
        hours: number;
        schedules: string[];
    }>;
}

export interface DragItem {
    type: 'schedule' | 'weeklySchedule';
    id: string;
    scheduleId?: string;
    employeeId?: string;
    dayOfWeek?: number;
    weekStart?: string;
}

export interface DropZone {
    employeeId: string;
    dayOfWeek: number;
    weekStart: string;
}

export interface CalendarWeek {
    weekStart: string;
    weekEnd: string;
    days: Array<{
        date: string;
        dayOfWeek: number;
        dayName: string;
    }>;
}

export interface WeeklyCalendarState {
    currentWeek: string;
    selectedEmployees: string[];
    schedules: Schedule[];
    weeklySchedules: WeeklySchedule[];
    templates: WeeklyTemplate[];
    isLoading: boolean;
    error?: string;
}