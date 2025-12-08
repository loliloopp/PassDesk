import { create } from 'zustand';

/**
 * Store для кэширования списка сотрудников
 * Предотвращает повторную загрузку при возврате на страницу
 */

const CACHE_TTL = 2 * 60 * 1000; // 2 минуты для списка сотрудников

export const useEmployeesStore = create((set, get) => ({
  // Кэш сотрудников
  employees: null,
  totalCount: 0,
  lastFetch: null,
  filterParams: null, // Параметры фильтрации для проверки соответствия кэша
  
  // Установить данные сотрудников в кэш
  setEmployees: (employees, totalCount, filterParams = {}) => {
    set({
      employees,
      totalCount,
      lastFetch: Date.now(),
      filterParams,
    });
  },

  // Получить сотрудников из кэша (если он актуален)
  getEmployees: (filterParams = {}) => {
    const state = get();
    const now = Date.now();

    // Проверяем, актуален ли кэш
    if (!state.employees || !state.lastFetch) {
      return null;
    }

    // Проверяем TTL
    if (now - state.lastFetch > CACHE_TTL) {
      return null;
    }

    // Проверяем, совпадают ли параметры фильтрации
    const paramsMatch = JSON.stringify(state.filterParams) === JSON.stringify(filterParams);
    if (!paramsMatch) {
      return null;
    }

    return {
      employees: state.employees,
      totalCount: state.totalCount,
    };
  },

  // Сбросить кэш (при мутациях: создание, обновление, удаление)
  invalidate: () => {
    set({
      employees: null,
      totalCount: 0,
      lastFetch: null,
      filterParams: null,
    });
  },

  // Очистить кэш (при logout)
  clear: () => {
    set({
      employees: null,
      totalCount: 0,
      lastFetch: null,
      filterParams: null,
    });
  },
}));

