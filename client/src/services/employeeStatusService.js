import api from './api'

export const employeeStatusService = {
  // Получить все статусы
  getAllStatuses: async () => {
    const response = await api.get('/employees/statuses/all')
    return response.data
  },

  // Получить статусы по группе
  getStatusesByGroup: async (group) => {
    const response = await api.get(`/employees/statuses/group/${group}`)
    return response.data
  },

  // Получить текущий статус сотрудника по группе
  getCurrentStatus: async (employeeId, group) => {
    const response = await api.get(`/employees/${employeeId}/status/group/${group}`)
    return response.data
  },

  // Получить все текущие статусы сотрудника
  getAllCurrentStatuses: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/statuses`)
    return response.data
  },

  // Получить сотрудника со всеми его статусами
  getEmployeeWithStatuses: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/with-statuses`)
    return response.data
  },

  // Получить список сотрудников со статусами
  getEmployeesWithStatuses: async (params = {}) => {
    const response = await api.get('/employees/with-statuses', { params })
    return response.data
  },

  // Установить новый статус для сотрудника
  setStatus: async (employeeId, statusId) => {
    const response = await api.post(`/employees/${employeeId}/status`, { statusId })
    return response.data
  },

  // Получить статусы для нескольких сотрудников одним запросом (batch)
  // Автоматически разбивает на порции по 500 ID для избежания ошибок
  getStatusesBatch: async (employeeIds) => {
    const CHUNK_SIZE = 500;
    
    // Если ID мало - один запрос
    if (employeeIds.length <= CHUNK_SIZE) {
      const response = await api.post('/employees/statuses/batch', { employeeIds });
      return response.data;
    }
    
    // Разбиваем на порции и загружаем параллельно
    const chunks = [];
    for (let i = 0; i < employeeIds.length; i += CHUNK_SIZE) {
      chunks.push(employeeIds.slice(i, i + CHUNK_SIZE));
    }
    
    const results = await Promise.all(
      chunks.map(chunk => 
        api.post('/employees/statuses/batch', { employeeIds: chunk })
          .then(res => res.data)
          .catch(err => {
            console.warn('Batch status load error:', err);
            return {}; // Возвращаем пустой объект при ошибке
          })
      )
    );
    
    // Объединяем результаты
    return results.reduce((acc, result) => ({ ...acc, ...result }), {});
  },

  // Уволить сотрудника
  fireEmployee: async (employeeId) => {
    const response = await api.post(`/employees/${employeeId}/action/fire`)
    return response.data
  },

  // Принять уволенного сотрудника
  reinstateEmployee: async (employeeId) => {
    const response = await api.post(`/employees/${employeeId}/action/reinstate`)
    return response.data
  },

  // Деактивировать сотрудника (установить статус inactive)
  deactivateEmployee: async (employeeId) => {
    const response = await api.post(`/employees/${employeeId}/action/deactivate`)
    return response.data
  },

  // Активировать сотрудника (установить статус employed)
  activateEmployee: async (employeeId) => {
    const response = await api.post(`/employees/${employeeId}/action/activate`)
    return response.data
  }
}

