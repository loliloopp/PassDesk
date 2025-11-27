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
    // Удаляем старые поля статусов, если они переданы
    const { status, statusCard, statusActive, statusSecure, ...cleanData } = employeeData
    const response = await api.post('/employees', cleanData)
    return response.data
  },

  // Обновить сотрудника
  update: async (id, employeeData) => {
    // Удаляем старые поля статусов, если они переданы
    const { status, statusCard, statusActive, statusSecure, ...cleanData } = employeeData
    const response = await api.put(`/employees/${id}`, cleanData)
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
  },

  // Загрузить файлы для сотрудника
  uploadFiles: async (employeeId, formData) => {
    const response = await api.post(`/employees/${employeeId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // Получить файлы сотрудника
  getFiles: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/files`)
    return response.data
  },

  // Удалить файл сотрудника
  deleteFile: async (employeeId, fileId) => {
    const response = await api.delete(`/employees/${employeeId}/files/${fileId}`)
    return response.data
  },

  // Получить ссылку для скачивания файла
  getFileDownloadLink: async (employeeId, fileId) => {
    const response = await api.get(`/employees/${employeeId}/files/${fileId}/download`)
    return response.data
  },

  // Получить ссылку для просмотра файла
  getFileViewLink: async (employeeId, fileId) => {
    const response = await api.get(`/employees/${employeeId}/files/${fileId}/view`)
    return response.data
  },

  // Обновить объекты строительства для сотрудника
  updateConstructionSites: async (employeeId, siteIds) => {
    const response = await api.put(`/employees/${employeeId}/construction-sites`, { siteIds })
    return response.data
  },

  // Обновить подразделение сотрудника
  updateDepartment: async (employeeId, departmentId) => {
    const response = await api.put(`/employees/${employeeId}/department`, { departmentId })
    return response.data
  }
}


