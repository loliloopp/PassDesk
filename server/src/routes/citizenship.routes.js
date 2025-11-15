import express from 'express';
import {
  getAllCitizenships,
  createCitizenship
} from '../controllers/citizenship.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticate);

router.get('/', getAllCitizenships);
router.post('/', createCitizenship);

export default router;

