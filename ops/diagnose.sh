#!/bin/bash

# Script de diagnóstico para verificar el estado del despliegue

echo "🔍 Diagnóstico del despliegue de CompilaTime"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Paso 1: Verificar archivos .env${NC}"

if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ backend/.env no existe${NC}"
    echo -e "${YELLOW}Ejecuta: sudo ./ops/setup-env.sh${NC}"
else
    echo -e "${GREEN}✅ backend/.env existe${NC}"
fi

if [ ! -f "frontend/.env" ]; then
    echo -e "${RED}❌ frontend/.env no existe${NC}"
    echo -e "${YELLOW}Ejecuta: sudo ./ops/setup-env.sh${NC}"
else
    echo -e "${GREEN}✅ frontend/.env existe${NC}"
fi

echo ""
echo -e "${YELLOW}📦 Paso 2: Verificar build del frontend${NC}"

if [ ! -d "frontend/dist" ]; then
    echo -e "${RED}❌ frontend/dist no existe${NC}"
    echo -e "${YELLOW}El frontend no ha sido construido${NC}"
else
    echo -e "${GREEN}✅ frontend/dist existe${NC}"
fi

echo ""
echo -e "${YELLOW}📦 Paso 3: Verificar build del backend${NC}"

if [ ! -d "backend/dist" ]; then
    echo -e "${RED}❌ backend/dist no existe${NC}"
    echo -e "${YELLOW}El backend no ha sido construido${NC}"
else
    echo -e "${GREEN}✅ backend/dist existe${NC}"
fi

echo ""
echo -e "${YELLOW}📦 Paso 4: Verificar procesos de PM2${NC}"

echo -e "${YELLOW}Procesos de PM2:${NC}"
pm2 list

echo ""
echo -e "${YELLOW}📦 Paso 5: Verificar estado de Nginx${NC}"

echo -e "${YELLOW}Estado de Nginx:${NC}"
sudo systemctl status nginx

echo ""
echo -e "${YELLOW}📦 Paso 6: Verificar archivos de configuración${NC}"

echo -e "${YELLOW}Contenido de backend/.env:${NC}"
if [ -f "backend/.env" ]; then
    grep DATABASE_URL backend/.env
    grep NODE_ENV backend/.env
    grep FRONTEND_URL backend/.env
    grep CORS_ORIGIN backend/.env
fi

echo ""
echo -e "${YELLOW}Contenido de frontend/.env:${NC}"
if [ -f "frontend/.env" ]; then
    grep VITE_API_URL frontend/.env
    grep VITE_DEV_DOMAIN frontend/.env
fi

echo ""
echo -e "${GREEN}✅ Diagnóstico completado${NC}"
echo ""
echo "📋 Soluciones:"
echo "  - Si backend/.env o frontend/.env no existen, ejecuta: sudo ./ops/setup-env.sh"
echo "  - Si frontend/dist o backend/dist no existen, ejecuta: sudo ./ops/deploy-production-no-docker.sh"
echo "  - Si PM2 no encuentra el proceso 'backend', verifica que backend/dist/server.js existe"
echo ""
echo "📝 Para ejecutar el despliegue completo:"
echo "  sudo ./ops/deploy-production-no-docker.sh"
