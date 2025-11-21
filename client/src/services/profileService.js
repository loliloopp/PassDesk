import api from './api';

const profileService = {
  /**
   * Получить профиль текущего пользователя
   */
  getMyProfile: async () => {
    const response = await api.get('/users/profile/me');
    return response.data;
  },

  /**
   * Обновить профиль текущего пользователя
   * @param {object} data - Данные профиля (firstName, email)
   */
  updateMyProfile: async (data) => {
    const response = await api.put('/users/profile/me', data);
    return response.data;
  },

  /**
   * Сменить пароль текущего пользователя
   * @param {string} currentPassword - Текущий пароль
   * @param {string} newPassword - Новый пароль
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/users/profile/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

export default profileService;

