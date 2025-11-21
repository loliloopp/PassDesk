import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator.js';
import { authenticate, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as employeeController from '../controllers/employee.controller.js';
import * as employeeFileController from '../controllers/employeeFile.controller.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Validation rules
const createEmployeeValidation = [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('middleName').optional().trim(),
  body('positionId').notEmpty().withMessage('Должность обязательна'), // Изменено с position на positionId
  body('email').optional().trim(),
  body('phone').optional().trim()
];

const updateEmployeeValidation = [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('middleName').optional().trim(),
  body('positionId').optional().notEmpty().withMessage('Должность обязательна'), // Изменено с position на positionId
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
router.get('/my-profile', employeeController.getMyProfile); // Получить свой профиль
router.put('/my-profile', updateMyProfileValidation, validate, employeeController.updateMyProfile); // Обновить свой профиль
router.get('/', employeeController.getAllEmployees);
router.get('/:id', employeeController.getEmployeeById);
router.post('/', createEmployeeValidation, validate, employeeController.createEmployee);
router.put('/:id', updateEmployeeValidation, validate, employeeController.updateEmployee); // Убрали authorize('admin'), проверка внутри контроллера
router.put('/:id/construction-sites', employeeController.updateEmployeeConstructionSites); // Убрали authorize('admin')
router.put('/:id/department', employeeController.updateEmployeeDepartment); // Убрали authorize('admin')
router.delete('/:id', authorize('admin'), employeeController.deleteEmployee);
router.get('/search', employeeController.searchEmployees);

// Employee files routes
// Пользователи (user) могут загружать файлы только для своего профиля
router.post('/:employeeId/files', 
  upload.array('files', 10), // максимум 10 файлов за раз
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

