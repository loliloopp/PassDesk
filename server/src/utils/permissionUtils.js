import { EmployeeCounterpartyMapping, Setting, UserEmployeeMapping } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Проверяет права доступа пользователя к сотруднику.
 * Выбрасывает AppError(403) если доступ запрещен.
 * 
 * @param {Object} user - объект пользователя (req.user)
 * @param {Object} employee - объект сотрудника (должен содержать employeeCounterpartyMappings или мы их догрузим)
 * @param {string} operation - тип операции: 'read' или 'write' (по умолчанию 'write')
 * @returns {Promise<boolean>} - true если доступ разрешен
 */
export const checkEmployeeAccess = async (user, employee, operation = 'write') => {
  // Админ имеет доступ ко всему
  if (user.role === 'admin') return true;

  const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');

  if (user.counterpartyId === defaultCounterpartyId) {
    // Пользователи дефолтного контрагента (бюро пропусков)
    
    // ✅ Для операции READ - разрешаем доступ к ЛЮБЫМ сотрудникам default контрагента
    if (operation === 'read') {
      // Проверяем, что сотрудник действительно относится к default контрагенту
      let belongsToDefaultCounterparty = false;
      
      if (employee.employeeCounterpartyMappings) {
        belongsToDefaultCounterparty = employee.employeeCounterpartyMappings.some(
          mapping => mapping.counterpartyId === defaultCounterpartyId
        );
      } else {
        // Если маппинги не загружены, проверяем через БД
        const mapping = await EmployeeCounterpartyMapping.findOne({
          where: {
            employeeId: employee.id,
            counterpartyId: defaultCounterpartyId
          }
        });
        belongsToDefaultCounterparty = !!mapping;
      }
      
      if (!belongsToDefaultCounterparty) {
        throw new AppError('Недостаточно прав. Сотрудник не принадлежит вашей организации.', 403);
      }
      
      return true; // Разрешаем чтение
    }
    
    // ✅ Для операции WRITE - проверяем наличие связи в user_employee_mapping
    // Если связь есть - разрешаем редактирование (даже если сотрудник создан другим пользователем)
    const userEmployeeLink = await UserEmployeeMapping.findOne({
      where: {
        userId: user.id,
        employeeId: employee.id,
        counterpartyId: null // Для default контрагента counterpartyId = NULL
      }
    });
    
    if (!userEmployeeLink) {
      throw new AppError('Недостаточно прав. Вы можете управлять только привязанными к вам сотрудниками.', 403);
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
