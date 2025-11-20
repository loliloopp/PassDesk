-- Миграция: Добавление значения 'application_scan' в ENUM тип document_type_enum
-- Дата: 2024-11-20
-- Описание: Добавляем новое значение 'application_scan' в document_type_enum для поддержки сканов заявок

-- Добавляем значение 'application_scan' в document_type_enum
ALTER TYPE document_type_enum ADD VALUE IF NOT EXISTS 'application_scan';

-- Обновляем комментарий к полю entity_type
COMMENT ON COLUMN files.entity_type IS 'Тип связанной сущности: employee, pass, application, other';

-- Обновляем комментарий к полю document_type
COMMENT ON COLUMN files.document_type IS 'Тип документа: passport (Паспорт), patent_front (Лицевая сторона патента), patent_back (Задняя сторона патента), biometric_consent (Согласие на обработку биометрических данных), application_scan (Скан заявки), other (Другое)';

