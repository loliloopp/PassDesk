import api from './api';

const citizenshipService = {
  // Получить все гражданства
  getAll: (params) => api.get('/citizenships', { params }),

  // Создать новое гражданство
  create: (data) => api.post('/citizenships', data),
};

export { citizenshipService };

