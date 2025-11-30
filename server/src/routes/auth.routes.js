import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator.js';
import * as authController from '../controllers/auth.controller.js';
import { authenticate, authenticateForLogout } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Введите корректный email'),
  body('password').isLength({ min: 8 }).withMessage('Пароль должен содержать минимум 8 символов'),
  body('fullName').notEmpty().trim().withMessage('ФИО обязательно')
];

// Routes
// Публичная регистрация (без authenticate middleware)
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/logout', authenticateForLogout, authController.logout);
router.post('/refresh', authController.refreshToken);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;

