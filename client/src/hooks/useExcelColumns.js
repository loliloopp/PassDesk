import { useState, useEffect } from 'react';

// Все доступные столбцы для экспорта
export const AVAILABLE_COLUMNS = [
  { key: 'number', label: '№ п/п' },
  { key: 'lastName', label: 'Фамилия' },
  { key: 'firstName', label: 'Имя' },
  { key: 'middleName', label: 'Отчество' },
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
  { key: 'department', label: 'Подразделение' },
  { key: 'counterparty', label: 'Контрагент' },
];

const STORAGE_KEY = 'passdesk_excel_columns_selection';

// Получить дефолтное состояние (все столбцы активны)
const getDefaultSelection = () => {
  const selection = {};
  AVAILABLE_COLUMNS.forEach(col => {
    selection[col.key] = true;
  });
  return selection;
};

/**
 * Хук для управления выбором столбцов экспорта
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
        setColumns(parsed);
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

  // Обновить один столбец
  const toggleColumn = (columnKey) => {
    const updated = {
      ...columns,
      [columnKey]: !columns[columnKey]
    };
    updateColumns(updated);
  };

  // Включить все
  const selectAll = () => {
    const allSelected = getDefaultSelection();
    updateColumns(allSelected);
  };

  // Отключить все
  const deselectAll = () => {
    const allDeselected = {};
    AVAILABLE_COLUMNS.forEach(col => {
      allDeselected[col.key] = false;
    });
    updateColumns(allDeselected);
  };

  // Получить список активных столбцов
  const getActiveColumns = () => {
    return AVAILABLE_COLUMNS.filter(col => columns[col.key]);
  };

  return {
    columns,
    isLoading,
    updateColumns,
    toggleColumn,
    selectAll,
    deselectAll,
    getActiveColumns,
  };
};

