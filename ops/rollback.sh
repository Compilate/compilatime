#!/bin/bash
#
# rollback.sh - Script de rollback para Compilatime
# Uso: ./rollback.sh [version]
# Ejemplo: ./rollback.sh v1.0.0
# Si no se especifica versión, vuelve a la anterior
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
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOG_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOG_FILE}"
}

# ============================================
# CARGAR CONFIGURACIÓN
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.ops"

if [[ ! -f "${ENV_FILE}" ]]; then
    log_error "Archivo de configuración no encontrado: ${ENV_FILE}"
    log_error "Copia ops/.env.ops.example a ops/.env.ops y rellena los valores"
    exit 1
fi

# Cargar variables de entorno
set -a
source "${ENV_FILE}"
set +a

# ============================================
# VARIABLES DE ROLLBACK
# ============================================
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="${LOGS_DIR}/rollback_${TIMESTAMP}.log"

# Crear directorios necesarios
mkdir -p "${LOGS_DIR}"

# ============================================
# FUNCIONES DE UTILIDAD
# ============================================
get_current_version() {
    if [[ -L "${CURRENT_LINK}" ]]; then
        local current_path=$(readlink -f "${CURRENT_LINK}")
        echo "${current_path##*/}"
    else
        echo "none"
    fi
}

list_available_releases() {
    log_info "Releases disponibles:"
    ls -1t "${RELEASES_DIR}" | grep -v "^current$" | while read -r release; do
        local version=""
        if [[ -f "${RELEASES_DIR}/${release}/VERSION" ]]; then
            version=$(cat "${RELEASES_DIR}/${release}/VERSION")
        fi
        
        local current=""
        if [[ "${release}" == "$(get_current_version)" ]]; then
            current=" [ACTUAL]"
        fi
        
        log_info "  - ${release}${current} (${version})"
    done
}

confirm_rollback() {
    local target_version=$1
    local current_version=$(get_current_version)
    
    log_warning "=========================================="
    log_warning "CONFIRMACIÓN DE ROLLBACK"
    log_warning "=========================================="
    log_warning "Versión actual: ${current_version}"
    log_warning "Versión objetivo: ${target_version}"
    log_warning ""
    log_warning "Esto cambiará el symlink 'current' a la versión ${target_version}"
    log_warning "y reiniciará el backend con PM2."
    log_warning ""
    log_warning "¿Estás seguro de que deseas continuar? (s/n)"
    
    read -r response
    if [[ "${response}" != "s" && "${response}" != "S" ]]; then
        log_info "Rollback cancelado por el usuario"
        exit 0
    fi
}

backup_before_rollback() {
    local current_version=$(get_current_version)
    
    log_info "Creando backup antes del rollback..."
    
    # Backup de base de datos
    local backup_file="${BACKUPS_DIR}/db/compilatime_rollback_${current_version}_${TIMESTAMP}.dump"
    
    if PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -F c \
        -f "${backup_file}" \
        --verbose 2>&1 | tee -a "${LOG_FILE}"; then
        
        chmod 600 "${backup_file}"
        log_success "Backup de base de datos creado: ${backup_file}"
    else
        log_warning "Error al crear backup de base de datos, continuando..."
    fi
}

switch_release() {
    local target_version=$1
    
    log_info "Cambiando symlink a release ${target_version}..."
    
    # Verificar que la release existe
    if [[ ! -d "${RELEASES_DIR}/${target_version}" ]]; then
        log_error "La release ${target_version} no existe"
        return 1
    fi
    
    # Verificar que la release tiene los archivos necesarios
    if [[ ! -f "${RELEASES_DIR}/${target_version}/backend/dist/server.js" ]]; then
        log_error "La release ${target_version} no tiene el backend compilado"
        return 1
    fi
    
    # Crear symlink temporal
    local temp_link="${DEPLOY_ROOT}/current_new"
    
    ln -sfn "${RELEASES_DIR}/${target_version}" "${temp_link}"
    
    # Cambiar symlink atómicamente
    mv -Tf "${temp_link}" "${CURRENT_LINK}"
    
    log_success "Symlink actualizado a ${target_version}"
    return 0
}

