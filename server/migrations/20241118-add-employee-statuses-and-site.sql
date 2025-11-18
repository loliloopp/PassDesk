-- Миграция: Добавление функционала статусов и объектов для сотрудников
-- Дата: 2024-11-18
-- Описание:
-- 1. Добавление столбца construction_site_id в таблицу employee_counterparty_mapping
-- 2. Добавление столбцов status и status_active в таблицу employees
-- 3. Обновление уникального индекса в employee_counterparty_mapping

-- 1. Добавляем столбец construction_site_id в таблицу employee_counterparty_mapping
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employee_counterparty_mapping' 
        AND column_name = 'construction_site_id'
    ) THEN
        ALTER TABLE employee_counterparty_mapping 
        ADD COLUMN construction_site_id UUID;
        
        ALTER TABLE employee_counterparty_mapping 
        ADD CONSTRAINT fk_ecm_construction_site 
        FOREIGN KEY (construction_site_id) 
        REFERENCES construction_sites(id) 
        ON DELETE SET NULL;
        
        COMMENT ON COLUMN employee_counterparty_mapping.construction_site_id IS 'ID объекта строительства (опционально)';
    END IF;
END $$;

-- 2. Удаляем старый уникальный constraint и создаем новый с construction_site_id
DO $$
BEGIN
    -- Удаляем старый constraint, если существует
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_employee_counterparty'
        AND table_name = 'employee_counterparty_mapping'
    ) THEN
        ALTER TABLE employee_counterparty_mapping DROP CONSTRAINT unique_employee_counterparty;
    END IF;
    
    -- Создаем новый уникальный индекс
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'unique_employee_counterparty_site_mapping'
    ) THEN
        CREATE UNIQUE INDEX unique_employee_counterparty_site_mapping 
        ON employee_counterparty_mapping (employee_id, counterparty_id, COALESCE(construction_site_id, '00000000-0000-0000-0000-000000000000'::uuid));
    END IF;
END $$;

-- 3. Добавляем столбцы status и status_active в таблицу employees
DO $$
BEGIN
    -- Добавляем столбец status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' 
        AND column_name = 'status'
    ) THEN
        -- Создаем ENUM тип для status, если не существует
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_status') THEN
            CREATE TYPE employee_status AS ENUM ('new', 'tb_passed', 'processed');
        END IF;
        
        ALTER TABLE employees 
        ADD COLUMN status employee_status NOT NULL DEFAULT 'new';
        
        COMMENT ON COLUMN employees.status IS 'Статус сотрудника: new (Новый), tb_passed (Проведен ТБ), processed (Обработан)';
    END IF;
    
    -- Добавляем столбец status_active
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' 
        AND column_name = 'status_active'
    ) THEN
        -- Создаем ENUM тип для status_active, если не существует
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_status_active') THEN
            CREATE TYPE employee_status_active AS ENUM ('fired', 'inactive');
        END IF;
        
        ALTER TABLE employees 
        ADD COLUMN status_active employee_status_active;
        
        COMMENT ON COLUMN employees.status_active IS 'Активность сотрудника: fired (Уволен), inactive (Неактивный), NULL (Активен)';
    END IF;
END $$;

-- Выводим информацию о выполненной миграции
DO $$
BEGIN
    RAISE NOTICE '✅ Миграция выполнена успешно';
    RAISE NOTICE '   - Добавлен столбец construction_site_id в employee_counterparty_mapping';
    RAISE NOTICE '   - Обновлен уникальный индекс для employee_counterparty_mapping';
    RAISE NOTICE '   - Добавлен столбец status в employees';
    RAISE NOTICE '   - Добавлен столбец status_active в employees';
END $$;

