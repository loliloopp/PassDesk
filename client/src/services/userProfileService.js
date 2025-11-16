import api from './api';

const userProfileService = {
  /**
   * Получить профиль сотрудника текущего пользователя
   */
  getMyProfile: async () => {
    const response = await api.get('/employees/my-profile');
    return response.data;
  },

  /**
   * Обновить профиль сотрудника текущего пользователя
   * @param {object} data - Данные профиля для обновления
   */
  updateMyProfile: async (data) => {
    const response = await api.put('/employees/my-profile', data);
    return response.data;
  },

  /**
   * Загрузить файлы для профиля
   * @param {string} employeeId - ID сотрудника
   * @param {File[]} files - Массив файлов для загрузки
   */
  uploadFiles: async (employeeId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    console.log('📤 Uploading files:', {
      employeeId,
      filesCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0)
    });

    const response = await api.post(`/employees/${employeeId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 90000 // 90 секунд для загрузки
    });
    
    console.log('✅ Upload response:', response.data);
    return response.data;
  },

  /**
   * Получить список файлов сотрудника
   * @param {string} employeeId - ID сотрудника
   */
  getFiles: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/files`);
    return response.data;
  },

  /**
   * Удалить файл
   * @param {string} employeeId - ID сотрудника
   * @param {string} fileId - ID файла
   */
  deleteFile: async (employeeId, fileId) => {
    const response = await api.delete(`/employees/${employeeId}/files/${fileId}`);
    return response.data;
  },

  /**
   * Получить ссылку для просмотра файла
   * @param {string} employeeId - ID сотрудника
   * @param {string} fileId - ID файла
   */
  getFileViewLink: async (employeeId, fileId) => {
    const response = await api.get(`/employees/${employeeId}/files/${fileId}/view`);
    return response.data;
  }
};

export default userProfileService;

