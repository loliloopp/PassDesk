import { useDepartmentsReference } from '@/hooks/useReferences';

/**
 * Хук для работы с подразделениями
 * Использует глобальный кэш для оптимизации запросов
 */
export const useDepartments = () => {
  // Используем кэшированную версию из глобального store
  return useDepartmentsReference();
};

