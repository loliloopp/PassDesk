import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validator.js';
import { authenticate, authenticateWithoutActivationCheck, authorize } from '../middleware/auth.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

// Маршруты для текущего пользователя (доступны всем авторизованным, даже неактивным)
router.get('/profile/me', authenticateWithoutActivationCheck, userController.getMyProfile);
router.put('/profile/me', authenticateWithoutActivationCheck, [
  body('firstName').optional().notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
], validate, userController.updateMyProfile);
router.post('/profile/change-password', authenticateWithoutActivationCheck, [
  body('currentPassword').notEmpty().withMessage('Необходимо указать текущий пароль'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Новый пароль должен содержать минимум 8 символов'),
], validate, userController.changeMyPassword);

// Остальные маршруты требуют активного пользователя и роли admin
router.use(authenticate);
router.use(authorize('admin'));

// Validation rules
const createUserValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль должен содержать минимум 6 символов'),
  body('firstName').notEmpty().trim(),
  body('lastName').optional().trim(),
  body('role').optional().isIn(['admin', 'user']),
];

const updateUserValidation = [
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().trim(),
  body('role').optional().isIn(['admin', 'user']),
];

const updatePasswordValidation = [
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Новый пароль должен содержать минимум 6 символов'),
  body('currentPassword').optional().notEmpty(),
];

// Routes
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', createUserValidation, validate, userController.createUser);
router.put('/:id', updateUserValidation, validate, userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.patch('/:id/password', updatePasswordValidation, validate, userController.updatePassword);
router.patch('/:id/toggle-status', userController.toggleUserStatus);

export default router;

