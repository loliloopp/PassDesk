/**
 * Скрипт для пересчета статусов сотрудников с учетом настроек контрагентов
 * 
 * Использование:
 * node server/src/scripts/recalculateEmployeeStatuses.js
 */

import { Employee, Citizenship, EmployeeCounterpartyMapping, Counterparty, Setting } from '../models/index.js';
import EmployeeStatusService from '../services/employeeStatusService.js';
import { isEmployeeCardComplete, DEFAULT_FORM_CONFIG } from '../utils/employeeFieldsConfig.js';

const recalculateStatuses = async () => {
  console.log('🔄 Начинаем пересчет статусов сотрудников...\n');

  try {
    // 1. Загружаем настройки
    const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');
    const configDefaultStr = await Setting.getSetting('employee_form_config_default');
    const configExternalStr = await Setting.getSetting('employee_form_config_external');

    let formConfigDefault = DEFAULT_FORM_CONFIG;
    let formConfigExternal = DEFAULT_FORM_CONFIG;

    if (configDefaultStr) {
      try {
        formConfigDefault = JSON.parse(configDefaultStr);
        console.log(`✅ Загружена конфигурация для default контрагента`);
      } catch (e) {
        console.warn('⚠️ Ошибка парсинга employee_form_config_default, используем DEFAULT_FORM_CONFIG');
      }
    }

    if (configExternalStr) {
      try {
        formConfigExternal = JSON.parse(configExternalStr);
        console.log(`✅ Загружена конфигурация для external контрагентов`);
      } catch (e) {
        console.warn('⚠️ Ошибка парсинга employee_form_config_external, используем DEFAULT_FORM_CONFIG');
      }
    }

    console.log(`\n📋 Default counterparty ID: ${defaultCounterpartyId}\n`);

    // 2. Загружаем всех сотрудников
    const employees = await Employee.findAll({
      include: [
        {
          model: Citizenship,
          as: 'citizenship',
          attributes: ['id', 'name', 'requiresPatent']
        },
        {
          model: EmployeeCounterpartyMapping,
          as: 'employeeCounterpartyMappings',
          include: [
            {
              model: Counterparty,
              as: 'counterparty',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    console.log(`📊 Всего сотрудников: ${employees.length}\n`);

    // 3. Пересчитываем статусы
    let updatedCount = 0;
    let completedCount = 0;
    let draftCount = 0;

    for (const employee of employees) {
      const employeeData = employee.toJSON();
      
      // Определяем контрагента
      const counterpartyId = employeeData.employeeCounterpartyMappings?.[0]?.counterpartyId;
      const isDefaultCounterparty = counterpartyId === defaultCounterpartyId;
      
      // Выбираем конфигурацию
      const formConfig = isDefaultCounterparty ? formConfigDefault : formConfigExternal;
      
      // Рассчитываем новый статус
      const isComplete = isEmployeeCardComplete(employeeData, formConfig, false);
      const newStatusCard = isComplete ? 'completed' : 'draft';

      // Получаем текущий статус status_card
      const currentCardStatus = await EmployeeStatusService.getCurrentStatus(employee.id, 'status_card');
      const currentStatusName = currentCardStatus?.status?.name;

      // Обновляем только если статус изменился
      if (
        (newStatusCard === 'completed' && currentStatusName !== 'status_card_completed') ||
        (newStatusCard === 'draft' && currentStatusName !== 'status_card_draft')
      ) {
        const newStatusName = newStatusCard === 'completed' ? 'status_card_completed' : 'status_card_draft';
        
        await EmployeeStatusService.setStatusByName(
          employee.id,
          newStatusName,
          employee.createdBy || employee.updatedBy // userId
        );

        updatedCount++;
        
        if (newStatusCard === 'completed') {
          completedCount++;
          console.log(`✅ ${employee.lastName} ${employee.firstName}: draft → completed`);
        } else {
          draftCount++;
          console.log(`⚠️  ${employee.lastName} ${employee.firstName}: completed → draft`);
        }
      }
    }

    console.log(`\n✅ Пересчет завершен!`);
    console.log(`📊 Обновлено статусов: ${updatedCount}`);
    console.log(`   - Стали completed: ${completedCount}`);
    console.log(`   - Стали draft: ${draftCount}`);
    
  } catch (error) {
    console.error('❌ Ошибка при пересчете статусов:', error);
    throw error;
  }
};

// Запуск скрипта
recalculateStatuses()
  .then(() => {
    console.log('\n✅ Скрипт успешно завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Скрипт завершился с ошибкой:', error);
    process.exit(1);
  });

