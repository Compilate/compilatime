# Sistema Multi-Empresa para Empleados

## Overview

El sistema multi-empresa de CompilaTime permite que un mismo empleado pueda trabajar en múltiples empresas, manteniendo registros separados y permitiendo el acceso específico a cada empresa.

## Arquitectura

### Base de Datos

1. **Employee**: Tabla global de empleados (sin companyId)
2. **EmployeeCompany**: Tabla intermedia que relaciona empleados con empresas
3. **Company**: Tabla de empresas con relación a EmployeeCompany

### Flujo de Autenticación

1. El empleado introduce DNI y PIN
2. El sistema busca todas las empresas asignadas al empleado
3. Si hay una sola empresa: acceso directo
4. Si hay múltiples empresas: pantalla de selección
5. Autenticación específica para la empresa seleccionada

## URLs y Rutas

### Estructura de URLs

```
/{codigo_empresa_encriptado}/{area}/{ruta}
```

### Ejemplos

- Login de empleado: `/{encrypted_code}/area/login`
- Fichaje: `/{encrypted_code}/area/fichar`
- Portal empresa: `/{encrypted_code}/portal/login`
- Dashboard empleado: `/{encrypted_code}/portal/dashboard`

### Áreas Disponibles

- **/area**: Área de empleados (fichaje, perfil, etc.)
- **/portal**: Portal de administración de empresa

## Componentes Clave

### 1. AuthContext

Gestiona la autenticación multi-empresa:

```typescript
// Login multi-empresa
const { loginEmployeeMultiCompany, getEmployeeCompanies } = useAuth();

// Obtener empresas de un empleado
const companies = await getEmployeeCompanies(dni);

// Login en empresa específica
await loginEmployeeMultiCompany({
    dni: '12345678A',
    pin: '1234',
    companyId: 'company-id'
});
```

### 2. useSecureNavigation

Hook para navegación segura con códigos encriptados:

```typescript
const { 
    navigateToCompany,
    getCurrentCompanyCode,
    getCompanyUrls 
} = useSecureNavigation();

// Navegar a empresa específica
navigateToCompany('company-id', '/area/fichar');

// Obtener código de empresa actual
const currentCode = getCurrentCompanyCode();

// Generar URLs seguras
const urls = getCompanyUrls('company-id');
```

### 3. SelectCompanyPage

Página para selección de empresa cuando un empleado está asignado a múltiples empresas.

### 4. FicharPage

Componente de fichaje actualizado para soporte multi-empresa:

- Detecta automáticamente si hay código de empresa en URL
- Muestra selección de empresas si es necesario
- Valida fichaje en empresa correcta

## Flujo de Usuario

### Empleado con una sola empresa

1. Accede a URL de empresa: `/{encrypted_code}/area/login`
2. Introduce DNI y PIN
3. Acceso directo al área personal

### Empleado con múltiples empresas

1. Accede a URL de selección: `/portal/select-company`
2. Introduce DNI y PIN
3. Selecciona empresa de la lista
4. Acceso al área personal de la empresa seleccionada

### Fichaje

1. Accede a URL: `/{encrypted_code}/area/fichar`
2. Introduce DNI y PIN
3. Si está en múltiples empresas: selecciona empresa
4. Realiza fichaje validado para la empresa correcta

## Seguridad

### Encriptación de URLs

- Los códigos de empresa se encriptan usando AES-256
- Clave de encriptación configurable en variables de entorno
- URLs seguras previenen acceso no autorizado

### Validación de Acceso

- Cada fichaje se valida contra la empresa específica
- Los tokens JWT incluyen companyId
- Middleware de autenticación verifica empresa

## Configuración

### Variables de Entorno

```env
# Clave para encriptación de URLs
ENCRYPTION_KEY=compilatime-secret-key-2024

# Configuración de geolocalización
GEOLOCATION_ENABLED=true
GEOFENCE_DEFAULT_RADIUS=100
```

### Configuración de Empresa

