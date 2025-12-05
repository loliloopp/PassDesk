import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { API_CONFIG } from '@/config/api.config'
import { jwtDecode } from 'jwt-decode'

// Флаг для предотвращения множественных уведомлений
let isRedirecting = false

// Флаг для предотвращения множественных refresh запросов
let isRefreshing = false
let failedQueue = []

// Счетчик попыток refresh для exponential backoff
let refreshAttempts = 0
const MAX_REFRESH_ATTEMPTS = 3
const REFRESH_TIMEOUT = 5000 // 5 секунд между попытками

// Очередь для обработки запросов, пока идет refresh
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  isRefreshing = false
  failedQueue = []
}

// Функция для получения базового URL
export const getBaseURL = () => {
  // Всегда используем относительный путь '/api/v1'
  // Это позволяет Vite проксировать запросы:
  // Browser (HTTPS) -> Vite Dev Server (HTTPS) -> Backend (HTTP)
  // Тем самым устраняется ошибка Mixed Content
  return '/api/v1';
};

// Функция для проверки, истекает ли токен в течение N минут
const isTokenExpiringSoon = (token, minutesBeforeExpiry = 1) => {
  try {
    if (!token) return false
    
    const decoded = jwtDecode(token)
    const expiryTime = decoded.exp * 1000 // exp в секундах, переводим в миллисекунды
    const currentTime = Date.now()
    const timeUntilExpiry = expiryTime - currentTime
    const minutesUntilExpiry = timeUntilExpiry / (1000 * 60)
    
    return minutesUntilExpiry <= minutesBeforeExpiry
  } catch (error) {
    console.error('❌ Error checking token expiry:', error)
    return false
  }
}

// Функция для переиспускания токена
const refreshAccessToken = async () => {
  try {
    // Проверяем, не превышена ли максимальное количество попыток
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      console.error('❌ Max refresh attempts reached. Logging out user.')
      refreshAttempts = 0
      return null
    }

    const authStore = useAuthStore.getState()
    const refreshToken = authStore.refreshToken
    
    if (!refreshToken) {
      console.warn('⚠️ Refresh token not available. Logging out user.')
      refreshAttempts = 0
      return null
    }
    
    refreshAttempts++
    
    // Вызываем refresh endpoint
    const response = await axios.post(`${getBaseURL()}/auth/refresh`, {
      refreshToken
    })
    
    const { token: newToken, refreshToken: newRefreshToken } = response.data.data
    
    // Обновляем токены в store
    authStore.updateTokens(newToken, newRefreshToken)
    
    // Сбрасываем счетчик попыток при успехе
    refreshAttempts = 0
    
    console.log('✅ Token refreshed successfully')
    return newToken
  } catch (error) {
    console.error('❌ Error refreshing token:', error.response?.status, error.message)
    
    // Если это 429 (rate limit) или другая ошибка - логируем пользователя
    const authStore = useAuthStore.getState()
    authStore.user = null
    authStore.token = null
    authStore.refreshToken = null
    authStore.isAuthenticated = false
    localStorage.removeItem('auth-storage')
    
    refreshAttempts = 0
    return null
  }
}

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

// Request interceptor - добавляем токен и проверяем его жизненный цикл
api.interceptors.request.use(
  async (config) => {
    const authStore = useAuthStore.getState()
    const token = authStore.token
    
    if (token) {
      // Проверяем, истекает ли токен в течение 1 минуты
      if (isTokenExpiringSoon(token, 1)) {
        console.log('⏱️ Token expiring soon. Attempting to refresh...')
        
        // Пытаемся обновить токен
        const newToken = await refreshAccessToken()
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`
          return config
        }
      }
      
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

    // Логируем ошибку для отладки (кроме 404 для check-inn, это нормально)
    const isCheckInnNotFound = error.response?.status === 404 && 
                               error.config?.url?.includes('/check-inn');
    
    if (!isCheckInnNotFound) {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
    }

    // Обработка 401 ошибки (неавторизован / истек токен)
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/logout')) {
      originalRequest._retry = true

      // Попытаемся обновить токен и повторить запрос
      console.log('🔄 Attempting to refresh token and retry request...')
      const newToken = await refreshAccessToken()
      
      if (newToken) {
        // Обновляем токен в заголовке и повторяем запрос
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      }

      // Если не удалось обновить токен - разлогиниваем пользователя
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
        
        // Логируем сообщение для отладки (было: message.warning в interceptor)
        // Сообщения отображаются в компонентах через App.useApp() hook

        // Разлогиниваем пользователя локально
        const authStore = useAuthStore.getState()
        authStore.user = null
        authStore.token = null
        authStore.refreshToken = null
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
      // Не логируем в консоль для уменьшения шума
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

