-- Добавление типа заявки и связи заявок с файлами сотрудников
-- Дата: 16.11.2025
-- Описание: Добавляем поле application_type (биометрия/заказчик) и таблицу связи заявок с файлами

-- 1. Добавляем тип заявки в таблицу applications
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS application_type VARCHAR(20);

-- 2. Устанавливаем значение по умолчанию для существующих заявок
UPDATE applications
SET application_type = 'biometric'
WHERE application_type IS NULL;

-- 3. Делаем поле обязательным
ALTER TABLE applications
ALTER COLUMN application_type SET NOT NULL;

-- 4. Добавляем CHECK constraint для типа заявки (если ещё не существует)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'applications_type_check' 
    AND table_name = 'applications'
  ) THEN
    ALTER TABLE applications
    ADD CONSTRAINT applications_type_check 
    CHECK (application_type IN ('biometric', 'customer'));
  END IF;
END $$;

-- 5. Создаем индекс для типа заявки
CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(application_type);

-- 6. Создаем таблицу связи заявок с файлами сотрудников
CREATE TABLE IF NOT EXISTS application_files_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальность: одна заявка не может включать один и тот же файл дважды
  CONSTRAINT unique_application_file UNIQUE (application_id, file_id)
);

-- 7. Создаем индексы для таблицы маппинга
CREATE INDEX IF NOT EXISTS idx_application_files_application 
ON application_files_mapping(application_id);

CREATE INDEX IF NOT EXISTS idx_application_files_employee 
ON application_files_mapping(employee_id);

CREATE INDEX IF NOT EXISTS idx_application_files_file 
ON application_files_mapping(file_id);

-- 8. Проверяем структуру таблицы applications
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'applications'
  AND column_name IN ('application_type');

-- 9. Проверяем созданную таблицу маппинга
SELECT 
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'application_files_mapping'
ORDER BY constraint_type, constraint_name;

-- 10. Проверяем данные
SELECT 
  COUNT(*) as total_applications,
  COUNT(*) FILTER (WHERE application_type = 'biometric') as biometric_count,
  COUNT(*) FILTER (WHERE application_type = 'customer') as customer_count
FROM applications;

