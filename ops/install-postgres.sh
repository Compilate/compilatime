#!/bin/bash

################################################################################
# Script de Instalación de PostgreSQL para Ubuntu 22.04 (Proxmox)
# 
# Este script instala y configura PostgreSQL en un contenedor Ubuntu 22.04
# para ser usado como base de datos de CompilaTime.
#
# Uso:
#   sudo ./ops/install-postgres.sh [opciones]
#
# Opciones:
#   --db-name NAME          Nombre de la base de datos (default: compilatime)
#   --db-user USER          Usuario de la base de datos (default: rafa)
#   --db-password PASS      Contraseña de la base de datos (default: C0mp1l@te)
#   --db-port PORT          Puerto de PostgreSQL (default: 5432)
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
Uso: sudo ./ops/install-postgres.sh [opciones]

Opciones:
  --db-name NAME          Nombre de la base de datos (default: compilatime)
  --db-user USER          Usuario de la base de datos (default: rafa)
  --db-password PASS      Contraseña de la base de datos (default: C0mp1l@te)
  --db-port PORT          Puerto de PostgreSQL (default: 5432)
  --help                  Mostrar esta ayuda

Ejemplos:
  # Instalación básica
  sudo ./ops/install-postgres.sh

  # Instalación con credenciales personalizadas
  sudo ./ops/install-postgres.sh \
    --db-name compilatime \
    --db-user rafa \
    --db-password C0mp1l@te

  # Instalación con puerto personalizado
  sudo ./ops/install-postgres.sh --db-port 5432
EOF
}

# Valores por defecto
DB_NAME="compilatime"
DB_USER="rafa"
DB_PASSWORD="C0mp1l@te"
DB_PORT="5432"

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
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
        --db-port)
            DB_PORT="$2"
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

# Directorio de logs
LOG_FILE="/var/log/postgres-install.log"

# Crear directorio de logs
mkdir -p /var/log
touch "$LOG_FILE"

# Redirigir output al log
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "=========================================="
log_info "Instalación de PostgreSQL para CompilaTime"
log_info "=========================================="
log_info "Fecha: $(date)"
log_info "Base de datos: $DB_NAME"
log_info "Usuario: $DB_USER"
log_info "Puerto: $DB_PORT"
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
    log_warning "Se recomienda al menos 1GB de memoria RAM para PostgreSQL"
fi

# Verificar espacio en disco
DISK_SPACE=$(df -BG /var/lib/postgresql 2>/dev/null | awk 'NR==2 {print $4}' || echo "0")
log_info "Espacio disponible en disco: ${DISK_SPACE}GB"

if [[ $DISK_SPACE -lt 5 ]]; then
    log_warning "Se recomienda al menos 5GB de espacio en disco para PostgreSQL"
fi

log_success "Requisitos del sistema verificados"
echo ""

################################################################################
# 2. Actualizar repositorios
################################################################################
log_info "Paso 2: Actualizando repositorios..."
apt-get update -y
log_success "Repositorios actualizados"
echo ""

################################################################################
# 3. Instalar PostgreSQL
################################################################################
log_info "Paso 3: Instalando PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Verificar instalación de PostgreSQL
PG_VERSION=$(psql --version)
log_success "PostgreSQL instalado: $PG_VERSION"
echo ""

################################################################################
# 4. Configurar PostgreSQL para aceptar conexiones remotas
################################################################################
log_info "Paso 4: Configurando PostgreSQL para conexiones remotas..."

# Configurar postgresql.conf
PG_CONF="/etc/postgresql/15/main/postgresql.conf"
if [ -f "$PG_CONF" ]; then
    # Configurar listen_addresses
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
    sed -i "s/#port = 5432/port = $DB_PORT/" "$PG_CONF"
    log_success "Configurado $PG_CONF"
else
    log_error "No se encontró $PG_CONF"
    exit 1
fi

# Configurar pg_hba.conf
PG_HBA="/etc/postgresql/15/main/pg_hba.conf"
if [ -f "$PG_HBA" ]; then
    # Agregar configuración para conexiones remotas
    if ! grep -q "host    all             all             0.0.0.0/0            md5" "$PG_HBA"; then
        echo "host    all             all             0.0.0.0/0            md5" >> "$PG_HBA"
        log_success "Configurado $PG_HBA para conexiones remotas"
    else
        log_info "$PG_HBA ya está configurado para conexiones remotas"
    fi
else
    log_error "No se encontró $PG_HBA"
    exit 1
fi

# Reiniciar PostgreSQL
log_info "Reiniciando PostgreSQL..."
systemctl restart postgresql

# Verificar que PostgreSQL está corriendo
if systemctl is-active --quiet postgresql; then
    log_success "PostgreSQL está corriendo"
