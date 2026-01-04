# 🚀 Guía de Despliegue en Producción SIN Docker - CompilaTime

Esta guía explica cómo desplegar CompilaTime en un servidor de producción **SIN usar Docker**.

## ⚠️ Importante: NO usar `npm run dev` en producción

El comando `npm run dev` es para **desarrollo local**. En producción se debe:
1. **Construir** la aplicación con `npm run build`
2. **Servir** los archivos estáticos con Nginx
3. **Ejecutar** el backend con PM2

## 📋 Requisitos Previos

- Servidor Linux (Ubuntu/Debian recomendado)
- Node.js 18+ y npm instalados
- PostgreSQL 15+ instalado y configurado
- Redis 7+ instalado y configurado
- Nginx instalado y configurado
- PM2 instalado globalmente (`npm install -g pm2`)
- Git instalado
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
DATABASE_URL=postgresql://user:password@localhost:5432/compilatime
REDIS_URL=redis://localhost:6379
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
chmod +x ops/deploy-production-no-docker.sh

# Ejecutar despliegue
sudo ./ops/deploy-production-no-docker.sh
```

Este script:
- Actualiza el código desde git
- Instala dependencias
- Construye frontend y backend
- Ejecuta migraciones de base de datos
- Reinicia el backend con PM2

### 4. Verificar Despliegue

```bash
# Ver estado del backend
pm2 status

# Ver logs del backend
pm2 logs backend

# Ver estado de Nginx
sudo systemctl status nginx

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
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

### 5. Reiniciar Backend con PM2

```bash
cd /opt/compilatime

# Reiniciar backend
pm2 restart backend

# O iniciar si no existe
pm2 start backend/dist/server.js --name backend
```

### 6. Recargar Nginx

```bash
# Recargar configuración de Nginx
sudo nginx -t
sudo systemctl reload nginx
```

## 🔐 Configuración de Nginx

El archivo [`nginx/nginx.conf`](../nginx/nginx.conf) ya está configurado para:

- Servir frontend estático desde `/`
- Proxy de `/api/` al backend
- Soporte para HTTPS con certificados SSL
- Headers de seguridad
- Soporte para WebSockets

### Instalar Nginx

```bash
sudo apt update
sudo apt install nginx
```

### Configurar Nginx

```bash
# Copiar configuración
sudo cp nginx/nginx.conf /etc/nginx/sites-available/compilatime

# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/compilatime /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

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
sudo ./ops/deploy-production-no-docker.sh
```

O manualmente:

```bash
cd /opt/compilatime
git pull origin master
cd frontend && npm install && npm run build
cd ../backend && npm install && npm run build
cd ../backend && npx prisma migrate deploy
pm2 restart backend
sudo systemctl reload nginx
```

## 🐛 Solución de Problemas

### Error: `vite: not found`

**Causa:** Intentando ejecutar `npm run dev` en producción.

**Solución:** No usar `npm run dev` en producción. Usar `npm run build` y PM2.

### Error: `Cannot connect to database`

**Causa:** Base de datos no iniciada o credenciales incorrectas.

**Solución:**
```bash
# Verificar estado de PostgreSQL
sudo systemctl status postgresql

# Verificar conexión
psql -U compilatime_user -d compilatime

# Verificar DATABASE_URL en backend/.env
cat backend/.env | grep DATABASE_URL
```

### Error: `CORS policy blocked`

**Causa:** `FRONTEND_URL` o `CORS_ORIGIN` incorrectos en backend/.env.

**Solución:** Verificar que las variables de entorno estén configuradas correctamente.

### Error: `502 Bad Gateway`

**Causa:** Backend no está respondiendo.

**Solución:**
```bash
# Verificar estado del backend
pm2 status

# Ver logs del backend
pm2 logs backend

# Reiniciar backend
pm2 restart backend
```

### Error: `404 Not Found` en frontend

**Causa:** Nginx no está sirviendo los archivos estáticos correctamente.

**Solución:**
```bash
# Verificar que el build existe
ls -la /opt/compilatime/frontend/dist

# Verificar configuración de Nginx
sudo nginx -t

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

## 📝 Checklist de Despliegue

- [ ] Servidor preparado con Node.js, PostgreSQL, Redis, Nginx
- [ ] PM2 instalado globalmente
- [ ] Repositorio clonado en `/opt/compilatime`
- [ ] Variables de entorno configuradas (backend/.env y frontend/.env)
- [ ] `VITE_API_URL` vacío en frontend/.env
- [ ] `NODE_ENV=production` en backend/.env
- [ ] Certificados SSL configurados (si es HTTPS)
- [ ] DNS apuntando al servidor
- [ ] Firewall configurado (puertos 80, 443 abiertos)
- [ ] Frontend construido (`npm run build`)
- [ ] Backend construido (`npm run build`)
- [ ] Migraciones ejecutadas (`npx prisma migrate deploy`)
- [ ] Backend corriendo con PM2 (`pm2 start backend/dist/server.js --name backend`)
- [ ] Nginx configurado y corriendo
- [ ] Aplicación accesible desde el navegador
- [ ] Login y autenticación funcionando
- [ ] Todas las funcionalidades probadas

## 📊 Estructura de Servicios

El despliegue sin Docker usa los siguientes servicios:

- **PostgreSQL**: Base de datos (puerto 5432)
- **Redis**: Caché y sesiones (puerto 6379)
- **Backend**: API Node.js/Express (puerto 4000, gestionado con PM2)
- **Frontend**: React estático (servido por Nginx)
- **Nginx**: Proxy inverso frontal (puertos 80/443)

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs: `pm2 logs backend` y `sudo tail -f /var/log/nginx/error.log`
2. Verifica las variables de entorno
3. Consulta la documentación en [`README.md`](../README.md)
4. Revisa los archivos de diagnóstico en [`plans/`](../plans/)

## 🔗 Recursos Útiles

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [CompilaTime README](../README.md)
