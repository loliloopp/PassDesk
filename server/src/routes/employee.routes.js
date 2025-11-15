import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator.js';
import { authenticate, authorize } from '../middleware/auth.js';
import * as employeeController from '../controllers/employee.controller.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Validation rules
const createEmployeeValidation = [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('middleName').optional().trim(),
  body('position').notEmpty().trim(),
  body('department').notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim()
];

const updateEmployeeValidation = [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('middleName').optional().trim(),
  body('position').optional().notEmpty().trim(),
  body('department').optional().notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim()
];

// Routes
router.get('/', employeeController.getAllEmployees);
router.get('/:id', employeeController.getEmployeeById);
router.post('/', authorize('admin', 'manager'), createEmployeeValidation, validate, employeeController.createEmployee);
router.put('/:id', authorize('admin', 'manager'), updateEmployeeValidation, validate, employeeController.updateEmployee);
router.delete('/:id', authorize('admin'), employeeController.deleteEmployee);
router.get('/search', employeeController.searchEmployees);

export default router;

