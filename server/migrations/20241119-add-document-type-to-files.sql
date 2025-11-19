-- Миграция: Добавление поля document_type в таблицу files
-- Дата: 2024-11-19
-- Описание: Добавляет поле для хранения типа документа (Паспорт, Патент и т.д.)

-- Создаём ENUM тип для типов документов
CREATE TYPE document_type_enum AS ENUM (
  'passport',           -- Паспорт
  'patent_front',       -- Лицевая сторона патента (с фото)
  'patent_back',        -- Задняя сторона патента
  'biometric_consent',  -- Согласие на обработку биометрических данных
  'other'               -- Другое
);

-- Добавляем поле document_type в таблицу files
ALTER TABLE files
ADD COLUMN document_type document_type_enum;

-- Комментарий к полю
COMMENT ON COLUMN files.document_type IS 'Тип документа: passport (Паспорт), patent_front (Лицевая сторона патента), patent_back (Задняя сторона патента), biometric_consent (Согласие на обработку биометрических данных), other (Другое)';

-- Создаём индекс для быстрого поиска по типу документа
CREATE INDEX idx_files_document_type ON files(document_type);

