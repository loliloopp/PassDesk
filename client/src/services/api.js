import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { API_CONFIG } from '@/config/api.config'
import { message } from 'antd'

// Флаг для предотвращения множественных уведомлений
let isRedirecting = false

// Функция для получения базового URL
export const getBaseURL = () => {
  // 1. Проверяем переменную окружения (приоритет!)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 2. Проверяем конфигурацию
  if (API_CONFIG?.BASE_URL) {
    return API_CONFIG.BASE_URL;
  }
  
  // 3. По умолчанию используем localhost
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
  timeout: 60000 // Увеличиваем до 60 секунд для импорта больших файлов
})

// Interceptor для обновления baseURL перед каждым запросом
api.interceptors.request.use(
  (config) => {
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

    // Обработка 401 ошибки (неавторизован / истек токен)
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/logout')) {
      originalRequest._retry = true

      // Предотвращаем множественные редиректы
      if (!isRedirecting) {
        isRedirecting = true

        // Определяем причину ошибки
        const errorMessage = error.response?.data?.message || ''
        let notificationMessage = 'Ваша сессия истекла. Пожалуйста, войдите снова.'
        
        if (errorMessage.includes('Token expired')) {
          notificationMessage = '⏱️ Время сессии истекло. Войдите в систему заново.'
        } else if (errorMessage.includes('Invalid token')) {
          notificationMessage = '🔐 Невалидный токен. Требуется повторная авторизация.'
        } else if (errorMessage.includes('No token provided')) {
          notificationMessage = '🔐 Необходима авторизация.'
        }

        console.warn('🚪 Logging out user due to 401 error:', errorMessage);
        
        // Показываем уведомление пользователю
        message.warning({
          content: notificationMessage,
          duration: 5,
          key: 'auth-error' // Чтобы не показывать дубликаты
        });

        // Разлогиниваем пользователя локально
        const authStore = useAuthStore.getState()
        authStore.user = null
        authStore.token = null
        authStore.isAuthenticated = false
        
        // Очищаем localStorage
        localStorage.removeItem('auth-storage')
        
        // Небольшая задержка перед редиректом, чтобы пользователь увидел сообщение
        setTimeout(() => {
          isRedirecting = false
          window.location.href = '/login'
        }, 1000);
      }
    }

    // Обработка 403 ошибки (нет прав доступа)
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.message || 'У вас нет прав для выполнения этого действия'
      console.warn('🚫 Access denied:', errorMessage);
      
      message.error({
        content: `🚫 Доступ запрещен: ${errorMessage}`,
        duration: 5
      });
      
      error.userMessage = errorMessage;
    }

    // Улучшенное сообщение об ошибке
    if (error.code === 'ECONNABORTED') {
      error.userMessage = 'Превышено время ожидания. Проверьте подключение к интернету.';
    } else if (error.code === 'ERR_NETWORK') {
      error.userMessage = 'Ошибка сети. Убедитесь, что сервер запущен и доступен.';
    } else if (error.response && error.response.status !== 401 && error.response.status !== 403) {
      // Для других ошибок (кроме 401 и 403, которые уже обработаны)
      error.userMessage = error.response.data?.message || `Ошибка сервера (${error.response.status})`;
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      error.userMessage = 'Нет ответа от сервера. Проверьте подключение.';
    } else if (!error.userMessage) {
      error.userMessage = error.message || 'Неизвестная ошибка';
    }

    return Promise.reject(error)
  }
)

export default api

