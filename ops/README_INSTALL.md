# Guía de Instalación de CompilaTime en Ubuntu 22.04 (Proxmox)

## Descripción

Este script instala y configura CompilaTime en un contenedor Ubuntu 22.04 (Proxmox) con la base de datos en otro contenedor.

## Requisitos Previos

### Contenedor de Base de Datos

Antes de ejecutar el script de instalación, asegúrate de tener un contenedor de base de datos PostgreSQL corriendo y accesible desde el contenedor de la aplicación.

**Ejemplo con Proxmox LXC:**

```bash
# Crear contenedor LXC para base de datos
pct create 100 local-zfs:subvol-100-disk-0 local-zfs:8 --hostname compilatime-db --memory 1024 --swap 512 --cores 1 --net0 name=eth0,bridge=vmbr0,ip=dhcp

# Iniciar contenedor
pct start 100

# Entrar al contenedor
pct enter 100

# Instalar PostgreSQL
apt-get update
apt-get install -y postgresql postgresql-contrib

# Configurar PostgreSQL
su - postgres
psql

# Crear usuario y base de datos
CREATE USER rafa WITH PASSWORD 'C0mp1l@te';
CREATE DATABASE compilatime OWNER rafa;
GRANT ALL PRIVILEGES ON DATABASE compilatime TO rafa;
\q

# Salir de usuario postgres
exit

# Configurar PostgreSQL para aceptar conexiones remotas
vim /etc/postgresql/15/main/postgresql.conf

# Agregar/modificar estas líneas:
listen_addresses = '*'
port = 5432

# Configurar pg_hba.conf
vim /etc/postgresql/15/main/pg_hba.conf

# Agregar esta línea al final:
host    all             all             0.0.0.0/0            md5

# Reiniciar PostgreSQL
systemctl restart postgresql

# Verificar que PostgreSQL está corriendo
systemctl status postgresql
```

### Contenedor de Aplicación

El contenedor de aplicación debe tener acceso a la red donde está el contenedor de base de datos.

**Ejemplo con Proxmox LXC:**

```bash
# Crear contenedor LXC para aplicación
pct create 101 local-zfs:subvol-101-disk-0 local-zfs:20 --hostname compilatime-app --memory 2048 --swap 1024 --cores 2 --net0 name=eth0,bridge=vmbr0,ip=dhcp

# Iniciar contenedor
pct start 101

# Entrar al contenedor
pct enter 101
```

## Instalación

### 1. Preparar el Contenedor

El script de instalación usa `git clone` para descargar el proyecto desde el repositorio Git, por lo que no es necesario copiar los archivos manualmente.

**Desde el host (Proxmox):**

```bash
# Entrar al contenedor
pct enter 101

# Verificar que el contenedor tiene acceso a Internet
ping -c 4 google.com
```

**Nota:** El script de instalación clonará automáticamente el proyecto desde el repositorio Git durante el proceso de instalación.

### 2. Ejecutar el Script de Instalación

**Opción A: Instalación desde el repositorio Git (recomendado)**

```bash
# Crear directorio temporal
mkdir -p /tmp/compilatime-install
cd /tmp/compilatime-install

# Clonar el repositorio
git clone https://github.com/Compilate/compilatime.git .

# Dar permisos de ejecución al script
chmod +x ops/install.sh

# Ejecutar el script como root
sudo ./ops/install.sh
```

**Opción B: Instalación desde el repositorio Git con URL personalizada**

```bash
# Crear directorio temporal
mkdir -p /tmp/compilatime-install
cd /tmp/compilatime-install

# Clonar el repositorio con URL personalizada
git clone https://github.com/tu-usuario/compilatime.git .

# Dar permisos de ejecución al script
chmod +x ops/install.sh

# Ejecutar el script como root con URL personalizada
sudo ./ops/install.sh --repo-url https://github.com/tu-usuario/compilatime.git
```

**Nota:** El script de instalación clonará automáticamente el proyecto desde el repositorio Git en `/opt/compilatime`.

### 3. Opciones del Script de Instalación

