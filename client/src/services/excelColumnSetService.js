import api from './api';

const excelColumnSetService = {
  // Получить все наборы столбцов для текущего контрагента
  getAll: () => api.get('/excel-column-sets'),

  // Получить набор по ID
  getById: (id) => api.get(`/excel-column-sets/${id}`),

  // Создать новый набор
  create: (data) => api.post('/excel-column-sets', data),

  // Обновить набор
  update: (id, data) => api.put(`/excel-column-sets/${id}`, data),

  // Удалить набор
  delete: (id) => api.delete(`/excel-column-sets/${id}`),

  // Установить набор как набор по умолчанию
  setDefault: (id) => api.patch(`/excel-column-sets/${id}/set-default`),
};

export default excelColumnSetService;

