import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind CSS de forma inteligente
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha en formato español
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const defaultOptions: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options,
    };

    return new Intl.DateTimeFormat('es-ES', defaultOptions).format(dateObj);
}

/**
 * Formatea una hora en formato español
 */
export function formatTime(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(dateObj);
}

/**
 * Formatea fecha y hora en formato español
 */
export function formatDateTime(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(dateObj);
}

/**
 * Formatea un número como moneda en euros
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
    }).format(amount);
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(number: number): string {
    return new Intl.NumberFormat('es-ES').format(number);
}

/**
 * Calcula la diferencia entre dos fechas en formato legible
 */
export function getTimeAgo(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'ahora mismo';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `hace ${diffInMonths} mes${diffInMonths > 1 ? 'es' : ''}`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `hace ${diffInYears} año${diffInYears > 1 ? 's' : ''}`;
}

/**
 * Valida un email
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valida un DNI español
 */
export function isValidDNI(dni: string): boolean {
    const dniRegex = /^[0-9]{8}[A-Z]$/;
    if (!dniRegex.test(dni)) return false;

    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const number = parseInt(dni.slice(0, 8));
    const letter = dni.slice(8, 9);
    const expectedLetter = letters[number % 23];

    return letter === expectedLetter;
}

/**
 * Genera un color aleatorio en formato hexadecimal
 */
export function generateRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalizeWords(text: string): string {
    return text.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Convierte un string a slug
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Genera las iniciales de un nombre
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2);
}

/**
 * Descarga un archivo desde una URL
 */
export function downloadFile(url: string, filename?: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Copia un texto al portapapeles
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Error al copiar al portapapeles:', err);
        return false;
    }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}