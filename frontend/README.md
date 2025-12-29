# CompilaTime Frontend

Frontend del SaaS de registro horario CompilaTime, construido con React, TypeScript, Vite y TailwindCSS.

## 🚀 Características

- **Interfaz Moderna**: Diseño limpio y profesional con TailwindCSS
- **Multi-rol**: Soporte para usuarios de empresa y empleados
- **Responsive**: Adaptado para móviles, tablets y desktop
- **Estado Global**: Gestión de estado con Zustand
- **TypeScript**: Tipado estricto para mayor robustez
- **Componentes Reutilizables**: Sistema de componentes consistente
- **Notificaciones**: Sistema de notificaciones en tiempo real
- **Gráficos**: Visualización de datos con Recharts
- **Exportación**: Exportación de informes en PDF y CSV
- **Tema Corporativo**: Paleta de colores personalizada

## 📋 Requisitos Previos

- Node.js 18+
- npm o yarn
- Navegador moderno con soporte ES2020

## 🛠️ Instalación

1. **Clonar el repositorio e instalar dependencias:**
```bash
cd frontend
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

Editar el archivo `.env` con tus configuraciones:
```env
# API URL
VITE_API_URL=http://localhost:4000

# App Configuration
VITE_APP_NAME=CompilaTime
VITE_APP_VERSION=1.0.0

# Development Only
VITE_ENABLE_DEBUG=true
VITE_MOCK_API=false
```

## 🏃‍♂️ Ejecución

### Modo Desarrollo
```bash
npm run dev
```

### Modo Producción
```bash
npm run build
npm run preview
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── common/        # Componentes genéricos
│   │   ├── backoffice/    # Componentes del backoffice
│   │   ├── employee/      # Componentes de empleados
│   │   └── forms/         # Componentes de formularios
│   ├── pages/              # Páginas de la aplicación
│   │   ├── backoffice/    # Páginas del backoffice
│   │   ├── employee/      # Páginas de empleados
│   │   └── public/        # Páginas públicas
│   ├── lib/                # Utilidades y configuración
│   │   ├── api.ts          # Cliente API
│   │   ├── auth.ts         # Utilidades de autenticación
│   │   └── utils.ts        # Funciones utilitarias
│   ├── store/              # Gestión de estado (Zustand)
│   │   ├── authStore.ts    # Store de autenticación
│   │   ├── companyStore.ts # Store de empresa
│   │   └── employeeStore.ts # Store de empleados
│   ├── hooks/              # Hooks personalizados
│   ├── routes/             # Layouts y rutas
│   ├── styles/             # Estilos globales
│   ├── types/              # Tipos TypeScript
│   ├── App.tsx             # Componente principal
│   └── main.tsx            # Punto de entrada
├── public/                 # Archivos estáticos
├── index.html              # HTML principal
├── package.json           # Dependencias y scripts
├── tailwind.config.cjs    # Configuración de Tailwind
├── vite.config.ts         # Configuración de Vite
└── tsconfig.json          # Configuración de TypeScript
```

## 🎨 Sistema de Diseño

### Paleta de Colores Corporativa

- **Azul Principal**: `#1E40AF` (primary-800)
- **Azul Claro**: `#3B82F6` (primary-500)
- **Verde Éxito**: `#10B981` (success-500)
- **Naranja Alerta**: `#F59E0B` (warning-500)
- **Rojo Error**: `#EF4444` (danger-500)
- **Grises**: Escala completa desde `#F3F4F6` a `#1F2937`

### Componentes Principales

#### Botones
- `.btn` - Clase base
- `.btn-primary`, `.btn-secondary`, `.btn-success`, etc.
- Variantes de tamaño: `.btn-sm`, `.btn-lg`, `.btn-xl`

#### Formularios
- `.input` - Campos de entrada
- `.form-group` - Grupo de formulario
- `.form-label` - Etiquetas
- `.form-error` - Mensajes de error

#### Tarjetas
- `.card` - Contenedor principal
- `.card-header`, `.card-body`, `.card-footer`

#### Tablas
- `.table` - Tabla base
- `.table-header`, `.table-body`
- `.table-row`, `.table-cell`

## 🔐 Autenticación

### Flujo de Autenticación

1. **Login de Empresa**: `/empresa/login`
   - Código de empresa + email + contraseña
   - Redirección a dashboard

2. **Login de Empleado**: `/empleado/login`
   - Código de empresa + DNI + PIN
   - Redirección a fichaje rápido

3. **Fichaje Rápido**: `/empleado/fichar`
   - Autenticación sin sesión persistente
   - Solo para registrar entradas/salidas

### Gestión de Tokens

