#!/bin/bash
#
# backup.sh - Script de backups para Compilatime
# Uso: ./backup.sh [db|config|all]
# Ejemplo: ./backup.sh all
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
# VARIABLES DE BACKUP
# ============================================
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="${LOGS_DIR}/backup_${TIMESTAMP}.log"
BACKUP_DB_DIR="${BACKUPS_DIR}/db"
BACKUP_CONFIG_DIR="${BACKUPS_DIR}/config"

# Crear directorios necesarios
mkdir -p "${BACKUP_DB_DIR}" "${BACKUP_CONFIG_DIR}" "${LOGS_DIR}"

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

check_database_connection() {
    log_info "Verificando conexión a la base de datos..."
    
    if PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -c "SELECT 1;" &>/dev/null; then
        log_success "Conexión a base de datos exitosa"
        return 0
    else
        log_error "No se puede conectar a la base de datos"
        return 1
    fi
}

backup_database() {
    local backup_file="${BACKUP_DB_DIR}/compilatime_manual_${TIMESTAMP}.dump"
    
    log_info "=========================================="
    log_info "Iniciando backup de base de datos"
    log_info "=========================================="
    
    # Verificar conexión
    if ! check_database_connection; then
        return 1
    fi
    
    # Obtener tamaño estimado de la base de datos
    local db_size=$(PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));" | tr -d ' ')
    
    log_info "Tamaño estimado de la base de datos: ${db_size}"
    
    # Hacer backup con pg_dump (formato custom comprimido)
    log_info "Ejecutando pg_dump..."
    
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
        
        # Obtener tamaño del backup
        local backup_size=$(du -h "${backup_file}" | cut -f1)
        
        log_success "Backup de base de datos completado"
        log_success "Archivo: ${backup_file}"
        log_success "Tamaño: ${backup_size}"
        
        # Rotación de backups
        rotate_backups "${BACKUP_DB_DIR}" "${DB_BACKUP_RETENTION:-14}"
        
        return 0
    else
        log_error "Error al hacer backup de base de datos"
        return 1
    fi
}

