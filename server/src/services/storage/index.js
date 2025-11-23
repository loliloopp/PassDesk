import dotenv from 'dotenv';
import { createYandexDiskProvider } from './providers/yandexDiskProvider.js';
import { createS3Provider } from './providers/s3Provider.js';

dotenv.config();

const providerName = (process.env.STORAGE_PROVIDER || 'cloudru').toLowerCase();

const providerBuilders = {
  'yandexdisk': () => createYandexDiskProvider({
    token: process.env.YANDEX_DISK_TOKEN,
    basePath: process.env.YANDEX_DISK_BASE_PATH,
  }),
  'yandexs3': () => createS3Provider({
    providerName: 'yandexS3',
    endpoint: process.env.YANDEX_S3_ENDPOINT || process.env.S3_ENDPOINT || 'https://storage.yandexcloud.net',
    region: process.env.YANDEX_S3_REGION || process.env.S3_REGION || 'ru-central1',
    accessKeyId: process.env.YANDEX_S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.YANDEX_S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY,
    bucketName: process.env.YANDEX_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME,
    basePath: process.env.YANDEX_S3_BASE_PATH || process.env.S3_BASE_PATH || '',
    kmsKeyId: process.env.YANDEX_S3_KMS_KEY_ID || process.env.S3_KMS_KEY_ID,
  }),
  'cloudru': () => createS3Provider({
    providerName: 'cloudRuS3',
    endpoint: process.env.CLOUDRU_S3_ENDPOINT || process.env.S3_ENDPOINT || 'https://s3.cloud.ru',
    region: process.env.CLOUDRU_S3_REGION || process.env.S3_REGION || 'ru-1',
    accessKeyId: process.env.CLOUDRU_S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDRU_S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY,
    bucketName: process.env.CLOUDRU_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME,
    basePath: process.env.CLOUDRU_S3_BASE_PATH || process.env.S3_BASE_PATH || '',
    kmsKeyId: process.env.CLOUDRU_S3_KMS_KEY_ID || process.env.S3_KMS_KEY_ID,
  }),
};

const builder = providerBuilders[providerName];

if (!builder) {
  throw new Error(`Неизвестный провайдер хранения: ${providerName}`);
}

const storageProvider = builder();

console.log(`🚀 Storage provider: ${storageProvider.name} (basePath: ${storageProvider.basePath})`);

export default storageProvider;

