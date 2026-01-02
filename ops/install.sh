#!/bin/bash

################################################################################
# Script de Instalación de CompilaTime para Ubuntu 22.04
# 
# Este script instala y configura CompilaTime en un contenedor Ubuntu 22.04
# con la base de datos en otro contenedor.
#
# Uso:
#   sudo ./ops/install.sh [opciones]
#
# Opciones:
#   --db-host HOST          Host de la base de datos (default: localhost)
#   --db-port PORT          Puerto de la base de datos (default: 5432)
#   --db-name NAME          Nombre de la base de datos (default: compilatime)
#   --db-user USER          Usuario de la base de datos (default: rafa)
#   --db-password PASS      Contraseña de la base de datos (default: C0mp1l@te)
#   --backend-port PORT      Puerto del backend (default: 4000)
#   --frontend-url URL       URL del frontend (default: http://localhost:3000)
#   --skip-deps            Saltar instalación de dependencias del sistema
#   --skip-build            Saltar compilación de backend y frontend
#   --dev                  Instalar en modo desarrollo
#   --help                  Mostrar ayuda
################################################################################

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para mostrar ayuda
show_help() {
    cat << EOF
Uso: sudo ./ops/install.sh [opciones]

Opciones:
  --db-host HOST          Host de la base de datos (default: localhost)
  --db-port PORT          Puerto de la base de datos (default: 5432)
  --db-name NAME          Nombre de la base de datos (default: compilatime)
  --db-user USER          Usuario de la base de datos (default: rafa)
  --db-password PASS      Contraseña de la base de datos (default: C0mp1l@te)
  --backend-port PORT      Puerto del backend (default: 4000)
  --frontend-url URL       URL del frontend (default: http://localhost:3000)
  --repo-url URL           URL del repositorio Git (default: https://github.com/Compilate/compilatime.git)
  --skip-deps            Saltar instalación de dependencias del sistema
  --skip-build            Saltar compilación de backend y frontend
  --dev                  Instalar en modo desarrollo
  --help                  Mostrar esta ayuda

Ejemplos:
  # Instalación básica
  sudo ./ops/install.sh

  # Instalación con base de datos en otro contenedor
  sudo ./ops/install.sh --db-host 192.168.1.100 --db-port 5432

  # Instalación en modo desarrollo
  sudo ./ops/install.sh --dev

  # Instalación sin compilar
  sudo ./ops/install.sh --skip-build

  # Instalación con repositorio personalizado
  sudo ./ops/install.sh --repo-url https://github.com/tu-usuario/compilatime.git
EOF
}

# Valores por defecto
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="compilatime"
DB_USER="rafa"
DB_PASSWORD="C0mp1l@te"
BACKEND_PORT="4000"
FRONTEND_URL="http://localhost:3000"
REPO_URL="https://github.com/Compilate/compilatime.git"
SKIP_DEPS=false
SKIP_BUILD=false
DEV_MODE=false

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --db-host)
            DB_HOST="$2"
            shift 2
            ;;
        --db-port)
            DB_PORT="$2"
            shift 2
            ;;
        --db-name)
            DB_NAME="$2"
            shift 2
            ;;
        --db-user)
            DB_USER="$2"
            shift 2
            ;;
        --db-password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --backend-port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        --frontend-url)
            FRONTEND_URL="$2"
            shift 2
            ;;
        --repo-url)
            REPO_URL="$2"
            shift 2
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --dev)
            DEV_MODE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Verificar que se ejecuta como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script debe ejecutarse como root (sudo)"
    exit 1
fi

# Directorio del proyecto
PROJECT_DIR="/opt/compilatime"
LOG_FILE="/var/log/compilatime-install.log"

# Crear directorio de logs
mkdir -p /var/log
touch "$LOG_FILE"

# Redirigir output al log
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "=========================================="
log_info "Instalación de CompilaTime v1.3.0"
log_info "=========================================="
log_info "Fecha: $(date)"
log_info "Directorio: $PROJECT_DIR"
log_info "Base de datos: $DB_HOST:$DB_PORT/$DB_NAME"
log_info "Modo: $(if [ "$DEV_MODE" = true ]; then echo 'Desarrollo'; else echo 'Producción'; fi)"
log_info "=========================================="
echo ""

