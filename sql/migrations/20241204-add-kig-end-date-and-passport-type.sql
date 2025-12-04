-- Миграция: добавление полей для даты окончания КИГ и типа паспорта
-- Дата: 2024-12-04

-- Добавляем столбец для даты окончания КИГ
ALTER TABLE employees
ADD COLUMN kig_end_date DATE NULL;

-- Добавляем столбец для типа паспорта (enum: russian, foreign)
ALTER TABLE employees
ADD COLUMN passport_type VARCHAR(20) NULL;

-- Комментарии для документирования
COMMENT ON COLUMN employees.kig_end_date IS 'Дата окончания действия Карты иностранного гражданина (КИГ)';
COMMENT ON COLUMN employees.passport_type IS 'Тип паспорта: russian (Российский) или foreign (Иностранного гражданина)';

