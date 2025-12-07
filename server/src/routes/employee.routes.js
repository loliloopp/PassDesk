import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator.js';
import { authenticate, authorize } from '../middleware/auth.js';
import upload, { fixFilenameEncoding } from '../middleware/upload.js';
import * as employeeController from '../controllers/employee.controller.js';
import * as employeeFileController from '../controllers/employeeFile.controller.js';

const router = express.Router();

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

// Импорт сотрудников из Excel (только admin) - ДОЛЖНО быть перед /:id
router.post('/import/validate', authorize('admin'), employeeController.validateEmployeesImport); // Валидация данных
router.post('/import/execute', authorize('admin'), employeeController.importEmployees); // Финальный импорт

// Общие маршруты
router.get('/', employeeController.getAllEmployees);
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

