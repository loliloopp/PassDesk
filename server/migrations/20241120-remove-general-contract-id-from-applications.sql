-- Миграция: Удаление колонки general_contract_id из таблицы applications
-- Дата: 2024-11-20
-- Описание: Колонка general_contract_id больше не используется при создании заявок

-- Удаляем колонку general_contract_id
ALTER TABLE applications DROP COLUMN IF EXISTS general_contract_id;

-- Проверяем результат
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'applications' 
ORDER BY ordinal_position;