backup_config() {
    local backup_file="${BACKUP_CONFIG_DIR}/config_manual_${TIMESTAMP}.tar.gz"
    
    log_info "=========================================="
    log_info "Iniciando backup de configuración"
    log_info "=========================================="
    
    # Verificar que existe el symlink current
    if [[ ! -L "${CURRENT_LINK}" ]]; then
        log_error "El symlink ${CURRENT_LINK} no existe"
        return 1
    fi
    
    # Crear lista de archivos a incluir
    local files_to_backup=()
    
    # Archivos .env
    if [[ -f "${CURRENT_LINK}/backend/.env" ]]; then
        files_to_backup+=("backend/.env")
    fi
    
    if [[ -f "${CURRENT_LINK}/frontend/.env" ]]; then
        files_to_backup+=("frontend/.env")
    fi
    
    # Archivos de configuración adicionales
    if [[ -f "${CURRENT_LINK}/backend/ecosystem.config.cjs" ]]; then
        files_to_backup+=("backend/ecosystem.config.cjs")
    fi
    
    if [[ -f "${CURRENT_LINK}/backend/prisma/schema.prisma" ]]; then
        files_to_backup+=("backend/prisma/schema.prisma")
    fi
    
    if [[ ${#files_to_backup[@]} -eq 0 ]]; then
        log_warning "No se encontraron archivos de configuración para backup"
        return 1
    fi
    
    log_info "Archivos a incluir en el backup:"
    for file in "${files_to_backup[@]}"; do
        log_info "  - ${file}"
    done
    
    # Crear backup
    log_info "Creando archivo tar.gz..."
    
    if tar -czf "${backup_file}" \
        -C "${CURRENT_LINK}" \
        "${files_to_backup[@]}" \
        2>&1 | tee -a "${LOG_FILE}"; then
        
        # Establecer permisos restrictivos
        chmod 600 "${backup_file}"
        
        # Obtener tamaño del backup
        local backup_size=$(du -h "${backup_file}" | cut -f1)
        
        log_success "Backup de configuración completado"
        log_success "Archivo: ${backup_file}"
        log_success "Tamaño: ${backup_size}"
        
        # Rotación de backups
        rotate_backups "${BACKUP_CONFIG_DIR}" "${CONFIG_BACKUP_RETENTION:-10}"
        
        return 0
    else
        log_error "Error al hacer backup de configuración"
        return 1
    fi
}

backup_current_release() {
    local backup_file="${BACKUPS_DIR}/releases/current_${TIMESTAMP}.tar.gz"
    
    log_info "=========================================="
    log_info "Iniciando backup de release actual"
    log_info "=========================================="
    
    # Verificar que existe el symlink current
    if [[ ! -L "${CURRENT_LINK}" ]]; then
        log_error "El symlink ${CURRENT_LINK} no existe"
        return 1
    fi
    
    # Obtener versión actual
    local current_version=""
    if [[ -f "${CURRENT_LINK}/VERSION" ]]; then
        current_version=$(cat "${CURRENT_LINK}/VERSION")
        log_info "Versión actual: ${current_version}"
    fi
    
    # Crear backup de la release actual (excluyendo node_modules y dist)
    log_info "Creando backup de la release actual..."
    
    if tar -czf "${backup_file}" \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='.git' \
        -C "${CURRENT_LINK}" \
        . \
        2>&1 | tee -a "${LOG_FILE}"; then
        
        # Establecer permisos restrictivos
        chmod 600 "${backup_file}"
        
        # Obtener tamaño del backup
        local backup_size=$(du -h "${backup_file}" | cut -f1)
        
        log_success "Backup de release completado"
        log_success "Archivo: ${backup_file}"
        log_success "Tamaño: ${backup_size}"
        
        return 0
    else
        log_error "Error al hacer backup de release"
        return 1
    fi
}

rotate_backups() {
    local backup_dir=$1
    local retention=$2
    
    log_info "Rotando backups en ${backup_dir} (mantener últimos ${retention})..."
    
    # Rotar backups de DB
    local db_count=$(ls -1 "${backup_dir}"/*.dump 2>/dev/null | wc -l) || db_count=0
    if [[ ${db_count} -gt ${retention} ]]; then
        ls -1t "${backup_dir}"/*.dump 2>/dev/null | tail -n +$((retention + 1)) | xargs rm -f
        log_info "Eliminados $((db_count - retention)) backups antiguos de DB"
    fi
    
    # Rotar backups de config
    local config_count=$(ls -1 "${backup_dir}"/*.tar.gz 2>/dev/null | wc -l) || config_count=0
    if [[ ${config_count} -gt ${retention} ]]; then
        ls -1t "${backup_dir}"/*.tar.gz 2>/dev/null | tail -n +$((retention + 1)) | xargs rm -f
        log_info "Eliminados $((config_count - retention)) backups antiguos de config"
    fi
}

list_backups() {
    log_info "=========================================="
    log_info "Backups disponibles"
    log_info "=========================================="
    
    # Backups de base de datos
    log_info ""
    log_info "Base de datos:"
    if ls -1 "${BACKUP_DB_DIR}"/*.dump &>/dev/null; then
        ls -lh "${BACKUP_DB_DIR}"/*.dump | awk '{print "  " $9 " (" $5 ")"}'
    else
        log_info "  No hay backups de base de datos"
    fi
    
    # Backups de configuración
    log_info ""
    log_info "Configuración:"
    if ls -1 "${BACKUP_CONFIG_DIR}"/*.tar.gz &>/dev/null; then
        ls -lh "${BACKUP_CONFIG_DIR}"/*.tar.gz | awk '{print "  " $9 " (" $5 ")"}'
    else
        log_info "  No hay backups de configuración"
    fi
    
    # Backups de releases
    log_info ""
    log_info "Releases:"
    if ls -1 "${BACKUPS_DIR}/releases"/*.tar.gz &>/dev/null; then
        ls -lh "${BACKUPS_DIR}/releases"/*.tar.gz | awk '{print "  " $9 " (" $5 ")"}'
    else
        log_info "  No hay backups de releases"
    fi
}

restore_database() {
    local backup_file=$1
    
    log_info "=========================================="
    log_info "Restaurando base de datos desde backup"
    log_info "=========================================="
    
    # Verificar que el archivo existe
    if [[ ! -f "${backup_file}" ]]; then
        log_error "El archivo de backup no existe: ${backup_file}"
        return 1
    fi
    
    # Confirmar restauración
    log_warning "ADVERTENCIA: Esto sobrescribirá la base de datos actual"
    log_warning "¿Estás seguro de que deseas continuar? (s/n)"
    read -r response
    if [[ "${response}" != "s" && "${response}" != "S" ]]; then
        log_info "Restauración cancelada por el usuario"
        return 0
    fi
    
    # Crear backup de seguridad antes de restaurar
    log_info "Creando backup de seguridad antes de restaurar..."
    backup_database
    
    # Restaurar base de datos
    log_info "Restaurando base de datos..."
    
    if PGPASSWORD="${DB_PASSWORD}" pg_restore \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -c \
        --if-exists \
        "${backup_file}" \
        2>&1 | tee -a "${LOG_FILE}"; then
        
        log_success "Base de datos restaurada exitosamente"
        return 0
    else
        log_error "Error al restaurar base de datos"
        return 1
    fi
}

send_notification() {
    local status=$1
    local message=$2
    
    # Notificación Slack (opcional)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        if [[ "${status}" == "error" ]]; then
            color="danger"
        elif [[ "${status}" == "warning" ]]; then
            color="warning"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"${color}\",\"title\":\"Compilatime Backup ${status}\",\"text\":\"${message}\",\"footer\":\"$(hostname)\",\"ts\":$(date +%s)}]}" \
            "${SLACK_WEBHOOK_URL}" &>/dev/null || true
    fi
}

# ============================================
# SCRIPT PRINCIPAL
# ============================================
main() {
    local command=${1:-all}
    
    case "${command}" in
        db)
            if ! check_disk_space; then
                send_notification "error" "Espacio en disco insuficiente para backup de DB"
                exit 1
            fi
            
            if backup_database; then
                send_notification "success" "Backup de base de datos completado exitosamente"
                exit 0
            else
                send_notification "error" "Error al hacer backup de base de datos"
                exit 1
            fi
            ;;
        config)
            if backup_config; then
                send_notification "success" "Backup de configuración completado exitosamente"
                exit 0
            else
                send_notification "error" "Error al hacer backup de configuración"
                exit 1
            fi
            ;;
        release)
            if backup_current_release; then
                send_notification "success" "Backup de release completado exitosamente"
                exit 0
            else
                send_notification "error" "Error al hacer backup de release"
                exit 1
            fi
            ;;
        all)
            local success=true
            
            if ! check_disk_space; then
                send_notification "error" "Espacio en disco insuficiente para backup completo"
                exit 1
            fi
            
            if ! backup_database; then
                success=false
            fi
            
            if ! backup_config; then
                success=false
            fi
            
            if ! backup_current_release; then
                success=false
            fi
            
            if [[ "${success}" == "true" ]]; then
                send_notification "success" "Backup completo finalizado exitosamente"
                exit 0
            else
                send_notification "error" "Backup completo finalizado con errores"
                exit 1
            fi
            ;;
        list)
            list_backups
            exit 0
            ;;
        restore)
            if [[ -z "${2:-}" ]]; then
                log_error "Uso: $0 restore <backup_file>"
                exit 1
            fi
            restore_database "$2"
            exit $?
            ;;
        *)
            log_error "Comando desconocido: ${command}"
            log_error "Uso: $0 <db|config|release|all|list|restore> [backup_file]"
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"
