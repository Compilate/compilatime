# Diagnóstico: Configuración de Entornos (Local/Remoto)

## A) DIAGNÓSTICO - Hallazgos

### 1. FRONTEND - Problemas Detectados

#### 1.1 URLs Hardcodeadas en API Client

**Archivo: `frontend/src/lib/api.ts`**
- **Línea 4**: `const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';`
  - **Problema**: Usa URL completa con dominio hardcodeado como fallback
  - **Impacto**: En producción, si `VITE_API_URL` no está definido, apunta a localhost

- **Línea 702**: `const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';` (en `exportWeeklySchedule`)
- **Línea 771**: `const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';` (en `exportReport`)

**Archivo: `frontend/src/lib/superadminApi.ts`**
- **Línea 279**: `this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';`
  - **Problema**: Mismo problema que api.ts

**Archivo: `frontend/src/pages/employee/MisRegistrosPage.tsx`**
- **Línea 111**: `const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';`

**Archivo: `frontend/src/lib/routeEncryption.ts`**
- **Línea 140**: `const devDomain = process.env.VITE_DEV_DOMAIN || 'http://localhost:3000';`
  - **Problema**: URL hardcodeada para desarrollo

#### 1.2 Configuración de Vite Proxy

**Archivo: `frontend/vite.config.ts`**
- **Líneas 10-16**: Proxy configurado correctamente
  ```typescript
  proxy: {
      '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
      },
  },
  ```
  - **Estado**: ✅ CORRECTO para desarrollo local
  - **Nota**: El target `http://localhost:4000` es correcto para desarrollo local

#### 1.3 Variables de Entorno

**Archivo: `frontend/.env.example`**
- **Línea 2**: `VITE_API_URL=http://localhost:4000`
  - **Problema**: Valor por defecto hardcodeado
  - **Impacto**: En producción, si no se sobreescribe, apunta a localhost

#### 1.4 Scripts de Desarrollo

**Archivo: `frontend/package.json`**
- **Línea 7**: `"dev": "vite --host 0.0.0.0"` ✅ CORRECTO
- **Línea 8**: `"dev:local": "vite"` ✅ CORRECTO

### 2. BACKEND - Problemas Detectados

#### 2.1 CORS Hardcodeado

**Archivo: `backend/src/app.ts`**
- **Línea 47**: `origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']`
  - **Problema**: Orígenes hardcodeados
  - **Impacto**: En producción, no aceptará peticiones del dominio real
  - **Solución**: Usar variable de entorno `CORS_ORIGIN` o `*` en producción

#### 2.2 Rutas del Backend

**Archivo: `backend/src/app.ts`**
- **Líneas 86-106**: Todas las rutas API están bajo `/api/...` ✅ CORRECTO
- **Línea 96**: `app.use('/admin', superadminRoutes);` - Ruta sin `/api` (compatibilidad)
- **Línea 97**: `app.use('/api/admin', superadminRoutes);` - Ruta con `/api`
- **Línea 120**: `app.use(employeeRoutes);` - Ruta comodín sin prefijo (para códigos de empresa)

**Estado**: ✅ Las rutas principales están correctamente bajo `/api/`

#### 2.3 Configuración del Servidor

**Archivo: `backend/src/server.ts`**
- **Línea 24**: `app.listen(env.PORT, ...)`
  - **Problema**: No especifica host, escucha en `127.0.0.1` por defecto
  - **Impacto**: En producción con Docker/Nginx, debe escuchar en `0.0.0.0`
  - **Solución**: Agregar `host: '0.0.0.0'` o usar variable de entorno

#### 2.4 Variables de Entorno

**Archivo: `backend/.env.example`**
- **Línea 5**: `PORT=4000` ✅ CORRECTO
- **Línea 33**: `FRONTEND_URL="http://localhost:3000"` - Hardcodeado
- **Línea 41**: `CORS_ORIGIN="http://localhost:3000"` - Hardcodeado

