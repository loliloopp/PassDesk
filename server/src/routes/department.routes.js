import express from 'express';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../controllers/department.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticate);

// Получить все подразделения (доступно всем аутентифицированным пользователям)
router.get('/', getAllDepartments);

// Получить подразделение по ID
router.get('/:id', getDepartmentById);

// Создать подразделение (admin и manager)
router.post('/', authorize('admin', 'manager'), createDepartment);

// Обновить подразделение (admin и manager)
router.put('/:id', authorize('admin', 'manager'), updateDepartment);

// Удалить подразделение (admin и manager)
router.delete('/:id', authorize('admin', 'manager'), deleteDepartment);

export default router;

