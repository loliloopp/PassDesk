import { File, Employee, Counterparty } from '../models/index.js';
import yandexDiskClient, { basePath } from '../config/storage.js';
import { buildEmployeeFilePath, sanitizeFileName } from '../utils/transliterate.js';
import { AppError } from '../middleware/errorHandler.js';
import axios from 'axios';

/**
 * Загрузка файлов для сотрудника
 */
export const uploadEmployeeFiles = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Файлы не предоставлены'
      });
    }
    
    // Загружаем данные сотрудника с контрагентом
    const employee = await Employee.findByPk(employeeId, {
      include: [{
        model: Counterparty,
        as: 'counterparty',
        attributes: ['id', 'name']
      }]
    });
    
    if (!employee) {
      throw new AppError('Сотрудник не найден', 404);
    }
    
    if (!employee.counterparty) {
      throw new AppError('У сотрудника не указан контрагент', 400);
    }
    
    // Формируем путь: /PassDesk/Counterparty_Name/Employee_LastName_FirstName_MiddleName/
    const employeeFullName = `${employee.lastName}_${employee.firstName}${employee.middleName ? '_' + employee.middleName : ''}`;
    const relativePath = buildEmployeeFilePath(
      employee.counterparty.name,
      employeeFullName
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
    
    // Загружаем каждый файл
    for (const file of req.files) {
      try {
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
          entityType: 'employee',
          entityId: employeeId,
          uploadedBy: req.user.id
        });
        
        uploadedFiles.push(fileRecord);
      } catch (error) {
        console.error(`Error uploading file ${file.originalname}:`, error);
        // Продолжаем загрузку остальных файлов
      }
    }
    
    if (uploadedFiles.length === 0) {
      throw new AppError('Не удалось загрузить ни одного файла', 500);
    }
    
    res.status(201).json({
      success: true,
      message: `Успешно загружено файлов: ${uploadedFiles.length}`,
      data: uploadedFiles
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение списка файлов сотрудника
 */
export const getEmployeeFiles = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    
    // Проверяем существование сотрудника
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      throw new AppError('Сотрудник не найден', 404);
    }
    
    // Получаем все файлы сотрудника
    const files = await File.findAll({
      where: {
        entityType: 'employee',
        entityId: employeeId,
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
 * Удаление файла сотрудника
 */
export const deleteEmployeeFile = async (req, res, next) => {
  try {
    const { employeeId, fileId } = req.params;
    
    // Находим файл
    const file = await File.findOne({
      where: {
        id: fileId,
        entityType: 'employee',
        entityId: employeeId,
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
    
    // Помечаем файл как удаленный в БД
    await file.update({ isDeleted: true });
    
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
export const getEmployeeFileDownloadLink = async (req, res, next) => {
  try {
    const { employeeId, fileId } = req.params;
    
    // Находим файл
    const file = await File.findOne({
      where: {
        id: fileId,
        entityType: 'employee',
        entityId: employeeId,
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
export const getEmployeeFileViewLink = async (req, res, next) => {
  try {
    const { employeeId, fileId } = req.params;
    
    // Находим файл
    const file = await File.findOne({
      where: {
        id: fileId,
        entityType: 'employee',
        entityId: employeeId,
        isDeleted: false
      }
    });
    
    if (!file) {
      throw new AppError('Файл не найден', 404);
    }
    
    // Для изображений всегда получаем прямую ссылку для скачивания
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


