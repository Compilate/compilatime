#!/bin/bash

# Script para crear copia de seguridad completa del proyecto CompilaTime
# Incluye código fuente, base de datos y configuración

# Configuración
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="compilatime_backup_${TIMESTAMP}"
PROJECT_DIR=$(pwd)

# Colores para salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Iniciando copia de seguridad de CompilaTime...${NC}"

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Crear directorio temporal para el backup
TEMP_DIR="${BACKUP_DIR}/${BACKUP_NAME}"
mkdir -p $TEMP_DIR

echo -e "${YELLOW}📁 Creando copia del código fuente...${NC}"

# Copiar todo el proyecto excluyendo node_modules, .git y backups
rsync -av --progress \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    --exclude='debug_schedules.js' \
    ./ "$TEMP_DIR/source/"

echo -e "${YELLOW}💾 Creando copia de la base de datos...${NC}"

# Obtener configuración de la base de datos desde .env
if [ -f "./backend/.env" ]; then
    # Extraer DATABASE_URL del archivo .env
    DB_URL=$(grep "DATABASE_URL" ./backend/.env | cut -d '=' -f2-)
    
    if [ ! -z "$DB_URL" ]; then
        # Parsear la URL de conexión
        DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        
        echo -e "${YELLOW}   Conectando a la base de datos: ${DB_NAME}@${DB_HOST}:${DB_PORT}${NC}"
        
        # Crear backup de la base de datos
        PGPASSWORD=$DB_PASS pg_dump \
            --host=$DB_HOST \
            --port=$DB_PORT \
            --username=$DB_USER \
            --no-password \
            --verbose \
            --clean \
            --no-owner \
            --no-privileges \
            --format=custom \
            --file="${TEMP_DIR}/database_backup.dump" \
            $DB_NAME
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}   ✅ Backup de base de datos creado exitosamente${NC}"
        else
            echo -e "${RED}   ❌ Error al crear backup de la base de datos${NC}"
            echo -e "${YELLOW}   Intentando con método alternativo...${NC}"
            
            # Método alternativo: SQL plano
            PGPASSWORD=$DB_PASS pg_dump \
                --host=$DB_HOST \
                --port=$DB_PORT \
                --username=$DB_USER \
                --no-password \
                --verbose \
                --clean \
                --no-owner \
                --no-privileges \
                --format=plain \
                --file="${TEMP_DIR}/database_backup.sql" \
                $DB_NAME
                
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}   ✅ Backup de base de datos (SQL) creado exitosamente${NC}"
            else
                echo -e "${RED}   ❌ No se pudo crear el backup de la base de datos${NC}"
            fi
        fi
    else
        echo -e "${RED}   ❌ No se encontró DATABASE_URL en el archivo .env${NC}"
    fi
else
    echo -e "${RED}   ❌ No se encontró archivo .env en ./backend/${NC}"
fi

echo -e "${YELLOW}📋 Creando archivo de información del backup...${NC}"

# Crear archivo de información
cat > "${TEMP_DIR}/backup_info.txt" << EOF
========================================
BACKUP DE COMPILATIME
========================================
Fecha y hora: $(date)
Directorio del proyecto: $PROJECT_DIR
Nombre del backup: $BACKUP_NAME

CONTENIDO:
- source/: Código fuente completo del proyecto
- database_backup.dump/.sql: Copia de seguridad de la base de datos PostgreSQL
- backup_info.txt: Este archivo de información

PARA RESTAURAR:
1. Restaurar código fuente:
   cp -r source/* /ruta/al/nuevo/proyecto/

2. Restaurar base de datos (si tienes .dump):
   pg_restore --host=HOST --port=PORT --username=USER --dbname=DATABASE --clean --no-owner --no-privileges database_backup.dump

3. Restaurar base de datos (si tienes .sql):
   psql --host=HOST --port=PORT --username=USER --dbname=DATABASE < database_backup.sql

4. Instalar dependencias:
   cd backend && npm install
   cd ../frontend && npm install

5. Configurar variables de entorno:
   Copiar y editar los archivos .env.example

6. Ejecutar migraciones de Prisma:
   cd backend && npx prisma migrate deploy

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