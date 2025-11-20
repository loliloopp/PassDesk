import { File, Application, Counterparty } from '../models/index.js';
import yandexDiskClient, { basePath } from '../config/storage.js';
import { transliterate, sanitizeFileName } from '../utils/transliterate.js';
import { AppError } from '../middleware/errorHandler.js';
import axios from 'axios';

/**
 * Построение пути для файлов заявки
 * @param {string} counterpartyName - Название контрагента
 * @param {string} applicationNumber - Номер заявки
 * @returns {string} - Относительный путь вида /Counterparty_Name/Application_Number
 */
const buildApplicationFilePath = (counterpartyName, applicationNumber) => {
  const transliteratedCounterparty = transliterate(counterpartyName);
  const transliteratedApplicationNumber = transliterate(applicationNumber);
  
  return `/${transliteratedCounterparty}/${transliteratedApplicationNumber}`;
};

/**
 * Загрузка файлов для заявки
 */
export const uploadApplicationFiles = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    
    console.log('📤 Upload request for application:', {
      applicationId,
      filesCount: req.files?.length,
      user: req.user?.id
    });
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Файлы не предоставлены'
      });
    }
    
    // Проверяем аутентификацию
    if (!req.user || !req.user.id) {
      throw new AppError('Пользователь не аутентифицирован', 401);
    }
    
    // Загружаем данные заявки с контрагентом
    const application = await Application.findOne({
      where: {
        id: applicationId,
        createdBy: req.user.id // Только свои заявки
      },
      include: [{
        model: Counterparty,
        as: 'counterparty',
        attributes: ['id', 'name']
      }]
    });
    
    if (!application) {
      throw new AppError('Заявка не найдена', 404);
    }
    
    if (!application.counterparty) {
      throw new AppError('У заявки не указан контрагент', 400);
    }
    
    // Формируем путь: /PassDesk/Counterparty_Name/Application_Number/
    const relativePath = buildApplicationFilePath(
      application.counterparty.name,
      application.applicationNumber
    );
    const fullPath = `${basePath}${relativePath}`;
    
    // Создаем папки рекурсивно если не существуют
    const pathParts = fullPath.split('/').filter(Boolean);
    let currentPath = '';
    
    for (const part of pathParts) {
      currentPath += '/' + part;
      try {
        await yandexDiskClient.put('/resources', undefined, {
          params: { path: currentPath }
        });
      } catch (error) {
        // 409 = папка уже существует, это нормально
        if (error.response?.status !== 409) {
          console.error('Error creating folder:', currentPath, error.response?.data);
          throw new AppError(`Ошибка создания папки ${currentPath} на Яндекс.Диске`, 500);
        }
      }
    }
    
    const uploadedFiles = [];
    const errors = [];
    
    // Загружаем каждый файл
    for (const file of req.files) {
      try {
        console.log(`📁 Uploading file: ${file.originalname}, size: ${file.size} bytes`);
        
        const timestamp = Date.now();
        const safeFileName = sanitizeFileName(file.originalname);
        const fileName = `${timestamp}_${safeFileName}`;
        const filePath = `${fullPath}/${fileName}`;
        
        // Получаем URL для загрузки от Яндекс.Диска
        const uploadUrlResponse = await yandexDiskClient.get('/resources/upload', {
          params: {
            path: filePath,
            overwrite: false
          }
        });
        
        const uploadUrl = uploadUrlResponse.data.href;
        
        // Загружаем файл по полученному URL
        await axios.put(uploadUrl, file.buffer, {
          headers: {
            'Content-Type': file.mimetype
          }
        });
        
        console.log(`✅ File uploaded to Yandex.Disk: ${filePath}`);
        
        // Получаем информацию о загруженном файле
        const fileInfoResponse = await yandexDiskClient.get('/resources', {
          params: {
            path: filePath
          }
        });
        
        const fileInfo = fileInfoResponse.data;
        
        // Сохраняем информацию о файле в БД
        const fileRecord = await File.create({
          fileKey: fileName,
          fileName: safeFileName,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          filePath: filePath,
          publicUrl: fileInfo.public_url || null,
          resourceId: fileInfo.resource_id || null,
          entityType: 'application',
          entityId: applicationId,
          uploadedBy: req.user.id,
          documentType: 'application_scan' // Тип документа для сканов заявки
        });
        
        console.log(`✅ File record saved to DB: ${fileRecord.id}`);
        uploadedFiles.push(fileRecord);
      } catch (error) {
        console.error(`❌ Error uploading file ${file.originalname}:`, error.message);
        errors.push({
          fileName: file.originalname,
          error: error.message
        });
        // Продолжаем загрузку остальных файлов
      }
    }
    
    if (uploadedFiles.length === 0) {
      throw new AppError(
        `Не удалось загрузить ни одного файла. ${errors.length > 0 ? 'Ошибки: ' + errors.map(e => `${e.fileName}: ${e.error}`).join('; ') : ''}`, 
        500
      );
    }
    
    console.log(`✅ Upload complete! ${uploadedFiles.length} file(s) uploaded successfully`);
    
    res.status(201).json({
      success: true,
      message: `Успешно загружено файлов: ${uploadedFiles.length}`,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    next(error);
  }
};

