#!/bin/bash
#
# init.sh - Script de inicialización del sistema de despliegue
# Este script configura automáticamente todo lo necesario para el sistema de despliegue
#
# Uso: ./ops/init.sh [repo_url]
# Ejemplo: ./ops/init.sh https://github.com/tu-usuario/compilatime.git
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

# ============================================
# FUNCIONES DE UTILIDAD
# ============================================
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "El comando $1 no está instalado"
        return 1
    fi
    return 0
}

check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "No ejecutes este script como root. Usa el usuario deploy."
        exit 1
    fi
}

# ============================================
# SCRIPT PRINCIPAL
# ============================================
main() {
    local repo_url=${1:-}
    
    echo "=========================================="
    echo "  Inicialización del Sistema de Despliegue"
    echo "  Compilatime"
    echo "=========================================="
    echo ""
    
    # 1. Verificar que no se ejecuta como root
    log_info "Verificando usuario..."
    check_root
    
    # 2. Verificar comandos necesarios
    log_info "Verificando comandos necesarios..."
    local missing_commands=()
    
    for cmd in git node npm psql pg_dump pg_restore pm2; do
        if ! check_command $cmd; then
            missing_commands+=($cmd)
        fi
    done
    
    if [[ ${#missing_commands[@]} -gt 0 ]]; then
        log_error "Faltan los siguientes comandos: ${missing_commands[*]}"
        log_error "Instálalos antes de continuar"
        exit 1
    fi
    
    log_success "Todos los comandos necesarios están instalados"
    echo ""
    
    # 3. Copiar archivo de configuración
    log_info "Copiando archivo de configuración..."
    if [[ ! -f "ops/.env.ops" ]]; then
        cp ops/.env.ops.example ops/.env.ops
        log_success "Archivo ops/.env.ops creado"
    else
        log_warning "El archivo ops/.env.ops ya existe, no se sobrescribirá"
    fi
    echo ""
    
    # 4. Configurar URL del repositorio
    if [[ -n "${repo_url}" ]]; then
        log_info "Configurando URL del repositorio..."
        sed -i "s|REPO_URL=https://github.com/tu-usuario/compilatime.git|REPO_URL=${repo_url}|g" ops/.env.ops
        log_success "URL del repositorio configurada: ${repo_url}"
    else
        log_warning "No se especificó URL del repositorio"
        log_warning "Debes configurar REPO_URL en ops/.env.ops manualmente"
    fi
    echo ""
    
    # 5. Configurar acceso a PostgreSQL
    log_info "Configurando acceso a PostgreSQL..."
    
    # Extraer credenciales del .env.ops
    source ops/.env.ops
    
    # Crear archivo .pgpass
    if [[ ! -f ~/.pgpass ]]; then
        echo "${DB_HOST}:${DB_PORT}:${DB_NAME}:${DB_USER}:${DB_PASSWORD}" > ~/.pgpass
        chmod 600 ~/.pgpass
        log_success "Archivo ~/.pgpass creado"
    else
        log_warning "El archivo ~/.pgpass ya existe, no se sobrescribirá"
    fi
    
    # Probar conexión a PostgreSQL
    log_info "Probando conexión a PostgreSQL..."
    if PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -c "SELECT 1;" &> /dev/null; then
        log_success "Conexión a PostgreSQL exitosa"
    else
        log_error "No se puede conectar a PostgreSQL"
        log_error "Verifica las credenciales en ops/.env.ops"
        exit 1
    fi
    echo ""
    
    # 6. Configurar acceso a Git
    log_info "Configurando acceso a Git..."
    
    # Detectar si es HTTPS o SSH
    if [[ "${REPO_URL}" =~ ^https:// ]]; then
        log_info "Repositorio HTTPS detectado"
        log_info "Configurando credenciales de Git..."
        git config --global credential.helper store
        log_success "Credenciales de Git configuradas"
        log_warning "La primera vez que clones, se te pedirá el token"
    elif [[ "${REPO_URL}" =~ ^git@ ]]; then
        log_info "Repositorio SSH detectado"
        
        # Generar clave SSH si no existe
        if [[ ! -f ~/.ssh/id_ed25519 ]]; then
            log_info "Generando clave SSH..."
            ssh-keygen -t ed25519 -C "deploy@compilatime" -f ~/.ssh/id_ed25519 -N ""
            log_success "Clave SSH generada"
            log_info "Clave pública:"
            cat ~/.ssh/id_ed25519.pub
            log_warning "Añade esta clave en GitHub: Settings > SSH and GPG keys"
        else
            log_success "Clave SSH ya existe"
        fi
        
        # Probar conexión SSH
        log_info "Probando conexión SSH a GitHub..."
        if ssh -T git@github.com &> /dev/null; then
            log_success "Conexión SSH a GitHub exitosa"
        else
            log_warning "No se puede conectar a GitHub por SSH"
            log_warning "Asegúrate de haber añadido la clave pública en GitHub"
        fi
    else
        log_warning "No se pudo detectar el tipo de repositorio"
    fi
    echo ""
    
    # 7. Dar permisos de ejecución a scripts
    log_info "Dando permisos de ejecución a scripts..."
    chmod +x ops/deploy.sh ops/backup.sh ops/rollback.sh
    log_success "Permisos de ejecución dados"
    echo ""
    
    # 8. Crear directorios necesarios
    log_info "Creando directorios necesarios..."
    source ops/.env.ops
    mkdir -p "${RELEASES_DIR}" "${BACKUPS_DIR}/db" "${BACKUPS_DIR}/config" "${BACKUPS_DIR}/releases" "${LOGS_DIR}"
    log_success "Directorios creados"
    echo ""
    
    # 9. Instalar cron job para backups automáticos
    log_info "Instalando cron job para backups automáticos..."
    
    if [[ -f "/etc/cron.d/compilatime-backup" ]]; then
        log_warning "El cron job ya existe, no se sobrescribirá"
    else
        # Crear archivo de cron con el usuario correcto
        sed "s|deploy|$(whoami)|g" ops/cron/compilatime-backup.cron > /tmp/compilatime-backup.cron
        
        # Copiar a /etc/cron.d/ (requiere sudo)
        if sudo cp /tmp/compilatime-backup.cron /etc/cron.d/compilatime-backup; then
            sudo chmod 644 /etc/cron.d/compilatime-backup
            sudo service cron restart
            log_success "Cron job instalado"
            log_info "Backups automáticos configurados:"
            log_info "  - Diario completo a las 2:00 AM"
            log_info "  - DB cada 6 horas (2:00, 8:00, 14:00, 20:00)"
            log_info "  - Configuración diaria a las 3:00 AM"
        else
            log_error "No se pudo instalar el cron job (requiere sudo)"
            log_warning "Instálalo manualmente:"
            log_warning "  sudo cp ops/cron/compilatime-backup.cron /etc/cron.d/compilatime-backup"
            log_warning "  sudo chmod 644 /etc/cron.d/compilatime-backup"
            log_warning "  sudo service cron restart"
        fi
    fi
    echo ""
    
    # 10. Verificar PM2
    log_info "Verificando PM2..."
    if pm2 list &> /dev/null; then
        log_success "PM2 está instalado y funcionando"
    else
        log_warning "PM2 no está inicializado"
        log_info "Inicializando PM2..."
        pm2 list
        log_success "PM2 inicializado"
    fi
    echo ""
    
    # 11. Resumen
    echo "=========================================="
    echo "  Inicialización Completada"
    echo "=========================================="
    echo ""
    log_success "Sistema de despliegue configurado exitosamente"
    echo ""
    echo "Próximos pasos:"
    echo ""
    echo "1. Crear primer tag (desde PC local):"
    echo "   git tag -a v1.0.0 -m 'Versión 1.0.0'"
    echo "   git push origin v1.0.0"
    echo ""
    echo "2. Desplegar (en servidor):"
    echo "   ./ops/deploy.sh"
    echo ""
    echo "3. Verificar versión:"
    echo "   curl http://localhost:${BACKEND_PORT:-4000}/api/version"
    echo ""
    echo "Para más información, consulta: ops/README_DEPLOY.md"
    echo ""
}

# Ejecutar función principal
main "$@"
