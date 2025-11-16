-- Добавление внешнего ключа employee_id в таблицу files
-- Дата: 16.11.2025
-- Описание: Создание явной связи между файлами и сотрудниками

-- Проверяем текущую структуру
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'files'
  AND column_name IN ('entity_id', 'entity_type', 'employee_id');

-- Добавляем новый столбец employee_id (UUID)
ALTER TABLE files
ADD COLUMN IF NOT EXISTS employee_id UUID;

-- Заполняем employee_id для существующих записей типа 'employee'
UPDATE files
SET employee_id = entity_id
WHERE entity_type = 'employee' AND employee_id IS NULL;

-- Добавляем внешний ключ
ALTER TABLE files
ADD CONSTRAINT fk_files_employee
FOREIGN KEY (employee_id) 
REFERENCES employees(id) 
ON DELETE CASCADE;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_files_employee_id ON files(employee_id);

-- Проверяем результат
SELECT 
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'files'
  AND constraint_name = 'fk_files_employee';

-- Проверяем данные
SELECT 
  COUNT(*) as total_files,
  COUNT(employee_id) as files_with_employee,
  COUNT(*) FILTER (WHERE entity_type = 'employee') as employee_type_files
FROM files;

