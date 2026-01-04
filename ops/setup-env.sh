#!/bin/bash

# Script para crear archivos .env en el servidor de producción
# Este script crea los archivos backend/.env y frontend/.env con la configuración correcta

set -e  # Detener si hay algún error

echo "🔧 Configurando archivos .env para producción..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorio del proyecto
PROJECT_DIR="/opt/compilatime"
cd $PROJECT_DIR

echo -e "${YELLOW}📦 Paso 1: Crear backend/.env${NC}"

# Crear backend/.env
cat > backend/.env << 'EOF'
# Base de datos
DATABASE_URL=postgresql://rafa:C0mp1l@te@192.168.10.107:5432/compilatime

# Servidor
PORT=4000
NODE_ENV=production

# JWT (IMPORTANTE: Cambiar esto por un secreto seguro en producción)
JWT_SECRET=cambia-esto-por-un-secreto-super-seguro-aleatorio
JWT_EXPIRES_IN=7d

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password_gmail

# Redis
REDIS_URL=redis://localhost:6379

# Frontend URL (para CORS)
FRONTEND_URL=http://192.168.10.107
CORS_ORIGIN=http://192.168.10.107

# Geolocation (opcional)
GEOLOCATION_API_KEY=tu_api_key
EOF

echo -e "${GREEN}✅ backend/.env creado${NC}"

echo -e "${YELLOW}📦 Paso 2: Crear frontend/.env${NC}"

# Crear frontend/.env
cat > frontend/.env << 'EOF'
# IMPORTANTE: Dejar VITE_API_URL vacío para usar rutas relativas
# Vite proxyea /api → backend automáticamente en desarrollo
# Nginx proxyea /api → backend en producción
VITE_API_URL=

# App Configuration
VITE_APP_NAME=CompilaTime
VITE_APP_VERSION=1.0.0

# Dominio de la aplicación (para rutas encriptadas)
VITE_DEV_DOMAIN=http://192.168.10.107
EOF

echo -e "${GREEN}✅ frontend/.env creado${NC}"

echo -e "${YELLOW}📦 Paso 3: Generar JWT_SECRET seguro${NC}"

# Generar JWT_SECRET seguro
JWT_SECRET=$(openssl rand -hex 32)

# Actualizar JWT_SECRET en backend/.env
sed -i "s/JWT_SECRET=cambia-esto-por-un-secreto-super-seguro-aleatorio/JWT_SECRET=$JWT_SECRET/" backend/.env

echo -e "${GREEN}✅ JWT_SECRET generado y actualizado${NC}"
echo ""
echo -e "${YELLOW}📝 JWT_SECRET generado: $JWT_SECRET${NC}"
echo -e "${RED}⚠️  GUARDA ESTE SECRETO EN UN LUGAR SEGURO${NC}"
echo ""

echo -e "${GREEN}✅ Configuración completada${NC}"
echo ""
echo "📋 Archivos creados:"
echo "  - backend/.env"
echo "  - frontend/.env"
echo ""
echo "🚀 Ahora puedes ejecutar el despliegue:"
echo "  sudo ./ops/deploy-production-no-docker.sh"