**Archivo: `backend/src/config/env.ts`**
- **Línea 40**: `FRONTEND_URL: z.string().default('http://localhost:3000')`
- **Línea 48**: `CORS_ORIGIN: z.string().default('http://localhost:3000')`

### 3. COOKIES Y AUTENTICACIÓN

**Archivo: `frontend/src/contexts/SuperadminAuthContext.tsx`**
- **Líneas 59, 64, 72, 85, 182**: Referencias a `localhost` para detectar entorno local
  - **Estado**: ✅ ACEPTABLE - Es para configurar cookies correctamente en desarrollo

**Archivo: `backend/src/middlewares/authMiddleware.ts`**
- **Estado**: ✅ CORRECTO - Usa JWT en Authorization header, no depende de cookies para API

### 4. DOCKER Y NGINX

**Archivo: `docker-compose.yml`**
- **Líneas 98-113**: Servicio nginx configurado
  - **Problema**: Referencia a `./nginx/nginx.conf` que no existe en el proyecto
  - **Impacto**: El despliegue con Docker fallará sin este archivo

### 5. DOCUMENTACIÓN

- **Estado**: ❌ NO EXISTE `README.md` en la raíz del proyecto
- **Impacto**: No hay documentación centralizada sobre cómo configurar entornos

---

## B) PLAN DE CAMBIOS

### Cambios Prioritarios (Obligatorios)

#### 1. Frontend - Eliminar URLs Hardcodeadas

**Objetivo**: El frontend debe usar rutas relativas `/api/...` sin dominio

**Archivos a modificar**:
1. `frontend/src/lib/api.ts` - Cambiar `API_BASE_URL` a `''` (cadena vacía)
2. `frontend/src/lib/superadminApi.ts` - Cambiar `baseUrl` a `''`
3. `frontend/src/pages/employee/MisRegistrosPage.tsx` - Eliminar uso de `apiUrl` completo
4. `frontend/src/lib/routeEncryption.ts` - Eliminar `devDomain` hardcodeado

**Nota**: Las funciones de exportación (`exportWeeklySchedule`, `exportReport`) que usan `fetch` directo también deben usar rutas relativas.

#### 2. Frontend - Actualizar .env.example

**Archivo**: `frontend/.env.example`
- Cambiar `VITE_API_URL=http://localhost:4000` a `VITE_API_URL=` (vacío o sin valor)
- Agregar comentarios explicando que en producción no se necesita

#### 3. Backend - Configurar CORS Dinámico

**Archivo**: `backend/src/app.ts`
- Cambiar `origin` hardcodeado a usar variable de entorno
- En desarrollo: usar `config.cors.origin`
- En producción: usar `*` o el dominio real desde `FRONTEND_URL`

#### 4. Backend - Escuchar en 0.0.0.0

**Archivo**: `backend/src/server.ts`
- Agregar `host: '0.0.0.0'` al `app.listen()`

#### 5. Backend - Actualizar .env.example

**Archivo**: `backend/.env.example`
- Cambiar `FRONTEND_URL` y `CORS_ORIGIN` a valores dinámicos
- Agregar comentarios explicando configuración para producción

#### 6. Crear Configuración Nginx

**Archivo nuevo**: `nginx/nginx.conf`
- Configurar proxy inverso para `/` → frontend
- Configurar proxy inverso para `/api/` → backend
- Configurar headers necesarios (X-Forwarded-*, Host, etc.)
- Configurar soporte para websockets si es necesario

#### 7. Crear README.md

**Archivo nuevo**: `README.md`
- Instrucciones para levantar local (frontend+backend+db+redis)
- Instrucciones para desplegar remoto con Nginx
- Variables de entorno a configurar
- Checklist de "no tocar URLs en el código"

### Cambios Opcionales (Mejoras)

1. Crear `.env.local.example` y `.env.production.example` para clarificar configuraciones
2. Agregar script `npm run dev:all` para levantar frontend y backend juntos
3. Agregar validación de variables de entorno al inicio

---

## C) PARCHES DE CÓDIGO

Los parches específicos se generarán en la siguiente sección del plan.
