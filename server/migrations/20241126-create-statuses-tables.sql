-- Создание таблицы справочника статусов
CREATE TABLE statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    "group" VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Комментарии для таблицы statuses
COMMENT ON TABLE statuses IS 'Справочник всех статусов для сотрудников';
COMMENT ON COLUMN statuses.name IS 'Имя статуса в формате группа_значение (например: status_new, status_card_draft)';
COMMENT ON COLUMN statuses."group" IS 'Группа статуса: status, status_card, status_active, status_secure';

-- Создание таблицы маппинга сотрудников и статусов
CREATE TABLE employees_statuses_mapping (
    id SERIAL PRIMARY KEY,
    employee_id UUID NOT NULL,
    status_id INTEGER NOT NULL,
    status_group VARCHAR(50) NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT false,
    
    CONSTRAINT employees_statuses_mapping_employee_fkey 
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT employees_statuses_mapping_status_fkey 
        FOREIGN KEY (status_id) REFERENCES statuses(id),
    CONSTRAINT employees_statuses_mapping_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT employees_statuses_mapping_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Комментарии для таблицы employees_statuses_mapping
COMMENT ON TABLE employees_statuses_mapping IS 'Маппинг между сотрудниками и их статусами по группам';
COMMENT ON COLUMN employees_statuses_mapping.status_group IS 'Группа статуса для быстрого поиска и индексирования';
COMMENT ON COLUMN employees_statuses_mapping.is_active IS 'Только один активный статус для каждой группы сотрудника';

-- Уникальный индекс для гарантии только одного активного статуса в группе для каждого сотрудника
CREATE UNIQUE INDEX employees_statuses_mapping_active_unique
    ON employees_statuses_mapping(employee_id, status_group)
    WHERE is_active = true;

-- Индексы для оптимизации поиска
CREATE INDEX employees_statuses_mapping_employee_id_idx 
    ON employees_statuses_mapping(employee_id);
CREATE INDEX employees_statuses_mapping_status_id_idx 
    ON employees_statuses_mapping(status_id);
CREATE INDEX employees_statuses_mapping_status_group_idx 
    ON employees_statuses_mapping(status_group);

