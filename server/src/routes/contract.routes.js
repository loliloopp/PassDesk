import express from 'express';
import {
  getAllContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract
} from '../controllers/contract.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticate);

// ======================================
// ЧТЕНИЕ - доступно всем авторизованным пользователям
// ======================================
router.get('/', getAllContracts);
router.get('/:id', getContractById);

// ======================================
// ИЗМЕНЕНИЕ - только для администраторов
// ======================================
router.post('/', authorize('admin'), createContract);
router.put('/:id', authorize('admin'), updateContract);
router.delete('/:id', authorize('admin'), deleteContract);

export default router;

