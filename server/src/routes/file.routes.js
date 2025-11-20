import express from 'express';
import { authenticate } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as fileController from '../controllers/file.controller.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Routes
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.post('/upload-multiple', upload.array('files', 5), fileController.uploadMultipleFiles);
router.get('/id/:fileId', fileController.getFileById); // Получить файл по ID
router.get('/:fileKey', fileController.getFile); // Получить файл по ключу
router.get('/:fileKey/public', fileController.getPublicLink);
router.delete('/:fileKey', fileController.deleteFile);

export default router;

