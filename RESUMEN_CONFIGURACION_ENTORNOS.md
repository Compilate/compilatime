# Resumen de Configuración de Entornos - CompilaTime

## 📋 Objetivo

Configurar el proyecto CompilaTime para que funcione **idénticamente en local y en remoto** sin necesidad de cambios manuales en el código al alternar entre entornos.

## ✅ Cambios Realizados

### 1. Frontend - Rutas Relativas

**Archivos modificados:**
- [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts)
- [`frontend/src/lib/superadminApi.ts`](frontend/src/lib/superadminApi.ts)
- [`frontend/src/pages/employee/MisRegistrosPage.tsx`](frontend/src/pages/employee/MisRegistrosPage.tsx)
- [`frontend/src/lib/routeEncryption.ts`](frontend/src/lib/routeEncryption.ts)
- [`frontend/.env.example`](frontend/.env.example)

**Cambios clave:**
- `API_BASE_URL` ahora usa string vacío `''` en lugar de `'http://localhost:4000'`
- Todas las llamadas a la API usan rutas relativas: `/api/...`
- `VITE_API_URL` debe dejarse vacío en ambos entornos

### 2. Backend - CORS Dinámico y Host Configurable

**Archivos modificados:**
- [`backend/src/app.ts`](backend/src/app.ts)
- [`backend/src/server.ts`](backend/src/server.ts)
- [`backend/.env.example`](backend/.env.example)

**Cambios clave:**
- CORS configurado dinámicamente según entorno:
  - Desarrollo: usa `config.cors.origin` o `['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']`
  - Producción: usa `*` (mismo origen con Nginx proxy)
- Host configurable:
  - Desarrollo: `127.0.0.1`
  - Producción: `0.0.0.0`

### 3. Nginx - Proxy Inverso Completo

**Archivo creado:**
- [`nginx/nginx.conf`](nginx/nginx.conf)

**Configuración:**
- Redirección HTTP → HTTPS
- SSL/TLS 1.2/1.3
- Headers de seguridad
- Headers X-Forwarded-*
- Frontend estático servido desde `/`
- API backend proxied a `/api/`
- Soporte para WebSockets
- Health check endpoint

### 4. Documentación Completa

**Archivos creados:**
- [`README.md`](README.md) - Documentación principal del proyecto
- [`ops/DEPLOY_PRODUCTION.md`](ops/DEPLOY_PRODUCTION.md) - Guía de despliegue CON Docker
- [`ops/DEPLOY_PRODUCTION_NO_DOCKER.md`](ops/DEPLOY_PRODUCTION_NO_DOCKER.md) - Guía de despliegue SIN Docker
- [`ops/INSTRUCCIONES_DESPLIEGE_RAPIDO.md`](ops/INSTRUCCIONES_DESPLIEGE_RAPIDO.md) - Instrucciones rápidas
- [`plans/diagnostico-configuracion-entornos.md`](plans/diagnostico-configuracion-entornos.md) - Diagnóstico detallado
- [`plans/parches-y-nginx.md`](plans/parches-y-nginx.md) - Parches de código

### 5. Scripts de Despliegue

**Archivos creados:**
- [`ops/deploy-production.sh`](ops/deploy-production.sh) - Despliegue CON Docker
- [`ops/deploy-production-no-docker.sh`](ops/deploy-production-no-docker.sh) - Despliegue SIN Docker
- [`ops/setup-env.sh`](ops/setup-env.sh) - Configuración automática de archivos .env
- [`ops/diagnose.sh`](ops/diagnose.sh) - Diagnóstico del estado del despliegue

### 6. Archivos de Configuración

**Archivos creados:**
- [`.gitignore`](.gitignore) - Ignorar archivos sensibles
- [`backend/.env`](backend/.env) - Variables de entorno del backend (creado con setup-env.sh)
- [`frontend/.env`](frontend/.env) - Variables de entorno del frontend (creado con setup-env.sh)

## 🚀 Cómo Usar

### Desarrollo Local

1. **Configurar variables de entorno:**
   ```bash
   # backend/.env
   NODE_ENV=development
   DATABASE_URL=postgresql://rafa:C0mp1l@te@192.168.10.107:5432/compilatime
   PORT=4000
   FRONTEND_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:3000

   # frontend/.env
   VITE_API_URL=
   VITE_DEV_DOMAIN=http://localhost:3000
   ```

2. **Iniciar backend:**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run dev
   ```

3. **Iniciar frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Acceder:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:4000
   - Vite proxy: `/api` → `http://localhost:4000`

### Producción (SIN Docker)

