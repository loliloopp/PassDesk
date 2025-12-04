import api from './api';
import { deduplicateRequest } from '../utils/requestCache';

const citizenshipService = {
  // Получить все гражданства
  getAll: (params) => {
    const key = `citizenships:getAll:${JSON.stringify(params || {})}`;
    return deduplicateRequest(key, () => api.get('/citizenships', { params }));
  },

  // Создать новое гражданство
  create: (data) => api.post('/citizenships', data),

  // Удалить гражданство
  delete: (id) => api.delete(`/citizenships/${id}`),
};

export { citizenshipService };

