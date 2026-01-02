-- Backup de la base de datos CompilaTime
-- Fecha: mié 10 dic 2025 23:35:35 CET
-- Creado con: Prisma + Script manual

-- Nota: Este es un backup de estructura y datos básicos.
-- Para una restauración completa, considere usar pg_dump directamente.

-- Iniciar transacción
BEGIN;

-- Desactivar restricciones de clave foránea temporalmente
SET session_replication_role = replica;


-- Reactivar restricciones
SET session_replication_role = DEFAULT;

-- Confirmar transacción
COMMIT;

-- Información del backup
-- Fecha de creación: mié 10 dic 2025 23:35:35 CET
-- Proyecto: CompilaTime
-- Método: Script manual con Prisma

-- Para restaurar este backup:
-- 1. Asegúrate de que la base de datos existe
-- 2. Ejecuta: psql -h localhost -U compilatime -d compilatime < database_backup_20251210_233533.sql

