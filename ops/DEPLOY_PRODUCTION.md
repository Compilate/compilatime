# 🚀 Guía de Despliegue en Producción - CompilaTime

Esta guía explica cómo desplegar CompilaTime en un servidor de producción.

## ⚠️ Importante: NO usar `npm run dev` en producción

El comando `npm run dev` es para **desarrollo local**. En producción se debe:
1. **Construir** la aplicación con `npm run build`
2. **Servir** los archivos estáticos con Nginx

## 📋 Requisitos Previos

- Servidor Linux (Ubuntu/Debian recomendado)
- Docker y Docker Compose instalados
- Git instalado
- Node.js 18+ y npm/pnpm instalados
- Dominio configurado con DNS apuntando al servidor
- Certificados SSL (Let's Encrypt recomendado)

## 🚀 Despliegue Automatizado (Recomendado)

### 1. Clonar el Repositorio

```bash
# En el servidor de producción
cd /opt
sudo git clone <tu-repositorio-git> compilatime
cd compilatime
```

### 2. Configurar Variables de Entorno

```bash
# Copiar archivos de ejemplo
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Editar las variables de entorno
nano backend/.env
nano frontend/.env
```

**Variables importantes:**

**Backend (.env):**
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:password@db:5432/compilatime
REDIS_URL=redis://redis:6379
FRONTEND_URL=https://tu-dominio.com
CORS_ORIGIN=https://tu-dominio.com
JWT_SECRET=tu-secreto-super-seguro
```

**Frontend (.env):**
```env
VITE_API_URL=
VITE_DEV_DOMAIN=https://tu-dominio.com
```

⚠️ **IMPORTANTE:** `VITE_API_URL` debe estar **VACÍO** en producción.

### 3. Ejecutar Script de Despliegue

```bash
# Dar permisos de ejecución
chmod +x ops/deploy-production.sh

# Ejecutar despliegue
sudo ./ops/deploy-production.sh
```

Este script:
- Actualiza el código desde git
- Instala dependencias
- Construye frontend y backend
- Ejecuta migraciones de base de datos
- Reinicia todos los servicios con Docker Compose

### 4. Verificar Despliegue

```bash
# Ver estado de los servicios
docker-compose ps

# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f nginx
```

## 🔧 Despliegue Manual (Alternativo)

Si prefieres hacer el despliegue manualmente:

### 1. Actualizar Código

```bash
cd /opt/compilatime
git pull origin master
```

### 2. Construir Frontend

```bash
cd /opt/compilatime/frontend
npm install
npm run build
```

### 3. Construir Backend

```bash
cd /opt/compilatime/backend
npm install
npm run build
```

### 4. Ejecutar Migraciones

```bash
cd /opt/compilatime/backend
npx prisma migrate deploy
```

### 5. Reiniciar Servicios

```bash
cd /opt/compilatime
docker-compose down
docker-compose up -d --build
```

## 📊 Estructura de Servicios

El despliegue usa Docker Compose con los siguientes servicios:

- **db**: PostgreSQL (base de datos)
- **redis**: Redis (caché y sesiones)
- **backend**: API Node.js/Express (puerto 4000 interno)
- **frontend**: React estático (servido por Nginx)
- **nginx**: Proxy inverso frontal (puertos 80/443)

## 🔐 Configuración de Nginx

El archivo [`nginx/nginx.conf`](../nginx/nginx.conf) ya está configurado para:

- Servir frontend estático desde `/`
- Proxy de `/api/` al backend
- Soporte para HTTPS con certificados SSL
- Headers de seguridad
- Soporte para WebSockets

### Certificados SSL

Para usar HTTPS con Let's Encrypt:

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com

# Renovación automática (ya configurada en cron)
sudo certbot renew --dry-run
```

## 🔄 Actualizaciones Futuras

Para actualizar la aplicación en producción:

```bash
cd /opt/compilatime
sudo ./ops/deploy-production.sh
```

O manualmente:

```bash
cd /opt/compilatime
git pull origin master
docker-compose down
docker-compose up -d --build
```

## 🐛 Solución de Problemas

### Error: `vite: not found`

**Causa:** Intentando ejecutar `npm run dev` en producción.

**Solución:** No usar `npm run dev` en producción. Usar `npm run build` y Docker Compose.

### Error: `Cannot connect to database`

**Causa:** Base de datos no iniciada o credenciales incorrectas.

**Solución:**
```bash
# Verificar estado de la base de datos
docker-compose ps db

# Ver logs de la base de datos
docker-compose logs db

# Reiniciar base de datos
docker-compose restart db
```

### Error: `CORS policy blocked`

**Causa:** `FRONTEND_URL` o `CORS_ORIGIN` incorrectos en backend/.env.

**Solución:** Verificar que las variables de entorno estén configuradas correctamente.

### Error: `502 Bad Gateway`

**Causa:** Backend no está respondiendo.

**Solución:**
```bash
# Verificar estado del backend
docker-compose ps backend

# Ver logs del backend
docker-compose logs backend

# Reiniciar backend
docker-compose restart backend
```

## 📝 Checklist de Despliegue

- [ ] Servidor preparado con Docker y Docker Compose
- [ ] Repositorio clonado en `/opt/compilatime`
- [ ] Variables de entorno configuradas (backend/.env y frontend/.env)
- [ ] `VITE_API_URL` vacío en frontend/.env
- [ ] `NODE_ENV=production` en backend/.env
- [ ] Certificados SSL configurados (si es HTTPS)
- [ ] DNS apuntando al servidor
- [ ] Firewall configurado (puertos 80, 443 abiertos)
- [ ] Script de despliegue ejecutado
- [ ] Servicios corriendo correctamente (`docker-compose ps`)
- [ ] Aplicación accesible desde el navegador
- [ ] Login y autenticación funcionando
- [ ] Todas las funcionalidades probadas

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica las variables de entorno
3. Consulta la documentación en [`README.md`](../README.md)
4. Revisa los archivos de diagnóstico en [`plans/`](../plans/)

## 🔗 Recursos Útiles

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [CompilaTime README](../README.md)