################################################################################
# 1. Verificar requisitos del sistema
################################################################################
log_info "Paso 1: Verificando requisitos del sistema..."

# Verificar versión de Ubuntu
if [ -f /etc/os-release ]; then
    . /etc/os-release
    log_info "Sistema operativo: $PRETTY_NAME"
    log_info "Versión: $VERSION_ID"
else
    log_error "No se puede determinar la versión de Ubuntu"
    exit 1
fi

# Verificar arquitectura
ARCH=$(uname -m)
log_info "Arquitectura: $ARCH"

if [[ "$ARCH" != "x86_64" ]]; then
    log_warning "La arquitectura $ARCH no ha sido probada. Se recomienda x86_64."
fi

# Verificar memoria disponible
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
log_info "Memoria total: ${TOTAL_MEM}MB"

if [[ $TOTAL_MEM -lt 1024 ]]; then
    log_warning "Se recomienda al menos 1GB de memoria RAM"
fi

# Verificar espacio en disco
DISK_SPACE=$(df -BG "$PROJECT_DIR" 2>/dev/null | awk 'NR==2 {print $4}' || echo "0")
log_info "Espacio disponible en disco: ${DISK_SPACE}GB"

if [[ $DISK_SPACE -lt 5 ]]; then
    log_warning "Se recomienda al menos 5GB de espacio en disco"
fi

log_success "Requisitos del sistema verificados"
echo ""

################################################################################
# 2. Instalar dependencias del sistema
################################################################################
if [ "$SKIP_DEPS" = false ]; then
    log_info "Paso 2: Instalando dependencias del sistema..."
    
    # Actualizar repositorios
    log_info "Actualizando repositorios..."
    apt-get update -y
    
    # Instalar dependencias básicas
    log_info "Instalando dependencias básicas..."
    apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        python3 \
        python3-pip \
        nginx \
        postgresql-client \
        redis-tools \
        unzip \
        htop \
        vim \
        net-tools \
        ufw
    
    # Instalar Node.js 18.x
    log_info "Instalando Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Verificar instalación de Node.js
    NODE_VERSION=$(node --version)
    log_success "Node.js instalado: $NODE_VERSION"
    
    # Verificar instalación de npm
    NPM_VERSION=$(npm --version)
    log_success "npm instalado: $NPM_VERSION"
    
    # Instalar PM2 globalmente
    log_info "Instalando PM2 globalmente..."
    npm install -g pm2
    
    # Verificar instalación de PM2
    PM2_VERSION=$(pm2 --version)
    log_success "PM2 instalado: $PM2_VERSION"
    
    # Instalar TypeScript globalmente
    log_info "Instalando TypeScript globalmente..."
    npm install -g typescript
    
    # Verificar instalación de TypeScript
    TSC_VERSION=$(tsc --version)
    log_success "TypeScript instalado: $TSC_VERSION"
    
    log_success "Dependencias del sistema instaladas"
else
    log_info "Saltando instalación de dependencias del sistema (--skip-deps)"
fi
echo ""

################################################################################
# 3. Crear usuario de despliegue
################################################################################
log_info "Paso 3: Creando usuario de despliegue..."

# Verificar si el usuario ya existe
if id "compilatime" &>/dev/null; then
    log_info "El usuario 'compilatime' ya existe"
else
    log_info "Creando usuario 'compilatime'..."
    useradd -r -s /bin/bash -d "$PROJECT_DIR" compilatime
    log_success "Usuario 'compilatime' creado"
fi

# Crear directorio del proyecto
log_info "Creando directorio del proyecto..."
mkdir -p "$PROJECT_DIR"
chown -R compilatime:compilatime "$PROJECT_DIR"
log_success "Directorio del proyecto creado: $PROJECT_DIR"
echo ""

################################################################################
# 4. Clonar o actualizar el proyecto con Git
################################################################################
log_info "Paso 4: Clonando o actualizando el proyecto con Git..."

# Agregar directorio a la lista de directorios seguros de Git
git config --global --add safe.directory "$PROJECT_DIR"

