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

⚠️ **IMPORTANTE**: En producción NO usar `npm run dev`. Usar Docker Compose.

Para instrucciones detalladas de despliegue en producción, consulta: **[Guía de Despliegue en Producción](ops/DEPLOY_PRODUCTION.md)**

#### Resumen Rápido

```bash
# 1. Configurar variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Editar variables (IMPORTANTE: VITE_API_URL debe estar vacío)
nano backend/.env
nano frontend/.env

# 3. Ejecutar script de despliegue
chmod +x ops/deploy-production.sh
sudo ./ops/deploy-production.sh
```

Este script:
- Actualiza el código desde git
- Instala dependencias
- Construye frontend y backend
- Ejecuta migraciones de base de datos
- Reinicia todos los servicios con Docker Compose

#### Configuración Manual

Si prefieres configurar manualmente:

**1. Variables de Entorno**

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

**2. Configurar Nginx**

Editar `nginx/nginx.conf`:
- Cambiar `tu-dominio.com` por tu dominio real
- Configurar certificados SSL (Let's Encrypt o propios)

**3. Construir y Levantar**

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
- [🚀 Guía de Despliegue en Producción](ops/DEPLOY_PRODUCTION.md) ⭐ **IMPORTANTE**
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
