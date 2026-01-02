#!/bin/bash

################################################################################
# Script de Configuración de CompilaTime
# 
# Este script configura el frontend y backend de CompilaTime para conectarse
# a una base de datos PostgreSQL remota.
#
# Uso:
#   sudo ./ops/configure-app.sh [opciones]
#
# Opciones:
#   --db-host HOST          Host de PostgreSQL (default: 192.168.10.107)
#   --db-port PORT          Puerto de PostgreSQL (default: 5432)
#   --db-name NAME          Nombre de la base de datos (default: compilatime)
#   --db-user USER          Usuario de PostgreSQL (default: rafa)
#   --db-password PASS      Contraseña de PostgreSQL (default: C0mp1l@te)
#   --backend-port PORT     Puerto del backend (default: 4000)
#   --frontend-port PORT    Puerto del frontend (default: 3000)
#   --app-host HOST        Host de la aplicación (default: 192.168.10.108)
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
Uso: sudo ./ops/configure-app.sh [opciones]

Opciones:
  --db-host HOST          Host de PostgreSQL (default: 192.168.10.107)
  --db-port PORT          Puerto de PostgreSQL (default: 5432)
  --db-name NAME          Nombre de la base de datos (default: compilatime)
  --db-user USER          Usuario de PostgreSQL (default: rafa)
  --db-password PASS      Contraseña de PostgreSQL (default: C0mp1l@te)
  --backend-port PORT     Puerto del backend (default: 4000)
  --frontend-port PORT    Puerto del frontend (default: 3000)
  --app-host HOST        Host de la aplicación (default: 192.168.10.108)
  --help                  Mostrar esta ayuda

Ejemplos:
  # Configuración básica
  sudo ./ops/configure-app.sh

  # Configuración con credenciales personalizadas
  sudo ./ops/configure-app.sh \
    --db-host 192.168.10.107 \
    --db-port 5432 \
    --db-name compilatime \
    --db-user rafa \
    --db-password C0mp1l@te

  # Configuración con puertos personalizados
  sudo ./ops/configure-app.sh \
    --backend-port 4000 \
    --frontend-port 3000
EOF
}

# Valores por defecto
DB_HOST="192.168.10.107"
DB_PORT="5432"
DB_NAME="compilatime"
DB_USER="rafa"
DB_PASSWORD="C0mp1l@te"
BACKEND_PORT="4000"
FRONTEND_PORT="3000"
APP_HOST="192.168.10.108"

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
        --frontend-port)
            FRONTEND_PORT="$2"
            shift 2
            ;;
        --app-host)
            APP_HOST="$2"
            shift 2
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

# Verificar que el directorio del proyecto existe
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "El directorio del proyecto no existe: $PROJECT_DIR"
    log_error "Ejecuta primero el script de instalación: sudo ./ops/install.sh"
    exit 1
fi

# Directorio de logs
LOG_FILE="/var/log/compilatime-configure.log"

# Crear directorio de logs
mkdir -p /var/log
touch "$LOG_FILE"

# Redirigir output al log
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "=========================================="
log_info "Configuración de CompilaTime"
log_info "=========================================="
log_info "Fecha: $(date)"
log_info "Host de PostgreSQL: $DB_HOST"
log_info "Puerto de PostgreSQL: $DB_PORT"
log_info "Base de datos: $DB_NAME"
log_info "Usuario de PostgreSQL: $DB_USER"
log_info "Puerto del backend: $BACKEND_PORT"
log_info "Puerto del frontend: $FRONTEND_PORT"
log_info "Host de la aplicación: $APP_HOST"
log_info "=========================================="
echo ""

################################################################################
# 1. Verificar conexión a PostgreSQL
################################################################################
log_info "Paso 1: Verificando conexión a PostgreSQL..."

# Verificar que PostgreSQL está accesible
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "No se pudo conectar a PostgreSQL"
    log_error "Verifica que PostgreSQL esté corriendo y accesible desde este servidor"
    log_error "Comando de prueba: PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT 1;\""
    exit 1
fi

log_success "Conexión a PostgreSQL exitosa"
echo ""

################################################################################
# 2. Configurar archivo .env del backend
################################################################################
log_info "Paso 2: Configurando archivo .env del backend..."

BACKEND_ENV="$PROJECT_DIR/backend/.env"

