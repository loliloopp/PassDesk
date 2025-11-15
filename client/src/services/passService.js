import api from './api'

export const passService = {
  // Получить все пропуска
  getAll: async (params = {}) => {
    const response = await api.get('/passes', { params })
    return response.data
  },

  // Получить пропуск по ID
  getById: async (id) => {
    const response = await api.get(`/passes/${id}`)
    return response.data
  },

  // Получить пропуска сотрудника
  getByEmployee: async (employeeId) => {
    const response = await api.get(`/passes/employee/${employeeId}`)
    return response.data
  },

  // Создать пропуск
  create: async (passData) => {
    const response = await api.post('/passes', passData)
    return response.data
  },

  // Обновить пропуск
  update: async (id, passData) => {
    const response = await api.put(`/passes/${id}`, passData)
    return response.data
  },

  // Удалить пропуск
  delete: async (id) => {
    const response = await api.delete(`/passes/${id}`)
    return response.data
  },

  // Отозвать пропуск
  revoke: async (id) => {
    const response = await api.patch(`/passes/${id}/revoke`)
    return response.data
  }
}

