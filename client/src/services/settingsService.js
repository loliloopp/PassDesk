import api from './api';

const settingsService = {
  /**
   * Получить публичные настройки (доступно всем авторизованным пользователям)
   */
  getPublicSettings: async () => {
    const response = await api.get('/settings/public');
    return response.data;
  },

  /**
   * Получить все настройки (только для администратора)
   */
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
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