restart_backend() {
    local app_name="${PM2_APP_NAME:-compilatime}"
    
    log_info "Reiniciando backend con PM2..."
    
    # Verificar si PM2 está instalado
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 no está instalado"
        return 1
    fi
    
    # Verificar si la aplicación existe
    if pm2 describe "${app_name}" &> /dev/null; then
        # Recargar aplicación (graceful reload)
        if pm2 reload "${app_name}" 2>&1 | tee -a "${LOG_FILE}"; then
            log_success "Backend recargado correctamente"
        else
            log_error "Error al recargar backend"
            return 1
        fi
    else
        # Crear nueva aplicación PM2
        log_info "Creando nueva aplicación PM2..."
        
        cd "${CURRENT_LINK}/backend"
        
        if pm2 start ecosystem.config.cjs --name "${app_name}" 2>&1 | tee -a "${LOG_FILE}"; then
            log_success "Aplicación PM2 creada correctamente"
        else
            log_error "Error al crear aplicación PM2"
            return 1
        fi
    fi
    
    # Guardar lista de procesos PM2
    pm2 save
    
    return 0
}

verify_rollback() {
    local target_version=$1
    
    log_info "Verificando estado del rollback..."
    
    # Esperar a que el backend se inicie
    sleep 5
    
    # Verificar que el symlink apunta a la versión correcta
    local current_version=$(get_current_version)
    if [[ "${current_version}" != "${target_version}" ]]; then
        log_error "El symlink no apunta a la versión correcta"
        return 1
    fi
    
    # Verificar que PM2 está online
    local app_name="${PM2_APP_NAME:-compilatime}"
    if ! pm2 describe "${app_name}" | grep -q "online"; then
        log_error "El backend no está online después del rollback"
        return 1
    fi
    
    log_success "Rollback verificado exitosamente"
    return 0
}

send_notification() {
    local status=$1
    local message=$2
    
    # Notificación Slack (opcional)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="warning"
        if [[ "${status}" == "error" ]]; then
            color="danger"
        elif [[ "${status}" == "success" ]]; then
            color="good"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"${color}\",\"title\":\"Compilatime Rollback ${status}\",\"text\":\"${message}\",\"footer\":\"$(hostname)\",\"ts\":$(date +%s)}]}" \
            "${SLACK_WEBHOOK_URL}" &>/dev/null || true
    fi
}

# ============================================
# FUNCIÓN PRINCIPAL DE ROLLBACK
# ============================================
rollback() {
    local target_version=$1
    local current_version=$(get_current_version)
    
    log_info "=========================================="
    log_info "Iniciando rollback"
    log_info "=========================================="
    log_info "Versión actual: ${current_version}"
    
    # Listar releases disponibles
    list_available_releases
    
    # Si no se especifica versión, usar la anterior
    if [[ -z "${target_version}" ]]; then
        target_version=$(ls -1t "${RELEASES_DIR}" | grep -v "^current$" | grep -v "^${current_version}$" | head -n1)
        if [[ -z "${target_version}" ]]; then
            log_error "No hay releases anteriores disponibles para rollback"
            exit 1
        fi
        log_info "Versión objetivo (automática): ${target_version}"
    else
        log_info "Versión objetivo: ${target_version}"
    fi
    
    # Verificar que la versión objetivo existe
    if [[ ! -d "${RELEASES_DIR}/${target_version}" ]]; then
        log_error "La release ${target_version} no existe"
        exit 1
    fi
    
    # Confirmar rollback
    confirm_rollback "${target_version}"
    
    # Backup antes del rollback
    backup_before_rollback
    
    # Cambiar release
    if ! switch_release "${target_version}"; then
        log_error "Error al cambiar release"
        send_notification "error" "Error al cambiar release durante rollback"
        exit 1
    fi
    
    # Reiniciar backend
    if ! restart_backend; then
        log_error "Error al reiniciar backend"
        send_notification "error" "Error al reiniciar backend durante rollback"
        exit 1
    fi
    
    # Verificar rollback
    if ! verify_rollback "${target_version}"; then
        log_error "Error al verificar rollback"
        send_notification "error" "Error al verificar rollback"
        exit 1
    fi
    
    log_success "=========================================="
    log_success "Rollback completado exitosamente"
    log_success "Versión actual: ${target_version}"
    log_success "=========================================="
    send_notification "success" "Rollback a versión ${target_version} completado exitosamente"
}

# ============================================
# SCRIPT PRINCIPAL
# ============================================
main() {
    local target_version=${1:-}
    
    # Verificar que existe el symlink current
    if [[ ! -L "${CURRENT_LINK}" ]]; then
        log_error "El symlink ${CURRENT_LINK} no existe"
        log_error "Primero debes hacer un despliegue inicial"
        exit 1
    fi
    
    rollback "${target_version}"
}

# Ejecutar función principal
main "$@"
