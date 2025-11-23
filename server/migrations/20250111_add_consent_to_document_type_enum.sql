-- Миграция: Добавление значения 'consent' в enum document_type_enum
-- Дата: 2025-01-11
-- Описание: Добавляет поддержку типа документа 'consent' (согласие на обработку персональных данных)

-- Добавляем новое значение в существующий enum
-- Позиция BEFORE 'biometric_consent' гарантирует логический порядок согласий
ALTER TYPE document_type_enum ADD VALUE 'consent' BEFORE 'biometric_consent';