```typescript
interface Company {
    id: string;
    name: string;
    slug: string;
    latitude?: number;
    longitude?: number;
    geofenceRadius?: number;
    requireGeolocation?: boolean;
    // ... otras propiedades
}
```

## API Endpoints

### Autenticación Multi-Empresa

```typescript
// Obtener empresas de un empleado
GET /auth/employee/companies/{dni}

// Login en empresa específica
POST /auth/employee/login-multi-company
{
    "dni": "12345678A",
    "pin": "1234",
    "companyId": "company-id"
}
```

### Fichaje con Empresa

```typescript
// Fichar en empresa específica (requiere token con companyId)
POST /{companyId}/employee/punch
{
    "type": "IN" | "OUT",
    "isRemoteWork": boolean,
    "latitude": number,
    "longitude": number
}
```

## Manejo de Errores

### Casos Comunes

1. **Empleado no encontrado**: Verificar DNI y estado activo
2. **No asignado a empresa**: Verificar tabla EmployeeCompany
3. **Código inválido**: Verificar encriptación/desencriptación
4. **Acceso denegado**: Verificar permisos en empresa específica

### Mensajes de Error

```typescript
interface ErrorResponse {
    success: false;
    message: string;
    code: 'EMPLOYEE_NOT_FOUND' | 'INVALID_CREDENTIALS' | 'EMPLOYEE_NOT_ASSIGNED_TO_COMPANY';
}
```

## Testing

### Casos de Prueba

1. **Empleado único empresa**
   - Login directo
   - Fichaje correcto
   - Acceso a todas las áreas

2. **Empleado múltiples empresas**
   - Selección de empresa
   - Cambio entre empresas
   - Datos aislados por empresa

3. **Validación de geolocalización**
   - Fichaje dentro de geovalla
   - Fichaje fuera de geovalla
   - Teletrabajo

## Deployment

### Consideraciones

1. **Base de Datos**: Asegurar migración de EmployeeCompany
2. **Tokens**: Regenerar tokens existentes si es necesario
3. **URLs**: Actualizar enlaces existentes a formato encriptado
4. **Testing**: Probar flujo completo con datos reales

## Monitoreo

### Métricas Clave

- Tasa de éxito de login multi-empresa
- Tiempo de selección de empresa
- Errores de encriptación/desencriptación
- Uso de fichaje por empresa

### Logs

```typescript
// Ejemplo de log de acceso
{
    "timestamp": "2024-01-01T12:00:00Z",
    "employeeId": "emp-123",
    "companyId": "comp-456",
    "action": "LOGIN_SUCCESS",
    "source": "MULTI_COMPANY_SELECT"
}
```

## Troubleshooting

### Problemas Comunes

1. **Error 401 al cambiar de empresa**
   - Limpiar localStorage
   - Verificar token refresh

2. **URL encriptada inválida**
   - Verificar clave de encriptación
   - Regenerar enlaces

3. **Empleado no aparece en empresa**
   - Verificar tabla EmployeeCompany
   - Verificar estado activo

### Herramientas de Depuración

```typescript
// Ver empresas de empleado
console.log(await getEmployeeCompanies('12345678A'));

// Ver código actual
console.log(getCurrentCompanyCode());

// Verificar encriptación
console.log(encryptText('company-id'));
console.log(decryptText('encrypted-code'));
```

## Mejoras Futuras

1. **Cambio rápido de empresa**: Selector en header
2. **Favoritos**: Empresas marcadas como favoritas
3. **Historial**: Últimas empresas accedidas
4. **Offline**: Soporte para fichaje sin conexión
5. **Móvil**: App nativa con soporte multi-empresa

## Soporte

Para problemas o preguntas sobre el sistema multi-empresa:

1. Verificar logs del servidor
2. Revisar configuración de base de datos
3. Validar encriptación de URLs
4. Contactar al equipo de desarrollo

---

*Última actualización: Diciembre 2024*
*Versión: 1.0.0*