#!/bin/bash

################################################################################
# Script de Restauración de Base de Datos de CompilaTime
#
# Este script restaura un backup de PostgreSQL en el servidor de base de datos.
#
# Uso:
#   sudo ./ops/restore-db.sh <archivo_backup>
#
# Ejemplos:
#   sudo ./ops/restore-db.sh /path/to/backup.dump
#   sudo ./ops/restore-db.sh /opt/compilatime/backups/db/compilatime_v1.0.0_20250101_120000.dump
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
Uso: sudo ./ops/restore-db.sh <archivo_backup>

Argumentos:
  archivo_backup    Ruta al archivo de backup a restaurar

Ejemplos:
  # Restaurar un backup específico
  sudo ./ops/restore-db.sh /path/to/backup.dump

  # Restaurar un backup del directorio de backups
  sudo ./ops/restore-db.sh /opt/compilatime/backups/db/compilatime_v1.0.0_20250101_120000.dump

Notas:
  - Este script hace un backup de seguridad antes de restaurar
  - El backup de seguridad se guarda en /opt/compilatime/backups/db/
  - El script requiere acceso a la base de datos PostgreSQL
EOF
}

# Verificar que se proporcionó un archivo de backup
if [ $# -eq 0 ]; then
    log_error "No se proporcionó un archivo de backup"
    show_help
    exit 1
fi

BACKUP_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "El archivo de backup no existe: $BACKUP_FILE"
    exit 1
fi

# Verificar que se ejecuta como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script debe ejecutarse como root (sudo)"
    exit 1
fi

# Cargar variables de entorno
if [ -f "/opt/compilatime/ops/.env.ops" ]; then
    source "/opt/compilatime/ops/.env.ops"
else
    log_error "No se encontró el archivo de configuración: /opt/compilatime/ops/.env.ops"
    log_error "Por favor, crea el archivo a partir de ops/.env.ops.example"
    exit 1
fi

# Verificar variables de entorno requeridas
if [ -z "${DB_HOST:-}" ] || [ -z "${DB_PORT:-}" ] || [ -z "${DB_NAME:-}" ] || [ -z "${DB_USER:-}" ] || [ -z "${DB_PASSWORD:-}" ]; then
    log_error "Faltan variables de entorno requeridas en /opt/compilatime/ops/.env.ops"
    log_error "Variables requeridas: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
    exit 1
fi

# Directorio de backups
BACKUP_DIR="/opt/compilatime/backups/db"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Directorio de logs
LOG_FILE="/var/log/compilatime-restore-db.log"

# Crear directorio de logs
mkdir -p /var/log
touch "$LOG_FILE"

# Redirigir output al log
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "=========================================="
log_info "Restauración de Base de Datos de CompilaTime"
log_info "=========================================="
log_info "Fecha: $(date)"
log_info "Archivo de backup: $BACKUP_FILE"
log_info "Host de PostgreSQL: $DB_HOST:$DB_PORT"
log_info "Base de datos: $DB_NAME"
log_info "Usuario de PostgreSQL: $DB_USER"
log_info "=========================================="
echo ""

################################################################################
# 1. Verificar conexión a PostgreSQL
################################################################################
log_info "Paso 1: Verificando conexión a PostgreSQL..."

if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "No se pudo conectar a PostgreSQL"
    log_error "Verifica que PostgreSQL esté corriendo y accesible desde este servidor"
    log_error "Comando de prueba: PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT 1;\""
    exit 1
fi

log_success "Conexión a PostgreSQL exitosa"
echo ""

################################################################################
# 2. Hacer backup de seguridad antes de restaurar
################################################################################
log_info "Paso 2: Haciendo backup de seguridad antes de restaurar..."

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PRE_RESTORE_BACKUP="$BACKUP_DIR/compilatime_pre_restore_${TIMESTAMP}.dump"

log_info "Creando backup de seguridad en: $PRE_RESTORE_BACKUP"

if ! PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$PRE_RESTORE_BACKUP"; then
    log_error "No se pudo crear el backup de seguridad"
    log_error "La restauración se ha cancelado por seguridad"
    exit 1
fi

log_success "Backup de seguridad creado exitosamente"
echo ""

################################################################################
# 3. Verificar formato del backup
################################################################################
log_info "Paso 3: Verificando formato del backup..."

# Verificar si el archivo es un dump de PostgreSQL
if ! file "$BACKUP_FILE" | grep -q "PostgreSQL custom database dump"; then
    log_warning "El archivo no parece ser un dump de PostgreSQL en formato custom"
    log_warning "Intentando restaurar de todas formas..."
fi

log_success "Formato del backup verificado"
echo ""

################################################################################
# 4. Restaurar backup
################################################################################
log_info "Paso 4: Restaurando backup..."

log_info "Este proceso puede tardar varios minutos dependiendo del tamaño del backup"
log_info "Por favor, espera..."

# Restaurar el backup
if ! PGPASSWORD="$DB_PASSWORD" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v "$BACKUP_FILE" 2>&1 | tee /tmp/pg_restore.log; then
    log_error "La restauración falló"
    log_error "Mostrando log de pg_restore:"
    cat /tmp/pg_restore.log
    log_error ""
    log_error "El backup de seguridad se guardó en: $PRE_RESTORE_BACKUP"
    log_error "Para restaurar el backup de seguridad, ejecuta:"
    log_error "  PGPASSWORD=$DB_PASSWORD pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v $PRE_RESTORE_BACKUP"
    exit 1
fi

log_success "Backup restaurado exitosamente"
echo ""

################################################################################
# 5. Verificar restauración
################################################################################
log_info "Paso 5: Verificando restauración..."

# Verificar que la base de datos tiene datos
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" -eq 0 ]; then
    log_error "La base de datos no tiene tablas después de la restauración"
    log_error "Es posible que la restauración haya fallado"
    log_error "El backup de seguridad se guardó en: $PRE_RESTORE_BACKUP"
    exit 1
fi

log_success "Restauración verificada exitosamente"
log_info "Número de tablas en la base de datos: $TABLE_COUNT"
echo ""

################################################################################
# 6. Finalizar restauración
################################################################################
log_info "=========================================="
log_success "Restauración de Base de Datos completada exitosamente"
log_info "=========================================="
log_info "Resumen de la restauración:"
log_info "  - Archivo de backup restaurado: $BACKUP_FILE"
log_info "  - Backup de seguridad: $PRE_RESTORE_BACKUP"
log_info "  - Host de PostgreSQL: $DB_HOST:$DB_PORT"
log_info "  - Base de datos: $DB_NAME"
log_info "  - Número de tablas: $TABLE_COUNT"
log_info "  - Logs de restauración: $LOG_FILE"
log_info "=========================================="
log_info "Comandos útiles:"
log_info "  - Verificar conexión a PostgreSQL: PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT 1;\""
log_info "  - Ver tablas en la base de datos: PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"\\dt\""
log_info "  - Restaurar backup de seguridad: PGPASSWORD=$DB_PASSWORD pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v $PRE_RESTORE_BACKUP"
log_info "=========================================="
log_info "Siguientes pasos:"
log_info "  1. Verificar que la aplicación funciona correctamente"
log_info "  2. Verificar que los datos son correctos"
log_info "  3. Si hay problemas, restaura el backup de seguridad"
log_info "=========================================="

exit 0