```bash
# Instalación básica (base de datos en localhost, repositorio por defecto)
sudo ./ops/install.sh

# Instalación con base de datos en otro contenedor
sudo ./ops/install.sh \
  --db-host 192.168.1.100 \
  --db-port 5432 \
  --db-name compilatime \
  --db-user rafa \
  --db-password C0mp1l@te

# Instalación con repositorio personalizado
sudo ./ops/install.sh \
  --repo-url https://github.com/tu-usuario/compilatime.git \
  --db-host 192.168.1.100 \
  --db-port 5432

# Instalación en modo desarrollo
sudo ./ops/install.sh \
  --db-host 192.168.1.100 \
  --db-port 5432 \
  --dev

# Instalación sin compilar (útil si ya compilaste)
sudo ./ops/install.sh \
  --db-host 192.168.1.100 \
  --db-port 5432 \
  --skip-build

# Instalación sin instalar dependencias del sistema
sudo ./ops/install.sh \
  --db-host 192.168.1.100 \
  --db-port 5432 \
  --skip-deps
```

### 4. Parámetros del Script

| Parámetro | Descripción | Default |
|-----------|-------------|---------|
| `--db-host HOST` | Host de la base de datos | `localhost` |
| `--db-port PORT` | Puerto de la base de datos | `5432` |
| `--db-name NAME` | Nombre de la base de datos | `compilatime` |
| `--db-user USER` | Usuario de la base de datos | `rafa` |
| `--db-password PASS` | Contraseña de la base de datos | `C0mp1l@te` |
| `--backend-port PORT` | Puerto del backend | `4000` |
| `--frontend-url URL` | URL del frontend | `http://localhost:3000` |
| `--repo-url URL` | URL del repositorio Git | `https://github.com/Compilate/compilatime.git` |
| `--skip-deps` | Saltar instalación de dependencias del sistema | `false` |
| `--skip-build` | Saltar compilación de backend y frontend | `false` |
| `--dev` | Instalar en modo desarrollo | `false` |
| `--help` | Mostrar ayuda | - |

## Pasos del Script de Instalación

El script de instalación realiza los siguientes pasos:

1. **Verificar requisitos del sistema**
   - Versión de Ubuntu
   - Arquitectura del sistema
   - Memoria disponible (mínimo 1GB recomendado)
   - Espacio en disco (mínimo 5GB recomendado)

2. **Instalar dependencias del sistema**
   - curl, wget, git
   - build-essential, python3, pip
   - nginx, postgresql-client, redis-tools
   - Node.js 18.x
   - npm
   - PM2 (global)
   - TypeScript (global)

3. **Crear usuario de despliegue**
   - Usuario `compilatime` con directorio `/opt/compilatime`
   - Permisos restringidos para seguridad