/**
 * Получение списка файлов заявки
 */
export const getApplicationFiles = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    
    // Проверяем существование заявки и права доступа
    const application = await Application.findOne({
      where: {
        id: applicationId,
        createdBy: req.user.id // Только свои заявки
      }
    });
    
    if (!application) {
      throw new AppError('Заявка не найдена', 404);
    }
    
    // Получаем все файлы заявки
    const files = await File.findAll({
      where: {
        entityType: 'application',
        entityId: applicationId,
        isDeleted: false
      },
      order: [['createdAt', 'DESC']],
      attributes: [
        'id',
        'fileKey',
        'fileName',
        'originalName',
        'mimeType',
        'fileSize',
        'filePath',
        'publicUrl',
        'createdAt'
      ]
    });
    
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Удаление файла заявки
 */
export const deleteApplicationFile = async (req, res, next) => {
  try {
    const { applicationId, fileId } = req.params;
    
    // Проверяем, что заявка принадлежит пользователю
    const application = await Application.findOne({
      where: {
        id: applicationId,
        createdBy: req.user.id // Только свои заявки
      }
    });
    
    if (!application) {
      throw new AppError('Заявка не найдена', 404);
    }
    
    // Находим файл
    const file = await File.findOne({
      where: {
        id: fileId,
        entityType: 'application',
        entityId: applicationId,
        isDeleted: false
      }
    });
    
    if (!file) {
      throw new AppError('Файл не найден', 404);
    }
    
    // Удаляем файл с Яндекс.Диска
    try {
      await yandexDiskClient.delete('/resources', {
        params: {
          path: file.filePath,
          permanently: true
        }
      });
    } catch (error) {
      console.error('Error deleting file from Yandex.Disk:', error);
      // Продолжаем даже если не удалось удалить с Яндекс.Диска
    }
    
    // Физически удаляем запись из БД
    await file.destroy();
    
    res.json({
      success: true,
      message: 'Файл успешно удален'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение ссылки для скачивания файла
 */
export const getApplicationFileDownloadLink = async (req, res, next) => {
  try {
    const { applicationId, fileId } = req.params;
    
    // Проверяем, что заявка принадлежит пользователю
    const application = await Application.findOne({
      where: {
        id: applicationId,
        createdBy: req.user.id // Только свои заявки
      }
    });
    
    if (!application) {
      throw new AppError('Заявка не найдена', 404);
    }
    
    // Находим файл
    const file = await File.findOne({
      where: {
        id: fileId,
        entityType: 'application',
        entityId: applicationId,
        isDeleted: false
      }
    });
    
    if (!file) {
      throw new AppError('Файл не найден', 404);
    }
    
    // Получаем ссылку для скачивания от Яндекс.Диска
    const downloadResponse = await yandexDiskClient.get('/resources/download', {
      params: {
        path: file.filePath
      }
    });
    
    res.json({
      success: true,
      data: {
        downloadUrl: downloadResponse.data.href,
        fileName: file.originalName
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение ссылки для просмотра файла (публичная ссылка)
 */
export const getApplicationFileViewLink = async (req, res, next) => {
  try {
    const { applicationId, fileId } = req.params;
    
    // Проверяем, что заявка принадлежит пользователю
    const application = await Application.findOne({
      where: {
        id: applicationId,
        createdBy: req.user.id // Только свои заявки
      }
    });
    
    if (!application) {
      throw new AppError('Заявка не найдена', 404);
    }
    
    // Находим файл
    const file = await File.findOne({
      where: {
        id: fileId,
        entityType: 'application',
        entityId: applicationId,
        isDeleted: false
      }
    });
    
    if (!file) {
      throw new AppError('Файл не найден', 404);
    }
    
    // Для изображений и PDF получаем прямую ссылку для скачивания
    // (она работает лучше для встраивания)
    const downloadResponse = await yandexDiskClient.get('/resources/download', {
      params: { path: file.filePath }
    });
    
    res.json({
      success: true,
      data: {
        viewUrl: downloadResponse.data.href,
        fileName: file.originalName,
        mimeType: file.mimeType
      }
    });
  } catch (error) {
    next(error);
  }
};

