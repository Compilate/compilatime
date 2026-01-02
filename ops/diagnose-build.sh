#!/bin/bash

################################################################################
# Script de Diagnóstico de Compilación de TypeScript
# 
# Este script ayuda a diagnosticar problemas de compilación de TypeScript
# en el backend de CompilaTime.
#
# Uso:
#   sudo ./ops/diagnose-build.sh
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

# Directorio del proyecto
PROJECT_DIR="/opt/compilatime"

# Verificar que se ejecuta como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script debe ejecutarse como root (sudo)"
    exit 1
fi

log_info "=========================================="
log_info "Diagnóstico de Compilación de TypeScript"
log_info "=========================================="
echo ""

################################################################################
# 1. Verificar versión de TypeScript
################################################################################
log_info "Paso 1: Verificando versión de TypeScript..."

if command -v tsc &> /dev/null; then
    TSC_VERSION=$(tsc --version)
    log_success "TypeScript instalado: $TSC_VERSION"
else
    log_error "TypeScript no está instalado"
    exit 1
fi
echo ""

################################################################################
# 2. Verificar configuración de TypeScript
################################################################################
log_info "Paso 2: Verificando configuración de TypeScript..."

if [ -f "$PROJECT_DIR/backend/tsconfig.json" ]; then
    log_success "Archivo tsconfig.json encontrado: $PROJECT_DIR/backend/tsconfig.json"
    log_info "Contenido de tsconfig.json:"
    cat "$PROJECT_DIR/backend/tsconfig.json"
else
    log_error "Archivo tsconfig.json no encontrado: $PROJECT_DIR/backend/tsconfig.json"
    exit 1
fi
echo ""

################################################################################
# 3. Verificar opción noEmit
################################################################################
log_info "Paso 3: Verificando opción noEmit..."

if grep -q '"noEmit": false' "$PROJECT_DIR/backend/tsconfig.json"; then
    log_success "tsconfig.json tiene noEmit=false (correcto)"
else
    log_error "tsconfig.json no tiene noEmit=false (incorrecto)"
    log_error "TypeScript no generará archivos JavaScript"
    exit 1
fi
echo ""

################################################################################
# 4. Verificar archivos fuente
################################################################################
log_info "Paso 4: Verificando archivos fuente..."

if [ -d "$PROJECT_DIR/backend/src" ]; then
    SOURCE_FILES=$(find "$PROJECT_DIR/backend/src" -name "*.ts" | wc -l)
    log_success "Archivos fuente TypeScript encontrados: $SOURCE_FILES"
else
    log_error "Directorio src no encontrado: $PROJECT_DIR/backend/src"
    exit 1
fi
echo ""

################################################################################
# 5. Compilar TypeScript
################################################################################
log_info "Paso 5: Compilando TypeScript..."

cd "$PROJECT_DIR/backend"

# Limpiar directorio dist anterior
if [ -d "$PROJECT_DIR/backend/dist" ]; then
    log_info "Limpiando directorio dist anterior..."
    rm -rf "$PROJECT_DIR/backend/dist"
fi

# Compilar TypeScript
log_info "Ejecutando: tsc"
tsc 2>&1 | tee /tmp/tsc-output.log
TSC_EXIT_CODE=${PIPESTATUS[0]}

if [ $TSC_EXIT_CODE -eq 0 ]; then
    log_success "Compilación completada sin errores"
else
    log_error "La compilación falló con código de salida: $TSC_EXIT_CODE"
    log_error "Mostrando log de compilación:"
    cat /tmp/tsc-output.log
    exit 1
fi
echo ""

################################################################################
# 6. Verificar archivos generados
################################################################################
log_info "Paso 6: Verificando archivos generados..."

if [ -d "$PROJECT_DIR/backend/dist" ]; then
    GENERATED_FILES=$(find "$PROJECT_DIR/backend/dist" -name "*.js" | wc -l)
    log_success "Archivos JavaScript generados: $GENERATED_FILES"
    log_info "Archivos generados:"
    ls -la "$PROJECT_DIR/backend/dist/"
else
    log_error "Directorio dist no creado: $PROJECT_DIR/backend/dist"
    log_error "TypeScript no generó archivos JavaScript"
    exit 1
fi
echo ""

################################################################################
# 7. Verificar archivo principal
################################################################################
log_info "Paso 7: Verificando archivo principal..."

if [ -f "$PROJECT_DIR/backend/dist/server.js" ]; then
    log_success "Archivo principal encontrado: $PROJECT_DIR/backend/dist/server.js"
elif [ -f "$PROJECT_DIR/backend/dist/app.js" ]; then
    log_success "Archivo principal encontrado: $PROJECT_DIR/backend/dist/app.js"
elif [ -f "$PROJECT_DIR/backend/dist/index.js" ]; then
    log_success "Archivo principal encontrado: $PROJECT_DIR/backend/dist/index.js"
elif [ -f "$PROJECT_DIR/backend/dist/main.js" ]; then
    log_success "Archivo principal encontrado: $PROJECT_DIR/backend/dist/main.js"
else
    log_error "Archivo principal no encontrado en $PROJECT_DIR/backend/dist/"
    log_error "Buscando archivos JavaScript:"
    find "$PROJECT_DIR/backend/dist" -name "*.js" || log_warning "No se pudo buscar archivos"
    exit 1
fi
echo ""

################################################################################
# 8. Finalizar diagnóstico
################################################################################
log_info "=========================================="
log_success "Diagnóstico completado"
log_info "=========================================="
log_info "Si la compilación fue exitosa, puedes ejecutar:"
log_info "  cd $PROJECT_DIR/backend"
log_info "  npm run build"
log_info "=========================================="

exit 0
