import api from '@/services/api';

/**
 * API для работы с сотрудниками
 */
export const employeeApi = {
  // Получить всех сотрудников
  // @param {object} params - параметры запроса (page, limit, search, activeOnly, dateFrom, dateTo)
  getAll: async (params = {}) => {
    // Преобразуем activeOnly в строку если это boolean
    const queryParams = {
      ...params,
      activeOnly: params.activeOnly !== undefined ? String(params.activeOnly) : 'false'
    };
    const response = await api.get('/employees', { params: queryParams });
    return response.data;
  },

  // Получить сотрудника по ID
  getById: async (id) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  // Создать сотрудника
  create: async (employeeData) => {
    const response = await api.post('/employees', employeeData);
    return response.data;
  },

  // Обновить сотрудника (полное сохранение со строгой валидацией)
  update: async (id, employeeData) => {
    const response = await api.put(`/employees/${id}`, employeeData);
    return response.data;
  },

  // Обновить черновик сотрудника (мягкая валидация)
  updateDraft: async (id, employeeData) => {
    const response = await api.put(`/employees/${id}/draft`, employeeData);
    return response.data;
  },

  // Удалить сотрудника
  delete: async (id) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },

  // Поиск сотрудников
  search: async (query) => {
    const response = await api.get('/employees/search', { params: { query } });
    return response.data;
  },

  // Загрузить файлы для сотрудника
  uploadFiles: async (employeeId, formData) => {
    const response = await api.post(`/employees/${employeeId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Получить файлы сотрудника
  getFiles: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/files`);
    return response.data;
  },

  // Удалить файл сотрудника
  deleteFile: async (employeeId, fileId) => {
    const response = await api.delete(`/employees/${employeeId}/files/${fileId}`);
    return response.data;
  },

  // Получить ссылку для скачивания файла
  getFileDownloadLink: async (employeeId, fileId) => {
    const response = await api.get(`/employees/${employeeId}/files/${fileId}/download`);
    return response.data;
  },

  // Получить ссылку для просмотра файла
  getFileViewLink: async (employeeId, fileId) => {
    const response = await api.get(`/employees/${employeeId}/files/${fileId}/view`);
    return response.data;
  },

  // Обновить объекты строительства для сотрудника
  updateConstructionSites: async (employeeId, siteIds) => {
    const response = await api.put(`/employees/${employeeId}/construction-sites`, { siteIds });
    return response.data;
  },

  // Обновить флаг is_upload для одного статуса сотрудника
  updateStatusUploadFlag: async (employeeId, statusMappingId, isUpload) => {
    const response = await api.put(`/employees/${employeeId}/status/${statusMappingId}/upload`, { isUpload });
    return response.data;
  },

  // Обновить флаг is_upload для всех активных статусов сотрудника
  updateAllStatusesUploadFlag: async (employeeId, isUpload) => {
    const response = await api.put(`/employees/${employeeId}/statuses/upload`, { isUpload });
    return response.data;
  },
};

