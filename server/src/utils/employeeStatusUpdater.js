/**
 * Утилита для автоматического обновления статусов сотрудника
 * в зависимости от полноты заполнения карточки
 */

import { EmployeeStatusMapping, Status } from '../models/index.js';
import { isEmployeeCardComplete } from './employeeFieldsConfig.js';

/**
 * Обновляет статусы сотрудника в зависимости от полноты данных
 * @param {Object} employee - объект сотрудника (должен включать citizenship)
 * @param {Object} formConfig - конфигурация полей для контрагента
 * @param {Object} statusMap - маппинг статусов {status_draft: id, status_new: id, ...}
 * @param {string} userId - ID пользователя для createdBy/updatedBy
 * @returns {Promise<{isComplete: boolean, statusNames: {status: string, statusCard: string}, missingFields: Array<string>}>}
 */
export const updateEmployeeStatusesByCompleteness = async (employee, formConfig, statusMap, userId) => {
  // Импортируем функцию получения недостающих полей
  const { getMissingRequiredFields } = await import('./employeeFieldsConfig.js');
  
  // Проверяем полноту карточки
  const isComplete = isEmployeeCardComplete(employee, formConfig, false);
  const missingFields = !isComplete ? getMissingRequiredFields(employee, formConfig) : [];

  console.log(`   📊 ПРОВЕРКА ПОЛНОТЫ ДАННЫХ:`);
  console.log(`      Сотрудник: ${employee.lastName} ${employee.firstName}`);
  console.log(`      Результат: ${isComplete ? '✅ ВСЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ ЗАПОЛНЕНЫ' : '⚠️  ЕСТЬ НЕЗАПОЛНЕННЫЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ'}`);
  
  if (!isComplete && missingFields.length > 0) {
    console.log(`      Незаполненные поля (${missingFields.length}): ${missingFields.join(', ')}`);
  }

  // Определяем целевые статусы
  const targetStatuses = isComplete
    ? {
        status: 'status_new',
        statusCard: 'status_card_completed'
      }
    : {
        status: 'status_draft',
        statusCard: 'status_card_draft'
      };

  console.log(`   🏷️  ЦЕЛЕВЫЕ СТАТУСЫ: ${targetStatuses.status} + ${targetStatuses.statusCard}`);

  // Деактивируем все старые статусы группы 'status' и 'draft'
  await EmployeeStatusMapping.update(
    { isActive: false, updatedBy: userId, updatedAt: new Date() },
    { 
      where: { 
        employeeId: employee.id,
        statusGroup: ['status', 'draft'] // Учитываем старые группы
      }
    }
  );

  // Обновляем или создаем статус (основной)
  let statusMapping;
  let statusCreated = false;
  const existingStatus = await EmployeeStatusMapping.findOne({
    where: {
      employeeId: employee.id,
      statusGroup: 'status',
      statusId: statusMap[targetStatuses.status]
    }
  });

  if (existingStatus) {
    await existingStatus.update({
      isActive: true,
      updatedBy: userId,
      updatedAt: new Date()
    });
    statusMapping = existingStatus;
  } else {
    statusMapping = await EmployeeStatusMapping.create({
      employeeId: employee.id,
      statusId: statusMap[targetStatuses.status],
      statusGroup: 'status',
      isActive: true,
      createdBy: userId,
      updatedBy: userId
    });
    statusCreated = true;
  }

  console.log(`   ${statusCreated ? '✨ СОЗДАН' : '🔄 ОБНОВЛЕН'} основной статус: ${targetStatuses.status}`);

  // Деактивируем все старые статусы группы 'status_card' и 'card draft'
  await EmployeeStatusMapping.update(
    { isActive: false, updatedBy: userId, updatedAt: new Date() },
    { 
      where: { 
        employeeId: employee.id,
        statusGroup: ['status_card', 'card draft'] // Учитываем старые группы
      }
    }
  );

  // Обновляем или создаем статус карточки
  let statusCardMapping;
  let statusCardCreated = false;
  const existingStatusCard = await EmployeeStatusMapping.findOne({
    where: {
      employeeId: employee.id,
      statusGroup: 'status_card',
      statusId: statusMap[targetStatuses.statusCard]
    }
  });

  if (existingStatusCard) {
    await existingStatusCard.update({
      isActive: true,
      updatedBy: userId,
      updatedAt: new Date()
    });
    statusCardMapping = existingStatusCard;
  } else {
    statusCardMapping = await EmployeeStatusMapping.create({
      employeeId: employee.id,
      statusId: statusMap[targetStatuses.statusCard],
      statusGroup: 'status_card',
      isActive: true,
      createdBy: userId,
      updatedBy: userId
    });
    statusCardCreated = true;
  }

  console.log(`   ${statusCardCreated ? '✨ СОЗДАН' : '🔄 ОБНОВЛЕН'} статус карточки: ${targetStatuses.statusCard}`);

  return {
    isComplete,
    statusNames: {
      status: targetStatuses.status,
      statusCard: targetStatuses.statusCard
    },
    missingFields
  };
};

/**
 * Получает все необходимые статусы для импорта
 * @returns {Promise<Object>} - маппинг статусов {status_draft: id, status_new: id, ...}
 */
export const getImportStatuses = async () => {
  const statuses = await Status.findAll({
    where: {
      name: ['status_draft', 'status_card_draft', 'status_new', 'status_card_completed']
    }
  });

  const statusMap = {};
  statuses.forEach(s => {
    statusMap[s.name] = s.id;
  });

  // Проверяем что все статусы найдены
  const requiredStatuses = ['status_draft', 'status_card_draft', 'status_new', 'status_card_completed'];
  const missingStatuses = requiredStatuses.filter(name => !statusMap[name]);

  if (missingStatuses.length > 0) {
    throw new Error(`Не найдены статусы: ${missingStatuses.join(', ')}`);
  }

  console.log('✅ Все необходимые статусы загружены:', Object.keys(statusMap).join(', '));

  return statusMap;
};

