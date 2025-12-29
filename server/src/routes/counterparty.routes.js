import express from 'express';
import {
  getAllCounterparties,
  getCounterpartyById,
  createCounterparty,
  updateCounterparty,
  deleteCounterparty,
  getCounterpartiesStats,
  generateRegistrationCode,
  getCounterpartyConstructionSites,
  saveCounterpartyConstructionSites,
  getAvailableCounterparties
} from '../controllers/counterparty.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticate);

// ======================================
// ЧТЕНИЕ - доступно всем авторизованным пользователям
// ======================================
router.get('/', getAllCounterparties);
router.get('/available', getAvailableCounterparties); // Список доступных контрагентов для выбора
router.get('/stats', getCounterpartiesStats);
router.get('/:id', getCounterpartyById);
router.get('/:id/construction-sites', getCounterpartyConstructionSites);

// ======================================
// ИЗМЕНЕНИЕ - только для администраторов и пользователей (не default)
// ======================================
router.post('/', authorize('admin', 'user'), createCounterparty);
router.post('/:id/generate-registration-code', authorize('admin'), generateRegistrationCode);
router.post('/:id/construction-sites', authorize('admin', 'user'), saveCounterpartyConstructionSites);
router.put('/:id', authorize('admin', 'user'), updateCounterparty);
router.delete('/:id', authorize('admin'), deleteCounterparty);

export default router;