# Verificar si el directorio ya existe
if [ -d "$PROJECT_DIR/.git" ]; then
    log_info "El proyecto ya existe en $PROJECT_DIR"
    read -p "¿Desea actualizar el proyecto existente? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Actualizando proyecto..."
        cd "$PROJECT_DIR"
        git fetch origin
        git reset --hard origin/master || log_warning "No se pudo actualizar el proyecto (continuando...)"
        log_success "Proyecto actualizado"
    else
        log_info "Usando proyecto existente"
    fi
else
    log_info "Clonando proyecto desde Git..."
    
    # Clonar el repositorio
    git clone "$REPO_URL" "$PROJECT_DIR"
    
    if [ $? -eq 0 ]; then
        log_success "Proyecto clonado desde Git"
    else
        log_error "No se pudo clonar el proyecto desde Git"
        exit 1
    fi
    
    # Configurar permisos
    chown -R compilatime:compilatime "$PROJECT_DIR"
fi
echo ""

################################################################################
# 5. Configurar variables de entorno
################################################################################
log_info "Paso 5: Configurando variables de entorno..."

# Crear archivo .env del backend
log_info "Creando archivo .env del backend..."
cat > "$PROJECT_DIR/backend/.env" << EOF
# Base de datos
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# Servidor
PORT=$BACKEND_PORT
NODE_ENV=$(if [ "$DEV_MODE" = true ]; then echo 'development'; else echo 'production'; fi)

# JWT
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN="7d"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Frontend
FRONTEND_URL=$FRONTEND_URL

# Email (opcional)
EMAIL_HOST=""
EMAIL_PORT="587"
EMAIL_USER=""
EMAIL_PASSWORD=""
EMAIL_FROM=""

# Geolocalización (opcional)
GOOGLE_MAPS_API_KEY=""
EOF

chown compilatime:compilatime "$PROJECT_DIR/backend/.env"
chmod 600 "$PROJECT_DIR/backend/.env"
log_success "Archivo .env del backend creado"

# Crear archivo .env del frontend
log_info "Creando archivo .env del frontend..."
cat > "$PROJECT_DIR/frontend/.env" << EOF
VITE_API_URL=http://localhost:$BACKEND_PORT
VITE_APP_NAME=CompilaTime
EOF

chown compilatime:compilatime "$PROJECT_DIR/frontend/.env"
chmod 600 "$PROJECT_DIR/frontend/.env"
log_success "Archivo .env del frontend creado"
echo ""

################################################################################
# 6. Instalar dependencias del backend
################################################################################
log_info "Paso 6: Instalando dependencias del backend..."

cd "$PROJECT_DIR/backend"
sudo -u compilatime npm install

log_success "Dependencias del backend instaladas"
echo ""

################################################################################
# 7. Instalar dependencias del frontend
################################################################################
log_info "Paso 7: Instalando dependencias del frontend..."

cd "$PROJECT_DIR/frontend"
sudo -u compilatime npm install

log_success "Dependencias del frontend instaladas"
echo ""

################################################################################
# 8. Compilar backend
################################################################################
if [ "$SKIP_BUILD" = false ]; then
    log_info "Paso 8: Compilando backend..."
    
    cd "$PROJECT_DIR/backend"
    sudo -u compilatime npm run build
    
    log_success "Backend compilado"
else
    log_info "Saltando compilación del backend (--skip-build)"
fi
echo ""

################################################################################
# 9. Compilar frontend
################################################################################
if [ "$SKIP_BUILD" = false ]; then
    log_info "Paso 9: Compilando frontend..."
    
    cd "$PROJECT_DIR/frontend"
    sudo -u compilatime npm run build
    
    log_success "Frontend compilado"
else
    log_info "Saltando compilación del frontend (--skip-build)"
fi
echo ""

################################################################################
# 10. Configurar PM2
################################################################################
log_info "Paso 10: Configurando PM2..."

# Verificar si el backend está compilado
if [ ! -f "$PROJECT_DIR/backend/dist/server.js" ]; then
    log_warning "El backend no está compilado (backend/dist/server.js no existe)"
    log_warning "PM2 no se iniciará. Ejecuta 'npm run build' en el backend primero."
    log_warning "O ejecuta el script de instalación sin la opción --skip-build"
