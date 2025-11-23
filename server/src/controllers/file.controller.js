import storageProvider from '../config/storage.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Загрузка файла в Object Storage
 */
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    const file = req.file;
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.originalname}`;
    const filePath = storageProvider.resolvePath(fileName);

    await storageProvider.uploadFile({
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      filePath,
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileKey: fileName,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        path: filePath
      }
    });
  } catch (error) {
    next(error);
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
      const fileName = `${timestamp}_${file.originalname}`;
      const filePath = storageProvider.resolvePath(fileName);

      await storageProvider.uploadFile({
        fileBuffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
        filePath,
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
 * Получить ссылку для скачивания файла по ID
 */
export const getFileById = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    
    // Импортируем модель File
    const { File } = await import('../models/index.js');
    
    // Находим файл по ID
    const file = await File.findOne({
      where: {
        id: fileId,
        isDeleted: false
      }
    });
    
    if (!file) {
      throw new AppError('Файл не найден', 404);
    }
    
    const downloadData = await storageProvider.getDownloadUrl(file.filePath, { expiresIn: 3600 });

    res.json({
      success: true,
      data: {
        url: downloadData.url,
        fileName: file.originalName || file.fileName
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
    const filePath = storageProvider.resolvePath(fileKey);
    const downloadData = await storageProvider.getDownloadUrl(filePath, { expiresIn: 3600 });

    res.json({
      success: true,
      data: {
        url: downloadData.url,
        fileName: fileKey
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получить публичную ссылку на файл
 */
export const getPublicLink = async (req, res, next) => {
  try {
    const { fileKey } = req.params;
    const filePath = storageProvider.resolvePath(fileKey);
    const publicLink = await storageProvider.getPublicUrl(filePath, { expiresIn: 86400 });

    res.json({
      success: true,
      data: {
        publicUrl: publicLink.url,
        fileName: fileKey
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Удалить файл
 */
export const deleteFile = async (req, res, next) => {
  try {
    const { fileKey } = req.params;
    const filePath = storageProvider.resolvePath(fileKey);
    await storageProvider.deleteFile(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

