/**
 * Поддерживаемые типы файлов для загрузки документов
 */
export const ALLOWED_FILE_TYPES = {
  jpeg: {
    mimeType: 'image/jpeg',
    extension: '.jpg, .jpeg',
    description: 'JPEG изображение'
  },
  png: {
    mimeType: 'image/png',
    extension: '.png',
    description: 'PNG изображение'
  },
  pdf: {
    mimeType: 'application/pdf',
    extension: '.pdf',
    description: 'PDF документ'
  },
  excel: {
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    extension: '.xls, .xlsx',
    description: 'Excel таблица'
  },
  word: {
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    extension: '.doc, .docx',
    description: 'Word документ'
  }
};

/**
 * Все MIME типы для валидации
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

/**
 * Расширения файлов для фильтра
 */
export const ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.pdf,.xls,.xlsx,.doc,.docx';

/**
 * Описание поддерживаемых типов файлов для показа пользователю
 */
export const SUPPORTED_FORMATS = 'JPG, PNG, PDF, XLS, XLSX, DOC, DOCX';
