// API Configuration
// Автоматически определяем хост на основе текущего URL

const getBaseURL = () => {
  // Если открыто через IP адрес локальной сети
  if (window.location.hostname === '192.168.8.118') {
    return 'http://192.168.8.118:5000/api/v1';
  }
  // Иначе используем localhost
  return 'http://localhost:5000/api/v1';
};

export const API_CONFIG = {
  BASE_URL: getBaseURL(),
  TIMEOUT: 10000
};

