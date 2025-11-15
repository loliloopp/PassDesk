import api from './api';

const applicationService = {
  // Получить все заявки
  getAll: (params) => api.get('/applications', { params }),

  // Получить заявку по ID
  getById: (id) => api.get(`/applications/${id}`),

  // Создать заявку
  create: (data) => api.post('/applications', data),

  // Обновить заявку
  update: (id, data) => api.put(`/applications/${id}`, data),

  // Удалить заявку
  delete: (id) => api.delete(`/applications/${id}`),

  // Копировать заявку
  copy: (id) => api.post(`/applications/${id}/copy`),

  // Получить договоры для контрагента и объекта
  getContracts: (counterpartyId, constructionSiteId) => 
    api.get('/applications/helpers/contracts', {
      params: { counterpartyId, constructionSiteId }
    }),

  // Получить сотрудников контрагента
  getEmployees: (counterpartyId) => 
    api.get('/applications/helpers/employees', {
      params: { counterpartyId }
    })
};

export { applicationService };

