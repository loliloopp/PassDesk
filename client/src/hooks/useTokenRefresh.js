import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { jwtDecode } from 'jwt-decode'
import api from '@/services/api'

/**
 * Hook для автоматического обновления токена за 2 минуты до истечения
 * Обновляет токен в фоне каждые 30 секунд если нужно
 */
export const useTokenRefresh = () => {
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      try {
        const authStore = useAuthStore.getState()
        const { token, refreshToken } = authStore
        
        if (!token || !refreshToken) {
          return
        }
        
        // Декодируем токен
        const decoded = jwtDecode(token)
        const expiryTime = decoded.exp * 1000
        const currentTime = Date.now()
        const timeUntilExpiry = expiryTime - currentTime
        const minutesUntilExpiry = timeUntilExpiry / (1000 * 60)
        
        // Если токен истекает в течение 2 минут - обновляем его
        if (minutesUntilExpiry <= 2 && minutesUntilExpiry > 0) {
          console.log(`⏱️ Token expiring in ${minutesUntilExpiry.toFixed(1)} minutes. Refreshing...`)
          
          try {
            const response = await api.post('/auth/refresh', {
              refreshToken
            })
            
            const { token: newToken, refreshToken: newRefreshToken } = response.data.data
            authStore.updateTokens(newToken, newRefreshToken)
            console.log('✅ Token refreshed proactively')
          } catch (error) {
            console.error('❌ Failed to refresh token:', error.response?.status)
          }
        }
      } catch (error) {
        console.error('Error in token refresh check:', error.message)
      }
    }
    
    // Проверяем токен каждые 30 секунд
    const interval = setInterval(checkAndRefreshToken, 30 * 1000)
    
    return () => clearInterval(interval)
  }, [])
}

