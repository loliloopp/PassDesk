-- Миграция: Исправление constraint employees_status_check
-- Дата: 2024-11-18
-- Описание: Удаляем constraint employees_status_check, так как валидация выполняется в Sequelize

DO $$
BEGIN
    -- Удаляем constraint employees_status_check, если существует
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'employees_status_check'
        AND table_name = 'employees'
    ) THEN
        ALTER TABLE employees DROP CONSTRAINT employees_status_check;
        RAISE NOTICE '✅ Удален constraint employees_status_check';
    ELSE
        RAISE NOTICE 'ℹ️ Constraint employees_status_check не найден (возможно, уже удален)';
    END IF;
END $$;

