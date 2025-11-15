import yandexDiskClient, { basePath } from '../config/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import path from 'path';
import axios from 'axios';

/**
 * Загрузка файла на Яндекс.Диск
 */
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    const file = req.file;
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${timestamp}_${file.originalname}`;
    const filePath = `${basePath}/${fileName}`;

    // Шаг 1: Получить URL для загрузки
    const uploadUrlResponse = await yandexDiskClient.get('/resources/upload', {
      params: {
        path: filePath,
        overwrite: false
      }
    });

    const uploadUrl = uploadUrlResponse.data.href;

    // Шаг 2: Загрузить файл по полученному URL
    await axios.put(uploadUrl, file.buffer, {
      headers: {
        'Content-Type': file.mimetype
      }
    });

    // Шаг 3: Получить информацию о загруженном файле
    const fileInfoResponse = await yandexDiskClient.get('/resources', {
      params: {
        path: filePath
      }
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileKey: fileName,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        path: filePath,
        resourceId: fileInfoResponse.data.resource_id
      }
    });
  } catch (error) {
    if (error.response?.status === 409) {
      next(new AppError('File already exists', 409));
    } else {
      next(error);
    }
  }
};

/**
 * Загрузка нескольких файлов
 */
export const uploadMultipleFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No files provided', 400);
    }

    const uploadPromises = req.files.map(async (file) => {
      const timestamp = Date.now();
      const fileExtension = path.extname(file.originalname);
      const fileName = `${timestamp}_${file.originalname}`;
      const filePath = `${basePath}/${fileName}`;

      // Получить URL для загрузки
      const uploadUrlResponse = await yandexDiskClient.get('/resources/upload', {
        params: {
          path: filePath,
          overwrite: false
        }
      });

      const uploadUrl = uploadUrlResponse.data.href;

      // Загрузить файл
      await axios.put(uploadUrl, file.buffer, {
        headers: {
          'Content-Type': file.mimetype
        }
      });

      return {
        fileKey: fileName,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        path: filePath
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.status(201).json({
      success: true,
      message: 'Files uploaded successfully',
      data: {
        files: uploadedFiles
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получить ссылку для скачивания файла
 */
export const getFile = async (req, res, next) => {
  try {
    const { fileKey } = req.params;
    const filePath = `${basePath}/${fileKey}`;

    // Получить ссылку для скачивания
    const downloadResponse = await yandexDiskClient.get('/resources/download', {
      params: {
        path: filePath
      }
    });

    res.json({
      success: true,
      data: {
        url: downloadResponse.data.href,
        fileName: fileKey
      }
    });
  } catch (error) {
    if (error.response?.status === 404) {
      next(new AppError('File not found', 404));
    } else {
      next(error);
    }
  }
};

/**
 * Получить публичную ссылку на файл
 */
export const getPublicLink = async (req, res, next) => {
  try {
    const { fileKey } = req.params;
    const filePath = `${basePath}/${fileKey}`;

    // Опубликовать файл и получить публичную ссылку
    const publishResponse = await yandexDiskClient.put('/resources/publish', null, {
      params: {
        path: filePath
      }
    });

    // Получить информацию о файле с публичной ссылкой
    const fileInfoResponse = await yandexDiskClient.get('/resources', {
      params: {
        path: filePath
      }
    });

    res.json({
      success: true,
      data: {
        publicUrl: fileInfoResponse.data.public_url,
        fileName: fileKey
      }
    });
  } catch (error) {
    if (error.response?.status === 404) {
      next(new AppError('File not found', 404));
    } else {
      next(error);
    }
  }
};

/**
 * Удалить файл
 */
export const deleteFile = async (req, res, next) => {
  try {
    const { fileKey } = req.params;
    const filePath = `${basePath}/${fileKey}`;

    // Удалить файл (permanent=true для окончательного удаления, без корзины)
    await yandexDiskClient.delete('/resources', {
      params: {
        path: filePath,
        permanently: true
      }
    });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    if (error.response?.status === 404) {
      next(new AppError('File not found', 404));
    } else {
      next(error);
    }
  }
};

