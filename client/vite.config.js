import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/entities': path.resolve(__dirname, './src/entities'),
      '@/widgets': path.resolve(__dirname, './src/widgets'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    port: 5173,
    host: '192.168.1.9', // Слушать на конкретном IP адресе
    https: true, // Включить HTTPS с самоподписанным сертификатом (basicSsl плагин)
    proxy: {
      '/api': {
        target: 'http://192.168.1.9:5000', // Проксируем на бэкенд по IP адресу
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})

