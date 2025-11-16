-- Удаление всех файлов, помеченных как удаленные
-- Дата: 16.11.2025
-- Описание: Очистка таблицы files от записей с isDeleted = true

-- Показываем количество записей для удаления
SELECT COUNT(*) as deleted_files_count 
FROM files 
WHERE is_deleted = true;

-- Удаляем все записи с is_deleted = true
DELETE FROM files 
WHERE is_deleted = true;

-- Проверяем результат
SELECT 
  COUNT(*) as total_files,
  COUNT(*) FILTER (WHERE is_deleted = false) as active_files,
  COUNT(*) FILTER (WHERE is_deleted = true) as deleted_files
FROM files;

