import { EmployeeCounterpartyMapping, Setting } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Проверяет права доступа пользователя к сотруднику.
 * Выбрасывает AppError(403) если доступ запрещен.
 * 
 * @param {Object} user - объект пользователя (req.user)
 * @param {Object} employee - объект сотрудника (должен содержать employeeCounterpartyMappings или мы их догрузим)
 * @returns {Promise<boolean>} - true если доступ разрешен
 */
export const checkEmployeeAccess = async (user, employee) => {
  // Админ имеет доступ ко всему
  if (user.role === 'admin') return true;

  const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');

  if (user.counterpartyId === defaultCounterpartyId) {
    // Пользователи дефолтного контрагента (бюро пропусков) 
    // могут управлять только теми сотрудниками, которых сами создали
    if (employee.createdBy !== user.id) {
      throw new AppError('Недостаточно прав. Вы можете управлять только созданными вами сотрудниками.', 403);
    }
  } else {
    // Пользователи конкретных контрагентов (подрядчики)
    // могут управлять всеми сотрудниками своей организации
    
    let hasAccess = false;

    // Если маппинги уже загружены
    if (employee.employeeCounterpartyMappings) {
      hasAccess = employee.employeeCounterpartyMappings.some(
        mapping => mapping.counterpartyId === user.counterpartyId
      );
    } else {
      // Если маппинги не загружены, проверяем через БД
      const mapping = await EmployeeCounterpartyMapping.findOne({
        where: {
          employeeId: employee.id,
          counterpartyId: user.counterpartyId
        }
      });
      hasAccess = !!mapping;
    }

    if (!hasAccess) {
      throw new AppError('Недостаточно прав. Сотрудник не принадлежит вашей организации.', 403);
    }
  }
  
  return true;
};
