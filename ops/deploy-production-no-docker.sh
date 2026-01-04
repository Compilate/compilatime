#!/bin/bash

# Script de despliegue en producción para CompilaTime (SIN Docker)
# Este script construye y despliega la aplicación en producción sin usar Docker

set -e  # Detener si hay algún error

echo "🚀 Iniciando despliegue en producción (SIN Docker)..."

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

echo -e "${YELLOW}📦 Paso 5: Ejecutar migraciones de base de datos${NC}"
cd $PROJECT_DIR/backend
npx prisma migrate deploy

echo -e "${YELLOW}📦 Paso 5: Iniciar backend con PM2${NC}"
cd $PROJECT_DIR

# Iniciar backend (solo si no existe)
if ! pm2 list | grep -q "backend"; then
  pm2 start backend/dist/server.js --name backend
else
  pm2 restart backend
fi

# Nota: El frontend estático se sirve con Nginx, no necesita PM2
echo -e "${GREEN}✅ Despliegue completado exitosamente${NC}"
echo ""
echo "📊 Verificar estado de los servicios:"
echo "  - Backend: pm2 status"
echo "  - Nginx: sudo systemctl status nginx"
echo ""
echo "📝 Ver logs:"
echo "  - Backend: pm2 logs backend"
echo "  - Nginx: sudo tail -f /var/log/nginx/access.log"
echo "  - Nginx error: sudo tail -f /var/log/nginx/error.log"
