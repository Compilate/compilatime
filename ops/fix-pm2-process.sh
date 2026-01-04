#!/bin/bash

# Script para corregir el proceso PM2 del backend
# Elimina el proceso antiguo y lo recrea con la configuración correcta

set -e  # Detener si hay algún error

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorio del proyecto
PROJECT_DIR="/opt/compilatime"
cd $PROJECT_DIR

echo -e "${YELLOW}🔧 Corrigiendo proceso PM2 del backend...${NC}"

# Verificar si el proceso existe
if pm2 list | grep -q "compilatime-backend"; then
  echo -e "${YELLOW}📦 Deteniendo y eliminando proceso PM2 antiguo...${NC}"
  pm2 stop compilatime-backend
  pm2 delete compilatime-backend
  echo -e "${GREEN}✅ Proceso antiguo eliminado${NC}"
else
  echo -e "${YELLOW}⚠️  No existe proceso compilatime-backend${NC}"
fi

# Verificar que el archivo compilado existe
if [ ! -f "backend/dist/src/server.js" ]; then
  echo -e "${RED}❌ Error: backend/dist/src/server.js no existe${NC}"
  echo -e "${YELLOW}📦 Construyendo backend...${NC}"
  cd backend
  npm run build
  cd $PROJECT_DIR
  echo -e "${GREEN}✅ Backend construido${NC}"
fi

# Crear el proceso con la configuración correcta
echo -e "${YELLOW}📦 Creando proceso PM2 con configuración correcta...${NC}"
pm2 start backend/dist/src/server.js --name compilatime-backend
echo -e "${GREEN}✅ Proceso PM2 creado con éxito${NC}"

# Guardar la configuración de PM2
pm2 save
echo -e "${GREEN}✅ Configuración de PM2 guardada${NC}"

# Mostrar estado
echo ""
echo -e "${YELLOW}📊 Estado de PM2:${NC}"
pm2 status

echo ""
echo -e "${GREEN}✅ Corrección completada${NC}"
echo ""
echo "📝 Ver logs:"
echo "  - Backend: pm2 logs compilatime-backend"
