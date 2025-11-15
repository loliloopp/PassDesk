import api from './api'

export const employeeService = {
  // Получить всех сотрудников
  getAll: async (params = {}) => {
    const response = await api.get('/employees', { params })
    return response.data
  },

  // Получить сотрудника по ID
  getById: async (id) => {
    const response = await api.get(`/employees/${id}`)
    return response.data
  },

  // Создать сотрудника
  create: async (employeeData) => {
    const response = await api.post('/employees', employeeData)
    return response.data
  },

  // Обновить сотрудника
  update: async (id, employeeData) => {
    const response = await api.put(`/employees/${id}`, employeeData)
    return response.data
  },

  // Удалить сотрудника
  delete: async (id) => {
    const response = await api.delete(`/employees/${id}`)
    return response.data
  },

  // Поиск сотрудников
  search: async (query) => {
    const response = await api.get('/employees/search', { params: { query } })
    return response.data
  }
}

