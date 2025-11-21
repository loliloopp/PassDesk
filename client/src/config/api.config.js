// API Configuration
// Используем относительный путь для работы через прокси Vite
// Это решает проблему Mixed Content (HTTPS фронтенд -> HTTP бэкенд)

export const API_CONFIG = {
  BASE_URL: '/api/v1',
  TIMEOUT: 10000
};

