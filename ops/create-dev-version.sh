#!/bin/bash
#
# create-dev-version.sh - Script para crear versión de desarrollo con copia de DB
# Uso: ./ops/create-dev-version.sh <version>
# Ejemplo: ./ops/create-dev-version.sh v1.0.0-dev
#
# Autor: DevOps Team
# Fecha: 2025-12-29
#

# ============================================
# CONFIGURACIÓN DE SEGURIDAD Y ERRORES
# ============================================
set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# FUNCIONES DE LOGGING
# ============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# ============================================
# CARGAR CONFIGURACIÓN
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.ops"

if [[ ! -f "${ENV_FILE}" ]]; then
    log_error "Archivo de configuración no encontrado: ${ENV_FILE}"
    log_error "Ejecuta primero: ./ops/init.sh"
    exit 1
fi

# Cargar variables de entorno
set -a
source "${ENV_FILE}"
set +a

# ============================================
# VARIABLES DE DESPLIEGUE
# ============================================
VERSION=${1:-}
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="${LOGS_DIR}/create-dev-version_${TIMESTAMP}.log"
RELEASE_DIR="${RELEASES_DIR}/${VERSION}"
TEMP_DIR="${DEPLOY_ROOT}/temp_${TIMESTAMP}"

# Crear directorios necesarios
mkdir -p "${RELEASES_DIR}" "${BACKUPS_DIR}/db" "${BACKUPS_DIR}/config" "${LOGS_DIR}"

# ============================================
# FUNCIONES DE UTILIDAD
# ============================================
check_disk_space() {
    local required_gb=${MIN_DISK_SPACE_GB:-2}
    local available_gb=$(df -BG "${DEPLOY_ROOT}" | awk 'NR==2 {print $4}' | tr -d 'G')
    
    if [[ ${available_gb} -lt ${required_gb} ]]; then
        log_error "Espacio en disco insuficiente. Disponible: ${available_gb}GB, Requerido: ${required_gb}GB"
        return 1
    fi
    log_info "Espacio en disco suficiente: ${available_gb}GB disponible"
    return 0
}

backup_production_db() {
    local backup_file="${BACKUPS_DIR}/db/compilatime_prod_backup_${TIMESTAMP}.dump"
    
    log_info "Haciendo backup de base de datos de producción..."
    
    # Crear directorio de backups si no existe
    mkdir -p "${BACKUPS_DIR}/db"
    
    # Hacer backup con pg_dump (formato custom comprimido)
    if PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -F c \
        -f "${backup_file}" \
        --verbose 2>&1 | tee -a "${LOG_FILE}"; then
        
        # Establecer permisos restrictivos
        chmod 600 "${backup_file}"
        
        log_success "Backup de base de datos de producción completado: ${backup_file}"
        
        # Rotación de backups
        rotate_backups "${BACKUPS_DIR}/db" "${DB_BACKUP_RETENTION:-14}"
        
        return 0
    else
        log_error "Error al hacer backup de base de datos de producción"
        return 1
    fi
}

create_dev_database() {
    local dev_db_name="${DB_NAME}_dev"
    local dev_db_user="${DB_USER}_dev"
    local dev_db_password="${DB_PASSWORD}_dev"
    
    log_info "Creando base de datos de desarrollo..."
    
    # Crear base de datos de desarrollo
    if PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d postgres \
        -c "CREATE DATABASE ${dev_db_name};" 2>&1 | tee -a "${LOG_FILE}"; then
        
        log_success "Base de datos de desarrollo creada: ${dev_db_name}"
    else
        log_warning "La base de datos de desarrollo ya existe, continuando..."
    fi
    
    # Crear usuario de desarrollo si no existe
    if PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d postgres \
        -c "CREATE USER ${dev_db_user} WITH PASSWORD '${dev_db_password}';" 2>&1 | tee -a "${LOG_FILE}"; then
        
        log_success "Usuario de desarrollo creado: ${dev_db_user}"
    else
        log_warning "El usuario de desarrollo ya existe, continuando..."
    fi
    
    # Dar permisos al usuario de desarrollo
    if PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d postgres \
        -c "GRANT ALL PRIVILEGES ON DATABASE ${dev_db_name} TO ${dev_db_user};" 2>&1 | tee -a "${LOG_FILE}"; then
        
        log_success "Permisos otorgados al usuario de desarrollo"
    else
        log_error "Error al otorgar permisos al usuario de desarrollo"
        return 1
    fi
    
    # Exportar variables de entorno de desarrollo
    echo "DEV_DB_NAME=${dev_db_name}" >> "${TEMP_DIR}/.env.dev"
    echo "DEV_DB_USER=${dev_db_user}" >> "${TEMP_DIR}/.env.dev"
    echo "DEV_DB_PASSWORD=${dev_db_password}" >> "${TEMP_DIR}/.env.dev"
    
    log_info "Variables de entorno de desarrollo guardadas"
    
    return 0
}

