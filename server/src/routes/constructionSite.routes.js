import express from 'express';
import {
  getAllConstructionSites,
  getConstructionSiteById,
  createConstructionSite,
  updateConstructionSite,
  deleteConstructionSite
} from '../controllers/constructionSite.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticate);

// ======================================
// ЧТЕНИЕ - доступно всем авторизованным пользователям
// ======================================
router.get('/', getAllConstructionSites);
router.get('/:id', getConstructionSiteById);

// ======================================
// ИЗМЕНЕНИЕ - только для администраторов
// ======================================
router.post('/', authorize('admin'), createConstructionSite);
router.put('/:id', authorize('admin'), updateConstructionSite);
router.delete('/:id', authorize('admin'), deleteConstructionSite);

export default router;

