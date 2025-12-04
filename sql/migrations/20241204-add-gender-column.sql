-- Добавление столбца gender (пол) в таблицу employees
-- Значения: 'male' (Муж), 'female' (Жен)

ALTER TABLE employees ADD COLUMN gender VARCHAR(10);

-- Добавляем constraint для валидации значений
ALTER TABLE employees ADD CONSTRAINT check_gender_values 
  CHECK (gender IN ('male', 'female'));

-- Примечание: новое поле по умолчанию NULL для существующих записей