# Crear archivo .env del backend
cat > "$BACKEND_ENV" << EOF
# Configuración de Base de Datos
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# Configuración del Servidor
PORT=$BACKEND_PORT
NODE_ENV=production

# Configuración de JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# Configuración de Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Configuración de Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña
SMTP_FROM=noreply@compilatime.com

# Configuración de Frontend
FRONTEND_URL=http://$APP_HOST:$FRONTEND_PORT

# Configuración de CORS
CORS_ORIGIN=http://$APP_HOST:$FRONTEND_PORT
EOF

log_success "Archivo .env del backend configurado: $BACKEND_ENV"
echo ""

################################################################################
# 3. Configurar archivo .env del frontend
################################################################################
log_info "Paso 3: Configurando archivo .env del frontend..."

FRONTEND_ENV="$PROJECT_DIR/frontend/.env"

# Crear archivo .env del frontend
cat > "$FRONTEND_ENV" << EOF
# Configuración de API
VITE_API_URL=http://$APP_HOST:$BACKEND_PORT/api

# Configuración de la aplicación
VITE_APP_NAME=CompilaTime
VITE_APP_URL=http://$APP_HOST:$FRONTEND_PORT
EOF

log_success "Archivo .env del frontend configurado: $FRONTEND_ENV"
echo ""

################################################################################
# 4. Instalar dependencias del backend
################################################################################
log_info "Paso 4: Instalando dependencias del backend..."

cd "$PROJECT_DIR/backend"
npm install

log_success "Dependencias del backend instaladas"
echo ""

################################################################################
# 5. Instalar dependencias del frontend
################################################################################
log_info "Paso 5: Instalando dependencias del frontend..."

cd "$PROJECT_DIR/frontend"
npm install

log_success "Dependencias del frontend instaladas"
echo ""

################################################################################
# 6. Compilar backend
################################################################################
log_info "Paso 6: Compilando backend..."

cd "$PROJECT_DIR/backend"
npm run build

# Mostrar archivos creados en el directorio dist
log_info "Archivos creados en el directorio dist:"
ls -la "$PROJECT_DIR/backend/dist/" || log_warning "No se pudo listar el directorio dist"

# Buscar el archivo compilado con diferentes nombres posibles
BACKEND_FILE=""
if [ -f "$PROJECT_DIR/backend/dist/server.js" ]; then
    BACKEND_FILE="$PROJECT_DIR/backend/dist/server.js"
elif [ -f "$PROJECT_DIR/backend/dist/app.js" ]; then
    BACKEND_FILE="$PROJECT_DIR/backend/dist/app.js"
elif [ -f "$PROJECT_DIR/backend/dist/index.js" ]; then
    BACKEND_FILE="$PROJECT_DIR/backend/dist/index.js"
elif [ -f "$PROJECT_DIR/backend/dist/main.js" ]; then
    BACKEND_FILE="$PROJECT_DIR/backend/dist/main.js"
else
    log_error "El backend no se compiló correctamente"
    log_error "No se encontró ningún archivo compilado en $PROJECT_DIR/backend/dist/"
    log_error "Archivos encontrados:"
    ls -la "$PROJECT_DIR/backend/dist/" || log_warning "No se pudo listar el directorio dist"
    exit 1
fi

log_success "Backend compilado correctamente: $BACKEND_FILE"
echo ""

################################################################################
# 7. Compilar frontend
################################################################################
log_info "Paso 7: Compilando frontend..."

cd "$PROJECT_DIR/frontend"
npm run build

# Verificar que el frontend se compiló correctamente
if [ ! -d "$PROJECT_DIR/frontend/dist" ]; then
    log_error "El frontend no se compiló correctamente"
    log_error "Directorio no encontrado: $PROJECT_DIR/frontend/dist"
    exit 1
fi

log_success "Frontend compilado correctamente"
echo ""

################################################################################
# 8. Ejecutar migraciones de Prisma
################################################################################
log_info "Paso 8: Ejecutando migraciones de Prisma..."

cd "$PROJECT_DIR/backend"
npx prisma migrate deploy

log_success "Migraciones de Prisma ejecutadas"
echo ""

################################################################################
# 9. Configurar PM2
################################################################################
log_info "Paso 9: Configurando PM2..."

# Verificar si PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 no está instalado, instalando..."
    npm install -g pm2
fi

# Verificar si el proceso de PM2 existe
if pm2 describe compilatime &> /dev/null; then
    log_info "El proceso de PM2 ya existe, recargando..."
    pm2 reload compilatime
