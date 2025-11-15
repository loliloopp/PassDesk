import express from 'express';
import {
  getAllApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
  copyApplication,
  getContractsForApplication,
  getEmployeesForApplication
} from '../controllers/application.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticate);

// Основные CRUD операции
router.get('/', getAllApplications);
router.get('/:id', getApplicationById);
router.post('/', createApplication);
router.put('/:id', updateApplication);
router.delete('/:id', deleteApplication);

// Дополнительные операции
router.post('/:id/copy', copyApplication);

// Вспомогательные endpoints для формы создания заявки
router.get('/helpers/contracts', getContractsForApplication);
router.get('/helpers/employees', getEmployeesForApplication);

export default router;

