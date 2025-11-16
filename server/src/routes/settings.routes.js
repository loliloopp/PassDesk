import express from 'express';
import { getSettings, updateSetting } from '../controllers/settings.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты доступны только администраторам
router.use(authenticate, authorize('admin'));

// GET /api/v1/settings - получить все настройки
router.get('/', getSettings);

// PUT /api/v1/settings/:key - обновить настройку по ключу
router.put('/:key', updateSetting);

export default router;

