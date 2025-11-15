import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

// Конфигурация для работы с Яндекс.Диск API
const YANDEX_DISK_API_URL = 'https://cloud-api.yandex.net/v1/disk';

// Создаем axios клиент с настройками для Яндекс.Диска
const yandexDiskClient = axios.create({
  baseURL: YANDEX_DISK_API_URL,
  headers: {
    'Authorization': `OAuth ${process.env.YANDEX_DISK_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Базовая папка для хранения файлов на Яндекс.Диске
export const basePath = process.env.YANDEX_DISK_BASE_PATH || '/PassDesk';

export default yandexDiskClient;

