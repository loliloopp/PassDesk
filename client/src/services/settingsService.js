import api from './api';

const settingsService = {
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

