#!/bin/bash
#
# deploy.sh - Script de despliegue por versiones para Compilatime
# Uso: ./deploy.sh [version] | ./deploy.sh latest
# Ejemplos:
#   ./deploy.sh              # Desplegar última versión automáticamente
#   ./deploy.sh v1.0.0       # Desplegar versión específica
#   ./deploy.sh latest       # Desplegar última versión
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

# Cargar variables de entorno (excluyendo contraseñas de logs)
set -a
source "${ENV_FILE}"
set +a

# ============================================
# VARIABLES DE DESPLIEGUE
# ============================================
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="${LOGS_DIR}/deploy_${TIMESTAMP}.log"
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

check_git_tag() {
    local tag=$1
    
    if [[ "${tag}" == "latest" ]]; then
        # Obtener el último tag semver
        VERSION=$(git -c 'versionsort.suffix=-' ls-remote --tags --sort='v:refname' "${REPO_URL}" | tail -n1 | sed 's/.*\///')
        if [[ -z "${VERSION}" ]]; then
            log_error "No se encontraron tags en el repositorio"
            exit 1
        fi
        log_info "Última versión detectada: ${VERSION}"
    else
        VERSION="${tag}"
    fi
    
    # Verificar que el tag existe en el repositorio remoto
    if ! git ls-remote --tags "${REPO_URL}" | grep -q "refs/tags/${VERSION}$"; then
        log_error "El tag ${VERSION} no existe en el repositorio remoto"
        log_error "Tags disponibles:"
        git ls-remote --tags "${REPO_URL}" | sed 's/.*\///' | while read -r tag; do
            log_error "  - ${tag}"
        done
        exit 1
    fi
    
    log_success "Tag ${VERSION} verificado en repositorio remoto"
}

backup_database() {
    local tag=$1
    local backup_file="${BACKUPS_DIR}/db/compilatime_${tag}_${TIMESTAMP}.dump"
    
    log_info "Iniciando backup de base de datos..."
    
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
        
        log_success "Backup de base de datos completado: ${backup_file}"
        
        # Rotación de backups
        rotate_backups "${BACKUPS_DIR}/db" "${DB_BACKUP_RETENTION:-14}"
        
        return 0
    else
        log_error "Error al hacer backup de base de datos"
        return 1
    fi
}

backup_config() {
    local tag=$1
    local backup_file="${BACKUPS_DIR}/config/${tag}_${TIMESTAMP}.tar.gz"
    
    log_info "Iniciando backup de configuración..."
    
    # Crear directorio de backups si no existe
    mkdir -p "${BACKUPS_DIR}/config"
    
    # Backup de .env y configuraciones
    if tar -czf "${backup_file}" \
        -C "${CURRENT_LINK}" \
        backend/.env \
        frontend/.env \
        2>&1 | tee -a "${LOG_FILE}"; then
        
        # Establecer permisos restrictivos
        chmod 600 "${backup_file}"
        
        log_success "Backup de configuración completado: ${backup_file}"
        
        # Rotación de backups
        rotate_backups "${BACKUPS_DIR}/config" "${CONFIG_BACKUP_RETENTION:-10}"
        
        return 0
    else
        log_error "Error al hacer backup de configuración"
        return 1
    fi
}

