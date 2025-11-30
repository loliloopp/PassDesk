import api from './api';
import { deduplicateRequest } from '../utils/requestCache';

const settingsService = {
  /**
   * Получить публичные настройки (доступно всем авторизованным пользователям)
   */
  getPublicSettings: async () => {
    const key = 'settings:public';
    return deduplicateRequest(key, async () => {
      const response = await api.get('/settings/public');
      return response.data;
    });
  },

  /**
   * Получить все настройки (только для администратора)
   */
  getSettings: async () => {
    const key = 'settings:all';
    return deduplicateRequest(key, async () => {
      const response = await api.get('/settings');
      return response.data;
    });
  },

  /**
   * Обновить настройку по ключу
   * @param {string} key - Ключ настройки
   * @param {string} value - Значение настройки
   */
  updateSetting: async (key, value) => {
    const response = await api.put(`/settings/${key}`, { value });
    return response.data;
  }
};

export default settingsService;

