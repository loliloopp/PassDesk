import { Status, EmployeeStatusMapping, Employee } from '../models/index.js';

/**
 * Сервис для управления статусами сотрудников
 */
class EmployeeStatusService {
  /**
   * Получить все статусы по группам
   */
  static async getAllStatuses() {
    return await Status.findAll({
      order: [['group', 'ASC'], ['name', 'ASC']]
    });
  }

  /**
   * Получить статусы по группе
   */
  static async getStatusesByGroup(group) {
    return await Status.findAll({
      where: { group },
      order: [['name', 'ASC']]
    });
  }

  /**
   * Получить текущий статус сотрудника по группе
   */
  static async getCurrentStatus(employeeId, statusGroup) {
    const mapping = await EmployeeStatusMapping.findOne({
      where: {
        employeeId: employeeId,
        statusGroup: statusGroup,
        isActive: true
      },
      include: [
        {
          model: Status,
          as: 'status'
        }
      ]
    });

    return mapping;
  }

  /**
   * Получить все текущие статусы сотрудника (по всем группам)
   */
  static async getAllCurrentStatuses(employeeId) {
    return await EmployeeStatusMapping.findAll({
      where: {
        employeeId: employeeId,
        isActive: true
      },
      include: [
        {
          model: Status,
          as: 'status'
        }
      ],
      order: [['statusGroup', 'ASC']]
    });
  }

  /**
   * Получить статусы для нескольких сотрудников одним запросом (batch)
   * @param {Array<string>} employeeIds - массив ID сотрудников
   * @returns {Object} объект где ключ = employeeId, значение = массив статусов
   */
  static async getStatusesBatch(employeeIds) {
    const mappings = await EmployeeStatusMapping.findAll({
      where: {
        employeeId: employeeIds,
        isActive: true
      },
      include: [
        {
          model: Status,
          as: 'status'
        }
      ],
      order: [['employeeId', 'ASC'], ['statusGroup', 'ASC']]
    });

    // Группируем по employeeId
    const result = {};
    mappings.forEach(mapping => {
      const empId = mapping.employeeId;
      if (!result[empId]) {
        result[empId] = [];
      }
      result[empId].push(mapping);
    });

    return result;
  }

  /**
   * Установить новый статус для сотрудника
   * Автоматически деактивирует старый статус из той же группы
   */
  static async setStatus(employeeId, statusId, userId) {
    // Получить статус чтобы узнать группу
    const newStatus = await Status.findByPk(statusId);
    if (!newStatus) {
      throw new Error('Статус не найден');
    }

    // Проверить что сотрудник существует
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      throw new Error('Сотрудник не найден');
    }

    // Деактивировать все статусы этой группы для этого сотрудника
    await EmployeeStatusMapping.update(
      { isActive: false },
      {
        where: {
          employeeId: employeeId,
          statusGroup: newStatus.group,
          isActive: true
        }
      }
    );

    // Проверить есть ли уже связь с этим статусом
    let mapping = await EmployeeStatusMapping.findOne({
      where: {
        employeeId: employeeId,
        statusId: statusId
      }
    });

    if (mapping) {
      // Обновить существующую связь
      mapping.isActive = true;
      mapping.updatedBy = userId;
      await mapping.save();
    } else {
      // Создать новую связь
      mapping = await EmployeeStatusMapping.create({
        employeeId: employeeId,
        statusId: statusId,
        statusGroup: newStatus.group,
        createdBy: userId,
        updatedBy: userId,
        isActive: true
      });
    }

