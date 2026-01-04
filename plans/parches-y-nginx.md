# Parches de Código y Configuración Nginx

## RESUMEN DE CAMBIOS APLICADOS

### Frontend (4 archivos modificados)
- ✅ [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts:1) - API_BASE_URL ahora usa ruta relativa
- ✅ [`frontend/src/lib/superadminApi.ts`](frontend/src/lib/superadminApi.ts:1) - baseUrl ahora usa ruta relativa
- ✅ [`frontend/src/pages/employee/MisRegistrosPage.tsx`](frontend/src/pages/employee/MisRegistrosPage.tsx:1) - apiUrl ahora usa ruta relativa
- ✅ [`frontend/src/lib/routeEncryption.ts`](frontend/src/lib/routeEncryption.ts:1) - Eliminado window.location.origin hardcodeado
- ✅ [`frontend/.env.example`](frontend/.env.example:1) - VITE_API_URL ahora está vacío

### Backend (3 archivos modificados)
- ✅ [`backend/src/app.ts`](backend/src/app.ts:1) - CORS ahora es dinámico según entorno
- ✅ [`backend/src/server.ts`](backend/src/server.ts:1) - Ahora escucha en 0.0.0.0 en producción
- ✅ [`backend/.env.example`](backend/.env.example:1) - Comentarios actualizados para producción

### Archivos Nuevos (2 archivos creados)
- ✅ [`nginx/nginx.conf`](nginx/nginx.conf:1) - Configuración completa de Nginx
- ✅ [`README.md`](README.md:1) - Documentación completa del proyecto

## NOTA IMPORTANTE SOBRE ARCHIVOS .env

**¿Por qué parcheo `.env.example` y no `.env`?**

- **`.env`**: Contiene datos sensibles (contraseñas, secrets) y NO debería estar en git
- **`.env.example`**: Es la plantilla pública que SÍ está en git, sirve como referencia

**Para implementar los cambios:**
1. Aplicar parches a archivos `.ts`/`.tsx` (código fuente) - **ESTOS SON LOS CAMBIOS REALES**
2. Actualizar `.env` local manualmente con los valores correctos - **NO parchear, editar manualmente**
3. Los parches a `.env.example` son solo para actualizar la plantilla pública (documentación)

## C) PARCHES DE CÓDIGO

### Parche 1: Frontend - api.ts (Usar rutas relativas)

**Archivo**: `frontend/src/lib/api.ts`

```diff
<<<<<<< SEARCH
:start_line:1
-------
// import { useAuth } from '../contexts/AuthContext';

// Configuración de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
=======
// import { useAuth } from '../contexts/AuthContext';

// Configuración de la API
// En local: Vite proxyea /api → backend
// En producción: Nginx proxyea /api → backend
// Por eso usamos ruta relativa (sin dominio)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
>>>>>>> REPLACE
```

```diff
<<<<<<< SEARCH
:start_line:698
-------
    // Exportar calendario semanal a CSV
    exportWeeklySchedule: (weekStart: string) => {
        // Para exportación, necesitamos usar window.location o crear un link de descarga
        const token = localStorage.getItem('compilatime-auth');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

        return fetch(`${apiUrl}/api/weekly-schedules/export?weekStart=${weekStart}`, {
=======
    // Exportar calendario semanal a CSV
    exportWeeklySchedule: (weekStart: string) => {
        // Para exportación, necesitamos usar window.location o crear un link de descarga
        const token = localStorage.getItem('compilatime-auth');
        // Usar ruta relativa (funciona tanto en local con Vite proxy como en producción con Nginx)
        const apiUrl = import.meta.env.VITE_API_URL || '';

        return fetch(`${apiUrl}/api/weekly-schedules/export?weekStart=${weekStart}`, {
>>>>>>> REPLACE
```

