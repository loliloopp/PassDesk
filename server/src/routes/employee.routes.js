import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator.js';
import { authenticate, authorize } from '../middleware/auth.js';
import upload, { fixFilenameEncoding } from '../middleware/upload.js';
import rateLimit from 'express-rate-limit';
import * as employeeController from '../controllers/employee.controller.js';
import * as employeeFileController from '../controllers/employeeFile.controller.js';

const router = express.Router();

// Rate limiter для импорта сотрудников (защита от DoS атак)
const importRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // Максимум 5 импортов за 15 минут на одного пользователя
  message: 'Слишком много попыток импорта. Попробуйте через 15 минут.',
  standardHeaders: true, // Возвращать информацию о лимите в заголовках `RateLimit-*`
  legacyHeaders: false, // Отключить заголовки `X-RateLimit-*`
  // Ключ по userId для индивидуального лимита на пользователя
  keyGenerator: (req) => {
    return req.user?.id || req.ip; // Используем userId если доступен, иначе IP
  },
  skip: (req) => {
    // Админы не подпадают под rate limit
    return req.user?.role === 'admin';
  }
});

// Все маршруты требуют аутентификации
router.use(authenticate);

// Validation rules
// Для черновиков - мягкая валидация (только фамилия обязательна)
const createEmployeeValidation = [
  body('lastName').notEmpty().trim(),
  body('firstName').optional().trim(),
  body('middleName').optional().trim(),
  body('positionId').optional().trim(),
  body('email').optional().trim(),
  body('phone').optional().trim()
];

// Для обновления черновика - мягкая валидация
const updateEmployeeDraftValidation = [
  body('lastName').optional().notEmpty().trim(),
  body('firstName').optional().trim(),
  body('middleName').optional().trim(),
  body('positionId').optional().trim(),
  body('email').optional().trim(),
  body('phone').optional().trim(),
  body('inn').optional().trim(),
  body('snils').optional().trim(),
  body('kig').optional().trim(),
  body('passportNumber').optional().trim(),
  body('passportDate').optional().trim(),
  body('passportIssuer').optional().trim(),
  body('registrationAddress').optional().trim(),
  body('patentNumber').optional().trim(),
  body('blankNumber').optional().trim(),
  body('notes').optional().trim()
];

// Для полного сохранения - строгая валидация
const updateEmployeeValidation = [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('middleName').optional().trim(),
  body('positionId').optional().notEmpty().withMessage('Должность обязательна'),
  body('email').optional().trim(),
  body('phone').optional().trim()
];

// Более мягкая валидация для профиля пользователя
const updateMyProfileValidation = [
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('middleName').optional().trim(),
  body('positionId').optional().trim(), // Изменено с position на positionId
  body('email').optional().isEmail().withMessage('Введите корректный email'),
  body('phone').optional().trim(),
  body('inn').optional().trim(),
  body('snils').optional().trim(),
  body('kig').optional().trim(),
  body('passportNumber').optional().trim(),
  body('passportIssuer').optional().trim(),
  body('registrationAddress').optional().trim(),
  body('patentNumber').optional().trim(),
  body('blankNumber').optional().trim(),
  body('notes').optional().trim()
];

// Employee routes
// ⚠️ Специфичные маршруты ДОЛЖНЫ быть перед параметризованными (/:id)
router.get('/my-profile', employeeController.getMyProfile); // Получить свой профиль
router.put('/my-profile', updateMyProfileValidation, validate, employeeController.updateMyProfile); // Обновить свой профиль
router.get('/check-inn', employeeController.checkEmployeeByInn); // Проверить наличие сотрудника по ИНН
router.get('/search', employeeController.searchEmployees); // Поиск

// Импорт сотрудников из Excel (доступен всем авторизованным) - ДОЛЖНО быть перед /:id
// Защита от DoS: максимум 5 импортов за 15 минут на пользователя
router.post('/import/validate', importRateLimiter, employeeController.validateEmployeesImport); // Валидация данных
router.post('/import/execute', importRateLimiter, employeeController.importEmployees); // Финальный импорт

// Общие маршруты
// Если есть activeOnly=true, используем отдельный контроллер для выгрузки
router.get('/', (req, res, next) => {
  const controller = req.query.activeOnly === 'true' 
    ? employeeController.getActiveEmployeesForExport
    : employeeController.getAllEmployees;
  controller(req, res, next);
});
router.post('/', createEmployeeValidation, validate, employeeController.createEmployee); // Валидация для создания (нужна минимум фамилия)

// Маршруты с параметрами (/:id должны быть в конце)
router.get('/:id', employeeController.getEmployeeById);
router.put('/:id/draft', updateEmployeeDraftValidation, validate, employeeController.updateEmployee); // Обновление черновика - мягкая валидация
router.put('/:id', updateEmployeeValidation, validate, employeeController.updateEmployee); // Полное обновление - строгая валидация
router.put('/:id/construction-sites', employeeController.updateEmployeeConstructionSites); // Убрали authorize('admin')
router.put('/:id/department', employeeController.updateEmployeeDepartment); // Убрали authorize('admin')
router.put('/:employeeId/status/:statusMappingId/upload', employeeController.updateStatusUploadFlag); // Обновить флаг is_upload для статуса
router.put('/:employeeId/statuses/upload', employeeController.updateAllStatusesUploadFlag); // Обновить флаг is_upload для всех активных статусов
router.post('/:employeeId/status/edited', employeeController.setEditedStatus); // Установить статус "Редактирован" с is_upload
router.post('/:id/action/fire', employeeController.fireEmployee); // Уволить сотрудника
router.post('/:id/action/reinstate', employeeController.reinstateEmployee); // Принять уволенного сотрудника
router.post('/:id/action/deactivate', employeeController.deactivateEmployee); // Деактивировать сотрудника
router.post('/:id/action/activate', employeeController.activateEmployee); // Активировать сотрудника
router.post('/:id/transfer', authorize('admin'), employeeController.transferEmployeeToCounterparty); // Перевести сотрудника в другую компанию (только admin)
router.delete('/:id', employeeController.deleteEmployee); // Проверка прав в контроллере

// Employee files routes
// Пользователи (user) могут загружать файлы только для своего профиля
router.post('/:employeeId/files', 
  upload.array('files', 10), // максимум 10 файлов за раз
  fixFilenameEncoding,
  employeeFileController.uploadEmployeeFiles
);
router.get('/:employeeId/files', 
  employeeFileController.getEmployeeFiles
);
router.delete('/:employeeId/files/:fileId', 
  employeeFileController.deleteEmployeeFile
);
router.get('/:employeeId/files/:fileId/download', 
  employeeFileController.getEmployeeFileDownloadLink
);

// Get employee file view link
router.get('/:employeeId/files/:fileId/view',
  employeeFileController.getEmployeeFileViewLink
);

export default router;

