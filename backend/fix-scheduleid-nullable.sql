-- Script corregido para hacer scheduleId nullable en weekly_schedules
-- Esto permitirá guardar NULL para días de descanso

-- 1. Eliminar la restricción de clave foránea (el nombre correcto es weekly_schedules_scheduleId_fkey)
ALTER TABLE weekly_schedules DROP CONSTRAINT weekly_schedules_scheduleId_fkey;

-- 2. Hacer la columna nullable (el nombre correcto es "scheduleId" con comillas dobles)
ALTER TABLE weekly_schedules ALTER COLUMN "scheduleId" DROP NOT NULL;

-- 3. Eliminar duplicados manteniendo solo el más reciente
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY "companyId", "employeeId", "weekStart", "dayOfWeek"
            ORDER BY "updatedAt" DESC
        ) as rn
    FROM weekly_schedules
)
DELETE FROM weekly_schedules
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 4. Verificar cuántos registros quedan
SELECT COUNT(*) as total_records FROM weekly_schedules;

-- 5. Mostrar algunos registros para verificar
SELECT id, "employeeId", "weekStart", "dayOfWeek", "scheduleId", "updatedAt" 
FROM weekly_schedules 
ORDER BY "updatedAt" DESC 
LIMIT 10;