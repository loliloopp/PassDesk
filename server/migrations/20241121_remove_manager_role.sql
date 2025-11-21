-- Миграция: Удаление роли 'manager' из таблицы users
-- Дата: 2024-11-21
-- Описание: Удаляет роль 'manager' из ENUM типа поля role в таблице users

-- 1. Проверяем, есть ли пользователи с ролью 'manager' (для информации)
DO $$
DECLARE
    manager_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO manager_count FROM users WHERE role = 'manager';
    RAISE NOTICE 'Количество пользователей с ролью manager: %', manager_count;
    
    -- Если есть пользователи с ролью 'manager', меняем их на 'user'
    IF manager_count > 0 THEN
        UPDATE users SET role = 'user' WHERE role = 'manager';
        RAISE NOTICE 'Изменено % пользователей с роли manager на user', manager_count;
    END IF;
END $$;

-- 2. Изменяем ENUM тип, удаляя значение 'manager'
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20);
ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;

-- 3. Создаём новый ENUM тип без 'manager'
DROP TYPE IF EXISTS user_role_new CASCADE;
CREATE TYPE user_role_new AS ENUM ('admin', 'user');

-- 4. Изменяем тип столбца role на новый ENUM
ALTER TABLE users 
    ALTER COLUMN role TYPE user_role_new 
    USING role::text::user_role_new;

-- 5. Удаляем старый тип и переименовываем новый
DROP TYPE IF EXISTS user_role CASCADE;
ALTER TYPE user_role_new RENAME TO user_role;

-- Готово!
RAISE NOTICE 'Роль manager успешно удалена из таблицы users';

