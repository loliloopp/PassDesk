import { useSettingsReference } from '@/hooks/useReferences';

/**
 * Хук для работы с настройками
 * Использует глобальный кэш для оптимизации запросов
 */
export const useSettings = () => {
  // Используем кэшированную версию из глобального store
  return useSettingsReference();
};

