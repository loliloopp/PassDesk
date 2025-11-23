import { File, Employee, Counterparty, EmployeeCounterpartyMapping } from '../models/index.js';
import storageProvider from '../config/storage.js';
import { buildEmployeeFilePath, sanitizeFileName } from '../utils/transliterate.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Загрузка файлов для сотрудника
 */
export const uploadEmployeeFiles = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { documentType } = req.body; // Получаем тип документа из тела запроса
    
    console.log('📤 Upload request:', {
      employeeId,
      filesCount: req.files?.length,
      user: req.user?.id,
      documentType
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
    
    // Валидация типа документа (опционально)
    const validDocumentTypes = ['passport', 'patent_front', 'patent_back', 'biometric_consent', 'other'];
    if (documentType && !validDocumentTypes.includes(documentType)) {
      throw new AppError(`Неверный тип документа. Допустимые значения: ${validDocumentTypes.join(', ')}`, 400);
    }
    
    // Загружаем данные сотрудника с контрагентом через маппинг
    const employee = await Employee.findByPk(employeeId, {
      include: [{
        model: EmployeeCounterpartyMapping,
        as: 'employeeCounterpartyMappings',
        include: [{
          model: Counterparty,
          as: 'counterparty',
          attributes: ['id', 'name']
        }]
      }]
    });
    
    if (!employee) {
      throw new AppError('Сотрудник не найден', 404);
    }
    
    const mapping = employee.employeeCounterpartyMappings?.[0];
    if (!mapping || !mapping.counterparty) {
      throw new AppError('У сотрудника не указан контрагент', 400);
    }
    
    const counterparty = mapping.counterparty;
    
    // Проверка лимитов для обычных пользователей
    if (req.user.role === 'user') {
      // Проверяем количество существующих файлов
      const existingFilesCount = await File.count({
        where: {
          entityType: 'employee',
          entityId: employeeId,
          isDeleted: false
        }
      });
      
      const newFilesCount = req.files.length;
      const totalFiles = existingFilesCount + newFilesCount;
      
      if (totalFiles > 10) {
        throw new AppError(`Превышен лимит файлов. Максимум 10 файлов. У вас уже ${existingFilesCount} файлов.`, 400);
      }
      
      // Проверяем размер каждого файла (макс 5MB)
      for (const file of req.files) {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 5) {
          throw new AppError(`Файл "${file.originalname}" слишком большой (${fileSizeMB.toFixed(2)}MB). Максимум 5MB.`, 400);
        }
      }
    }
    
    // Формируем путь: PassDesk/Counterparty_Name/Employee_LastName_FirstName_MiddleName/
    const employeeFullName = `${employee.lastName}_${employee.firstName}${employee.middleName ? '_' + employee.middleName : ''}`;
    const relativeDirectory = buildEmployeeFilePath(
      counterparty.name,
      employeeFullName
    ).replace(/^\/+/, '');
    const folderPath = storageProvider.resolvePath(relativeDirectory);
    
    const uploadedFiles = [];
    const errors = [];
    
    // Загружаем каждый файл
    for (const file of req.files) {
      try {
        console.log(`📁 Uploading file: ${file.originalname}, size: ${file.size} bytes`);
        console.log(`📦 Provider: ${storageProvider.name}`);
        console.log(`📍 Base folder: ${folderPath}`);
        
        const timestamp = Date.now();
        const safeFileName = sanitizeFileName(file.originalname);
        const fileName = `${timestamp}_${safeFileName}`;
        const targetPath = storageProvider.resolvePath(`${relativeDirectory}/${fileName}`);
        
        console.log(`🔑 File key: ${targetPath}`);
        
        await storageProvider.uploadFile({
          fileBuffer: file.buffer,
          mimeType: file.mimetype,
          originalName: file.originalname,
          filePath: targetPath,
        });
        
        console.log(`✅ File uploaded to storage: ${targetPath}`);
        console.log(`💾 Now saving to database...`);
        
        // Сохраняем информацию о файле в БД
        const fileRecord = await File.create({
          fileKey: fileName,
          fileName: safeFileName,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          filePath: targetPath,
          publicUrl: null,
          resourceId: null,
          entityType: 'employee',
          entityId: employeeId,
          employeeId: employeeId, // Явная связь с сотрудником
          uploadedBy: req.user.id,
          documentType: documentType || null // Сохраняем тип документа
        });
        
        console.log(`✅ File record saved to DB: ${fileRecord.id}`);
        uploadedFiles.push(fileRecord);
      } catch (error) {
        console.error(`❌ Error uploading file ${file.originalname}:`, error.message);
        console.error(`📋 Error details:`, {
          name: error.name,
          code: error.code,
          statusCode: error.$metadata?.httpStatusCode,
          message: error.message,
          stack: error.stack
        });
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
        'documentType',
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
    
    // Удаляем файл из хранилища
    try {
      await storageProvider.deleteFile(file.filePath);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Продолжаем даже если не удалось удалить из хранилища
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
    
    const downloadData = await storageProvider.getDownloadUrl(file.filePath, { 
      expiresIn: 3600,
      fileName: file.originalName // Передаём имя файла для заголовка Content-Disposition
    });
    
    res.json({
      success: true,
      data: {
        downloadUrl: downloadData.url,
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
    
    const viewData = await storageProvider.getPublicUrl(file.filePath, { expiresIn: 86400 });
    
    res.json({
      success: true,
      data: {
        viewUrl: viewData.url,
        fileName: file.originalName,
        mimeType: file.mimeType
      }
    });
  } catch (error) {
    next(error);
  }
};


