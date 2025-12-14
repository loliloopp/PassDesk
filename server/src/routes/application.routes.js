import express from 'express';
import {
  getAllApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
  copyApplication,
  getContractsForApplication,
  getEmployeesForApplication,
  exportApplicationToWord,
  downloadDeveloperBiometricConsents
} from '../controllers/application.controller.js';
import {
  uploadApplicationFiles,
  getApplicationFiles,
  deleteApplicationFile,
  getApplicationFileDownloadLink,
  getApplicationFileViewLink
} from '../controllers/applicationFile.controller.js';
import { authenticate } from '../middleware/auth.js';
import upload, { fixFilenameEncoding } from '../middleware/upload.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticate);

// Основные CRUD операции
router.get('/', getAllApplications);
router.get('/:id', getApplicationById);
router.post('/', createApplication);
router.put('/:id', updateApplication);
router.delete('/:id', deleteApplication);

// Дополнительные операции
router.post('/:id/copy', copyApplication);
router.get('/:id/export/word', exportApplicationToWord);
router.post('/:id/consents/developer-biometric/download', downloadDeveloperBiometricConsents);


// Вспомогательные endpoints для формы создания заявки
router.get('/helpers/contracts', getContractsForApplication);
router.get('/helpers/employees', getEmployeesForApplication);

// Работа с файлами заявки
router.post('/:applicationId/files', upload.array('files', 10), fixFilenameEncoding, uploadApplicationFiles);
router.get('/:applicationId/files', getApplicationFiles);
router.delete('/:applicationId/files/:fileId', deleteApplicationFile);
router.get('/:applicationId/files/:fileId/download', getApplicationFileDownloadLink);
router.get('/:applicationId/files/:fileId/view', getApplicationFileViewLink);

export default router;

