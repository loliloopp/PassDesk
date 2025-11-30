import api from './api';
import { deduplicateRequest } from '../utils/requestCache';

export const constructionSiteService = {
  getAll: (params) => {
    const key = `construction-sites:getAll:${JSON.stringify(params || {})}`;
    return deduplicateRequest(key, () => api.get('/construction-sites', { params }));
  },
  getById: (id) => {
    const key = `construction-sites:getById:${id}`;
    return deduplicateRequest(key, () => api.get(`/construction-sites/${id}`));
  },
  create: (data) => api.post('/construction-sites', data),
  update: (id, data) => api.put(`/construction-sites/${id}`, data),
  delete: (id) => api.delete(`/construction-sites/${id}`),
  getCounterpartyObjects: (counterpartyId) => {
    const key = `counterparties:getObjects:${counterpartyId}`;
    return deduplicateRequest(key, () => api.get(`/counterparties/${counterpartyId}/construction-sites`));
  }
};

