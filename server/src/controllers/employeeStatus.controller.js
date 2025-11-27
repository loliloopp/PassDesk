import EmployeeStatusService from '../services/employeeStatusService.js';

/**
 * Контроллер для управления статусами сотрудников
 */
export const employeeStatusController = {
  /**
   * Получить все статусы
   */
  async getAllStatuses(req, res) {
    try {
      const statuses = await EmployeeStatusService.getAllStatuses();
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Получить статусы по группе
   */
  async getStatusesByGroup(req, res) {
    try {
      const { group } = req.params;
      const statuses = await EmployeeStatusService.getStatusesByGroup(group);
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Получить текущий статус сотрудника по группе
   */
  async getEmployeeCurrentStatus(req, res) {
    try {
      const { employeeId, group } = req.params;
      const status = await EmployeeStatusService.getCurrentStatus(employeeId, group);
      
      if (!status) {
        return res.status(404).json({ error: 'Статус не найден' });
      }

      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Получить все текущие статусы сотрудника
   */
  async getEmployeeAllStatuses(req, res) {
    try {
      const { employeeId } = req.params;
      const statuses = await EmployeeStatusService.getAllCurrentStatuses(employeeId);
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Установить новый статус для сотрудника
   */
  async setEmployeeStatus(req, res) {
    try {
      const { employeeId } = req.params;
      const { statusId } = req.body;
      const userId = req.user.id;

      if (!statusId) {
        return res.status(400).json({ error: 'statusId обязателен' });
      }

      const mapping = await EmployeeStatusService.setStatus(employeeId, statusId, userId);
      res.json(mapping);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  /**
   * Получить сотрудника со всеми его текущими статусами
   */
  async getEmployeeWithStatuses(req, res) {
    try {
      const { employeeId } = req.params;
      const employee = await EmployeeStatusService.getEmployeeWithStatuses(employeeId);
      res.json(employee);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  },

  /**
   * Получить список сотрудников со статусами
   */
  async getEmployeesWithStatuses(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const result = await EmployeeStatusService.getEmployeesWithStatuses({
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Получить статусы для нескольких сотрудников одним запросом (batch)
   */
  async getStatusesBatch(req, res) {
    try {
      const { employeeIds } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds)) {
        return res.status(400).json({ error: 'employeeIds должен быть массивом' });
      }

      if (employeeIds.length === 0) {
        return res.json({});
      }

      if (employeeIds.length > 1000) {
        return res.status(400).json({ error: 'Максимум 1000 сотрудников за один запрос' });
      }

      const statuses = await EmployeeStatusService.getStatusesBatch(employeeIds);
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