else
    log_info "Creando proceso de PM2..."
    cd "$PROJECT_DIR/backend"
    pm2 start ecosystem.config.cjs --name compilatime
fi

# Guardar lista de procesos de PM2
pm2 save

log_success "PM2 configurado correctamente"
echo ""

################################################################################
# 10. Configurar Nginx
################################################################################
log_info "Paso 10: Configurando Nginx..."

# Verificar si Nginx está instalado
if ! command -v nginx &> /dev/null; then
    log_warning "Nginx no está instalado, instalando..."
    apt-get install -y nginx
fi

# Crear configuración de Nginx
NGINX_CONF="/etc/nginx/sites-available/compilatime"

cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $APP_HOST;

    # Frontend
    location / {
        root $PROJECT_DIR/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
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

# Habilitar configuración de Nginx
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/

# Verificar configuración de Nginx
nginx -t

# Reiniciar Nginx
systemctl restart nginx

log_success "Nginx configurado correctamente"
echo ""

################################################################################
# 11. Configurar firewall
################################################################################
log_info "Paso 11: Configurando firewall..."

# Permitir puertos
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow $BACKEND_PORT/tcp
ufw allow $FRONTEND_PORT/tcp

# Habilitar firewall si no está habilitado
if ! ufw status | grep -q "Status: active"; then
    ufw --force enable
    log_success "Firewall habilitado"
else
    log_info "Firewall ya está habilitado"
fi

log_success "Firewall configurado correctamente"
echo ""

################################################################################
# 12. Verificar instalación
################################################################################
log_info "Paso 12: Verificando instalación..."

# Verificar que PM2 está corriendo
if pm2 describe compilatime &> /dev/null; then
    PM2_STATUS=$(pm2 describe compilatime | grep "status" | awk '{print $4}')
    if [ "$PM2_STATUS" = "online" ]; then
        log_success "PM2 está corriendo"
    else
        log_error "PM2 no está corriendo"
        log_error "Estado: $PM2_STATUS"
        exit 1
    fi
else
    log_error "El proceso de PM2 no existe"
    exit 1
fi

# Verificar que Nginx está corriendo
if systemctl is-active --quiet nginx; then
    log_success "Nginx está corriendo"
else
    log_error "Nginx no está corriendo"
    exit 1
fi

# Verificar que el backend está accesible
if curl -s "http://localhost:$BACKEND_PORT/api/version" > /dev/null 2>&1; then
    log_success "Backend está accesible"
else
    log_warning "Backend no está accesible (puede ser normal si aún no está completamente iniciado)"
fi

# Verificar que el frontend está accesible
if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
    log_success "Frontend está accesible"
else
    log_warning "Frontend no está accesible (puede ser normal si Nginx está sirviendo el frontend)"
fi

echo ""

################################################################################
# 13. Finalizar configuración
################################################################################
log_info "=========================================="
log_success "Configuración de CompilaTime completada exitosamente"
log_info "=========================================="
log_info "Resumen de la configuración:"
log_info "  - Host de PostgreSQL: $DB_HOST:$DB_PORT"
log_info "  - Base de datos: $DB_NAME"
log_info "  - Usuario de PostgreSQL: $DB_USER"
log_info "  - Puerto del backend: $BACKEND_PORT"
log_info "  - Puerto del frontend: $FRONTEND_PORT"
log_info "  - Host de la aplicación: $APP_HOST"
log_info "  - Logs de configuración: $LOG_FILE"
log_info "=========================================="
log_info "Comandos útiles:"
log_info "  - Verificar estado de PM2: pm2 status"
log_info "  - Ver logs de PM2: pm2 logs compilatime"
log_info "  - Reiniciar PM2: pm2 restart compilatime"
log_info "  - Verificar estado de Nginx: systemctl status nginx"
log_info "  - Ver logs de Nginx: tail -f /var/log/nginx/compilatime-error.log"
log_info "  - Verificar conexión a PostgreSQL: PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT 1;\""
log_info "=========================================="
log_info "Siguientes pasos:"
log_info "  1. Acceder a la aplicación: http://$APP_HOST"
log_info "  2. Verificar que el backend funciona: http://$APP_HOST/api/version"
log_info "  3. Verificar que el frontend funciona: http://$APP_HOST"
log_info "  4. Crear un superadmin si es necesario"
log_info "=========================================="

exit 0
