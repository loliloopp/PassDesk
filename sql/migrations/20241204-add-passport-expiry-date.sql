-- Миграция: добавление поля даты окончания иностранного паспорта
-- Дата: 2024-12-04

-- Добавляем столбец для даты окончания иностранного паспорта
ALTER TABLE employees
ADD COLUMN passport_expiry_date DATE NULL;

-- Комментарий для документирования
COMMENT ON COLUMN employees.passport_expiry_date IS 'Дата окончания действия иностранного паспорта';

