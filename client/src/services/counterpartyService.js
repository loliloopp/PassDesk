import api from './api';

export const counterpartyService = {
  getAll: (params) => api.get('/counterparties', { params }),
  getById: (id) => api.get(`/counterparties/${id}`),
  create: (data) => api.post('/counterparties', data),
  update: (id, data) => api.put(`/counterparties/${id}`, data),
  delete: (id) => api.delete(`/counterparties/${id}`),
  getStats: () => api.get('/counterparties/stats'),
  generateRegistrationCode: (id) => api.post(`/counterparties/${id}/generate-registration-code`),
  getConstructionSites: (counterpartyId) => api.get(`/counterparties/${counterpartyId}/construction-sites`),
  saveConstructionSites: (counterpartyId, constructionSiteIds) => api.post(`/counterparties/${counterpartyId}/construction-sites`, { constructionSiteIds }),
  getAvailable: () => api.get('/counterparties/available') // Список доступных контрагентов для текущего пользователя
};