else
    log_error "PostgreSQL no está corriendo"
    log_error "Verifica los logs: journalctl -u postgresql"
    exit 1
fi
echo ""

################################################################################
# 5. Crear usuario y base de datos
################################################################################
log_info "Paso 5: Creando usuario y base de datos..."

# Crear usuario y base de datos usando psql
su - postgres -c "psql" << EOF
-- Crear usuario
DO \$\$
BEGIN;
    IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = '$DB_USER') THEN
        RAISE NOTICE 'El usuario ya existe';
    ELSE
        CREATE USER "$DB_USER" WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$;

-- Crear base de datos
DO \$\$
BEGIN;
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$DB_NAME') THEN
        RAISE NOTICE 'La base de datos ya existe';
    ELSE
        CREATE DATABASE "$DB_NAME" OWNER "$DB_USER";
    END IF;
END
\$;

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";
\q
EOF

log_success "Usuario '$DB_USER' creado"
log_success "Base de datos '$DB_NAME' creada"
echo ""

################################################################################
# 6. Configurar firewall
################################################################################
log_info "Paso 6: Configurando firewall..."

# Permitir puerto de PostgreSQL
ufw allow $DB_PORT/tcp

# Habilitar firewall si no está habilitado
if ! ufw status | grep -q "Status: active"; then
    ufw --force enable
    log_success "Firewall habilitado"
else
    log_info "Firewall ya está habilitado"
fi

log_success "Firewall configurado para permitir conexiones en el puerto $DB_PORT"
echo ""

################################################################################
# 7. Obtener dirección IP
################################################################################
log_info "Paso 7: Obteniendo dirección IP..."

# Obtener dirección IP
IP_ADDR=$(ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)

if [ -z "$IP_ADDR" ]; then
    log_warning "No se pudo obtener la dirección IP automáticamente"
    IP_ADDR="<IP_DEL_CONTENEDOR>"
else
    log_success "Dirección IP: $IP_ADDR"
fi
echo ""

################################################################################
# 8. Verificar instalación
################################################################################
log_info "Paso 8: Verificando instalación..."

# Verificar que PostgreSQL está corriendo
if systemctl is-active --quiet postgresql; then
    log_success "PostgreSQL está corriendo"
else
    log_error "PostgreSQL no está corriendo"
    log_error "Verifica los logs: journalctl -u postgresql"
    exit 1
fi

# Verificar que el puerto está escuchando
if ss -tuln | grep -q ":$DB_PORT "; then
    log_success "PostgreSQL está escuchando en el puerto $DB_PORT"
else
    log_error "PostgreSQL no está escuchando en el puerto $DB_PORT"
    log_error "Verifica la configuración de PostgreSQL"
    exit 1
fi

# Verificar conexión local
if PGPASSWORD="$DB_PASSWORD" psql -h localhost -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Conexión local a PostgreSQL exitosa"
else
    log_error "No se pudo conectar localmente a PostgreSQL"
    log_error "Verifica la configuración de PostgreSQL"
    exit 1
fi
echo ""

################################################################################
# 9. Finalizar instalación
################################################################################
log_info "=========================================="
log_success "Instalación de PostgreSQL completada exitosamente"
log_info "=========================================="
log_info "Resumen de la instalación:"
log_info "  - Base de datos: $DB_NAME"
log_info "  - Usuario: $DB_USER"
log_info "  - Puerto: $DB_PORT"
log_info "  - Dirección IP: $IP_ADDR"
log_info "  - Logs de instalación: $LOG_FILE"
log_info "=========================================="
log_info "Comandos útiles:"
log_info "  - Verificar estado de PostgreSQL: systemctl status postgresql"
log_info "  - Ver logs de PostgreSQL: journalctl -u postgresql"
log_info "  - Reiniciar PostgreSQL: systemctl restart postgresql"
log_info "  - Conectar a PostgreSQL: psql -h $IP_ADDR -p $DB_PORT -U $DB_USER -d $DB_NAME"
log_info "=========================================="
log_info "Siguientes pasos:"
log_info "  1. Configurar el contenedor de aplicación para usar esta base de datos"
log_info "  2. Ejecutar el script de instalación de la aplicación:"
log_info "     sudo ./ops/install.sh --db-host $IP_ADDR --db-port $DB_PORT --db-name $DB_NAME --db-user $DB_USER --db-password $DB_PASSWORD"
log_info "  3. Verificar la conexión desde el contenedor de aplicación:"
log_info "     PGPASSWORD=$DB_PASSWORD psql -h $IP_ADDR -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT 1;\""
log_info "=========================================="

exit 0
