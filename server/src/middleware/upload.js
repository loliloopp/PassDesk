import multer from 'multer';
import path from 'path';
import { AppError } from './errorHandler.js';

// Функция для исправления кодировки filename (UTF-8 декодированный как ISO-8859-1)
const decodeFilename = (filename) => {
  try {
    // Проверяем, не содержит ли уже кириллицу (значит уже правильный UTF-8)
    if (/[\u0400-\u04FF]/.test(filename)) {
      return filename;
    }
    
    // Пытаемся декодировать как UTF-8 bytes, которые были неправильно интерпретированы как ISO-8859-1
    const bytes = Buffer.from(filename, 'latin1');
    const corrected = bytes.toString('utf8');
    
    // Проверяем, содержит ли исправленная версия кириллицу
    if (/[\u0400-\u04FF]/.test(corrected)) {
      return corrected;
    }
    
    // Если исправление не помогло, возвращаем исходное имя
    return filename;
  } catch (error) {
    console.warn('⚠️ Error decoding filename:', filename, error.message);
    return filename;
  }
};

// Настройка временного хранилища для загрузки файлов
const storage = multer.memoryStorage();

// Фильтр файлов
const fileFilter = (req, file, cb) => {
  // Разрешенные типы файлов
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'application/vnd.ms-excel', // XLS
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'application/msword', // DOC
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${file.mimetype} is not allowed`, 400), false);
  }
};

// Конфигурация multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB default
  }
});

// Middleware для исправления кодировки filename
export const fixFilenameEncoding = (req, res, next) => {
  try {
    // Исправляем одиночный файл
    if (req.file) {
      req.file.originalname = decodeFilename(req.file.originalname);
      console.log(`📝 Fixed filename encoding: ${req.file.originalname}`);
    }
    
    // Исправляем несколько файлов
    if (req.files && Array.isArray(req.files)) {
      req.files = req.files.map(file => ({
        ...file,
        originalname: decodeFilename(file.originalname)
      }));
      console.log(`📝 Fixed ${req.files.length} filename encodings`);
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in fixFilenameEncoding middleware:', error);
    next(error);
  }
};

export default upload;

