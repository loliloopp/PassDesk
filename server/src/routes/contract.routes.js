import express from 'express';
import {
  getAllContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract
} from '../controllers/contract.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllContracts);
router.get('/:id', getContractById);
router.post('/', createContract);
router.put('/:id', updateContract);
router.delete('/:id', deleteContract);

export default router;