restore_to_dev_db() {
    local dev_db_name="${DB_NAME}_dev"
    local dev_db_user="${DB_USER}_dev"
    local dev_db_password="${DB_PASSWORD}_dev"
    
    log_info "Restaurando backup en base de datos de desarrollo..."
    
    # Encontrar el backup más reciente
    local latest_backup=$(ls -1t "${BACKUPS_DIR}/db"/compilatime_prod_backup_*.dump 2>/dev/null | head -n1)
    
    if [[ -z "${latest_backup}" ]]; then
        log_error "No se encontró ningún backup de producción"
        return 1
    fi
    
    log_info "Backup encontrado: ${latest_backup}"
    
    # Restaurar backup en base de datos de desarrollo
    if PGPASSWORD="${DB_PASSWORD}" pg_restore \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${dev_db_name}" \
        -c \
        --if-exists \
        "${latest_backup}" \
        2>&1 | tee -a "${LOG_FILE}"; then
        
        log_success "Backup restaurado en base de datos de desarrollo"
        return 0
    else
        log_error "Error al restaurar backup en base de datos de desarrollo"
        return 1
    fi
}

clone_repository() {
    local tag=$1
    
    log_info "Clonando repositorio con tag ${tag}..."
    
    # Crear directorio temporal
    rm -rf "${TEMP_DIR}"
    mkdir -p "${TEMP_DIR}"
    
    # Clonar repositorio
    if git clone --depth 1 --branch "${tag}" "${REPO_URL}" "${TEMP_DIR}" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Repositorio clonado correctamente"
        return 0
    else
        log_error "Error al clonar repositorio"
        return 1
    fi
}

install_dependencies() {
    log_info "Instalando dependencias..."
    
    # Backend
    log_info "Instalando dependencias del backend..."
    cd "${TEMP_DIR}/backend"
    if npm ci --production=false 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Dependencias del backend instaladas"
    else
        log_error "Error al instalar dependencias del backend"
        return 1
    fi
    
    # Frontend
    log_info "Instalando dependencias del frontend..."
    cd "${TEMP_DIR}/frontend"
    if npm ci 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Dependencias del frontend instaladas"
    else
        log_error "Error al instalar dependencias del frontend"
        return 1
    fi
    
    return 0
}

build_application() {
    log_info "Compilando aplicación..."
    
    # Backend
    log_info "Compilando backend..."
    cd "${TEMP_DIR}/backend"
    if npm run build 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Backend compilado correctamente"
    else
        log_error "Error al compilar backend"
        return 1
    fi
    
    # Frontend
    log_info "Compilando frontend..."
    cd "${TEMP_DIR}/frontend"
    if npm run build 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Frontend compilado correctamente"
    else
        log_error "Error al compilar frontend"
        return 1
    fi
    
    return 0
}

create_release() {
    local tag=$1
    
    log_info "Creando release de desarrollo ${tag}..."
    
    # Mover directorio temporal a release
    mv "${TEMP_DIR}" "${RELEASE_DIR}"
    
    # Crear archivo VERSION
    echo "${tag}" > "${RELEASE_DIR}/VERSION"
    
    # Crear archivo .env de desarrollo para backend
    cat > "${RELEASE_DIR}/backend/.env" <<EOF
# Base de datos de desarrollo
DATABASE_URL="postgresql://${DB_USER}_dev:${DB_PASSWORD}_dev@${DB_HOST}:${DB_PORT}/${DB_NAME}_dev"

# Servidor
PORT=4000
NODE_ENV="development"

# JWT
JWT_SECRET="d2F8Bnqm4X9uPR7A3fU6sBk9dH2WqZxKjLpTqMfS"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="tu_email@gmail.com"
SMTP_PASS="tu_app_password_gmail"
SMTP_FROM="CompilaTime Dev <noreply@compilatime-dev.com>"

# Redis (para caché y sesiones)
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Archivos
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Logs
LOG_LEVEL="debug"
LOG_FILE="./logs/app.log"

# Seguridad
BCRYPT_ROUNDS=12
CORS_ORIGIN="http://localhost:3000"

# Notificaciones
NOTIFICATION_QUEUE_ENABLED=true
NOTIFICATION_RETRY_ATTEMPTS=3

# Reportes
REPORTS_DIR="./reports"
REPORTS_RETENTION_DAYS=30

# Timezone por defecto
DEFAULT_TIMEZONE="Europe/Madrid"
EOF
    
    # Crear archivo .env de desarrollo para frontend
    cat > "${RELEASE_DIR}/frontend/.env" <<EOF
VITE_API_URL=http://localhost:4000
EOF
    
    log_success "Release ${tag} creada en ${RELEASE_DIR}"
    log_success "Archivos .env de desarrollo creados"
}