1. **Configurar variables de entorno:**
   ```bash
   sudo ./ops/setup-env.sh
   ```

2. **Diagnosticar estado:**
   ```bash
   sudo ./ops/diagnose.sh
   ```

3. **Desplegar:**
   ```bash
   sudo ./ops/deploy-production-no-docker.sh
   ```

4. **Configurar Nginx:**
   ```bash
   sudo cp nginx/nginx.conf /etc/nginx/sites-available/compilatime
   sudo ln -s /etc/nginx/sites-available/compilatime /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Verificar:**
   ```bash
   pm2 status
   sudo systemctl status nginx
   ```

### Producción (CON Docker)

1. **Configurar variables de entorno:**
   ```bash
   sudo ./ops/setup-env.sh
   ```

2. **Desplegar:**
   ```bash
   sudo ./ops/deploy-production.sh
   ```

3. **Verificar:**
   ```bash
   docker-compose ps
   sudo systemctl status nginx
   ```

## 📊 Variables de Entorno

### Backend (.env)

| Variable | Desarrollo | Producción | Descripción |
|----------|-----------|------------|-------------|
| `NODE_ENV` | `development` | `production` | Entorno de ejecución |
| `DATABASE_URL` | `postgresql://...` | `postgresql://...` | URL de conexión a PostgreSQL |
| `PORT` | `4000` | `4000` | Puerto del backend |
| `FRONTEND_URL` | `http://localhost:3000` | `http://192.168.10.107` | URL del frontend |
| `CORS_ORIGIN` | `http://localhost:3000` | `http://192.168.10.107` | Orígenes permitidos para CORS |
| `JWT_SECRET` | (generado) | (generado) | Secreto para firmar JWT |
| `REDIS_URL` | `redis://localhost:6379` | `redis://localhost:6379` | URL de conexión a Redis |

### Frontend (.env)

| Variable | Desarrollo | Producción | Descripción |
|----------|-----------|------------|-------------|
| `VITE_API_URL` | `` (vacío) | `` (vacío) | **IMPORTANTE**: Debe estar vacío |
| `VITE_DEV_DOMAIN` | `http://localhost:3000` | `http://192.168.10.107` | Dominio para desarrollo |

## ⚠️ Reglas de Oro

1. **NUNCA** hardcodear URLs en el código
2. **SIEMPRE** usar rutas relativas `/api/...` en el frontend
3. **SIEMPRE** dejar `VITE_API_URL` vacío en ambos entornos
4. **SIEMPRE** usar variables de entorno para configuración
5. **NUNCA** hacer cambios manuales al alternar entre entornos

## 🔍 Checklist de Validación

### Local
- [ ] Frontend inicia en http://localhost:3000
- [ ] Backend inicia en http://localhost:4000
- [ ] Vite proxy funciona: `/api` → `http://localhost:4000`
- [ ] Login funciona con cookies HTTPOnly
- [ ] No hay errores de CORS en la consola

### Producción
- [ ] Frontend se sirve desde Nginx en `/`
- [ ] Backend se ejecuta con PM2 en `0.0.0.0:4000`
- [ ] Nginx proxy funciona: `/api/` → `http://localhost:4000`
- [ ] Login funciona con cookies HTTPOnly
- [ ] No hay errores de CORS en la consola
- [ ] HTTPS funciona correctamente
- [ ] Certificados SSL son válidos

## 📚 Documentación Adicional

- [`README.md`](README.md) - Documentación principal
- [`ops/DEPLOY_PRODUCTION.md`](ops/DEPLOY_PRODUCTION.md) - Guía de despliegue CON Docker
- [`ops/DEPLOY_PRODUCTION_NO_DOCKER.md`](ops/DEPLOY_PRODUCTION_NO_DOCKER.md) - Guía de despliegue SIN Docker
- [`ops/INSTRUCCIONES_DESPLIEGE_RAPIDO.md`](ops/INSTRUCCIONES_DESPLIEGE_RAPIDO.md) - Instrucciones rápidas
- [`plans/diagnostico-configuracion-entornos.md`](plans/diagnostico-configuracion-entornos.md) - Diagnóstico detallado
- [`plans/parches-y-nginx.md`](plans/parches-y-nginx.md) - Parches de código

## 🎯 Resumen

El proyecto CompilaTime ahora está configurado para funcionar **idénticamente en local y en remoto** sin necesidad de cambios manuales en el código. El frontend usa rutas relativas `/api/...`, el backend escucha en `0.0.0.0` en producción con CORS dinámico, y Nginx actúa como proxy inverso para enrutar el tráfico correctamente.

**Todo listo para desplegar en producción sin tocar código.** 🚀