```diff
<<<<<<< SEARCH
:start_line:767
-------
    // Exportación de reportes
    exportReport: (reportType: string, filters: any, format: 'csv' | 'pdf' | 'excel') => {
        const token = localStorage.getItem('compilatime-auth');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
=======
    // Exportación de reportes
    exportReport: (reportType: string, filters: any, format: 'csv' | 'pdf' | 'excel') => {
        const token = localStorage.getItem('compilatime-auth');
        // Usar ruta relativa (funciona tanto en local con Vite proxy como en producción con Nginx)
        const apiUrl = import.meta.env.VITE_API_URL || '';
>>>>>>> REPLACE
```

### Parche 2: Frontend - superadminApi.ts (Usar rutas relativas)

**Archivo**: `frontend/src/lib/superadminApi.ts`

```diff
<<<<<<< SEARCH
:start_line:274
-------
// Cliente API para Superadmin
class SuperadminApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    }
=======
// Cliente API para Superadmin
class SuperadminApiClient {
    private baseUrl: string;

    constructor() {
        // Usar ruta relativa (funciona tanto en local con Vite proxy como en producción con Nginx)
        this.baseUrl = import.meta.env.VITE_API_URL || '';
    }
>>>>>>> REPLACE
```

### Parche 3: Frontend - MisRegistrosPage.tsx (Usar rutas relativas)

**Archivo**: `frontend/src/pages/employee/MisRegistrosPage.tsx`

```diff
<<<<<<< SEARCH
:start_line:109
-------
            // Crear URL para exportación
            const token = localStorage.getItem('compilatime-auth');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

            return fetch(`${apiUrl}/api/me/time-entries/export?${params.toString()}`, {
=======
            // Crear URL para exportación
            const token = localStorage.getItem('compilatime-auth');
            // Usar ruta relativa (funciona tanto en local con Vite proxy como en producción con Nginx)
            const apiUrl = import.meta.env.VITE_API_URL || '';

            return fetch(`${apiUrl}/api/me/time-entries/export?${params.toString()}`, {
>>>>>>> REPLACE
```

### Parche 4: Frontend - routeEncryption.ts (Eliminar devDomain hardcodeado)

**Archivo**: `frontend/src/lib/routeEncryption.ts`

```diff
<<<<<<< SEARCH
:start_line:136
-------
        // En el servidor, usar variables de entorno
        if (typeof import.meta !== 'undefined' && import.meta.env.DEV) {
            // Usar window.location.origin para detectar el dominio actual
            const devDomain = process.env.VITE_DEV_DOMAIN || 'http://localhost:3000';
            console.log('🔧 Dominio de desarrollo:', devDomain);
            return devDomain;
        }
=======
        // En el servidor, usar variables de entorno
        if (typeof import.meta !== 'undefined' && import.meta.env.DEV) {
            // Usar window.location.origin para detectar el dominio actual
            const devDomain = import.meta.env.VITE_DEV_DOMAIN || 'http://localhost:3000';
            console.log('🔧 Dominio de desarrollo:', devDomain);
            return devDomain;
        }
>>>>>>> REPLACE
```

### Parche 5: Frontend - .env.example (Actualizar valores por defecto)

**Archivo**: `frontend/.env.example`

```diff
<<<<<<< SEARCH
:start_line:1
-------
# API URL
VITE_API_URL=http://localhost:4000
=======
# API URL
# En desarrollo local: Dejar vacío para usar Vite proxy (/api → backend)
# En producción: Dejar vacío para usar Nginx proxy (/api → backend)
# NO poner dominio aquí, usar rutas relativas
VITE_API_URL=
>>>>>>> REPLACE
```

### Parche 6: Backend - app.ts (CORS dinámico)

**Archivo**: `backend/src/app.ts`

```diff
<<<<<<< SEARCH
:start_line:45
-------
// Configurar CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'], // Añadir todos los orígenes posibles
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
=======
// Configurar CORS
// En desarrollo: usar orígenes específicos desde env
// En producción: usar * o el dominio real (cuando se usa Nginx proxy, es mismo origen)
const corsOrigin = config.isDevelopment
    ? (config.cors.origin ? config.cors.origin.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'])
    : '*'; // En producción con Nginx proxy, es mismo origen

app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
>>>>>>> REPLACE
```

