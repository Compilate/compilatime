#!/bin/bash

# Script para crear copia de seguridad completa del proyecto CompilaTime
# Incluye código fuente y base de datos

# Colores para salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Creando copia de seguridad completa de CompilaTime...${NC}"

# Generar timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
BACKUP_NAME="compilatime_backup_complete_${TIMESTAMP}"

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Crear directorio temporal para el backup
TEMP_DIR="${BACKUP_DIR}/${BACKUP_NAME}"
mkdir -p $TEMP_DIR

echo -e "${YELLOW}📁 Copiando código fuente...${NC}"

# Copiar código fuente excluyendo archivos innecesarios
rsync -av --progress \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    --exclude='debug_schedules.js' \
    --exclude='backup_*.sh' \
    ./ "$TEMP_DIR/source/"

echo -e "${YELLOW}💾 Creando backup de la base de datos...${NC}"

# Copiar el backup de la base de datos existente
if [ -f "${BACKUP_DIR}/database_backup_20251210_233533.sql" ]; then
    cp "${BACKUP_DIR}/database_backup_20251210_233533.sql" "$TEMP_DIR/database_backup.sql"
    echo -e "${GREEN}   ✅ Backup de base de datos copiado${NC}"
else
    echo -e "${YELLOW}   ⚠️  No se encontró backup de base de datos reciente${NC}"
fi

echo -e "${YELLOW}📋 Creando archivo de información del backup...${NC}"

# Crear archivo de información
cat > "${TEMP_DIR}/backup_info.txt" << EOF
========================================
BACKUP COMPLETO DE COMPILATIME
========================================
Fecha y hora: $(date)
Directorio del proyecto: $(pwd)
Nombre del backup: $BACKUP_NAME

CONTENIDO:
- source/: Código fuente completo del proyecto
- database_backup.sql: Copia de seguridad de la base de datos
- backup_info.txt: Este archivo de información

ESTADO DEL PROYECTO:
- Backend: Node.js + Express + TypeScript + Prisma
- Frontend: React + TypeScript + Vite + TailwindCSS
- Base de datos: PostgreSQL

FUNCIONALIDADES IMPLEMENTADAS:
✅ Autenticación de empresa y empleados
✅ Gestión de empleados con CRUD completo
✅ Gestión de horarios con turnos y colores
✅ Calendario semanal interactivo
✅ Sistema de fichaje (entrada/salida)
✅ Línea de tiempo de 24 horas
✅ Reportes y exportación
✅ Dashboard con estadísticas
✅ Múltiples turnos por día
✅ Turnos nocturnos que cruzan medianoche
✅ Días de descanso
✅ Edición de registros de fichaje

PARA RESTAURAR ESTE BACKUP:
1. Descomprimir el archivo:
   tar -xzf ${BACKUP_NAME}.tar.gz

2. Restaurar código fuente:
   cp -r source/* /ruta/al/nuevo/proyecto/

3. Restaurar base de datos:
   psql -h localhost -U compilatime -d compilatime < database_backup.sql

4. Instalar dependencias:
   cd backend && npm install
   cd ../frontend && npm install

5. Configurar variables de entorno:
   Copiar y editar los archivos .env.example a .env

6. Ejecutar migraciones de Prisma:
   cd backend && npx prisma migrate deploy

7. Iniciar servicios:
   cd backend && npm run dev
   cd ../frontend && npm run dev

========================================
EOF

echo -e "${YELLOW}🗜️ Comprimiendo backup...${NC}"

# Comprimir todo en un archivo .tar.gz
cd $BACKUP_DIR
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"

# Eliminar directorio temporal
rm -rf "$BACKUP_NAME"

# Calcular tamaño del backup
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)

echo -e "${GREEN}✅ ¡Copia de seguridad completada!${NC}"
echo -e "${GREEN}   📦 Archivo: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz${NC}"
echo -e "${GREEN}   📏 Tamaño: ${BACKUP_SIZE}${NC}"
echo -e "${GREEN}   📅 Fecha: $(date)${NC}"
echo -e "${YELLOW}💡 Para restaurar este backup, descomprime el archivo y sigue las instrucciones en backup_info.txt${NC}"

# Volver al directorio principal
cd ..

echo -e "${GREEN}🎉 Proceso de backup completado${NC}"