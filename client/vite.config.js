import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Слушать на всех сетевых интерфейсах (0.0.0.0)
    // Прокси НЕ используется - клиент напрямую обращается к серверу
    // Это позволяет работать как с localhost, так и с мобильных устройств
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})

