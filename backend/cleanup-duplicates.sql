-- Script para limpiar duplicados en weekly_schedules antes de la migración
-- Este script elimina registros duplicados manteniendo solo el más reciente

-- Primero, identificamos los duplicados
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY companyId, employeeId, weekStart, dayOfWeek
            ORDER BY weekly_schedules.updatedAt DESC
        ) as rn
    FROM weekly_schedules
)

-- Eliminamos los duplicados (mantenemos solo el más reciente, rn = 1)
DELETE FROM weekly_schedules
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Verificamos cuántos registros quedan
SELECT COUNT(*) as total_records FROM weekly_schedules;