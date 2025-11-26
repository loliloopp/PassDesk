import { useState, useEffect } from 'react';

const STORAGE_KEY = 'employee_table_filters';

/**
 * Хук для сохранения и восстановления фильтров таблицы сотрудников
 * Хранит только фильтры столбцов, где они есть
 */
export const useTableFilters = () => {
  const [filters, setFilters] = useState({});

  // Восстановление фильтров при загрузке компонента
  useEffect(() => {
    const savedFilters = localStorage.getItem(STORAGE_KEY);
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch (error) {
        console.warn('Ошибка при загрузке фильтров таблицы:', error);
      }
    }
  }, []);

  // Сохранение фильтров при изменении
  const handleFiltersChange = (newFilters) => {
    // Фильтруем фильтры: оставляем только те, у которых есть значения
    const filteredFilters = {};
    Object.keys(newFilters).forEach((key) => {
      if (newFilters[key] && newFilters[key].length > 0) {
        filteredFilters[key] = newFilters[key];
      }
    });

    setFilters(filteredFilters);
    
    // Сохраняем в localStorage
    if (Object.keys(filteredFilters).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredFilters));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Очистка фильтров
  const clearFilters = () => {
    setFilters({});
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    filters,
    onFiltersChange: handleFiltersChange,
    clearFilters,
  };
};