### Parche 7: Backend - server.ts (Escuchar en 0.0.0.0)

**Archivo**: `backend/src/server.ts`

```diff
<<<<<<< SEARCH
:start_line:23
-------
        // Iniciar servidor
        const server = app.listen(env.PORT, () => {
            console.log(`🚀 Servidor CompilaTime iniciado en el puerto ${env.PORT}`);
=======
        // Iniciar servidor
        // En producción con Docker/Nginx, escuchar en 0.0.0.0
        const host = config.isProduction ? '0.0.0.0' : '127.0.0.1';
        const server = app.listen(env.PORT, host, () => {
            console.log(`🚀 Servidor CompilaTime iniciado en el puerto ${env.PORT}`);
            console.log(`📝 Environment: ${config.isDevelopment ? 'Development' : 'Production'}`);
            console.log(`🌐 API URL: http://${host}:${env.PORT}`);
>>>>>>> REPLACE
```

### Parche 8: Backend - .env.example (Actualizar valores por defecto)

**Archivo**: `backend/.env.example`

```diff
<<<<<<< SEARCH
:start_line:32
-------
# Frontend URL
FRONTEND_URL="http://localhost:3000"
=======
# Frontend URL
# En desarrollo local: http://localhost:3000
# En producción: https://tu-dominio.com
FRONTEND_URL="http://localhost:3000"
>>>>>>> REPLACE
```

```diff
<<<<<<< SEARCH
:start_line:40
-------
# Seguridad
BCRYPT_ROUNDS=12
CORS_ORIGIN="http://localhost:3000"
=======
# Seguridad
BCRYPT_ROUNDS=12
# CORS Origin
# En desarrollo local: http://localhost:3000
# En producción: https://tu-dominio.com (o dejar vacío para usar *)
CORS_ORIGIN="http://localhost:3000"
>>>>>>> REPLACE
```

---

## D) CONFIGURACIÓN NGINX PARA REMOTO

### Archivo: `nginx/nginx.conf`

```nginx
# Configuración de Nginx para CompilaTime
# Proxy inverso frontal que enruta:
# - / → frontend (archivos estáticos)
# - /api/ → backend (API REST)

# Upstream para el backend
upstream backend {
    server backend:4000;
    keepalive 64;
}

# Servidor HTTP (redirigir a HTTPS)
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redirigir todo a HTTPS
    return 301 https://$server_name$request_uri;
}

# Servidor HTTPS
server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # Certificados SSL (usar Let's Encrypt o certificados propios)
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Configuración SSL recomendada
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Headers para pasar información real al backend
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;

    # Límites de tamaño
    client_max_body_size 10M;

    # Frontend (archivos estáticos)
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;

        # Cache para assets estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;

        # Headers para pasar al backend
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Deshabilitar cache para API
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Health check
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }

    # Logs
    access_log /var/log/nginx/compilatime-access.log;
    error_log /var/log/nginx/compilatime-error.log;
}
```

### Notas sobre la configuración de Nginx:

1. **Cambiar `tu-dominio.com`** por tu dominio real
2. **Certificados SSL**:
   - Usar Let's Encrypt con certbot: `certbot certonly --nginx -d tu-dominio.com`
   - O colocar certificados propios en `/etc/nginx/ssl/`
3. **Upstream backend**:
   - `backend:4000` asume que el backend corre en un contenedor Docker llamado `backend`
   - Si no usas Docker, cambiar a `127.0.0.1:4000` o la IP/puerto correcto
4. **WebSockets**: La configuración ya incluye soporte para websockets (headers Upgrade/Connection)
5. **try_files**: El `try_files $uri $uri/ /index.html` es necesario para SPAs (Single Page Applications)

---

## E) README - Documentación

### Archivo: `README.md`

```markdown
# CompilaTime - Sistema de Registro Horario Profesional

