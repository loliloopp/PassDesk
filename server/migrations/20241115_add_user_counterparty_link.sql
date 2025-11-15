-- Миграция: Добавление контрагента для пользователей
-- Дата: 2024-11-15
-- Описание: Добавление поля counterparty_id в таблицу users

-- Добавляем поле counterparty_id
ALTER TABLE users
ADD COLUMN counterparty_id INTEGER;

-- Добавляем внешний ключ
ALTER TABLE users
ADD CONSTRAINT fk_users_counterparty
  FOREIGN KEY (counterparty_id)
  REFERENCES counterparties(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Создаем индекс
CREATE INDEX idx_users_counterparty ON users(counterparty_id);

-- Комментарий
COMMENT ON COLUMN users.counterparty_id IS 'Ссылка на контрагента, к которому относится пользователь. NULL для пользователей без привязки';

