-- Удаление старых столбцов со статусами из таблицы employees
ALTER TABLE employees
    DROP COLUMN status,
    DROP COLUMN status_card,
    DROP COLUMN status_active,
    DROP COLUMN status_secure;