rotate_backups() {
    local backup_dir=$1
    local retention=$2
    
    log_info "Rotando backups en ${backup_dir} (mantener últimos ${retention})..."
    
    # Contar archivos y eliminar los más antiguos
    local count=$(ls -1 "${backup_dir}"/*.dump 2>/dev/null | wc -l) || count=0
    local count_config=$(ls -1 "${backup_dir}"/*.tar.gz 2>/dev/null | wc -l) || count_config=0
    
    if [[ ${count} -gt ${retention} ]]; then
        ls -1t "${backup_dir}"/*.dump 2>/dev/null | tail -n +$((retention + 1)) | xargs rm -f
        log_info "Eliminados $((count - retention)) backups antiguos de DB"
    fi
    
    if [[ ${count_config} -gt ${retention} ]]; then
        ls -1t "${backup_dir}"/*.tar.gz 2>/dev/null | tail -n +$((retention + 1)) | xargs rm -f
        log_info "Eliminados $((count_config - retention)) backups antiguos de config"
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

run_migrations() {
    if [[ "${ENABLE_MIGRATIONS:-true}" != "true" ]]; then
        log_warning "Migraciones deshabilitadas, saltando..."
        return 0
    fi
    
    log_info "Ejecutando migraciones de base de datos..."
    
    cd "${TEMP_DIR}/backend"
    
    # Ejecutar migraciones con timeout
    if timeout "${MIGRATION_TIMEOUT:-300}" npx prisma migrate deploy 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Migraciones ejecutadas correctamente"
        return 0
    else
        local exit_code=$?
        if [[ ${exit_code} -eq 124 ]]; then
            log_error "Timeout al ejecutar migraciones (${MIGRATION_TIMEOUT:-300}s)"
        else
            log_error "Error al ejecutar migraciones (código: ${exit_code})"
        fi
        log_error "Para restaurar la base de datos desde el backup:"
        log_error "  pg_restore -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} ${BACKUPS_DIR}/db/compilatime_${VERSION}_${TIMESTAMP}.dump"
        return 1
    fi
}

create_release() {
    local tag=$1
    
    log_info "Creando release ${tag}..."
    
    # Mover directorio temporal a release
    mv "${TEMP_DIR}" "${RELEASE_DIR}"
    
    # Crear archivo VERSION
    echo "${tag}" > "${RELEASE_DIR}/VERSION"
    
    # Copiar archivos .env desde current si existen
    if [[ -L "${CURRENT_LINK}" ]]; then
        log_info "Copiando archivos .env desde release actual..."
        if [[ -f "${CURRENT_LINK}/backend/.env" ]]; then
            cp "${CURRENT_LINK}/backend/.env" "${RELEASE_DIR}/backend/.env"
        fi
        if [[ -f "${CURRENT_LINK}/frontend/.env" ]]; then
            cp "${CURRENT_LINK}/frontend/.env" "${RELEASE_DIR}/frontend/.env"
        fi
    fi
    
    log_success "Release ${tag} creada en ${RELEASE_DIR}"
}

switch_release() {
    local tag=$1
    
    log_info "Cambiando symlink a release ${tag}..."
    
    # Crear symlink temporal
    local temp_link="${DEPLOY_ROOT}/current_new"
    
    ln -sfn "${RELEASE_DIR}" "${temp_link}"
    
    # Cambiar symlink atómicamente
    mv -Tf "${temp_link}" "${CURRENT_LINK}"
    
    log_success "Symlink actualizado a ${tag}"
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

cleanup_old_releases() {
    local retention=${RELEASE_RETENTION:-5}
    
    log_info "Limpiando releases antiguas (mantener últimas ${retention})..."
    
    # Listar releases ordenadas por fecha
    local releases=($(ls -1t "${RELEASES_DIR}" | grep -v "^current$"))
    
    if [[ ${#releases[@]} -gt ${retention} ]]; then
        local to_delete=(${releases[@]:${retention}})
        
        for release in "${to_delete[@]}"; do
            log_info "Eliminando release antigua: ${release}"
            rm -rf "${RELEASES_DIR}/${release}"
        done
        
        log_success "Eliminadas ${#to_delete[@]} releases antiguas"
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
            --data "{\"attachments\":[{\"color\":\"${color}\",\"title\":\"Compilatime Deploy ${status}\",\"text\":\"${message}\",\"footer\":\"$(hostname)\",\"ts\":$(date +%s)}]}" \
            "${SLACK_WEBHOOK_URL}" &>/dev/null || true
    fi
    
    # Notificación por email (opcional)
    if [[ -n "${ALERT_EMAIL:-}" && "${status}" == "error" ]]; then
        echo "${message}" | mail -s "[ERROR] Compilatime Deploy Failed" "${ALERT_EMAIL}" &>/dev/null || true
    fi
}

# ============================================
# FUNCIÓN PRINCIPAL DE DESPLIEGUE
# ============================================
deploy() {
    local version_arg=$1
    
    log_info "=========================================="
    log_info "Iniciando despliegue de versión: ${version_arg}"
    log_info "=========================================="
    
    # 1. Verificar espacio en disco
    if ! check_disk_space; then
        send_notification "error" "Espacio en disco insuficiente para despliegue"
        exit 1
    fi
    
    # 2. Verificar tag de Git
    check_git_tag "${version_arg}"
    
    # 3. Verificar que la release no existe ya
    if [[ -d "${RELEASES_DIR}/${VERSION}" ]]; then
        log_warning "La release ${VERSION} ya existe. ¿Deseas continuar? (s/n)"
        read -r response
        if [[ "${response}" != "s" && "${response}" != "S" ]]; then
            log_info "Despliegue cancelado por el usuario"
            exit 0
        fi
    fi
    
    # 4. Backup de base de datos
    if ! backup_database "${VERSION}"; then
        send_notification "error" "Error al hacer backup de base de datos"
        exit 1
    fi
    
    # 5. Backup de configuración
    if ! backup_config "${VERSION}"; then
        log_warning "Error al hacer backup de configuración, continuando..."
    fi
    
    # 6. Clonar repositorio
    if ! clone_repository "${VERSION}"; then
        send_notification "error" "Error al clonar repositorio"
        exit 1
    fi
    
    # 7. Instalar dependencias
    if ! install_dependencies; then
        send_notification "error" "Error al instalar dependencias"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
    
    # 8. Compilar aplicación
    if ! build_application; then
        send_notification "error" "Error al compilar aplicación"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
    
    # 9. Ejecutar migraciones
    if ! run_migrations; then
        send_notification "error" "Error al ejecutar migraciones"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
    
    # 10. Crear release
    create_release "${VERSION}"
    
    # 11. Cambiar symlink
    switch_release "${VERSION}"
    
    # 12. Reiniciar backend
    if ! restart_backend; then
        log_error "Error al reiniciar backend. Ejecutando rollback..."
        rollback "${VERSION}"
        send_notification "error" "Error al reiniciar backend, rollback ejecutado"
        exit 1
    fi
    
    # 13. Limpiar releases antiguas
    cleanup_old_releases
    
    # 14. Verificar estado
    log_info "Verificando estado del despliegue..."
    sleep 5
    
    if pm2 describe "${PM2_APP_NAME:-compilatime}" | grep -q "online"; then
        log_success "=========================================="
        log_success "Despliegue completado exitosamente"
        log_success "Versión: ${VERSION}"
        log_success "Release: ${RELEASE_DIR}"
        log_success "=========================================="
        send_notification "success" "Despliegue de versión ${VERSION} completado exitosamente"
    else
        log_error "El backend no está online después del despliegue"
        send_notification "error" "Backend no está online después del despliegue"
        exit 1
    fi
}

# ============================================
# FUNCIÓN DE ROLLBACK
# ============================================
rollback() {
    local current_version=$1
    local target_version=$2
    
    log_warning "=========================================="
    log_warning "Iniciando rollback desde ${current_version}"
    log_warning "=========================================="
    
    # Listar releases disponibles
    log_info "Releases disponibles:"
    ls -1t "${RELEASES_DIR}" | grep -v "^current$" | while read -r release; do
        if [[ "${release}" != "${current_version}" ]]; then
            log_info "  - ${release}"
        fi
    done
    
    # Si no se especifica versión, usar la anterior
    if [[ -z "${target_version}" ]]; then
        target_version=$(ls -1t "${RELEASES_DIR}" | grep -v "^current$" | grep -v "^${current_version}$" | head -n1)
        if [[ -z "${target_version}" ]]; then
            log_error "No hay releases anteriores disponibles para rollback"
            exit 1
        fi
    fi
    
    # Verificar que la release existe
    if [[ ! -d "${RELEASES_DIR}/${target_version}" ]]; then
        log_error "La release ${target_version} no existe"
        exit 1
    fi
    
    log_warning "Rollback a versión: ${target_version}"
    
    # Cambiar symlink
    switch_release "${target_version}"
    
    # Reiniciar backend
    if ! restart_backend; then
        log_error "Error al reiniciar backend durante rollback"
        exit 1
    fi
    
    log_success "=========================================="
    log_success "Rollback completado exitosamente"
    log_success "Versión actual: ${target_version}"
    log_success "=========================================="
}

# ============================================
# SCRIPT PRINCIPAL
# ============================================
main() {
    local command=${1:-deploy}
    local version_arg=${2:-}
    
    case "${command}" in
        deploy)
            # Si no se especifica versión, usar la última automáticamente
            if [[ -z "${version_arg}" ]]; then
                log_info "No se especificó versión, detectando última versión disponible..."
                version_arg="latest"
            fi
            deploy "${version_arg}"
            ;;
        rollback)
            rollback "${version_arg}"
            ;;
        *)
            log_error "Comando desconocido: ${command}"
            log_error "Uso: $0 <deploy|rollback> [version]"
            log_error ""
            log_error "Ejemplos:"
            log_error "  $0 deploy              # Desplegar última versión automáticamente"
            log_error "  $0 deploy v1.0.0       # Desplegar versión específica"
            log_error "  $0 deploy latest       # Desplegar última versión"
            log_error "  $0 rollback            # Rollback a versión anterior"
            log_error "  $0 rollback v1.0.0     # Rollback a versión específica"
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"
