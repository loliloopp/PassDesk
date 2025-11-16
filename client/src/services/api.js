import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { API_CONFIG } from '@/config/api.config'

// Функция для получения базового URL
export const getBaseURL = () => {
  // 1. Проверяем конфигурацию (приоритет!)
  if (API_CONFIG?.BASE_URL) {
    console.log('📌 Using API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
    return API_CONFIG.BASE_URL;
  }
  
  // 2. Проверяем переменную окружения
  if (import.meta.env.VITE_API_URL) {
    console.log('📌 Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  // 3. Автоматическое определение по hostname
  const hostname = window.location.hostname;
  
  console.log('📌 Hostname:', hostname);
  console.log('📌 Is localhost?', hostname === 'localhost' || hostname === '127.0.0.1');
  
  // Если это НЕ localhost и НЕ 127.0.0.1 - используем hostname как есть
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const url = `http://${hostname}:5000/api/v1`;
    console.log('📌 Using network URL:', url);
    return url;
  }
  
  // Иначе используем localhost
  console.log('📌 Using localhost URL');
  return 'http://localhost:5000/api/v1';
};

// Создаем базовый экземпляр с правильным baseURL
const api = axios.create({
  baseURL: getBaseURL(), // Устанавливаем при создании
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  timeout: 10000
})

// Логируем информацию при инициализации
console.log('🔗 API module loaded - VERSION 3.0 (with API_CONFIG)'); // Обновили версию
console.log('📍 window.location.href:', window.location.href);
console.log('📍 window.location.hostname:', window.location.hostname);
console.log('📍 API_CONFIG.BASE_URL:', API_CONFIG?.BASE_URL);
console.log('📍 Initial baseURL:', api.defaults.baseURL);

// Interceptor для обновления baseURL перед каждым запросом
api.interceptors.request.use(
  (config) => {
    // Обновляем baseURL динамически для каждого запроса
    const currentBaseURL = getBaseURL();
    
    // Обновляем только если изменился
    if (config.baseURL !== currentBaseURL) {
      console.log('🔄 Updating baseURL from', config.baseURL, 'to', currentBaseURL);
      config.baseURL = currentBaseURL;
    }
    
    console.log('📤 Outgoing request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`
    });
    
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error)
  }
)

// Response interceptor - обработка ошибок
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Логируем ошибку для отладки
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    // Если ошибка 401 и это не повторный запрос
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // TODO: Implement token refresh logic
        // const response = await api.post('/auth/refresh')
        // const { token } = response.data.data
        // useAuthStore.getState().updateToken(token)
        // originalRequest.headers.Authorization = `Bearer ${token}`
        // return api(originalRequest)
        
        // Пока просто разлогиниваем пользователя
        useAuthStore.getState().logout()
      } catch (refreshError) {
        useAuthStore.getState().logout()
        return Promise.reject(refreshError)
      }
    }

    // Улучшенное сообщение об ошибке
    if (error.code === 'ECONNABORTED') {
      error.userMessage = 'Превышено время ожидания. Проверьте подключение к интернету.';
    } else if (error.code === 'ERR_NETWORK') {
      error.userMessage = 'Ошибка сети. Убедитесь, что сервер запущен и доступен.';
    } else if (error.response) {
      // Сервер ответил с ошибкой
      error.userMessage = error.response.data?.message || `Ошибка сервера (${error.response.status})`;
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      error.userMessage = 'Нет ответа от сервера. Проверьте подключение.';
    } else {
      error.userMessage = error.message || 'Неизвестная ошибка';
    }

    return Promise.reject(error)
  }
)

export default api

