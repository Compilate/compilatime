# Sistema de Despliegue por Versiones - Compilatime

Este documento describe el sistema de despliegue por versiones implementado para Compilatime, diseñado para entornos de producción con Proxmox.

## 📋 Índice

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Requisitos Previos](#requisitos-previos)
3. [Configuración Inicial](#configuración-inicial)
4. [Flujo de Despliegue](#flujo-de-despliegue)
5. [Uso de Scripts](#uso-de-scripts)
6. [Gestión de Versiones](#gestión-de-versiones)
7. [Backups](#backups)
8. [Rollback](#rollback)
9. [Solución de Problemas](#solución-de-problemas)
10. [Buenas Prácticas](#buenas-prácticas)
11. [Inicio Rápido](#inicio-rápido)
12. [Script de Inicialización](#script-de-inicialización)
13. [Versión de Desarrollo](#versión-de-desarrollo)

---

## 🏗️ Arquitectura del Sistema

### Estructura de Directorios

```
/opt/compilatime/
├── releases/              # Releases versionadas
│   ├── v1.0.0/           # Release v1.0.0
│   │   ├── backend/
│   │   │   ├── dist/     # Backend compilado
│   │   │   ├── node_modules/
│   │   │   └── .env      # Configuración backend
│   │   ├── frontend/
│   │   │   ├── dist/     # Frontend compilado
│   │   │   ├── node_modules/
│   │   │   └── .env      # Configuración frontend
│   │   └── VERSION       # Archivo con el tag de versión
│   ├── v1.0.1/           # Release v1.0.1
│   └── v1.1.0/           # Release v1.1.0
├── current -> releases/v1.1.0/  # Symlink a la release actual
├── backups/              # Directorio de backups
│   ├── db/              # Backups de base de datos
│   │   ├── compilatime_v1.0.0_20251229_020000.dump
│   │   └── compilatime_v1.0.1_20251230_020000.dump
│   ├── config/          # Backups de configuración
│   │   ├── v1.0.0_20251229_020000.tar.gz
│   │   └── v1.0.1_20251230_020000.tar.gz
│   └── releases/        # Backups de releases completas
│       └── current_20251229_020000.tar.gz
├── logs/                 # Logs de despliegue y backups
│   ├── deploy_20251229_020000.log
│   ├── backup_20251229_020000.log
│   └── rollback_20251229_020000.log
└── ops/                  # Scripts de operaciones
    ├── deploy.sh         # Script de despliegue
    ├── backup.sh         # Script de backups
    ├── rollback.sh       # Script de rollback
    ├── .env.ops          # Configuración de scripts
    └── cron/             # Configuración de cron jobs
```

### Componentes

1. **deploy.sh**: Script principal de despliegue
2. **backup.sh**: Script de backups manuales
3. **rollback.sh**: Script de rollback a versiones anteriores
4. **ecosystem.config.cjs**: Configuración de PM2
5. **cron/compilatime-backup.cron**: Configuración de backups automáticos

---

## 📦 Requisitos Previos

### En el Servidor (Contenedor APP)

1. **Sistema Operativo**: Linux (Ubuntu/Debian recomendado)
2. **Node.js**: v20 o superior
3. **npm**: v9 o superior
4. **Git**: v2.0 o superior
5. **PostgreSQL Client**: `postgresql-client` para pg_dump/pg_restore
6. **PM2**: Gestor de procesos de Node.js
7. **Nginx**: Servidor web (opcional, para frontend)

### Instalación de Dependencias

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Git
sudo apt install -y git

# Instalar PostgreSQL Client
sudo apt install -y postgresql-client

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Nginx (opcional)
sudo apt install -y nginx
```

### Permisos de Usuario

```bash
# Crear usuario de despliegue (si no existe)
sudo adduser deploy

# Añadir usuario a grupos necesarios
sudo usermod -aG sudo deploy
sudo usermod -aG www-data deploy  # Para Nginx

# Crear directorio de despliegue
sudo mkdir -p /opt/compilatime
sudo chown -R deploy:deploy /opt/compilatime
```

---

## ⚙️ Configuración Inicial

### Opción 1: Inicialización Automática (Recomendado)

El script [`init.sh`](ops/init.sh) configura automáticamente todo lo necesario:

```bash
# Ejecutar script de inicialización
./ops/init.sh https://github.com/tu-usuario/compilatime.git
```

**Qué hace el script:**
1. ✅ Verifica que todos los comandos necesarios están instalados
2. ✅ Copia archivo de configuración `.env.ops`
3. ✅ Configura URL del repositorio Git
4. ✅ Configura acceso a PostgreSQL (crea archivo `~/.pgpass`)
5. ✅ Configura acceso a Git (HTTPS o SSH)
6. ✅ Da permisos de ejecución a scripts
7. ✅ Crea directorios necesarios
8. ✅ Instala cron job para backups automáticos
9. ✅ Verifica PM2
10. ✅ Muestra resumen y próximos pasos

**Requisitos:**
- Ejecutar como usuario `deploy` (no como root)
- Tener permisos sudo para instalar cron job
- Proporcionar URL del repositorio Git

### Opción 2: Configuración Manual

Si prefieres configurar manualmente:

#### 1. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp ops/.env.ops.example ops/.env.ops

# Editar con tus valores
nano ops/.env.ops
```

**Variables obligatorias a configurar:**

```bash
# Base de datos
DB_HOST=localhost              # Host de PostgreSQL
DB_PORT=5432                   # Puerto de PostgreSQL
DB_NAME=compilatime            # Nombre de la base de datos
DB_USER=rafa                   # Usuario de PostgreSQL
DB_PASSWORD=C0mp1l@te          # Contraseña de PostgreSQL

# Repositorio Git
REPO_URL=https://github.com/tu-usuario/compilatime.git
REPO_BRANCH=main

# PM2
PM2_APP_NAME=compilatime

# Rutas (generalmente no necesitan cambio)
DEPLOY_ROOT=/opt/compilatime
RELEASES_DIR=${DEPLOY_ROOT}/releases
CURRENT_LINK=${DEPLOY_ROOT}/current
BACKUPS_DIR=${DEPLOY_ROOT}/backups
LOGS_DIR=${DEPLOY_ROOT}/logs
```

#### 2. Configurar Acceso a Git

**Opción A: HTTPS con token**

```bash
# Configurar credenciales de Git
git config --global credential.helper store
git clone https://github.com/tu-usuario/compilatime.git /tmp/test
# Introduce tu token cuando se solicite
rm -rf /tmp/test
```

**Opción B: SSH con claves**

```bash
# Generar clave SSH si no existe
ssh-keygen -t ed25519 -C "deploy@compilatime"

# Copiar clave pública a GitHub
cat ~/.ssh/id_ed25519.pub
# Añadir la clave en GitHub: Settings > SSH and GPG keys

# Probar conexión
ssh -T git@github.com
```

### 3. Configurar Acceso a PostgreSQL

```bash
# Crear archivo .pgpass para evitar contraseña en comandos
echo "localhost:5432:compilatime:compilatime_user:tu_contraseña" > ~/.pgpass
chmod 600 ~/.pgpass

# Probar conexión
psql -h localhost -U compilatime_user -d compilatime -c "SELECT 1;"
```

### 4. Dar Permisos de Ejecución a Scripts

```bash
chmod +x ops/deploy.sh
chmod +x ops/backup.sh
chmod +x ops/rollback.sh
```

### 5. Configurar Cron para Backups Automáticos

```bash
# Copiar archivo de cron
sudo cp ops/cron/compilatime-backup.cron /etc/cron.d/compilatime-backup

# Asegurar permisos correctos
sudo chmod 644 /etc/cron.d/compilatime-backup

# Reiniciar servicio cron
sudo service cron restart

# Verificar cron jobs
sudo crontab -l -u deploy
```

---

## 🚀 Flujo de Despliegue

### Flujo Completo de Despliegue

```
1. Crear tag en Git (desde PC local)
   ↓
2. Ejecutar script de despliegue (en servidor)
   ↓
3. Verificar tag en repositorio remoto
   ↓
4. Hacer backup de base de datos
   ↓
5. Hacer backup de configuración
   ↓
6. Clonar repositorio con el tag
   ↓
7. Instalar dependencias (npm ci)
   ↓
8. Compilar backend y frontend
   ↓
9. Ejecutar migraciones de Prisma
   ↓
10. Crear release versionada
   ↓
11. Cambiar symlink 'current'
   ↓
12. Reiniciar backend con PM2
   ↓
13. Verificar estado del despliegue
   ↓
14. Limpiar releases antiguas
```

### Diagrama de Estados

```
┌─────────────┐
│  Desarrollo │
└──────┬──────┘
       │ git tag v1.0.0
       ▼
┌─────────────┐
│  Git Remote │
└──────┬──────┘
       │ ./deploy.sh v1.0.0
       ▼
┌─────────────┐
│   Backup    │
│  DB + Config│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Release   │
│  v1.0.0/    │
└──────┬──────┘
       │ symlink current
       ▼
┌─────────────┐
│  Producción │
│  (current)  │
└─────────────┘
```

---

## 📝 Uso de Scripts

### deploy.sh - Despliegue de Versiones

#### Sintaxis

```bash
./ops/deploy.sh [version]
./ops/deploy.sh latest
```

#### Ejemplos

```bash
# Desplegar última versión automáticamente (recomendado)
./ops/deploy.sh

# Desplegar versión específica
./ops/deploy.sh v1.0.0

# Desplegar última versión explícitamente
./ops/deploy.sh latest
```

**Nota**: Si no se especifica ninguna versión, el script detectará automáticamente la última versión disponible en el repositorio remoto y la desplegará.

#### Qué hace el script

1. ✅ Si no se especifica versión, detecta automáticamente la última versión disponible
2. ✅ Verifica que el tag existe en el repositorio remoto
3. ✅ Comprueba espacio en disco (mínimo 2GB)
4. ✅ Hace backup de la base de datos
5. ✅ Hace backup de la configuración
6. ✅ Clona el repositorio con el tag especificado
7. ✅ Instala dependencias con `npm ci`
8. ✅ Compila backend (`npm run build`)
9. ✅ Compila frontend (`npm run build`)
10. ✅ Ejecuta migraciones de Prisma (`npx prisma migrate deploy`)
11. ✅ Crea la release en `/opt/compilatime/releases/<tag>/`
12. ✅ Cambia el symlink `current` a la nueva release
13. ✅ Reinicia el backend con PM2
14. ✅ Verifica que el backend esté online
15. ✅ Limpia releases antiguas (mantiene últimas 5)

#### Logs

Los logs se guardan en `/opt/compilatime/logs/deploy_<timestamp>.log`

#### Errores Comunes

**Error: Tag no existe**

```
[ERROR] El tag v1.0.0 no existe en el repositorio remoto
```

**Solución**: Verifica que el tag existe en GitHub/GitLab:
```bash
git ls-remote --tags https://github.com/tu-usuario/compilatime.git
```

**Error: Espacio en disco insuficiente**

```
[ERROR] Espacio en disco insuficiente. Disponible: 1GB, Requerido: 2GB
```

**Solución**: Libera espacio en disco o aumenta `MIN_DISK_SPACE_GB` en `.env.ops`

**Error: Migraciones fallaron**

```
[ERROR] Error al ejecutar migraciones (código: 1)
```

**Solución**: 
1. Revisa el log de migraciones
2. Si es necesario, restaura el backup de DB:
```bash
./ops/backup.sh restore /opt/compilatime/backups/db/compilatime_v1.0.0_20251229_020000.dump
```

---

### backup.sh - Backups Manuales

#### Sintaxis

```bash
./ops/backup.sh <db|config|release|all|list|restore>
```

#### Ejemplos

```bash
# Backup completo (DB + config + release)
./ops/backup.sh all

# Backup solo de base de datos
./ops/backup.sh db

# Backup solo de configuración
./ops/backup.sh config

# Backup de release actual
./ops/backup.sh release

# Listar backups disponibles
./ops/backup.sh list

# Restaurar base de datos desde backup
./ops/backup.sh restore /opt/compilatime/backups/db/compilatime_manual_20251229_020000.dump
```

#### Qué hace el script

**backup db**:
- Verifica conexión a PostgreSQL
- Ejecuta `pg_dump` en formato custom comprimido
- Guarda backup en `/opt/compilatime/backups/db/`
- Aplica rotación (mantiene últimos 14)

**backup config**:
- Copia archivos `.env` de backend y frontend
- Copia `ecosystem.config.cjs` y `schema.prisma`
- Crea archivo `.tar.gz` comprimido
- Aplica rotación (mantiene últimos 10)

**backup release**:
- Crea backup completo de la release actual
- Excluye `node_modules` y `dist`
- Guarda en `/opt/compilatime/backups/releases/`

#### Logs

Los logs se guardan en `/opt/compilatime/logs/backup_<timestamp>.log`

#### Restaurar Base de Datos

```bash
# Listar backups disponibles
./ops/backup.sh list

# Restaurar backup específico
./ops/backup.sh restore /opt/compilatime/backups/db/compilatime_manual_20251229_020000.dump
```

**Nota**: El script crea un backup de seguridad antes de restaurar.

---

### rollback.sh - Rollback a Versiones Anteriores

#### Sintaxis

```bash
./ops/rollback.sh [version]
```

#### Ejemplos

```bash
# Rollback a versión anterior (automático)
./ops/rollback.sh

# Rollback a versión específica
./ops/rollback.sh v1.0.0
```

#### Qué hace el script

1. ✅ Lista releases disponibles
2. ✅ Si no se especifica versión, usa la anterior
3. ✅ Pide confirmación al usuario
4. ✅ Hace backup antes del rollback
5. ✅ Cambia symlink `current` a la versión objetivo
6. ✅ Reinicia backend con PM2
7. ✅ Verifica que el backend esté online

#### Logs

Los logs se guardan en `/opt/compilatime/logs/rollback_<timestamp>.log`

#### Ejemplo de Salida

```
[INFO] ==========================================
[INFO] Iniciando rollback
[INFO] ==========================================
[INFO] Versión actual: v1.1.0
[INFO] Releases disponibles:
[INFO]   - v1.1.0 [ACTUAL] (v1.1.0)
[INFO]   - v1.0.1 (v1.0.1)
[INFO]   - v1.0.0 (v1.0.0)
[WARNING] ==========================================
[WARNING] CONFIRMACIÓN DE ROLLBACK
[WARNING] ==========================================
[WARNING] Versión actual: v1.1.0
[WARNING] Versión objetivo: v1.0.1
[WARNING] ¿Estás seguro de que deseas continuar? (s/n)
s
[INFO] Creando backup antes del rollback...
[SUCCESS] Backup de base de datos creado: /opt/compilatime/backups/db/compilatime_rollback_v1.1.0_20251229_120000.dump
[INFO] Cambiando symlink a release v1.0.1...
[SUCCESS] Symlink actualizado a v1.0.1
[INFO] Reiniciando backend con PM2...
[SUCCESS] Backend recargado correctamente
[INFO] Verificando estado del rollback...
[SUCCESS] Rollback verificado exitosamente
[SUCCESS] ==========================================
[SUCCESS] Rollback completado exitosamente
[SUCCESS] Versión actual: v1.0.1
[SUCCESS] ==========================================
```

---

## 🏷️ Gestión de Versiones

### Crear Tags en Git (Desde PC Local)

```bash
# Asegurarse de estar en la rama correcta
git checkout main
git pull origin main

# Crear tag anotado
git tag -a v1.0.0 -m "Versión 1.0.0 - Release inicial"

# Push del tag al repositorio remoto
git push origin v1.0.0

# O push de todos los tags
git push origin --tags
```

### Ver Tags Disponibles

```bash
# Listar tags locales
git tag

# Listar tags remotos
git ls-remote --tags origin

# Ver detalles de un tag
git show v1.0.0
```

### Convención de Versionado (SemVer)

```
vMAJOR.MINOR.PATCH

MAJOR: Cambios incompatibles con la API
MINOR: Nueva funcionalidad compatible hacia atrás
PATCH: Corrección de errores compatible hacia atrás

Ejemplos:
v1.0.0 - Release inicial
v1.0.1 - Corrección de errores
v1.1.0 - Nueva funcionalidad
v2.0.0 - Cambios importantes en la API
```

### Verificar Versión Desplegada

```bash
# Desde el servidor
cat /opt/compilatime/current/VERSION

# O vía API
curl http://localhost:3000/api/version
```

**Respuesta de la API:**

```json
{
  "success": true,
  "version": "v1.0.0",
  "deployDate": "2025-12-29T02:00:00.000Z",
  "gitCommit": "abc1234",
  "environment": "production",
  "nodeVersion": "v20.10.0",
  "uptime": 3600,
  "timestamp": "2025-12-29T12:00:00.000Z"
}
```

---

## 💾 Backups

### Tipos de Backups

1. **Backups Automáticos (Cron)**
   - Diario a las 2:00 AM (completo)
   - Cada 6 horas (solo DB)
   - Configuración diaria a las 3:00 AM

2. **Backups de Despliegue**
   - Automáticos antes de cada despliegue
   - Incluyen DB y configuración

3. **Backups Manuales**
   - Ejecutados con `./ops/backup.sh`
   - Flexibles según necesidad

### Rotación de Backups

- **Base de datos**: Últimos 14 backups
- **Configuración**: Últimos 10 backups
- **Releases**: Sin rotación automática (gestión manual)

### Ubicación de Backups

```
/opt/compilatime/backups/
├── db/                          # Backups de PostgreSQL
│   ├── compilatime_v1.0.0_20251229_020000.dump
│   ├── compilatime_v1.0.1_20251230_020000.dump
│   └── compilatime_manual_20251229_120000.dump
├── config/                      # Backups de configuración
│   ├── v1.0.0_20251229_020000.tar.gz
│   └── v1.0.1_20251230_020000.tar.gz
└── releases/                    # Backups de releases completas
    └── current_20251229_020000.tar.gz
```

### Restaurar desde Backup

#### Restaurar Base de Datos

```bash
# Opción 1: Usar script de backup
./ops/backup.sh restore /opt/compilatime/backups/db/compilatime_manual_20251229_020000.dump

# Opción 2: Usar pg_restore directamente
PGPASSWORD=tu_contraseña pg_restore \
  -h localhost \
  -p 5432 \
  -U compilatime_user \
  -d compilatime \
  -c \
  --if-exists \
  /opt/compilatime/backups/db/compilatime_manual_20251229_020000.dump
```

#### Restaurar Configuración

```bash
# Extraer backup de configuración
tar -xzf /opt/compilatime/backups/config/v1.0.0_20251229_020000.tar.gz \
  -C /opt/compilatime/current/

# Verificar archivos
cat /opt/compilatime/current/backend/.env
cat /opt/compilatime/current/frontend/.env
```

#### Restaurar Release Completa

```bash
# Extraer backup de release
tar -xzf /opt/compilatime/backups/releases/current_20251229_020000.tar.gz \
  -C /opt/compilatime/releases/restored/

# Cambiar symlink
ln -sfn /opt/compilatime/releases/restored /opt/compilatime/current

# Reiniciar backend
pm2 reload compilatime
```

### Backups Externos (Recomendado)

Para mayor seguridad, considera copiar los backups a un almacenamiento externo:

```bash
# Usar rsync para copiar a servidor remoto
rsync -avz --delete \
  /opt/compilatime/backups/ \
  user@backup-server:/backups/compilatime/

# Usar rclone para copiar a cloud storage (S3, Google Drive, etc.)
rclone sync /opt/compilatime/backups/ remote:compilatime-backups/
```

---

## 🔄 Rollback

### Cuándo Hacer Rollback

- El despliegue introduce errores críticos
- Las migraciones de base de datos fallan
- El rendimiento degrada significativamente
- Hay problemas de compatibilidad

### Proceso de Rollback

#### Opción 1: Usar Script de Rollback

```bash
# Rollback a versión anterior (automático)
./ops/rollback.sh

# Rollback a versión específica
./ops/rollback.sh v1.0.0
```

#### Opción 2: Rollback Manual

```bash
# 1. Listar releases disponibles
ls -la /opt/compilatime/releases/

# 2. Cambiar symlink manualmente
ln -sfn /opt/compilatime/releases/v1.0.0 /opt/compilatime/current

# 3. Reiniciar backend
pm2 reload compilatime

# 4. Verificar estado
pm2 status
curl http://localhost:3000/api/version
```

### Rollback con Restauración de DB

Si las migraciones causaron problemas en la DB:

```bash
# 1. Hacer rollback del código
./ops/rollback.sh v1.0.0

# 2. Restaurar backup de DB anterior
./ops/backup.sh restore /opt/compilatime/backups/db/compilatime_v1.0.0_20251229_020000.dump

# 3. Reiniciar backend
pm2 reload compilatime
```

### Verificar Rollback Exitoso

```bash
# Verificar versión
cat /opt/compilatime/current/VERSION

# Verificar estado de PM2
pm2 status

# Verificar logs
pm2 logs compilatime --lines 50

# Verificar API
curl http://localhost:3000/api/version
curl http://localhost:3000/health
```

---

## 🔧 Solución de Problemas

### Problema: El script de despliegue falla al clonar el repositorio

**Error:**
```
[ERROR] Error al clonar repositorio
fatal: repository 'https://github.com/...' not found
```

**Solución:**
```bash
# Verificar URL del repositorio
cat ops/.env.ops | grep REPO_URL

# Probar clonación manual
git clone https://github.com/tu-usuario/compilatime.git /tmp/test

# Si es HTTPS, verificar credenciales
git config --global credential.helper store

# Si es SSH, verificar clave SSH
ssh -T git@github.com
```

### Problema: Las migraciones de Prisma fallan

**Error:**
```
[ERROR] Error al ejecutar migraciones (código: 1)
Error: P3006
Migration failed to apply cleanly to the shadow database.
```

**Solución:**
```bash
# 1. Revisar log de migraciones
tail -100 /opt/compilatime/logs/deploy_*.log

# 2. Verificar estado de migraciones
cd /opt/compilatime/current/backend
npx prisma migrate status

# 3. Si es necesario, resolver manualmente
npx prisma migrate resolve --applied "20251229_migration_name"

# 4. O restaurar backup de DB
./ops/backup.sh restore /opt/compilatime/backups/db/compilatime_*.dump
```

### Problema: PM2 no puede iniciar la aplicación

**Error:**
```
[ERROR] Error al recargar backend
Error: ENOENT: no such file or directory, open '/opt/compilatime/current/backend/dist/server.js'
```

**Solución:**
```bash
# 1. Verificar que el archivo existe
ls -la /opt/compilatime/current/backend/dist/

# 2. Si no existe, la compilación falló
# Revisar logs de despliegue
tail -100 /opt/compilatime/logs/deploy_*.log

# 3. Verificar que el symlink apunta a la release correcta
ls -la /opt/compilatime/current

# 4. Si es necesario, hacer rollback
./ops/rollback.sh
```

### Problema: Espacio en disco insuficiente

**Error:**
```
[ERROR] Espacio en disco insuficiente. Disponible: 1GB, Requerido: 2GB
```

**Solución:**
```bash
# 1. Verificar espacio en disco
df -h

# 2. Limpiar releases antiguas
ls -la /opt/compilatime/releases/
rm -rf /opt/compilatime/releases/v1.0.0

# 3. Limpiar backups antiguos
find /opt/compilatime/backups/ -name "*.dump" -mtime +30 -delete
find /opt/compilatime/backups/ -name "*.tar.gz" -mtime +30 -delete

# 4. Limpiar logs antiguos
find /opt/compilatime/logs/ -name "*.log" -mtime +30 -delete

# 5. Limpiar caché de npm
npm cache clean --force
```

### Problema: El backend no responde después del despliegue

**Solución:**
```bash
# 1. Verificar estado de PM2
pm2 status

# 2. Verificar logs de PM2
pm2 logs compilatime --lines 100

# 3. Verificar logs de la aplicación
tail -100 /opt/compilatime/current/backend/logs/*.log

# 4. Verificar que el puerto está disponible
netstat -tlnp | grep 3000

# 5. Verificar conexión a DB
psql -h localhost -U compilatime_user -d compilatime -c "SELECT 1;"

# 6. Si todo parece correcto, reiniciar PM2
pm2 restart compilatime

# 7. Si persiste, hacer rollback
./ops/rollback.sh
```

### Problema: Los backups automáticos no se ejecutan

**Solución:**
```bash
# 1. Verificar que cron está corriendo
sudo service cron status

# 2. Verificar cron jobs
sudo crontab -l -u deploy

# 3. Verificar logs de cron
tail -100 /opt/compilatime/logs/cron_backup.log

# 4. Probar ejecución manual
./ops/backup.sh all

# 5. Verificar permisos del archivo de cron
ls -la /etc/cron.d/compilatime-backup

# 6. Reiniciar cron
sudo service cron restart
```

---

## ✅ Buenas Prácticas

### Antes del Despliegue

1. **Probar en staging primero**
   ```bash
   # Desplegar en entorno de staging
   ./ops/deploy.sh v1.0.0
   ```

2. **Revisar cambios en el tag**
   ```bash
   git show v1.0.0 --stat
   ```

3. **Verificar que las migraciones son reversibles**
   ```bash
   # Revisar archivos de migración
   cat backend/prisma/migrations/*/migration.sql
   ```

4. **Hacer backup manual antes de cambios importantes**
   ```bash
   ./ops/backup.sh all
   ```

### Durante el Despliegue

1. **Monitorear logs en tiempo real**
   ```bash
   tail -f /opt/compilatime/logs/deploy_*.log
   ```

2. **Verificar cada paso**
   - Backup completado
   - Dependencias instaladas
   - Compilación exitosa
   - Migraciones aplicadas
   - Backend online

3. **Tener plan de rollback preparado**
   ```bash
   # Identificar versión anterior
   ls -la /opt/compilatime/releases/
   ```

### Después del Despliegue

1. **Verificar versión desplegada**
   ```bash
   curl http://localhost:3000/api/version
   ```

2. **Probar funcionalidad crítica**
   - Login
   - Registro de horas
   - Reportes

3. **Monitorear logs de aplicación**
   ```bash
   pm2 logs compilatime --lines 100
   ```

4. **Verificar métricas de rendimiento**
   - Tiempo de respuesta
   - Uso de CPU/Memoria
   - Errores en logs

### Gestión de Versiones

1. **Usar versionado semántico**
   ```
   vMAJOR.MINOR.PATCH
   ```

2. **Documentar cambios en cada tag**
   ```bash
   git tag -a v1.0.0 -m "Versión 1.0.0

   - Feature: Sistema de registro horario
   - Feature: Gestión de empleados
   - Fix: Corrección de errores en login
   "
   ```

3. **Mantener releases anteriores por un tiempo**
   - Al menos 2-3 releases anteriores
   - Para rollback rápido si es necesario

### Seguridad

1. **Proteger archivos de configuración**
   ```bash
   chmod 600 ops/.env.ops
   chmod 600 backend/.env
   chmod 600 frontend/.env
   ```

2. **Usar variables de entorno para secretos**
   - No hardcodear contraseñas
   - No commitear archivos .env

3. **Rotar credenciales regularmente**
   - Contraseñas de DB
   - Tokens de API
   - Claves SSH

4. **Limitar acceso a scripts**
   ```bash
   # Solo usuario deploy puede ejecutar
   chown deploy:deploy ops/*.sh
   chmod 750 ops/*.sh
   ```

### Monitoreo

1. **Configurar alertas**
   - Backend caído
   - Errores en logs
   - Espacio en disco bajo

2. **Revisar logs regularmente**
   ```bash
   # Logs de despliegue
   tail -100 /opt/compilatime/logs/deploy_*.log

   # Logs de PM2
   pm2 logs compilatime --lines 100

   # Logs de aplicación
   tail -100 /opt/compilatime/current/backend/logs/*.log
   ```

3. **Mantener documentación actualizada**
   - Registrar cambios importantes
   - Documentar problemas y soluciones
   - Actualizar este README según sea necesario

---

## 🚀 Inicio Rápido

### Opción 1: Inicialización Automática (Recomendado)

El script [`init.sh`](ops/init.sh) configura automáticamente todo lo necesario en un solo comando:

```bash
# Ejecutar script de inicialización
./ops/init.sh https://github.com/tu-usuario/compilatime.git
```

**Qué hace el script automáticamente:**
1. ✅ Verifica comandos necesarios (git, node, npm, psql, pm2)
2. ✅ Copia archivo de configuración `.env.ops`
3. ✅ Configura URL del repositorio Git
4. ✅ Configura acceso a PostgreSQL (crea archivo `~/.pgpass`)
5. ✅ Configura acceso a Git (HTTPS o SSH)
6. ✅ Da permisos de ejecución a scripts
7. ✅ Crea directorios necesarios
8. ✅ Instala cron job para backups automáticos
9. ✅ Verifica PM2
10. ✅ Muestra resumen y próximos pasos

**Requisitos:**
- Ejecutar como usuario `deploy` (no como root)
- Tener permisos sudo para instalar cron job
- Proporcionar URL del repositorio Git

### Opción 2: Configuración Manual

Si prefieres configurar manualmente:

#### 1. Configurar el entorno
   ```bash
   cp ops/.env.ops.example ops/.env.ops
   nano ops/.env.ops  # Rellenar valores reales
   ```

#### 2. Configurar acceso a Git
   - HTTPS con token o SSH con claves

#### 3. Configurar acceso a PostgreSQL
   ```bash
   echo "localhost:5432:compilatime:rafa:C0mp1l@te" > ~/.pgpass
   chmod 600 ~/.pgpass
   ```

#### 4. Dar permisos de ejecución a scripts
   ```bash
   chmod +x ops/deploy.sh ops/backup.sh ops/rollback.sh
   ```

#### 5. Crear directorios necesarios
   ```bash
   mkdir -p /opt/compilatime/releases
   mkdir -p /opt/compilatime/backups/db
   mkdir -p /opt/compilatime/backups/config
   mkdir -p /opt/compilatime/backups/releases
   mkdir -p /opt/compilatime/logs
   ```

#### 6. Instalar cron para backups automáticos
   ```bash
   sudo cp ops/cron/compilatime-backup.cron /etc/cron.d/compilatime-backup
   sudo chmod 644 /etc/cron.d/compilatime-backup
   sudo service cron restart
   ```

### Primer Despliegue

Una vez configurado el entorno:

1. **Crear primer tag** (desde PC local):
   ```bash
   git tag -a v1.0.0 -m "Versión 1.0.0"
   git push origin v1.0.0
   ```

2. **Desplegar** (en servidor):
   ```bash
   # Desplegar última versión automáticamente (recomendado)
   ./ops/deploy.sh
   ```

### Despliegues Posteriores

Para despliegues posteriores, simplemente:

1. **Crear y pushear tag** (desde PC local):
   ```bash
   git tag -a v1.0.1 -m "Versión 1.0.1"
   git push origin v1.0.1
   ```

2. **Desplegar** (en servidor):
   ```bash
   # Desplegar última versión automáticamente (recomendado)
   ./ops/deploy.sh
   
   # O desplegar versión específica
   ./ops/deploy.sh v1.0.1
   ```

---

## 🔧 Script de Inicialización

### init.sh - Configuración Automática Completa

El script [`init.sh`](ops/init.sh) configura automáticamente todo lo necesario para el sistema de despliegue en un solo comando.

#### Sintaxis

```bash
./ops/init.sh [repo_url]
```

#### Ejemplo

```bash
./ops/init.sh https://github.com/tu-usuario/compilatime.git
```

#### Qué hace el script

1. ✅ **Verifica comandos necesarios**
   - git, node, npm, psql, pg_dump, pg_restore, pm2

2. ✅ **Copia archivo de configuración**
   - Crea `ops/.env.ops` desde `ops/.env.ops.example`
   - Configura URL del repositorio Git

3. ✅ **Configura acceso a PostgreSQL**
   - Crea archivo `~/.pgpass` con credenciales
   - Establece permisos restrictivos (600)
   - Prueba conexión a la base de datos

4. ✅ **Configura acceso a Git**
   - Detecta si es HTTPS o SSH
   - Si es HTTPS: configura credenciales de Git
   - Si es SSH: genera clave SSH si no existe
   - Muestra clave pública para añadir en GitHub
   - Prueba conexión SSH

5. ✅ **Da permisos de ejecución a scripts**
   - `ops/deploy.sh`
   - `ops/backup.sh`
   - `ops/rollback.sh`

6. ✅ **Crea directorios necesarios**
   - `/opt/compilatime/releases`
   - `/opt/compilatime/backups/db`
   - `/opt/compilatime/backups/config`
   - `/opt/compilatime/backups/releases`
   - `/opt/compilatime/logs`

7. ✅ **Instala cron job para backups automáticos**
   - Copia archivo de cron a `/etc/cron.d/`
   - Configura usuario correcto
   - Reinicia servicio cron

8. ✅ **Verifica PM2**
   - Inicializa PM2 si no está corriendo

9. ✅ **Muestra resumen y próximos pasos**
   - Resumen de lo configurado
   - Instrucciones para primer despliegue

#### Requisitos

- Ejecutar como usuario `deploy` (no como root)
- Tener permisos sudo para instalar cron job
- Proporcionar URL del repositorio Git

#### Logs

El script muestra información detallada en consola con colores para facilitar la lectura.

#### Ejemplo de Salida

```
==========================================
  Inicialización del Sistema de Despliegue
  Compilatime
==========================================

[INFO] Verificando usuario...
[INFO] Verificando comandos necesarios...
[SUCCESS] Todos los comandos necesarios están instalados

[INFO] Copiando archivo de configuración...
[SUCCESS] Archivo ops/.env.ops creado

[INFO] Configurando URL del repositorio...
[SUCCESS] URL del repositorio configurada: https://github.com/tu-usuario/compilatime.git

[INFO] Configurando acceso a PostgreSQL...
[SUCCESS] Archivo ~/.pgpass creado
[INFO] Probando conexión a PostgreSQL...
[SUCCESS] Conexión a PostgreSQL exitosa

[INFO] Configurando acceso a Git...
[INFO] Repositorio HTTPS detectado
[INFO] Configurando credenciales de Git...
[SUCCESS] Credenciales de Git configuradas
[WARNING] La primera vez que clones, se te pedirá el token

[INFO] Dando permisos de ejecución a scripts...
[SUCCESS] Permisos de ejecución dados

[INFO] Creando directorios necesarios...
[SUCCESS] Directorios creados

[INFO] Instalando cron job para backups automáticos...
[SUCCESS] Cron job instalado
[INFO] Backups automáticos configurados:
[INFO]   - Diario completo a las 2:00 AM
[INFO]   - DB cada 6 horas (2:00, 8:00, 14:00, 20:00)
[INFO]   - Configuración diaria a las 3:00 AM

[INFO] Verificando PM2...
[SUCCESS] PM2 está instalado y funcionando

==========================================
  Inicialización Completada
==========================================

[SUCCESS] Sistema de despliegue configurado exitosamente

Próximos pasos:

1. Crear primer tag (desde PC local):
   git tag -a v1.0.0 -m 'Versión 1.0.0'
   git push origin v1.0.0

2. Desplegar (en servidor):
   ./ops/deploy.sh

3. Verificar versión:
   curl http://localhost:4000/api/version

Para más información, consulta: ops/README_DEPLOY.md
```

---

## 🔧 Versión de Desarrollo

### create-dev-version.sh - Crear Versión de Desarrollo con Copia de DB

El script [`create-dev-version.sh`](ops/create-dev-version.sh) permite crear una versión de desarrollo que usa una copia independiente de la base de datos de producción.

#### Sintaxis

```bash
./ops/create-dev-version.sh <version>
```

#### Ejemplo

```bash
# Crear versión de desarrollo v1.0.0-dev
./ops/create-dev-version.sh v1.0.0-dev
```

#### Qué hace el script

1. ✅ **Verifica espacio en disco**
   - Comprueba que hay al menos 2GB disponibles

2. ✅ **Backup de base de datos de producción**
   - Hace backup de la base de datos de producción
   - Guarda en `/opt/compilatime/backups/db/`
   - Aplica rotación (mantiene últimos 14)

3. ✅ **Crea base de datos de desarrollo**
   - Crea nueva base de datos: `compilatime_dev`
   - Crea usuario de desarrollo: `rafa_dev`
   - Otorga permisos al usuario de desarrollo

4. ✅ **Restaura backup en base de datos de desarrollo**
   - Restaura el backup de producción en la base de datos de desarrollo
   - Permite trabajar con datos reales sin afectar producción

5. ✅ **Clona repositorio con el tag especificado**
   - Clona el código en `/opt/compilatime/releases/<version>/`

6. ✅ **Instala dependencias**
   - Ejecuta `npm ci` en backend y frontend

7. ✅ **Compila aplicación**
   - Compila backend (`npm run build`)
   - Compila frontend (`npm run build`)

8. ✅ **Crea archivos de configuración de desarrollo**
   - Crea `.env` para backend con conexión a DB de desarrollo
   - Crea `.env` para frontend con URL de API de desarrollo
   - Configura `NODE_ENV=development`

9. ✅ **Crea archivo VERSION**
   - Guarda el tag de versión en la release

10. ✅ **Crea symlink `current_dev`**
   - Crea symlink `/opt/compilatime/current_dev` apuntando a la versión de desarrollo
   - No afecta al symlink `current` de producción

11. ✅ **Inicia aplicación PM2 de desarrollo**
   - Crea aplicación PM2: `compilatime-dev`
   - Usa `ecosystem.dev.config.cjs`
   - Configura puerto 4000 (mismo que producción)
   - Permite ejecutar desarrollo y producción en paralelo

#### Estructura de Directorios de Desarrollo

```
/opt/compilatime/
├── releases/
│   ├── v1.0.0-dev/           # Release de desarrollo
│   │   ├── backend/
│   │   │   ├── dist/
│   │   │   ├── node_modules/
│   │   │   ├── .env (DB: compilatime_dev)
│   │   │   └── ecosystem.dev.config.cjs
│   │   ├── frontend/
│   │   │   ├── dist/
│   │   │   ├── node_modules/
│   │   │   └── .env (API: http://localhost:4000)
│   │   └── VERSION (v1.0.0-dev)
│   ├── v1.0.0/               # Release de producción
│   └── v1.0.1/               # Release de producción
├── current -> releases/v1.0.1/  # Producción
├── current_dev -> releases/v1.0.0-dev/  # Desarrollo
└── backups/
    └── db/
        ├── compilatime_prod_backup_20251229_120000.dump
        └── compilatime_prod_backup_20251230_120000.dump
```

#### Variables de Entorno de Desarrollo

**Backend:**
```bash
DATABASE_URL="postgresql://rafa_dev:C0mp1l@te_dev@localhost:5432/compilatime_dev"
NODE_ENV="development"
PORT=4000
```

**Frontend:**
```bash
VITE_API_URL="http://localhost:4000"
```

#### Acceder a la Versión de Desarrollo

```bash
# Verificar versión de desarrollo
cat /opt/compilatime/current_dev/VERSION

# Verificar estado de PM2 de desarrollo
pm2 status compilatime-dev

# Verificar logs de PM2 de desarrollo
pm2 logs compilatime-dev --lines 50

# Acceder a la aplicación de desarrollo
# Frontend: http://localhost:3000 (o el puerto que uses)
# Backend API: http://localhost:4000/api
```

#### Logs

Los logs se guardan en `/opt/compilatime/logs/create-dev-version_<timestamp>.log`

#### Ventajas de este Enfoque

1. **Aislamiento completo**
   - Base de datos independiente
   - Usuario de base de datos independiente
   - No afecta a producción

2. **Datos reales**
   - Copia exacta de la base de datos de producción
   - Permite probar con datos reales

3. **Desarrollo en paralelo**
   - Producción y desarrollo pueden ejecutarse simultáneamente
   - Diferentes puertos (si se configura)
   - Diferentes procesos PM2

4. **Fácil limpieza**
   - Para eliminar versión de desarrollo:
     ```bash
     pm2 stop compilatime-dev
     pm2 delete compilatime-dev
     rm -rf /opt/compilatime/releases/v1.0.0-dev
     rm /opt/compilatime/current_dev
     psql -h localhost -U rafa -d postgres -c "DROP DATABASE compilatime_dev;"
     psql -h localhost -U rafa -d postgres -c "DROP USER rafa_dev;"
     ```

5. **Rollback fácil**
   - Si algo sale mal, simplemente elimina la versión de desarrollo
   - La producción sigue intacta

#### Flujo de Trabajo Típico

1. **Crear versión de desarrollo**
   ```bash
   ./ops/create-dev-version.sh v1.0.0-dev
   ```

2. **Desarrollar y probar cambios**
   - Editar código en `/opt/compilatime/current_dev/`
   - Recompilar si es necesario
   - Probar cambios con datos reales

3. **Cuando esté listo, crear versión de producción**
   ```bash
   # Desde PC local
   git tag -a v1.0.0 -m "Versión 1.0.0"
   git push origin v1.0.0
   
   # En servidor
   ./ops/deploy.sh
   ```

4. **Limpiar versión de desarrollo**
   ```bash
   pm2 stop compilatime-dev
   pm2 delete compilatime-dev
   rm -rf /opt/compilatime/releases/v1.0.0-dev
   rm /opt/compilatime/current_dev
   psql -h localhost -U rafa -d postgres -c "DROP DATABASE compilatime_dev;"
   psql -h localhost -U rafa -d postgres -c "DROP USER rafa_dev;"
   ```

#### Consideraciones Importantes

1. **Espacio en disco**
   - Cada versión de desarrollo consume espacio adicional
   - Recuerda limpiar versiones de desarrollo antiguas

2. **Recursos del sistema**
   - Ejecutar dos versiones (producción + desarrollo) consume más recursos
   - Asegúrate de que el servidor tenga suficiente RAM/CPU

3. **Seguridad**
   - La versión de desarrollo usa la misma contraseña de DB (con sufijo `_dev`)
   - Considera cambiar contraseñas regularmente
   - No expongas la versión de desarrollo a internet

4. **Backups automáticos**
   - Los backups automáticos (cron) solo afectan a producción
   - La base de datos de desarrollo no tiene backups automáticos
   - Recuerda hacer backups manuales si es necesario

#### Errores Comunes

**Error: Base de datos de desarrollo ya existe**

```
[WARNING] La base de datos de desarrollo ya existe, continuando...
```

**Solución**: Esto es normal si ya has creado una versión de desarrollo antes. El script continuará con la base de datos existente.

**Error: No se puede conectar a PostgreSQL**

```
[ERROR] No se puede conectar a PostgreSQL
```

**Solución**: Verifica que PostgreSQL está corriendo y que las credenciales en `ops/.env.ops` son correctas.

**Error: PM2 ya tiene una aplicación compilatime-dev**

```
[WARNING] Deteniendo aplicación de desarrollo existente...
```

**Solución**: El script detendrá la aplicación existente antes de crear la nueva.

---

## 📞 Soporte

Si encuentras problemas no documentados aquí:

1. Revisa los logs en `/opt/compilatime/logs/`
2. Consulta la documentación de [Prisma](https://www.prisma.io/docs)
3. Consulta la documentación de [PM2](https://pm2.keymetrics.io/docs)
4. Contacta al equipo de DevOps

---

## 📚 Recursos Adicionales

- [Documentación de Git](https://git-scm.com/doc)
- [Documentación de Prisma](https://www.prisma.io/docs)
- [Documentación de PM2](https://pm2.keymetrics.io/docs)
- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)
- [Documentación de Nginx](https://nginx.org/en/docs/)

---

**Última actualización:** 2025-12-29
**Versión del documento:** 1.1.0
