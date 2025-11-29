import express from 'express';
import { employeeStatusController } from '../controllers/employeeStatus.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Все статусы (публичное)
router.get('/employees/statuses/all', authenticate, employeeStatusController.getAllStatuses);

// Статусы по группе (публичное)
router.get('/employees/statuses/group/:group', authenticate, employeeStatusController.getStatusesByGroup);

// Текущий статус сотрудника по группе
router.get('/employees/:employeeId/status/group/:group', authenticate, employeeStatusController.getEmployeeCurrentStatus);

// Все текущие статусы сотрудника
router.get('/employees/:employeeId/statuses', authenticate, employeeStatusController.getEmployeeAllStatuses);

// Batch: получить статусы для нескольких сотрудников одним запросом
router.post('/employees/statuses/batch', authenticate, employeeStatusController.getStatusesBatch);

// Сотрудник со статусами (с деталями)
router.get('/employees/:employeeId/with-statuses', authenticate, employeeStatusController.getEmployeeWithStatuses);

// Список сотрудников со статусами
router.get('/employees/with-statuses', authenticate, employeeStatusController.getEmployeesWithStatuses);

// Установить новый статус (требует прав admin)
router.post('/employees/:employeeId/status', authenticate, authorize('admin'), employeeStatusController.setEmployeeStatus);

export default router;

