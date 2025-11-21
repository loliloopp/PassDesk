import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
  importPositions
} from '../controllers/position.controller.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticate);

// GET /api/v1/positions - получить все должности
router.get('/', getAllPositions);

// POST /api/v1/positions/import - импорт должностей из Excel (только admin)
// ВАЖНО: этот роут должен быть ПЕРЕД /:id, иначе 'import' будет восприниматься как id
router.post('/import', authorize('admin'), importPositions);

// POST /api/v1/positions - создать должность (только admin)
router.post('/', authorize('admin'), createPosition);

// GET /api/v1/positions/:id - получить должность по ID
router.get('/:id', getPositionById);

// PUT /api/v1/positions/:id - обновить должность (только admin)
router.put('/:id', authorize('admin'), updatePosition);

// DELETE /api/v1/positions/:id - удалить должность (только admin)
router.delete('/:id', authorize('admin'), deletePosition);

export default router;

