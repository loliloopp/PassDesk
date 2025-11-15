import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Настройка S3-совместимого клиента для Yandex Object Storage
const s3Client = new AWS.S3({
  endpoint: process.env.YC_STORAGE_ENDPOINT || 'https://storage.yandexcloud.net',
  accessKeyId: process.env.YC_STORAGE_ACCESS_KEY,
  secretAccessKey: process.env.YC_STORAGE_SECRET_KEY,
  region: process.env.YC_STORAGE_REGION || 'ru-central1',
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

export const bucketName = process.env.YC_STORAGE_BUCKET || 'passdesk-files';

export default s3Client;