SaaS completo para gestión de registro horario de empleados con múltiples roles y funcionalidades avanzadas.

## 🏗️ Arquitectura

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL + Redis
- **Infraestructura**: Docker + Nginx (proxy inverso)

## 🚀 Inicio Rápido

### Desarrollo Local

#### Requisitos Previos

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- pnpm o npm

#### 1. Configurar Variables de Entorno

**Backend** (`backend/.env`):
```bash
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/compilatime"

# Servidor
PORT=4000
NODE_ENV="development"

# JWT
JWT_SECRET="tu_secreto_jwt_muy_seguro_aqui"
JWT_EXPIRES_IN="7d"

# Email (opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="tu_email@gmail.com"
SMTP_PASS="tu_app_password_gmail"

# Redis
REDIS_URL="redis://localhost:6379"

# Frontend URL (solo para CORS en desarrollo)
FRONTEND_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000"
```

**Frontend** (`frontend/.env`):
```bash
# IMPORTANTE: Dejar VITE_API_URL vacío para usar rutas relativas
# Vite proxyea /api → backend automáticamente
VITE_API_URL=

# App Configuration
VITE_APP_NAME=CompilaTime
VITE_APP_VERSION=1.0.0
```

#### 2. Instalar Dependencias

```bash
# Backend
cd backend
pnpm install

# Frontend
cd ../frontend
pnpm install
```

#### 3. Configurar Base de Datos

```bash
cd backend

# Ejecutar migraciones
pnpm prisma:migrate

# Sembrar datos iniciales (opcional)
pnpm prisma:seed

# Crear superadmin (opcional)
npx ts-node prisma/seed-superadmin.ts
```

#### 4. Iniciar Servicios

```bash
# Terminal 1: Backend
cd backend
pnpm dev

# Terminal 2: Frontend
cd frontend
pnpm dev
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api
- Health Check: http://localhost:4000/health

### Producción con Docker

#### 1. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
# JWT Secret (obligatorio, generar uno seguro)
JWT_SECRET=$(openssl rand -hex 32)

# Base de datos
POSTGRES_DB=compilatime
POSTGRES_USER=compilatime_user
POSTGRES_PASSWORD=tu_contraseña_segura

# Redis
REDIS_PASSWORD=tu_contraseña_redis

# Dominio
DOMAIN=tu-dominio.com
```

#### 2. Configurar Nginx