switch_release() {
    local tag=$1
    
    log_info "Cambiando symlink a release ${tag}..."
    
    # Crear symlink temporal
    local temp_link="${DEPLOY_ROOT}/current_dev"
    
    ln -sfn "${RELEASE_DIR}" "${temp_link}"
    
    # Cambiar symlink atómicamente
    mv -Tf "${temp_link}" "${DEPLOY_ROOT}/current_dev"
    
    log_success "Symlink actualizado a ${tag} (current_dev)"
}

restart_backend() {
    local app_name="${PM2_APP_NAME}-dev"
    
    log_info "Reiniciando backend de desarrollo con PM2..."
    
    # Verificar si PM2 está instalado
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 no está instalado"
        return 1
    fi
    
    # Detener aplicación de desarrollo si existe
    if pm2 describe "${app_name}" &> /dev/null; then
        log_info "Deteniendo aplicación de desarrollo existente..."
        pm2 stop "${app_name}" 2>&1 | tee -a "${LOG_FILE}"
    fi
    
    # Crear nueva aplicación PM2
    log_info "Creando nueva aplicación PM2 de desarrollo..."
    
    cd "${RELEASE_DIR}/backend"
    
    # Crear archivo ecosystem temporal para desarrollo
    cat > "${RELEASE_DIR}/backend/ecosystem.dev.config.cjs" <<EOF
module.exports = {
  apps: [
    {
      name: '${app_name}',
      script: './dist/server.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
    },
  ],
};
EOF
    
    if pm2 start ecosystem.dev.config.cjs --name "${app_name}" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Aplicación PM2 de desarrollo creada correctamente"
    else
        log_error "Error al crear aplicación PM2 de desarrollo"
        return 1
    fi
    
    # Guardar lista de procesos PM2
    pm2 save
    
    return 0
}

rotate_backups() {
    local backup_dir=$1
    local retention=$2
    
    log_info "Rotando backups en ${backup_dir} (mantener últimos ${retention})..."
    
    # Contar archivos y eliminar los más antiguos
    local count=$(ls -1 "${backup_dir}"/*.dump 2>/dev/null | wc -l) || count=0
    
    if [[ ${count} -gt ${retention} ]]; then
        ls -1t "${backup_dir}"/*.dump 2>/dev/null | tail -n +$((retention + 1)) | xargs rm -f
        log_info "Eliminados $((count - retention)) backups antiguos de DB"
    fi
}

# ============================================
# FUNCIÓN PRINCIPAL
# ============================================
main() {
    local version_arg=${1:-}
    
    if [[ -z "${version_arg}" ]]; then
        log_error "Uso: $0 <version>"
        log_error "Ejemplo: $0 v1.0.0-dev"
        exit 1
    fi
    
    log_info "=========================================="
    log_info "Creando versión de desarrollo: ${version_arg}"
    log_info "=========================================="
    
    # 1. Verificar espacio en disco
    if ! check_disk_space; then
        exit 1
    fi
    
    # 2. Backup de base de datos de producción
    if ! backup_production_db; then
        log_error "Error al hacer backup de base de datos de producción"
        exit 1
    fi
    
    # 3. Crear base de datos de desarrollo
    if ! create_dev_database; then
        log_error "Error al crear base de datos de desarrollo"
        exit 1
    fi
    
    # 4. Clonar repositorio
    if ! clone_repository "${version_arg}"; then
        log_error "Error al clonar repositorio"
        exit 1
    fi
    
    # 5. Instalar dependencias
    if ! install_dependencies; then
        log_error "Error al instalar dependencias"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
    
    # 6. Compilar aplicación
    if ! build_application; then
        log_error "Error al compilar aplicación"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
    
    # 7. Crear release
    create_release "${version_arg}"
    
    # 8. Cambiar symlink
    switch_release "${version_arg}"
    
    # 9. Reiniciar backend
    if ! restart_backend; then
        log_error "Error al reiniciar backend"
        exit 1
    fi
    
    # 10. Verificar estado
    log_info "Verificando estado del despliegue..."
    sleep 5
    
    local app_name="${PM2_APP_NAME}-dev"
    if pm2 describe "${app_name}" | grep -q "online"; then
        log_success "=========================================="
        log_success "Versión de desarrollo creada exitosamente"
        log_success "Versión: ${version_arg}"
        log_success "Release: ${RELEASE_DIR}"
        log_success "Base de datos de desarrollo: ${DB_NAME}_dev"
        log_success "Usuario de desarrollo: ${DB_USER}_dev"
        log_success "Symlink: ${DEPLOY_ROOT}/current_dev"
        log_success "Aplicación PM2: ${app_name}"
        log_success "=========================================="
    else
        log_error "El backend de desarrollo no está online después del despliegue"
        exit 1
    fi
}

# Ejecutar función principal
main "$@"