else
    # Iniciar backend con PM2
    cd "$PROJECT_DIR/backend"
    sudo -u compilatime pm2 start ecosystem.config.cjs --name compilatime-backend || \
        sudo -u compilatime pm2 restart compilatime-backend
    
    # Guardar configuración de PM2
    sudo -u compilatime pm2 save
    
    # Configurar PM2 para iniciar en el arranque
    sudo -u compilatime pm2 startup systemd -u compilatime --hp /opt/compilatime --y
    
    log_success "PM2 configurado"
fi
echo ""

################################################################################
# 11. Configurar Nginx
################################################################################
log_info "Paso 11: Configurando Nginx..."

# Crear configuración de Nginx
cat > /etc/nginx/sites-available/compilatime << EOF
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root $PROJECT_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Logs
    access_log /var/log/nginx/compilatime-access.log;
    error_log /var/log/nginx/compilatime-error.log;
}
EOF

# Habilitar sitio
ln -sf /etc/nginx/sites-available/compilatime /etc/nginx/sites-enabled/

# Eliminar configuración por defecto
rm -f /etc/nginx/sites-enabled/default

# Probar configuración de Nginx
nginx -t

# Reiniciar Nginx
systemctl restart nginx
systemctl enable nginx

log_success "Nginx configurado"
echo ""

################################################################################
# 12. Configurar firewall
################################################################################
log_info "Paso 12: Configurando firewall..."

# Permitir SSH
ufw allow OpenSSH

# Permitir HTTP
ufw allow 80/tcp

# Permitir HTTPS (si se configura más adelante)
ufw allow 443/tcp

# Habilitar firewall
ufw --force enable

log_success "Firewall configurado"
echo ""

################################################################################
# 13. Crear directorio de logs
################################################################################
log_info "Paso 13: Creando directorio de logs..."

mkdir -p /var/log/compilatime
chown -R compilatime:compilatime /var/log/compilatime

log_success "Directorio de logs creado: /var/log/compilatime"
echo ""

################################################################################
# 14. Verificar instalación
################################################################################
log_info "Paso 14: Verificando instalación..."

# Verificar que el backend está corriendo
if pm2 describe compilatime-backend > /dev/null 2>&1; then
    log_success "Backend está corriendo"
    pm2 describe compilatime-backend
else
    log_error "Backend no está corriendo"
    log_error "Verifica los logs: pm2 logs compilatime-backend"
fi

# Verificar que Nginx está corriendo
if systemctl is-active --quiet nginx; then
    log_success "Nginx está corriendo"
else
    log_error "Nginx no está corriendo"
    log_error "Verifica los logs: journalctl -u nginx"
fi

# Verificar conexión a la base de datos
log_info "Verificando conexión a la base de datos..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Conexión a la base de datos exitosa"
else
    log_warning "No se pudo conectar a la base de datos"
    log_warning "Verifica que el contenedor de la base de datos esté corriendo y sea accesible"
fi
echo ""

################################################################################
# 15. Finalizar instalación
################################################################################
log_info "=========================================="
log_success "Instalación completada exitosamente"
log_info "=========================================="
log_info "Resumen de la instalación:"
log_info "  - Directorio del proyecto: $PROJECT_DIR"
log_info "  - Usuario de despliegue: compilatime"
log_info "  - Backend: http://localhost:$BACKEND_PORT"
log_info "  - Frontend: http://localhost"
log_info "  - Logs de instalación: $LOG_FILE"
log_info "  - Logs de la aplicación: /var/log/compilatime"
log_info "=========================================="
log_info "Comandos útiles:"
log_info "  - Verificar estado del backend: pm2 status"
log_info "  - Ver logs del backend: pm2 logs compilatime-backend"
log_info "  - Reiniciar backend: pm2 restart compilatime-backend"
log_info "  - Ver logs de Nginx: tail -f /var/log/nginx/compilatime-error.log"
log_info "  - Reiniciar Nginx: systemctl restart nginx"
log_info "=========================================="
log_info "Siguientes pasos:"
log_info "  1. Configurar SSL/TLS para HTTPS (recomendado)"
log_info "  2. Configurar dominio personalizado"
log_info "  3. Configurar backups automáticos"
log_info "  4. Configurar monitoreo"
log_info "=========================================="

exit 0
