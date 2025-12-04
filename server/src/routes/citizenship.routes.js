import express from 'express';
import {
  getAllCitizenships,
  createCitizenship,
  updateCitizenship,
  addSynonym,
  updateSynonym,
  deleteSynonym,
  deleteCitizenship
} from '../controllers/citizenship.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticate);

// Получить все гражданства (доступно всем)
router.get('/', getAllCitizenships);

// Создать/обновить/удалить гражданство (только admin)
router.post('/', authorize('admin'), createCitizenship);
router.put('/:id', authorize('admin'), updateCitizenship);
router.delete('/:id', authorize('admin'), deleteCitizenship);

// Работа с синонимами (только admin)
router.post('/:citizenshipId/synonyms', authorize('admin'), addSynonym);
router.put('/synonyms/:id', authorize('admin'), updateSynonym);
router.delete('/synonyms/:id', authorize('admin'), deleteSynonym);

export default router;

