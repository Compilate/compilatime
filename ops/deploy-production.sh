#!/bin/bash

# Script de despliegue en producción para CompilaTime
# Este script construye y despliega la aplicación en producción

set -e  # Detener si hay algún error

echo "🚀 Iniciando despliegue en producción..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorio del proyecto
PROJECT_DIR="/opt/compilatime"
cd $PROJECT_DIR

echo -e "${YELLOW}📦 Paso 1: Actualizar código desde git${NC}"
git pull origin master

echo -e "${YELLOW}📦 Paso 2: Construir frontend${NC}"
cd $PROJECT_DIR/frontend
npm install
npm run build

echo -e "${YELLOW}📦 Paso 3: Construir backend${NC}"
cd $PROJECT_DIR/backend
npm install
npm run build

echo -e "${YELLOW}📦 Paso 4: Ejecutar migraciones de base de datos${NC}"
cd $PROJECT_DIR/backend
npx prisma migrate deploy

echo -e "${YELLOW}📦 Paso 5: Reiniciar servicios con Docker Compose${NC}"
cd $PROJECT_DIR
docker-compose down
docker-compose up -d --build

echo -e "${GREEN}✅ Despliegue completado exitosamente${NC}"
echo ""
echo "📊 Verificar estado de los servicios:"
docker-compose ps

echo ""
echo "📝 Ver logs:"
echo "  - Todos los servicios: docker-compose logs -f"
echo "  - Frontend: docker-compose logs -f frontend"
echo "  - Backend: docker-compose logs -f backend"
echo "  - Nginx: docker-compose logs -f nginx"
