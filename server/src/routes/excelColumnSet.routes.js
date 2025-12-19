import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator.js';
import { authenticate } from '../middleware/auth.js';
import * as excelColumnSetController from '../controllers/excelColumnSet.controller.js';

const router = express.Router();

// Все маршруты требуют авторизации
router.use(authenticate);

// Validation rules
const createColumnSetValidation = [
  body('name')
    .notEmpty()
    .withMessage('Название набора обязательно')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Название должно быть от 1 до 100 символов'),
  body('columns')
    .isArray({ min: 1 })
    .withMessage('Необходимо выбрать хотя бы один столбец'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault должен быть булевым значением'),
];

const updateColumnSetValidation = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Название набора не может быть пустым')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Название должно быть от 1 до 100 символов'),
  body('columns')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Необходимо выбрать хотя бы один столбец'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault должен быть булевым значением'),
];

// Routes
router.get('/', excelColumnSetController.getAll);
router.get('/:id', excelColumnSetController.getById);
router.post('/', createColumnSetValidation, validate, excelColumnSetController.create);
router.put('/:id', updateColumnSetValidation, validate, excelColumnSetController.update);
router.delete('/:id', excelColumnSetController.remove);
router.patch('/:id/set-default', excelColumnSetController.setDefault);

export default router;

