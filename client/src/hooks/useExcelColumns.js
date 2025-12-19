import { useState, useEffect } from 'react';

// Все доступные столбцы для экспорта (в стандартном порядке)
const DEFAULT_COLUMNS = [
  { key: 'number', label: '№ п/п' },
  { key: 'fullName', label: 'ФИО' },
  { key: 'kig', label: 'КИГ' },
  { key: 'citizenship', label: 'Гражданство' },
  { key: 'birthDate', label: 'Дата рождения' },
  { key: 'snils', label: 'СНИЛС' },
  { key: 'position', label: 'Должность' },
  { key: 'inn', label: 'ИНН сотрудника' },
  { key: 'passport', label: 'Паспорт' },
  { key: 'passportDate', label: 'Дата выдачи паспорта' },
  { key: 'passportIssuer', label: 'Орган выдачи паспорта' },
  { key: 'registrationAddress', label: 'Адрес регистрации' },
  { key: 'phone', label: 'Телефон' },
  { key: 'counterparty', label: 'Контрагент' },
];

export const AVAILABLE_COLUMNS = DEFAULT_COLUMNS;

const STORAGE_KEY = 'passdesk_excel_columns_selection';

// Получить дефолтное состояние (все столбцы активны в стандартном порядке)
const getDefaultSelection = () => {
  return DEFAULT_COLUMNS.map((col, index) => ({
    key: col.key,
    label: col.label,
    enabled: true,
    order: index,
  }));
};

/**
 * Хук для управления выбором и порядком столбцов экспорта
 * Сохраняет выбор в localStorage
 */
export const useExcelColumns = () => {
  const [columns, setColumns] = useState(getDefaultSelection());
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем состояние из localStorage при инициализации
  useEffect(() => {
    try {
      const savedSelection = localStorage.getItem(STORAGE_KEY);
      if (savedSelection) {
        const parsed = JSON.parse(savedSelection);
        // Проверяем что это массив и есть все нужные поля
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading Excel columns selection:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Сохраняем состояние в localStorage при изменении
  const updateColumns = (newColumns) => {
    setColumns(newColumns);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newColumns));
    } catch (error) {
      console.error('Error saving Excel columns selection:', error);
    }
  };

  // Включить/отключить столбец
  const toggleColumn = (columnKey) => {
    const updated = columns.map(col => 
      col.key === columnKey ? { ...col, enabled: !col.enabled } : col
    );
    updateColumns(updated);
  };

  // Переместить столбец вверх
  const moveColumnUp = (columnKey) => {
    const currentIndex = columns.findIndex(col => col.key === columnKey);
    if (currentIndex <= 0) return;

    const updated = [...columns];
    [updated[currentIndex], updated[currentIndex - 1]] = [updated[currentIndex - 1], updated[currentIndex]];
    
    // Обновляем значения order для корректности
    updated.forEach((col, index) => {
      col.order = index;
    });
    
    updateColumns(updated);
  };

  // Переместить столбец вниз
  const moveColumnDown = (columnKey) => {
    const currentIndex = columns.findIndex(col => col.key === columnKey);
    if (currentIndex >= columns.length - 1) return;

    const updated = [...columns];
    [updated[currentIndex], updated[currentIndex + 1]] = [updated[currentIndex + 1], updated[currentIndex]];
    
    // Обновляем значения order для корректности
    updated.forEach((col, index) => {
      col.order = index;
    });
    
    updateColumns(updated);
  };

  // Включить все
  const selectAll = () => {
    const allSelected = columns.map(col => ({
      ...col,
      enabled: true,
    }));
    updateColumns(allSelected);
  };

  // Отключить все
  const deselectAll = () => {
    const allDeselected = columns.map(col => ({
      ...col,
      enabled: false,
    }));
    updateColumns(allDeselected);
  };

  // Получить список активных столбцов в порядке
  const getActiveColumns = () => {
    return columns.filter(col => col.enabled);
  };

  // Сбросить в дефолтное состояние
  const resetToDefault = () => {
    const defaultColumns = getDefaultSelection();
    updateColumns(defaultColumns);
  };

  return {
    columns,
    isLoading,
    updateColumns,
    toggleColumn,
    moveColumnUp,
    moveColumnDown,
    selectAll,
    deselectAll,
    resetToDefault,
    getActiveColumns,
  };
};

