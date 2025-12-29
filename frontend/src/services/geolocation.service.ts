/**
 * Servicio de geolocalización para el sistema de fichaje
 */

export interface GeolocationPosition {
    latitude: number;
    longitude: number;
    accuracy: number;
}

export interface GeolocationError {
    code: number;
    message: string;
}

export class GeolocationService {
    private static instance: GeolocationService;
    // private watchId: number | null = null;

    private constructor() { }

    public static getInstance(): GeolocationService {
        if (!GeolocationService.instance) {
            GeolocationService.instance = new GeolocationService();
        }
        return GeolocationService.instance;
    }

    /**
     * Verifica si el navegador soporta geolocalización
     */
    public isSupported(): boolean {
        return 'geolocation' in navigator;
    }

    /**
     * Obtiene la posición actual del usuario
     */
    public getCurrentPosition(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            if (!this.isSupported()) {
                reject({
                    code: 0,
                    message: 'La geolocalización no es compatible con este navegador'
                });
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    reject({
                        code: error.code,
                        message: this.getErrorMessage(error.code)
                    });
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutos
                }
            );
        });
    }

    /**
     * Calcula la distancia entre dos coordenadas en metros
     */
    public calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371e3; // Radio de la Tierra en metros
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // en metros
    }

    /**
     * Verifica si una coordenada está dentro del radio permitido
     */
    public isWithinGeofence(
        userLat: number,
        userLon: number,
        companyLat: number,
        companyLon: number,
        radius: number
    ): boolean {
        const distance = this.calculateDistance(userLat, userLon, companyLat, companyLon);
        return distance <= radius;
    }

    /**
     * Obtiene mensaje de error según el código
     */
    private getErrorMessage(code: number): string {
        switch (code) {
            case 1:
                return 'Permiso denegado. Por favor, habilita la geolocalización en tu navegador.';
            case 2:
                return 'Posición no disponible. Inténtalo de nuevo.';
            case 3:
                return 'Tiempo de espera agotado. Inténtalo de nuevo.';
            default:
                return 'Error desconocido al obtener la geolocalización.';
        }
    }

    /**
     * Solicita permisos de geolocalización
     */
    public async requestPermission(): Promise<PermissionState> {
        if (!this.isSupported()) {
            return 'denied';
        }

        try {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            return permission.state;
        } catch (error) {
            console.warn('Error al verificar permisos de geolocalización:', error);
            return 'prompt';
        }
    }
}

export default GeolocationService;