    return mapping;
  }

  /**
   * Получить статус сотрудника с полной информацией
   */
  static async getEmployeeWithStatuses(employeeId) {
    const employee = await Employee.findByPk(employeeId, {
      include: [
        {
          model: EmployeeStatusMapping,
          as: 'statusMappings',
          where: { isActive: true },
          include: [
            {
              model: Status,
              as: 'status'
            }
          ]
        }
      ]
    });

    if (!employee) {
      throw new Error('Сотрудник не найден');
    }

    return employee;
  }

  /**
   * Получить список сотрудников с их текущими статусами
   */
  static async getEmployeesWithStatuses(options = {}) {
    const { limit = 50, offset = 0, where = {} } = options;

    return await Employee.findAndCountAll({
      where,
      include: [
        {
          model: EmployeeStatusMapping,
          as: 'statusMappings',
          where: { isActive: true },
          required: false,
          include: [
            {
              model: Status,
              as: 'status'
            }
          ]
        }
      ],
      limit,
      offset,
      distinct: true
    });
  }

  /**
   * Изменить статус по названию (упрощённый метод)
   */
  static async setStatusByName(employeeId, statusName, userId) {
    const status = await Status.findOne({
      where: { name: statusName }
    });

    if (!status) {
      throw new Error(`Статус ${statusName} не найден`);
    }

    return await this.setStatus(employeeId, status.id, userId);
  }

  /**
   * Активировать или создать статус для группы (без деактивации других статусов этой группы)
   * Используется для специальных переходов типа status_hr_fired_off
   */
  static async activateOrCreateStatus(employeeId, statusName, userId, setUploadFlag = false) {
    // Получить статус по названию
    const status = await Status.findOne({
      where: { name: statusName }
    });

    if (!status) {
      throw new Error(`Статус ${statusName} не найден`);
    }

    console.log(`[activateOrCreateStatus] Processing ${statusName} for employee ${employeeId}, setUploadFlag=${setUploadFlag}`);

    // Проверить есть ли уже связь с этим статусом
    let mapping = await EmployeeStatusMapping.findOne({
      where: {
        employeeId: employeeId,
        statusId: status.id,
        statusGroup: status.group
      }
    });

    if (mapping) {
      // Обновить существующую связь
      console.log(`[activateOrCreateStatus] Updating existing mapping: is_active ${mapping.isActive} → true, is_upload ${mapping.isUpload} → ${setUploadFlag}`);
      mapping.isActive = true;
      mapping.isUpload = setUploadFlag;
      mapping.updatedBy = userId;
      await mapping.save();
    } else {
      // Создать новую связь
      console.log(`[activateOrCreateStatus] Creating new mapping with is_active=true, is_upload=${setUploadFlag}`);
      mapping = await EmployeeStatusMapping.create({
        employeeId: employeeId,
        statusId: status.id,
        statusGroup: status.group,
        isActive: true,
        isUpload: setUploadFlag,
        createdBy: userId,
        updatedBy: userId
      });
    }

    console.log(`[activateOrCreateStatus] Mapping after save: is_active=${mapping.isActive}, is_upload=${mapping.isUpload}`);
    return mapping;
  }

  /**
   * Инициализировать статусы для нового сотрудника
   */
  static async initializeEmployeeStatuses(employeeId, userId) {
    console.log('=== INITIALIZING EMPLOYEE STATUSES ===');
    console.log('Employee ID:', employeeId);
    console.log('User ID:', userId);

    // Создать начальные статусы для всех групп
    const statusNames = {
      'status': 'status_draft',
      'status_card': 'status_card_draft',
      'status_active': 'status_active_employed',
      'status_secure': 'status_secure_allow'
    };

    const mappings = [];

    for (const [group, statusName] of Object.entries(statusNames)) {
      console.log(`Looking for status: ${statusName} in group: ${group}`);
      
      const status = await Status.findOne({
        where: { name: statusName, group }
      });

      if (!status) {
        console.error(`Status ${statusName} NOT FOUND!`);
        throw new Error(`Статус ${statusName} не найден`);
      }

      console.log(`Found status: ${status.id}, creating mapping...`);

      const mapping = await EmployeeStatusMapping.create({
        employeeId: employeeId,
        statusId: status.id,
        statusGroup: group,
        createdBy: userId,
        updatedBy: userId,
        isActive: true
      });

      console.log(`✓ Created mapping for ${group}:`, mapping.id);
      mappings.push(mapping);
    }

    console.log('=== EMPLOYEE STATUSES INITIALIZED ===');
    return mappings;
  }
}

export default EmployeeStatusService;
