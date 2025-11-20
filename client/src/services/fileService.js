import api from './api'

export const fileService = {
  // Загрузить файл
  upload: async (file) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // Загрузить несколько файлов
  uploadMultiple: async (files) => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    const response = await api.post('/files/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // Получить URL файла по ключу
  getFileUrl: async (fileKey) => {
    const response = await api.get(`/files/${fileKey}`)
    return response.data
  },

  // Получить URL файла по ID
  getFileUrlById: async (fileId) => {
    const response = await api.get(`/files/id/${fileId}`)
    return response.data
  },

  // Удалить файл
  delete: async (fileKey) => {
    const response = await api.delete(`/files/${fileKey}`)
    return response.data
  }
}

