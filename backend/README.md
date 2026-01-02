# CompilaTime Backend

Backend del SaaS de registro horario CompilaTime, construido con Node.js, Express, TypeScript y Prisma.

## 🚀 Características

- **Multi-empresa**: Arquitectura SaaS con soporte para múltiples empresas
- **Autenticación segura**: JWT con cookies HTTPOnly y refresh tokens
- **Roles y permisos**: Sistema avanzado de roles con permisos granulares
- **Registro horario**: Sistema completo de fichaje con múltiples fuentes
- **Notificaciones**: Sistema de notificaciones por email
- **Cálculos**: Motor para cálculo de horas trabajadas y extras
- **Informes**: Sistema avanzado de reportes y estadísticas
- **Auditoría**: Logs completos de todas las operaciones
- **Rate limiting**: Protección contra ataques de fuerza bruta
- **Validación**: Validación de datos con Zod

## 📋 Requisitos Previos

- Node.js 18+ 
- PostgreSQL 13+
- npm o yarn
- Redis (opcional, para caché y sesiones)

## 🛠️ Instalación

1. **Clonar el repositorio e instalar dependencias:**
```bash
cd backend
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

Editar el archivo `.env` con tus configuraciones:
```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/compilatime"

# JWT
JWT_SECRET="tu_secreto_jwt_muy_seguro_aqui"

# Email (opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_USER="tu_email@gmail.com"
SMTP_PASS="tu_app_password"

# Otros...
PORT=4000
NODE_ENV="development"
```

3. **Generar cliente Prisma:**
```bash
npm run prisma:generate
```

4. **Ejecutar migraciones:**
```bash
npm run prisma:migrate
```

5. **(Opcional) Ejecutar seed con datos de ejemplo:**
```bash
npm run prisma:seed
```

## 🏃‍♂️ Ejecución

### Modo Desarrollo
```bash
npm run dev
```

### Modo Producción
```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/          # Configuraciones (DB, email, env)
│   ├── middlewares/      # Middlewares (auth, errors, rate limiting)
│   ├── modules/         # Módulos de negocio
│   │   ├── auth/        # Autenticación
│   │   ├── company/     # Gestión de empresas
│   │   ├── employee/    # Gestión de empleados
│   │   ├── timeEntry/   # Registros de tiempo
│   │   ├── schedule/    # Horarios
│   │   ├── notification/ # Notificaciones
│   │   └── reports/     # Informes
│   ├── services/        # Servicios compartidos
│   ├── types/           # Tipos TypeScript
│   ├── utils/           # Utilidades
│   ├── app.ts           # Aplicación Express
│   └── server.ts        # Servidor
├── prisma/
│   ├── schema.prisma    # Esquema de base de datos
│   └── migrations/      # Migraciones
├── uploads/             # Archivos subidos
├── reports/             # Reportes generados
└── logs/                # Logs de la aplicación
```

## 🔗 Endpoints de la API

### Autenticación
- `POST /api/auth/company/login` - Login de empresa
- `POST /api/auth/employee/login` - Login de empleado
- `POST /api/auth/quick-punch` - Fichaje rápido
- `POST /api/auth/refresh-token` - Refrescar token
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Gestión de Contraseñas
- `POST /api/auth/change-password` - Cambiar contraseña (empresa)
- `POST /api/auth/change-pin` - Cambiar PIN (empleado)
- `POST /api/auth/request-password-reset` - Solicitar reseteo
- `POST /api/auth/confirm-password-reset` - Confirmar reseteo

### Sistema
- `GET /health` - Health check
- `GET /api` - Información de la API

## 🔐 Seguridad

- **JWT**: Tokens JWT con expiración configurable
- **Cookies HTTPOnly**: Protección contra XSS
- **Rate Limiting**: Límites de solicitud por IP y usuario
- **Password Hashing**: bcrypt con salt rounds configurables
- **CORS**: Configuración segura de CORS
- **Helmet**: Headers de seguridad
- **Input Validation**: Validación estricta con Zod

## 📊 Base de Datos

El esquema utiliza PostgreSQL con las siguientes tablas principales:

- `companies` - Empresas (multi-tenancy)
- `company_users` - Usuarios del backoffice
- `employees` - Empleados
- `schedules` - Horarios/turnos
- `time_entries` - Registros de fichaje
- `notifications` - Notificaciones
- `reports` - Configuración de informes

## 📧 Notificaciones

El sistema incluye un servicio de email configurable:

- Plantillas HTML personalizadas
- Soporte para múltiples tipos de notificación
- Cola de envío asíncrona
- Reintentos automáticos en caso de fallo

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar tests en modo watch
npm run test:watch
```

## 📝 Logs

La aplicación genera logs en diferentes niveles:

- **Error**: Errores críticos del sistema
- **Warn**: Advertencias y problemas menores
- **Info**: Información general de operación
- **Debug**: Información detallada para debugging

Los logs se guardan en `./logs/app.log` y se rotan automáticamente.

## 🚀 Despliegue

### Variables de Entorno Producción
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=secreto_muy_largo_y_seguro
SMTP_HOST=smtp.tu-proveedor.com
SMTP_USER=email@tu-dominio.com
SMTP_PASS=tu_contraseña_segura
CORS_ORIGIN=https://tu-dominio.com
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]
```

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:

- Email: support@compilatime.com
- Documentación: https://docs.compilatime.com
- Issues: https://github.com/compilatime/backend/issues

---

**CompilaTime** v1.0.0 © 2025 - Sistema de Registro Horario Profesional

> **Nota:** El año del copyright debería actualizarse anualmente.