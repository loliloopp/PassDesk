-- Миграция: Добавление подразделений и маппинга сотрудник-контрагент-подразделение
-- Дата: 2024-11-18
-- Описание:
-- 1. Создание таблицы departments (подразделения)
-- 2. Создание таблицы employee_counterparty_mapping (связь сотрудник-контрагент-подразделение)
-- 3. Перенос данных из employees.counterparty_id в маппинг
-- 4. Удаление столбца counterparty_id из employees

-- Создаем таблицу подразделений
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  counterparty_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Связь с контрагентом
  CONSTRAINT fk_department_counterparty
    FOREIGN KEY (counterparty_id)
    REFERENCES counterparties (id)
    ON DELETE CASCADE,
  
  -- Уникальность названия подразделения в рамках контрагента
  CONSTRAINT unique_department_name_per_counterparty UNIQUE (name, counterparty_id)
);

-- Комментарии для таблицы departments
COMMENT ON TABLE departments IS 'Подразделения контрагентов';
COMMENT ON COLUMN departments.id IS 'Уникальный идентификатор подразделения';
COMMENT ON COLUMN departments.name IS 'Название подразделения';
COMMENT ON COLUMN departments.counterparty_id IS 'ID контрагента, к которому относится подразделение';

-- Индексы для departments
CREATE INDEX idx_departments_counterparty_id ON departments (counterparty_id);

-- Создаем таблицу маппинга сотрудник-контрагент-подразделение
CREATE TABLE employee_counterparty_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  counterparty_id UUID NOT NULL,
  department_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Связи
  CONSTRAINT fk_mapping_employee
    FOREIGN KEY (employee_id)
    REFERENCES employees (id)
    ON DELETE CASCADE,
  
  CONSTRAINT fk_mapping_counterparty
    FOREIGN KEY (counterparty_id)
    REFERENCES counterparties (id)
    ON DELETE CASCADE,
  
  CONSTRAINT fk_mapping_department
    FOREIGN KEY (department_id)
    REFERENCES departments (id)
    ON DELETE SET NULL,
  
  -- Уникальность связки сотрудник-контрагент
  CONSTRAINT unique_employee_counterparty UNIQUE (employee_id, counterparty_id)
);

-- Комментарии для таблицы employee_counterparty_mapping
COMMENT ON TABLE employee_counterparty_mapping IS 'Связь между сотрудниками, контрагентами и подразделениями';
COMMENT ON COLUMN employee_counterparty_mapping.employee_id IS 'ID сотрудника';
COMMENT ON COLUMN employee_counterparty_mapping.counterparty_id IS 'ID контрагента';
COMMENT ON COLUMN employee_counterparty_mapping.department_id IS 'ID подразделения (может быть NULL)';

-- Индексы для employee_counterparty_mapping
CREATE INDEX idx_emp_cp_mapping_employee_id ON employee_counterparty_mapping (employee_id);
CREATE INDEX idx_emp_cp_mapping_counterparty_id ON employee_counterparty_mapping (counterparty_id);
CREATE INDEX idx_emp_cp_mapping_department_id ON employee_counterparty_mapping (department_id);

-- Переносим существующие данные из employees.counterparty_id в маппинг
INSERT INTO employee_counterparty_mapping (employee_id, counterparty_id, department_id)
SELECT id, counterparty_id, NULL
FROM employees
WHERE counterparty_id IS NOT NULL;

-- Удаляем столбец counterparty_id из таблицы employees
ALTER TABLE employees DROP COLUMN counterparty_id;

-- Удаляем внешний ключ и индекс, если они существуют
-- (на случай, если были созданы ранее)
DO $$ 
BEGIN
  -- Попытка удалить constraint, если он существует
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employees_counterparty_id_fkey' 
    AND table_name = 'employees'
  ) THEN
    ALTER TABLE employees DROP CONSTRAINT employees_counterparty_id_fkey;
  END IF;
END $$;