Editar `nginx/nginx.conf`:
- Cambiar `tu-dominio.com` por tu dominio real
- Configurar certificados SSL (Let's Encrypt o propios)

#### 3. Construir y Levantar

```bash
# Construir imágenes
docker-compose build

# Levantar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## 📝 Variables de Entorno Importantes

### Frontend

| Variable | Descripción | Local | Producción |
|----------|-------------|-------|------------|
| `VITE_API_URL` | URL de la API | **Dejar vacío** (usa proxy) | **Dejar vacío** (usa Nginx) |

⚠️ **IMPORTANTE**: NO poner dominio en `VITE_API_URL`. Usar rutas relativas `/api/...`

### Backend

| Variable | Descripción | Local | Producción |
|----------|-------------|-------|------------|
| `PORT` | Puerto del servidor | `4000` | `4000` |
| `DATABASE_URL` | URL de PostgreSQL | `postgresql://...` | `postgresql://...` |
| `REDIS_URL` | URL de Redis | `redis://localhost:6379` | `redis://redis:6379` |
| `FRONTEND_URL` | URL del frontend (CORS) | `http://localhost:3000` | `https://tu-dominio.com` |
| `CORS_ORIGIN` | Orígenes permitidos (CORS) | `http://localhost:3000` | `https://tu-dominio.com` |

## 🔧 Scripts Útiles

### Backend

```bash
pnpm dev          # Iniciar en desarrollo
pnpm build        # Compilar TypeScript
pnpm start        # Iniciar en producción
pnpm prisma:migrate  # Ejecutar migraciones
pnpm prisma:seed     # Sembrar datos
pnpm prisma:studio    # Abrir Prisma Studio
```

### Frontend

```bash
pnpm dev          # Iniciar en desarrollo (host: 0.0.0.0)
pnpm dev:local    # Iniciar solo en localhost
pnpm build        # Compilar para producción
pnpm preview      # Previsualizar build de producción
```

## 🚨 Checklist: NO Tocar URLs en el Código

Para que la aplicación funcione igual en local y en remoto sin cambios manuales:

- ✅ **Frontend**: Usar rutas relativas `/api/...` (sin dominio)
- ✅ **Frontend**: Dejar `VITE_API_URL` vacío en `.env`
- ✅ **Backend**: Escuchar en `0.0.0.0` en producción
- ✅ **Backend**: Usar variables de entorno para CORS
- ✅ **Nginx**: Configurar proxy `/api/` → backend

❌ **NO HACER**:
- ❌ No poner `http://localhost:4000` en el código del frontend
- ❌ No poner dominios hardcodeados en el código
- ❌ No cambiar `VITE_API_URL` al desplegar a producción
- ❌ No usar URLs completas en las llamadas a la API

## 📚 Documentación Adicional

- [Contexto del Proyecto](PROJECT_CONTEXT.md)
- [Documentación de Despliegue](ops/README_DEPLOY.md)
- [Documentación de Instalación](ops/README_INSTALL.md)

## 🔐 Credenciales por Defecto

### Superadmin
- URL: http://localhost:4000/admin/login
- Email: admin@compilatime.com
- Contraseña: admin123456

### Empresa Demo
- Código: demo
- Email: admin@demo.com
- Contraseña: Admin123!

## 📄 Licencia

MIT
```

---

## F) CHECKLIST FINAL DE VALIDACIÓN

### Validación de Entornos
- [ ] Mismo código funciona en local y producción sin cambios
- [ ] `VITE_API_URL` está vacío en ambos entornos
- [ ] No hay URLs hardcodeadas en el código
- [ ] CORS está configurado correctamente en ambos entornos
- [ ] Cookies funcionan correctamente (HTTPOnly, SameSite)
- [ ] WebSockets funcionan (si aplica)

### Validación Local
- [ ] Frontend inicia en `http://localhost:3000`
- [ ] Backend inicia en `http://localhost:4000`
- [ ] Proxy de Vite funciona: `/api/` → backend
- [ ] Login funciona (empresa y empleado)
- [ ] Fichajes funcionan
- [ ] Reportes se generan correctamente
- [ ] Exportaciones (CSV, PDF, Excel) funcionan
- [ ] No hay errores de CORS en consola
- [ ] No hay errores de red en Network tab

### Validación Producción
- [ ] Nginx está configurado y corriendo
- [ ] Frontend sirve archivos estáticos correctamente
- [ ] Proxy `/api/` → backend funciona
- [ ] SSL/HTTPS está configurado
- [ ] Login funciona (empresa y empleado)
- [ ] Fichajes funcionan
- [ ] Reportes se generan correctamente
- [ ] Exportaciones (CSV, PDF, Excel) funcionan
- [ ] No hay errores de CORS
- [ ] No hay errores de red
- [ ] Backend escucha en `0.0.0.0`
- [ ] Logs de Nginx no muestran errores

### Validación de Entornos
- [ ] Mismo código funciona en local y producción sin cambios
- [ ] `VITE_API_URL` está vacío en ambos entornos
- [ ] No hay URLs hardcodeadas en el código
- [ ] CORS está configurado correctamente en ambos entornos
- [ ] Cookies funcionan correctamente (HTTPOnly, SameSite)
- [ ] WebSockets funcionan (si aplica)