- **Access Token**: 15 minutos de validez
- **Refresh Token**: 30 días de validez
- **Auto-refresh**: Renovación automática
- **Persistencia**: Almacenamiento en localStorage

## 📊 Estado Global (Zustand)

### Store de Autenticación
```typescript
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  // ... acciones
}
```

### Store de Empresa
```typescript
interface CompanyState {
  employees: Employee[]
  schedules: Schedule[]
  timeEntries: TimeEntry[]
  // ... acciones
}
```

## 🌐 Rutas de la Aplicación

### Públicas
- `/` - Redirección a login
- `/empresa/login` - Login de empresa
- `/empleado/login` - Login de empleado
- `/empleado/fichar` - Fichaje rápido

### Backoffice (Empresa)
- `/empresa/dashboard` - Dashboard principal
- `/empresa/empleados` - Gestión de empleados
- `/empresa/horarios` - Gestión de horarios
- `/empresa/registros` - Registros de tiempo
- `/empresa/informes` - Informes y estadísticas
- `/empresa/configuracion` - Configuración

### Empleado
- `/empleado/fichar` - Fichaje rápido
- `/empleado/perfil` - Perfil personal
- `/empleado/mis-registros` - Mis registros
- `/empleado/notificaciones` - Notificaciones

## 🎯 Componentes Clave

### Layouts
- **PublicLayout**: Layout para páginas públicas
- **BackofficeLayout**: Layout del backoffice con sidebar
- **EmployeeLayout**: Layout de empleados con navegación simple

### Páginas Principales
- **DashboardEmpresaPage**: Dashboard con estadísticas
- **EmpleadosPage**: CRUD de empleados
- **FicharPage**: Interfaz de fichaje rápido
- **MisRegistrosPage**: Registros personales del empleado

### Componentes Reutilizables
- **Button**: Botón con múltiples variantes
- **Input**: Campo de entrada con validación
- **Table**: Tabla con paginación y ordenación
- **Modal**: Ventana modal reutilizable
- **Loader**: Indicadores de carga
- **Toast**: Notificaciones flotantes

## 🔧 Configuración

### Variables de Entorno
```env
# API
VITE_API_URL=http://localhost:4000

# App
VITE_APP_NAME=CompilaTime
VITE_APP_VERSION=1.0.0

# Features
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true

# UI
VITE_DEFAULT_THEME=light
VITE_PRIMARY_COLOR=#1E40AF
```

### Configuración de Tailwind
- **Tema Corporativo**: Colores personalizados
- **Componentes**: Clases de utilidad
- **Animaciones**: Transiciones personalizadas
- **Responsive**: Breakpoints optimizados

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md, lg)
- **Desktop**: > 1024px (xl, 2xl)

### Adaptaciones
- **Sidebar**: Colapsable en móvil
- **Tablas**: Scroll horizontal en móvil
- **Formularios**: Optimizados para touch
- **Navegación**: Menú hamburguesa

## 🚀 Despliegue

### Build de Producción
```bash
npm run build
```

### Variables de Entorno Producción
```env
VITE_API_URL=https://api.compilatime.com
VITE_NODE_ENV=production
VITE_ENABLE_ANALYTICS=true
```

### Despliegue Estático
```bash
# Después del build
npm run preview

# O copiar archivos de dist/ al servidor web
```

### Docker
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar tests en modo watch
npm run test:watch
```

## 📊 Optimización

### Performance
- **Code Splitting**: División automática de código
- **Lazy Loading**: Carga bajo demanda
- **Tree Shaking**: Eliminación de código no usado
- **Minificación**: Optimización de assets

### SEO
- **Meta Tags**: Open Graph y Twitter Cards
- **Structured Data**: Schema.org
- **Sitemap**: Generación automática
- **Robots.txt**: Configuración proper

## 🔐 Seguridad

### Medidas Implementadas
- **CSP**: Content Security Policy
- **XSS Protection**: Headers de seguridad
- **HTTPS**: Forzado en producción
- **Token Security**: Almacenamiento seguro
- **Input Validation**: Validación estricta

### Buenas Prácticas
- **Sin datos sensibles** en el frontend
- **Validación cliente-servidor**
- **Sanitización de entradas**
- **Rate limiting** del lado cliente

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Guía de Estilo
- **Componentes**: PascalCase
- **Archivos**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **CSS**: Clases con Tailwind
- **TypeScript**: Tipado estricto

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:

- Email: frontend@compilatime.com
- Documentación: https://docs.compilatime.com
- Issues: https://github.com/compilatime/frontend/issues

---

**CompilaTime** © 2024 - Interfaz de Registro Horario Profesional