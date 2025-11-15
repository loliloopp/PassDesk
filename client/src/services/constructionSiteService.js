import api from './api';

export const constructionSiteService = {
  getAll: (params) => api.get('/construction-sites', { params }),
  getById: (id) => api.get(`/construction-sites/${id}`),
  create: (data) => api.post('/construction-sites', data),
  update: (id, data) => api.put(`/construction-sites/${id}`, data),
  delete: (id) => api.delete(`/construction-sites/${id}`)
};

