import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', credentials)
          const { user, token } = response.data.data

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })

          return response.data
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (userData) => {
        set({ isLoading: true })
        try {
          console.log('🚀 Attempting registration...', {
            baseURL: api.defaults.baseURL,
            url: '/auth/register',
            data: { ...userData, password: '***' }
          });
          
          const response = await api.post('/auth/register', userData)
          
          console.log('✅ Registration successful:', response.data);
          
          const { user, token } = response.data.data

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })

          return response.data
        } catch (error) {
          console.error('❌ Registration error:', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status,
            baseURL: api.defaults.baseURL
          });
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false
          })
        }
      },

      getCurrentUser: async () => {
        try {
          const response = await api.get('/auth/me')
          set({ user: response.data.data })
          return response.data
        } catch (error) {
          console.error('Get current user error:', error)
          throw error
        }
      },

      updateToken: (token) => {
        set({ token })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

