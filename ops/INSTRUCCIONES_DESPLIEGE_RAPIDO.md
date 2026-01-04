# 🚀 Instrucciones Rápidas de Despliegue - CompilaTime

## ✅ Archivos .env Configurados

Los archivos de entorno ya están configurados con:
- **IP del servidor**: 192.168.10.107
- **Base de datos**: rafa / C0mp1l@te / compilatime
- **Frontend**: VITE_API_URL vacío (rutas relativas)

## 🚀 Pasos para Desplegar

### 1. En el servidor de producción

```bash
# Ir al directorio del proyecto
cd /opt/compilatime

# Ejecutar script de despliegue
sudo ./ops/deploy-production-no-docker.sh
```

### 2. El script hará automáticamente:

✅ Actualizar código desde git
✅ Instalar dependencias del frontend
✅ Construir frontend (`npm run build`)
✅ Instalar dependencias del backend
✅ Construir backend (`npm run build`)
✅ Ejecutar migraciones de base de datos
✅ Reiniciar backend con PM2

### 3. Verificar que todo funciona

```bash
# Ver estado del backend
pm2 status

# Ver logs del backend
pm2 logs backend

# Ver estado de Nginx
sudo systemctl status nginx

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
```

## 🌐 Acceder a la Aplicación

Una vez desplegado, accede a:
- **Frontend**: http://192.168.10.107
- **Backend API**: http://192.168.10.107/api
- **Health Check**: http://192.168.10.107/api/health

## ⚠️ IMPORTANTE: Cambiar JWT_SECRET

El archivo [`backend/.env`](../backend/.env) tiene un JWT_SECRET de ejemplo. **DEBES CAMBIARLO** por un secreto seguro:

```bash
# Generar un secreto seguro
openssl rand -hex 32

# Editar el archivo
nano backend/.env

# Cambiar la línea:
JWT_SECRET=cambia-esto-por-un-secreto-super-seguro-aleatorio
# Por el secreto generado:
JWT_SECRET=tu-secreto-generado-con-openssl
```

## 🔧 Configurar Nginx

Si aún no has configurado Nginx, sigue estos pasos:

```bash
# Copiar configuración de Nginx
sudo cp nginx/nginx.conf /etc/nginx/sites-available/compilatime

# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/compilatime /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

**IMPORTANTE**: Antes de copiar la configuración de Nginx, edita [`nginx/nginx.conf`](../nginx/nginx.conf) y cambia `tu-dominio.com` por `192.168.10.107`.

## 🔄 Actualizaciones Futuras

Para actualizar la aplicación en el futuro:

```bash
cd /opt/compilatime
git pull origin master
sudo ./ops/deploy-production-no-docker.sh
```

## 🐛 Solución de Problemas

### Error: `Cannot connect to database`

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar conexión
psql -U compilatime_user -d compilatime -h localhost
```

### Error: `502 Bad Gateway`

```bash
# Verificar que el backend está corriendo
pm2 status

# Reiniciar backend
pm2 restart backend
```

### Error: `404 Not Found` en frontend

```bash
# Verificar que el build existe
ls -la /opt/compilatime/frontend/dist

# Verificar configuración de Nginx
sudo nginx -t
```

## 📝 Checklist de Despliegue

- [ ] Archivos .env configurados
- [ ] JWT_SECRET cambiado por un secreto seguro
- [ ] Nginx configurado y corriendo
- [ ] Script de despliegue ejecutado
- [ ] Backend corriendo con PM2
- [ ] Frontend accesible desde el navegador
- [ ] Login y autenticación funcionando
- [ ] Todas las funcionalidades probadas

## 📚 Documentación Completa

Para más detalles, consulta:
- [Guía de Despliegue en Producción SIN Docker](DEPLOY_PRODUCTION_NO_DOCKER.md)
- [README Principal](../README.md)
