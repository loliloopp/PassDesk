import express from 'express';
import {
  getAllConstructionSites,
  getConstructionSiteById,
  createConstructionSite,
  updateConstructionSite,
  deleteConstructionSite
} from '../controllers/constructionSite.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllConstructionSites);
router.get('/:id', getConstructionSiteById);
router.post('/', createConstructionSite);
router.put('/:id', updateConstructionSite);
router.delete('/:id', deleteConstructionSite);

export default router;

