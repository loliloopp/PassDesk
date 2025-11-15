import express from 'express';
import {
  getAllCounterparties,
  getCounterpartyById,
  createCounterparty,
  updateCounterparty,
  deleteCounterparty,
  getCounterpartiesStats
} from '../controllers/counterparty.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticate);

router.get('/', getAllCounterparties);
router.get('/stats', getCounterpartiesStats);
router.get('/:id', getCounterpartyById);
router.post('/', createCounterparty);
router.put('/:id', updateCounterparty);
router.delete('/:id', deleteCounterparty);

export default router;

