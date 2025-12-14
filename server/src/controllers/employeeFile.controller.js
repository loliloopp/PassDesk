import { File, Employee, Counterparty, EmployeeCounterpartyMapping, Setting } from '../models/index.js';
import storageProvider from '../config/storage.js';
import { buildEmployeeFilePath, sanitizeFileName, formatEmployeeFileName } from '../utils/transliterate.js';
import { AppError } from '../middleware/errorHandler.js';
import { checkEmployeeAccess } from '../utils/permissionUtils.js';

/**
 * Helper: Загрузить сотрудника с маппингами для проверки прав
 */
const fetchEmployeeWithMappings = async (employeeId) => {
  return Employee.findByPk(employeeId, {
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
};

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
    const validDocumentTypes = ['passport', 'patent_front', 'patent_back', 'consent', 'biometric_consent', 'biometric_consent_developer', 'kig', 'bank_details', 'diploma', 'med_book', 'migration_card', 'arrival_notice', 'patent_payment_receipt', 'mvd_notification', 'other'];
    if (documentType && !validDocumentTypes.includes(documentType)) {
      throw new AppError(`Неверный тип документа. Допустимые значения: ${validDocumentTypes.join(', ')}`, 400);
    }
    
    // Загружаем данные сотрудника с контрагентом через маппинг
    const employee = await fetchEmployeeWithMappings(employeeId);
    
    if (!employee) {
      throw new AppError('Сотрудник не найден', 404);
    }

    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);
    

    const mapping = employee.employeeCounterpartyMappings?.[0];
    // Для пользователей с дефолтным контрагентом маппинга может и не быть при создании,
    // но если они прошли checkEmployeeAccess, значит они создатели.
    // Однако для сохранения файла нам нужно имя контрагента для пути.
    // Если маппинга нет (редкий случай для созданного сотрудника, обычно создается сразу),
    // нужно решить откуда брать имя папки.
    // В createEmployee маппинг создается всегда.
    
    if (!mapping || !mapping.counterparty) {
      // Если маппинга нет, но доступ разрешен (например, создатель без маппинга?),
      // это странная ситуация, так как при создании маппинг создается.
      throw new AppError('У сотрудника не указан контрагент (нарушение целостности данных)', 400);
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
      
      // Проверяем размер каждого файла (макс 100MB)
      for (const file of req.files) {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 100) {
          throw new AppError(`Файл "${file.originalname}" слишком большой (${fileSizeMB.toFixed(2)}MB). Максимум 100MB.`, 400);
        }
      }
    }
    
    // Формируем путь: PassDesk/Counterparty_Name/employee_uuid/
    // Используем UUID сотрудника для стабильности при редактировании ФИО
    const relativeDirectory = buildEmployeeFilePath(
      counterparty.name,
      employee.id
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
        
        // Получаем расширение файла
        const lastDotIndex = file.originalname.lastIndexOf('.');
        const extension = lastDotIndex > 0 ? file.originalname.substring(lastDotIndex) : '';
        
        // Форматируем имя файла в соответствии с типом документа и ФИО
        let formattedFileName;
        if (documentType && documentType !== 'other') {
          // Если указан тип документа, используем форматированное имя
          formattedFileName = formatEmployeeFileName(
            documentType,
            employee.lastName,
            employee.firstName,
            employee.middleName,
            extension
          );
        } else {
          // Иначе используем оригинальное имя
          formattedFileName = sanitizeFileName(file.originalname);
        }
        
        const timestamp = Date.now();
        const fileName = `${timestamp}_${formattedFileName}`;
        const targetPath = storageProvider.resolvePath(`${relativeDirectory}/${fileName}`);
        
        console.log(`📝 Formatted filename: ${formattedFileName}`);
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
          fileName: formattedFileName,
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
    
    // Проверяем существование сотрудника и права доступа
    const employee = await fetchEmployeeWithMappings(employeeId);
    if (!employee) {
      throw new AppError('Сотрудник не найден', 404);
    }

    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);
    
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
    
    // Проверяем права доступа к сотруднику
    const employee = await fetchEmployeeWithMappings(employeeId);
    if (!employee) {
      throw new AppError('Сотрудник не найден', 404);
    }

    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);
    
    // Находим файл с проверкой прав через сотрудника
    const file = await File.findOne({
      where: {
        id: fileId,
        entityType: 'employee',
        entityId: employeeId,
        isDeleted: false
      },
      include: [{
        model: Employee,
        as: 'employee',
        include: [{
          model: EmployeeCounterpartyMapping,
          as: 'employeeCounterpartyMappings',
          attributes: ['counterpartyId']
        }]
      }]
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
    
    // Проверяем права доступа к сотруднику
    const employee = await fetchEmployeeWithMappings(employeeId);
    if (!employee) {
      throw new AppError('Сотрудник не найден', 404);
    }

    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);
    
    // Находим файл с проверкой прав
    const file = await File.findOne({
      where: {
        id: fileId,
        entityType: 'employee',
        entityId: employeeId,
        isDeleted: false
      },
      include: [{
        model: Employee,
        as: 'employee',
        include: [{
          model: EmployeeCounterpartyMapping,
          as: 'employeeCounterpartyMappings',
          attributes: ['counterpartyId']
        }]
      }]
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
    
    // Проверяем права доступа к сотруднику
    const employee = await fetchEmployeeWithMappings(employeeId);
    if (!employee) {
      throw new AppError('Сотрудник не найден', 404);
    }

    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);
    
    // Находим файл с проверкой прав
    const file = await File.findOne({
      where: {
        id: fileId,
        entityType: 'employee',
        entityId: employeeId,
        isDeleted: false
      },
      include: [{
        model: Employee,
        as: 'employee',
        include: [{
          model: EmployeeCounterpartyMapping,
          as: 'employeeCounterpartyMappings',
          attributes: ['counterpartyId']
        }]
      }]
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