4. **Clonar o actualizar el proyecto con Git**
    - Clona el proyecto desde el repositorio Git (por defecto: https://github.com/Compilate/compilatime.git)
    - Opcionalmente actualiza si ya existe
    - Configura permisos para el usuario `compilatime`

5. **Configurar variables de entorno**
   - Crea `backend/.env` con configuración de base de datos
   - Crea `frontend/.env` con URL del backend
   - Genera JWT_SECRET aleatorio

6. **Instalar dependencias del backend**
   - Ejecuta `npm ci` en el directorio del backend

7. **Instalar dependencias del frontend**
   - Ejecuta `npm ci` en el directorio del frontend

8. **Compilar backend**
   - Ejecuta `npm run build` en el directorio del backend
   - Genera archivos en `backend/dist/`

9. **Compilar frontend**
   - Ejecuta `npm run build` en el directorio del frontend
   - Genera archivos en `frontend/dist/`

10. **Configurar PM2**
    - Inicia el backend con PM2
    - Configura PM2 para iniciar en el arranque del sistema

11. **Configurar Nginx**
    - Crea configuración de Nginx para servir el frontend
    - Configura proxy para la API del backend
    - Habilita el sitio y reinicia Nginx

12. **Configurar firewall**
    - Permite SSH (puerto 22)
    - Permite HTTP (puerto 80)
    - Permite HTTPS (puerto 443)
    - Habilita el firewall

13. **Crear directorio de logs**
    - Crea `/var/log/compilatime`
    - Configura permisos para el usuario `compilatime`

14. **Verificar instalación**
    - Verifica que el backend está corriendo
    - Verifica que Nginx está corriendo
    - Verifica conexión a la base de datos

15. **Finalizar instalación**
    - Muestra resumen de la instalación
    - Muestra comandos útiles
    - Muestra siguientes pasos recomendados

## Verificación de la Instalación

### Verificar Backend

```bash
# Verificar estado del backend
pm2 status

# Ver logs del backend
pm2 logs compilatime-backend

# Verificar que el backend responde
curl http://localhost:4000/api/version
```

### Verificar Frontend

```bash
# Verificar que Nginx está corriendo
systemctl status nginx

# Ver logs de Nginx
tail -f /var/log/nginx/compilatime-error.log

# Verificar que el frontend es accesible
curl http://localhost/
```

### Verificar Base de Datos

```bash
# Verificar conexión a la base de datos
PGPASSWORD=C0mp1l@te psql -h 192.168.1.100 -p 5432 -U rafa -d compilatime -c "SELECT 1;"

# Verificar tablas
PGPASSWORD=C0mp1l@te psql -h 192.168.1.100 -p 5432 -U rafa -d compilatime -c "\dt"
```

### Verificar desde el Host

```bash
# Desde el host (Proxmox), verificar que la aplicación es accesible
curl http://IP_DEL_CONTENEDOR/api/version

# Verificar que el frontend es accesible
curl http://IP_DEL_CONTENEDOR/
```

## Configuración Adicional

### Configurar SSL/TLS para HTTPS

```bash
# Instalar Certbot
apt-get install -y certbot python3-certbot-nginx

# Obtener certificado SSL
certbot --nginx -d tu-dominio.com

# Renovar automáticamente
certbot renew --dry-run
```

### Configurar Dominio Personalizado

```bash
# Editar configuración de Nginx
vim /etc/nginx/sites-available/compilatime

# Cambiar server_name
server_name tu-dominio.com;

# Reiniciar Nginx
systemctl restart nginx
```

### Configurar Backups Automáticos

```bash
# Usar el script de backup del proyecto
cd /opt/compilatime
./ops/backup.sh all

# Configurar cron para backups automáticos
crontab -e

# Agregar línea para backup diario a las 2:00 AM
0 2 * * * /opt/compilatime/ops/backup.sh all >> /var/log/compilatime/backup.log 2>&1
```

### Configurar Monitoreo

```bash
# Instalar herramientas de monitoreo
apt-get install -y htop iotop

# Verificar uso de recursos
htop

# Verificar uso de disco
df -h

# Verificar uso de memoria
free -h
```

## Solución de Problemas

### El backend no inicia

```bash
# Ver logs del backend
pm2 logs compilatime-backend --lines 100

# Verificar conexión a la base de datos
PGPASSWORD=C0mp1l@te psql -h 192.168.1.100 -p 5432 -U rafa -d compilatime -c "SELECT 1;"

# Reiniciar backend
pm2 restart compilatime-backend
```

### Nginx no sirve el frontend

```bash
# Ver logs de Nginx
tail -f /var/log/nginx/compilatime-error.log

# Verificar configuración de Nginx
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

### No se puede conectar a la base de datos

```bash
# Verificar que el contenedor de base de datos está corriendo
pct list

# Verificar logs del contenedor de base de datos
pct exec 100 tail -f /var/log/postgresql/postgresql-15-main.log

# Verificar que el contenedor de aplicación puede acceder al contenedor de base de datos
pct exec 101 ping 192.168.1.100

# Probar conexión desde el contenedor de aplicación
pct exec 101
PGPASSWORD=C0mp1l@te psql -h 192.168.1.100 -p 5432 -U rafa -d compilatime -c "SELECT 1;"
```

### Error de permisos

```bash
# Verificar permisos del directorio del proyecto
ls -la /opt/compilatime

# Corregir permisos
chown -R compilatime:compilatime /opt/compilatime
chmod -R 755 /opt/compilatime
```

### Error de memoria insuficiente

```bash
# Verificar memoria disponible
free -h

# Aumentar memoria del contenedor (desde Proxmox)
pct set 101 -memory 4096 -swap 2048

# Reiniciar contenedor
pct restart 101
```

## Actualización

### Actualizar el Proyecto

```bash
# Navegar al directorio del proyecto
cd /opt/compilatime

# Actualizar el proyecto
git pull origin master

# Instalar dependencias actualizadas
cd backend && npm ci
cd ../frontend && npm ci

# Compilar
cd backend && npm run build
cd ../frontend && npm run build

# Reiniciar backend
pm2 restart compilatime-backend
```

### Reinstalar desde el Repositorio Git

Si necesitas reinstalar completamente el proyecto desde el repositorio Git:

```bash
# Detener el backend
pm2 stop compilatime-backend

# Hacer backup del proyecto actual
cd /opt
tar -czf compilatime-backup-$(date +%Y%m%d_%H%M%S).tar.gz compilatime

# Eliminar el proyecto actual
rm -rf /opt/compilatime

# Crear directorio temporal
mkdir -p /tmp/compilatime-install
cd /tmp/compilatime-install

# Clonar el repositorio
git clone https://github.com/Compilate/compilatime.git .

# Ejecutar el script de instalación
sudo ./ops/install.sh --db-host 192.168.1.100 --db-port 5432
```

### Usar el Sistema de Despliegue por Versiones

```bash
# Desplegar última versión
./ops/deploy.sh

# Desplegar versión específica
./ops/deploy.sh v1.3.0

# Hacer backup manual
./ops/backup.sh all

# Rollback a versión anterior
./ops/rollback.sh v1.2.0
```

## Logs

### Ubicación de Logs

- **Instalación**: `/var/log/compilatime-install.log`
- **Backend**: `/var/log/compilatime/`
- **Nginx**: `/var/log/nginx/compilatime-*.log`
- **PM2**: `~/.pm2/logs/`

### Ver Logs en Tiempo Real

```bash
# Logs de instalación
tail -f /var/log/compilatime-install.log

# Logs del backend
tail -f /var/log/compilatime/backend.log

# Logs de Nginx
tail -f /var/log/nginx/compilatime-error.log

# Logs de PM2
pm2 logs compilatime-backend --lines 100
```

## Seguridad

### Recomendaciones de Seguridad

1. **Cambiar contraseñas por defecto**
   - Cambiar la contraseña de la base de datos
   - Cambiar el JWT_SECRET
   - Cambiar contraseñas de usuarios

2. **Configurar firewall**
   - Solo permitir puertos necesarios
   - Usar reglas específicas para IPs de confianza

3. **Configurar SSL/TLS**
   - Usar HTTPS en producción
   - Renovar certificados automáticamente

4. **Actualizar regularmente**
   - Actualizar el sistema operativo
   - Actualizar dependencias del proyecto
   - Actualizar Node.js y npm

5. **Monitorear logs**
   - Revisar logs regularmente
   - Configurar alertas para errores críticos

6. **Backups automáticos**
   - Configurar backups diarios
   - Almacenar backups en ubicación segura
   - Probar restauración de backups regularmente

## Proxmox LXC Tips

### Crear Contenedor LXC

```bash
# Crear contenedor con recursos específicos
pct create 101 local-zfs:subvol-101-disk-0 local-zfs:20 \
  --hostname compilatime-app \
  --memory 2048 \
  --swap 1024 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --features nesting=1,keyctl=1

# Nota: nesting=1 permite usar Docker dentro del contenedor si es necesario
# Nota: keyctl=1 permite usar systemd sin problemas
```

### Configurar Red

```bash
# Configurar IP estática en el contenedor
pct set 101 -net0 name=eth0,bridge=vmbr0,ip=192.168.1.101/24,gw=192.168.1.1

# Reiniciar contenedor
pct restart 101
```

### Backup del Contenedor

```bash
# Backup del contenedor desde Proxmox
pct backup 101 --storage local-zfs --mode snapshot --compress zstd

# Restaurar contenedor
pct restore local-zfs:backup-vm-101-disk-0.tar.zst 101 --storage local-zfs
```

### Snapshots del Contenedor

```bash
# Crear snapshot
pct snapshot 101 pre-update

# Listar snapshots
pct listsnapshot 101

# Restaurar snapshot
pct rollback 101 pre-update

# Eliminar snapshot
pct delsnapshot 101 pre-update
```

## Soporte

Para obtener ayuda o reportar problemas:

1. Revisar los logs de instalación: `/var/log/compilatime-install.log`
2. Revisar los logs de la aplicación: `/var/log/compilatime/`
3. Consultar la documentación del proyecto: `ops/README_DEPLOY.md`
4. Revisar el contexto del proyecto: `PROJECT_CONTEXT.md`
5. Verificar la documentación de Proxmox: https://pve.proxmox.com/wiki/
