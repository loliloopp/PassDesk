import api from './api';

const positionService = {
  // Получить все должности
  getAll: (params = {}) => {
    return api.get('/positions', { params });
  },

  // Получить должность по ID
  getById: (id) => {
    return api.get(`/positions/${id}`);
  },

  // Создать должность
  create: (data) => {
    return api.post('/positions', data);
  },

  // Обновить должность
  update: (id, data) => {
    return api.put(`/positions/${id}`, data);
  },

  // Удалить должность
  delete: (id) => {
    return api.delete(`/positions/${id}`);
  },

  // Импорт должностей из массива названий
  import: (positions) => {
    return api.post('/positions/import', { positions });
  }
};

export default positionService;

