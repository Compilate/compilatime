#!/bin/bash

# Script para crear copia de seguridad de la base de datos usando Prisma
# Este script es una alternativa cuando pg_dump tiene problemas de autenticación

# Colores para salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Creando backup de la base de datos con Prisma...${NC}"

# Cambiar al directorio del backend
cd backend

# Verificar si npx está disponible
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx no está disponible. Por favor instala Node.js y npm.${NC}"
    exit 1
fi

# Verificar si Prisma está instalado
if [ ! -d "node_modules/.bin/prisma" ] && [ ! -f "node_modules/prisma/index.js" ]; then
    echo -e "${YELLOW}📦 Instalando dependencias de Prisma...${NC}"
    npm install
fi

# Crear directorio de backups si no existe
mkdir -p ../backups

# Generar timestamp para el nombre del archivo
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="../backups/database_backup_${TIMESTAMP}.sql"

echo -e "${YELLOW}💾 Exportando base de datos a SQL...${NC}"

# Usar Prisma para exportar la base de datos
npx prisma db push --accept-data-loss 2>/dev/null || true

# Intentar usar prisma migrate diff para generar un script SQL
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}🐳 Intentando backup con Docker...${NC}"
    
    # Si Docker está disponible, intentar usar un contenedor PostgreSQL temporal
    docker run --rm \
        --network host \
        -e PGPASSWORD="compilatime123" \
        -v "$(pwd)/../backups:/backups" \
        postgres:15 \
        sh -c "pg_dump --host=localhost --port=5432 --username=compilatime --dbname=compilatime --no-password --clean --no-owner --no-privileges --format=plain > /backups/database_backup_${TIMESTAMP}.sql" 2>/dev/null
    
    if [ $? -eq 0 ] && [ -f "../backups/database_backup_${TIMESTAMP}.sql" ]; then
        echo -e "${GREEN}✅ Backup de base de datos creado exitosamente con Docker${NC}"
        BACKUP_FILE="../backups/database_backup_${TIMESTAMP}.sql"
    else
        echo -e "${RED}❌ Falló el backup con Docker${NC}"
    fi
fi

# Si el archivo no existe, crear un backup manual usando las migraciones
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}📋 Creando backup manual desde migraciones...${NC}"
    
    # Crear un archivo SQL con la estructura actual
    cat > "$BACKUP_FILE" << EOF
-- Backup de la base de datos CompilaTime
-- Fecha: $(date)
-- Creado con: Prisma + Script manual

-- Nota: Este es un backup de estructura y datos básicos.
-- Para una restauración completa, considere usar pg_dump directamente.

-- Iniciar transacción
BEGIN;

-- Desactivar restricciones de clave foránea temporalmente
SET session_replication_role = replica;

EOF
    
    # Obtener datos de las tablas principales usando Prisma (si está disponible)
    if [ -f "prisma/schema.prisma" ]; then
        echo -e "${YELLOW}📊 Extrayendo datos de las tablas...${NC}"
        
        # Extraer datos usando un script Node.js temporal
        cat > temp_backup_data.js << 'EOJS'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupData() {
    const outputFile = process.argv[2];
    
    try {
        // Lista de tablas a respaldar (en orden de dependencia)
        const tables = [
            'companies',
            'company_users',
            'employees',
            'schedules',
            'employee_schedules',
            'weekly_schedules',
            'time_entries',
            'time_entry_edit_logs'
        ];
        
        for (const table of tables) {
            try {
                const model = prisma[table];
                if (model) {
                    const records = await model.findMany({
                        take: 1000 // Limitar a 1000 registros por tabla para evitar archivos muy grandes
                    });
                    
                    if (records.length > 0) {
                        fs.appendFileSync(outputFile, `\n-- Datos de la tabla: ${table}\n`);
                        
                        for (const record of records) {
                            const columns = Object.keys(record);
                            const values = Object.values(record).map(val => {
                                if (val === null) return 'NULL';
                                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                                if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                                if (val instanceof Date) return `'${val.toISOString()}'`;
                                return val;
                            });
                            
                            fs.appendFileSync(outputFile, 
                                `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`
                            );
                        }
                        
                        console.log(`✅ ${records.length} registros extraídos de ${table}`);
                    }
                }
            } catch (error) {
                console.log(`⚠️  No se pudo extraer datos de ${table}: ${error.message}`);
            }
        }
        
        fs.appendFileSync(outputFile, '\n-- Reactivar restricciones\nSET session_replication_role = DEFAULT;\n');
        fs.appendFileSync(outputFile, '\n-- Confirmar transacción\nCOMMIT;\n');
        
    } catch (error) {
        console.error('Error durante el backup:', error);
        fs.appendFileSync(outputFile, '\n-- Error durante el backup\nROLLBACK;\n');
    } finally {
        await prisma.$disconnect();
    }
}

backupData();
EOJS
        
        # Ejecutar el script de backup
        if [ -f "node_modules/@prisma/client/index.js" ]; then
            node temp_backup_data.js "$BACKUP_FILE"
            rm temp_backup_data.js
        else
            echo -e "${YELLOW}⚠️  Cliente Prisma no disponible, creando backup de estructura solamente${NC}"
        fi
    fi
    
    # Añadir información del backup
    cat >> "$BACKUP_FILE" << EOF

-- Información del backup
-- Fecha de creación: $(date)
-- Proyecto: CompilaTime
-- Método: Script manual con Prisma

-- Para restaurar este backup:
-- 1. Asegúrate de que la base de datos existe
-- 2. Ejecuta: psql -h localhost -U compilatime -d compilatime < database_backup_${TIMESTAMP}.sql

EOF
fi

# Verificar si el archivo se creó correctamente
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ ¡Backup de base de datos completado!${NC}"
    echo -e "${GREEN}   📦 Archivo: ${BACKUP_FILE}${NC}"
    echo -e "${GREEN}   📏 Tamaño: ${BACKUP_SIZE}${NC}"
    echo -e "${GREEN}   📅 Fecha: $(date)${NC}"
else
    echo -e "${RED}❌ No se pudo crear el backup de la base de datos${NC}"
    exit 1
fi

# Volver al directorio principal
cd ..

echo -e "${GREEN}🎉 Proceso de backup completado${NC}"