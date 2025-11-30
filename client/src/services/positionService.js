import api from './api';
import { deduplicateRequest } from '../utils/requestCache';

const positionService = {
  // Получить все должности
  getAll: (params = {}) => {
    const key = `positions:getAll:${JSON.stringify(params)}`;
    return deduplicateRequest(key, () => api.get('/positions', { params }));
  },

  // Получить должность по ID
  getById: (id) => {
    const key = `positions:getById:${id}`;
    return deduplicateRequest(key, () => api.get(`/positions/${id}`));
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

