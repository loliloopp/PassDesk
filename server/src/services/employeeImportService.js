/**
 * Сервис для импорта сотрудников из Excel
 */

import {
  Employee,
  Counterparty,
  Citizenship,
  Position,
  Status,
  EmployeeCounterpartyMapping,
  EmployeeStatusMapping,
  Setting
} from '../models/index.js';
import {
  validateEmployeeForImport,
  checkEmployeeConflict,
  validateKppConsistency
} from '../utils/importValidation.js';
import { AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';
import { getImportStatuses, updateEmployeeStatusesByCompleteness } from '../utils/employeeStatusUpdater.js';
import { DEFAULT_FORM_CONFIG } from '../utils/employeeFieldsConfig.js';

/**
 * Валидирует данные для импорта сотрудников
 */
export const validateEmployeesImport = async (employees, userId, userCounterpartyId) => {
  console.log('📥 validateEmployeesImport - входные данные:', {
    count: Array.isArray(employees) ? employees.length : 0,
    sample: employees?.[0],
    userCounterpartyId
  });

  if (!Array.isArray(employees) || employees.length === 0) {
    throw new AppError('Данные сотрудников не предоставлены', 400);
  }

  if (!userCounterpartyId) {
    throw new AppError('У пользователя не указан контрагент', 403);
  }

  // Проверяем требуемые статусы
  const requiredStatuses = ['status_draft', 'status_card_draft'];
  const foundStatuses = await Status.findAll({
    where: { name: requiredStatuses }
  });

  const foundStatusNames = foundStatuses.map(s => s.name);
  const missingStatuses = requiredStatuses.filter(s => !foundStatusNames.includes(s));

  if (missingStatuses.length > 0) {
    console.error('❌ Отсутствуют статусы:', missingStatuses);
    throw new AppError(
      `Ошибка системы: не найдены статусы: ${missingStatuses.join(', ')}`,
      500
    );
  }

  console.log('✅ Все требуемые статусы найдены');

  // Проверяем консистентность КПП для одного ИНН
  const kppErrors = validateKppConsistency(employees);
  const validationErrors = kppErrors.map(err => ({
    rowIndex: err.rowIndex,
    lastName: employees[err.rowIndex - 1]?.lastName || '',
    errors: [err.error]
  }));

  // Валидируем каждого сотрудника
  const validatedEmployees = [];
  const conflictingInns = [];
  const existingEmployeesMap = {};

  for (let index = 0; index < employees.length; index++) {
    const emp = employees[index];

    // Пропускаем строки с ошибками КПП
    if (kppErrors.some(e => e.rowIndex === index + 1)) {
      continue;
    }

    try {
      const validation = await validateEmployeeForImport(emp, userId);

      if (!validation.valid) {
        validationErrors.push({
          rowIndex: index + 1,
          lastName: emp.lastName || '',
          errors: validation.errors
        });
        continue;
      }

      const validated = validation.validated;
      validated.rowIndex = index + 1;

      // 🔒 ПРОВЕРКА БЕЗОПАСНОСТИ: Контрагент должен принадлежать пользователю
      if (validated.counterparty && validated.counterparty.id !== userCounterpartyId) {
        validationErrors.push({
          rowIndex: index + 1,
          lastName: emp.lastName || '',
          errors: [`Нет прав для импорта в контрагента "${validated.counterparty.name}". Вы можете импортировать только в своего контрагента.`]
        });
        continue;
      }

      // Проверяем конфликты
      const conflicts = await checkEmployeeConflict(validated);

      if (conflicts.length > 0 && validated.inn) {
        // Есть конфликты по ИНН, СНИЛС или ФИО
        const existingByInn = await Employee.findOne({
          where: { inn: validated.inn },
          attributes: ['id', 'firstName', 'lastName', 'middleName', 'inn', 'snils']
        });

        if (existingByInn && !existingEmployeesMap[validated.inn]) {
          conflictingInns.push({
            inn: validated.inn,
            newEmployee: {
              firstName: validated.firstName,
              lastName: validated.lastName,
              middleName: validated.middleName,
              inn: validated.inn,
              snils: validated.snils
            },
            existingEmployee: {
              id: existingByInn.id,
              firstName: existingByInn.firstName,
              lastName: existingByInn.lastName,
              middleName: existingByInn.middleName,
              inn: existingByInn.inn,
              snils: existingByInn.snils
            }
          });
          existingEmployeesMap[validated.inn] = existingByInn;
          continue;
        }
      }

      validatedEmployees.push(validated);
    } catch (error) {
      console.error(`⚠️ Ошибка валидации строки ${index + 1}:`, error.message);
      validationErrors.push({
        rowIndex: index + 1,
        lastName: emp.lastName || '',
        errors: [error.message]
      });
    }
  }

  console.log(`📊 Результаты валидации:`, {
    validEmployeesCount: validatedEmployees.length,
    validationErrorsCount: validationErrors.length,
    conflictingInnsCount: conflictingInns.length
  });

  return {
    validEmployees: validatedEmployees,
    validationErrors,
    conflictingInns,
    hasErrors: validationErrors.length > 0,
    hasConflicts: conflictingInns.length > 0
  };
};

/**
 * Импортирует сотрудников с разрешением конфликтов
 */
export const importEmployees = async (validatedEmployees, conflictResolutions, userId, userCounterpartyId) => {
  console.log('📥 importEmployees - начало импорта:', {
    count: validatedEmployees?.length || 0,
    resolutions: Object.keys(conflictResolutions || {}).length,
    userCounterpartyId
  });

  if (!Array.isArray(validatedEmployees) || validatedEmployees.length === 0) {
    throw new AppError('Нет данных для импорта', 400);
  }

  if (!userCounterpartyId) {
    throw new AppError('У пользователя не указан контрагент', 403);
  }

  // 🔒 КРИТИЧЕСКАЯ ПРОВЕРКА: Загружаем контрагент пользователя
  const userCounterparty = await Counterparty.findByPk(userCounterpartyId);
  if (!userCounterparty) {
    throw new AppError('Контрагент пользователя не найден', 403);
  }
  console.log(`🏢 Контрагент пользователя: ${userCounterparty.name} (ИНН: ${userCounterparty.inn})`);

  // 🔒 КРИТИЧЕСКАЯ ПРОВЕРКА: Все сотрудники должны относиться к контрагенту пользователя
  const invalidEmployees = validatedEmployees.filter(emp => {
    const empCounterpartyInn = emp.counterparty?.inn;
    return empCounterpartyInn !== userCounterparty.inn;
  });

  if (invalidEmployees.length > 0) {
    console.error('❌ Попытка импорта в чужого контрагента:', invalidEmployees.map(e => ({
      fio: `${e.lastName} ${e.firstName}`,
      counterpartyInn: e.counterparty?.inn
    })));
    throw new AppError('ЗАПРЕЩЕНО: попытка импорта сотрудников в контрагента, не принадлежащего пользователю', 403);
  }

  console.log(`✅ Все ${validatedEmployees.length} сотрудников относятся к контрагенту пользователя`);

  // Получаем все необходимые статусы (включая для полных карточек)
  const statusMap = await getImportStatuses();

  // Загружаем конфигурацию полей для контрагента пользователя
  const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');
  const isDefaultCounterparty = userCounterparty.id === defaultCounterpartyId;

  let formConfig = DEFAULT_FORM_CONFIG;

  try {
    const configKey = isDefaultCounterparty 
      ? 'employee_form_config_default' 
      : 'employee_form_config_external';
    
    const configStr = await Setting.getSetting(configKey);
    
    if (configStr) {
      formConfig = JSON.parse(configStr);
      console.log(`✅ Загружена конфигурация полей: ${configKey}`);
    } else {
      console.log(`⚠️  Конфигурация ${configKey} не найдена, используется дефолтная`);
    }
  } catch (error) {
    console.warn('⚠️  Ошибка загрузки конфигурации полей, используется дефолтная:', error.message);
  }

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  const batchSize = 100;

  for (let i = 0; i < validatedEmployees.length; i += batchSize) {
    const batch = validatedEmployees.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (emp) => {
        try {
          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`📝 ИМПОРТ СОТРУДНИКА: ${emp.lastName} ${emp.firstName} ${emp.middleName || ''}`);
          console.log(`   📋 Данные из файла:`, {
            inn: emp.inn,
            snils: emp.snils,
            kig: emp.kig,
            birthDate: emp.birthDate,
            kigEndDate: emp.kigEndDate,
            citizenship: emp.citizenship?.name,
            position: emp.position?.name,
            counterpartyInn: emp.counterparty?.inn
          });

          // Проверяем конфликт по ИНН
          const resolution = emp.inn ? conflictResolutions?.[emp.inn] : null;

          let employee;
          let isCreated = false;
          let existingEmployee = null;

          // ШАГ 1: Поиск по ИНН (если есть)
          if (emp.inn) {
            console.log(`   🔍 Ищем по ИНН: ${emp.inn}`);
            existingEmployee = await Employee.findOne({
              where: { inn: emp.inn }
            });

            if (existingEmployee) {
              console.log(`   ✅ Найден сотрудник по ИНН:`, {
                id: existingEmployee.id,
                uuid: existingEmployee.id,
                idAll: existingEmployee.idAll,
                fio: `${existingEmployee.lastName} ${existingEmployee.firstName} ${existingEmployee.middleName || ''}`,
                hasInn: !!existingEmployee.inn,
                hasSnils: !!existingEmployee.snils,
                hasCitizenship: !!existingEmployee.citizenshipId
              });
            } else {
              console.log(`   ⚠️  По ИНН не найден, ищем по ФИО...`);
            }
          }

          // ШАГ 2: Если не нашли по ИНН - ищем по ФИО среди сотрудников ЭТОГО контрагента
          if (!existingEmployee && emp.firstName && emp.lastName) {
            console.log(`   🔍 Ищем по ФИО среди сотрудников контрагента: ${emp.lastName} ${emp.firstName} ${emp.middleName || ''}`);
            
            // Сначала ищем всех сотрудников с таким ФИО
            const candidateEmployees = await Employee.findAll({
              where: {
                firstName: emp.firstName,
                lastName: emp.lastName,
                middleName: emp.middleName || null
              }
            });

            console.log(`   📊 Найдено кандидатов с таким ФИО: ${candidateEmployees.length}`);

            // Проверяем, есть ли среди них сотрудник этого контрагента
            for (const candidate of candidateEmployees) {
              const mapping = await EmployeeCounterpartyMapping.findOne({
                where: {
                  employeeId: candidate.id,
                  counterpartyId: userCounterparty.id
                }
              });

              if (mapping) {
                existingEmployee = candidate;
                console.log(`   ✅ Найден сотрудник по ФИО (у этого контрагента):`, {
                  id: existingEmployee.id,
                  uuid: existingEmployee.id,
                  idAll: existingEmployee.idAll,
                  hasInn: !!existingEmployee.inn,
                  currentInn: existingEmployee.inn || 'отсутствует',
                  hasSnils: !!existingEmployee.snils,
                  currentSnils: existingEmployee.snils || 'отсутствует',
                  hasCitizenship: !!existingEmployee.citizenshipId,
                  citizenshipId: existingEmployee.citizenshipId || 'отсутствует'
                });
                break;
              }
            }

            if (!existingEmployee) {
              console.log(`   ⚠️  По ФИО не найден среди сотрудников этого контрагента`);
            }
          }

          // ШАГ 3: Обработка найденного сотрудника или создание нового
          if (existingEmployee) {
            // Сотрудник найден - обновляем
            console.log(`   🔄 ОБНОВЛЕНИЕ существующего сотрудника`);
            
            // Проверяем разрешение конфликта
            if (resolution === 'skip') {
              console.log(`   ⏭️  Пользователь выбрал "Пропустить"`);
              results.skipped++;
              return;
            }

            // Обновляем только заполненные поля из файла
            const updateData = {};
            const changes = [];

            if (emp.firstName && emp.firstName !== existingEmployee.firstName) {
              updateData.firstName = emp.firstName;
              changes.push(`firstName: ${existingEmployee.firstName} → ${emp.firstName}`);
            }
            if (emp.lastName && emp.lastName !== existingEmployee.lastName) {
              updateData.lastName = emp.lastName;
              changes.push(`lastName: ${existingEmployee.lastName} → ${emp.lastName}`);
            }
            if (emp.middleName && emp.middleName !== existingEmployee.middleName) {
              updateData.middleName = emp.middleName;
              changes.push(`middleName: ${existingEmployee.middleName} → ${emp.middleName}`);
            }
            if (emp.inn && emp.inn !== existingEmployee.inn) {
              updateData.inn = emp.inn;
              changes.push(`inn: ${existingEmployee.inn || 'пусто'} → ${emp.inn}`);
            }
            if (emp.snils && emp.snils !== existingEmployee.snils) {
              updateData.snils = emp.snils;
              changes.push(`snils: ${existingEmployee.snils || 'пусто'} → ${emp.snils}`);
            }
            if (emp.kig && emp.kig !== existingEmployee.kig) {
              updateData.kig = emp.kig;
              changes.push(`kig: ${existingEmployee.kig || 'пусто'} → ${emp.kig}`);
            }
            if (emp.birthDate && emp.birthDate !== existingEmployee.birthDate) {
              updateData.birthDate = emp.birthDate;
              changes.push(`birthDate: ${existingEmployee.birthDate || 'пусто'} → ${emp.birthDate}`);
            }
            if (emp.kigEndDate && emp.kigEndDate !== existingEmployee.kigEndDate) {
              updateData.kigEndDate = emp.kigEndDate;
              changes.push(`kigEndDate: ${existingEmployee.kigEndDate || 'пусто'} → ${emp.kigEndDate}`);
            }
            if (emp.position?.id && emp.position.id !== existingEmployee.positionId) {
              updateData.positionId = emp.position.id;
              changes.push(`positionId: ${existingEmployee.positionId || 'пусто'} → ${emp.position.id}`);
            }
            if (emp.citizenship?.id && emp.citizenship.id !== existingEmployee.citizenshipId) {
              updateData.citizenshipId = emp.citizenship.id;
              changes.push(`citizenshipId: ${existingEmployee.citizenshipId || 'пусто'} → ${emp.citizenship.id}`);
            }

            if (Object.keys(updateData).length > 0) {
              updateData.updatedBy = userId;
              await existingEmployee.update(updateData);
              console.log(`   ✅ ОБНОВЛЕНО полей: ${Object.keys(updateData).length - 1}`);
              console.log(`   📝 Изменения:`, changes);
              results.updated++;
            } else {
              console.log(`   ℹ️  Нет изменений - данные совпадают`);
              results.skipped++;
            }
            
            employee = existingEmployee;
          } else {
            // Сотрудник не найден - создаем нового
            console.log(`   ✨ СОЗДАНИЕ нового сотрудника`);
            employee = await Employee.create({
              firstName: emp.firstName,
              lastName: emp.lastName,
              middleName: emp.middleName,
              inn: emp.inn,
              snils: emp.snils,
              kig: emp.kig,
              birthDate: emp.birthDate,
              kigEndDate: emp.kigEndDate,
              positionId: emp.position?.id,
              citizenshipId: emp.citizenship?.id,
              createdBy: userId
            });
            isCreated = true;
            console.log(`   ✅ СОЗДАН новый сотрудник:`, {
              id: employee.id,
              uuid: employee.id,
              inn: employee.inn,
              snils: employee.snils
            });
            results.created++;
          }

          // 🔗 КРИТИЧЕСКИ ВАЖНО: Создаем маппинг сотрудник-контрагент
          console.log(`   🔗 Проверка маппинга с контрагентом ${userCounterparty.name} (ИНН: ${userCounterparty.inn})`);
          const existingMapping = await EmployeeCounterpartyMapping.findOne({
            where: {
              employeeId: employee.id,
              counterpartyId: userCounterparty.id
            }
          });

          if (!existingMapping) {
            await EmployeeCounterpartyMapping.create({
              employeeId: employee.id,
              counterpartyId: userCounterparty.id,
              createdBy: userId
            });
            console.log(`   ✅ СОЗДАН маппинг сотрудник → контрагент (ID: ${userCounterparty.id})`);
          } else {
            console.log(`   ℹ️  Маппинг уже существует (ID: ${existingMapping.id})`);
          }

          // 🎯 АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ СТАТУСОВ в зависимости от полноты данных
          // Перезагружаем сотрудника с включенным citizenship для проверки полноты
          await employee.reload({
            include: [{
              model: Citizenship,
              as: 'citizenship'
            }]
          });

          // Обновляем статусы на основе полноты карточки
          const { isComplete, statusNames, missingFields } = await updateEmployeeStatusesByCompleteness(
            employee,
            formConfig,
            statusMap,
            userId
          );

          // Логируем результаты проверки полноты
          if (isComplete) {
            if (isCreated) {
              console.log(`   🎉 НОВЫЙ сотрудник с ПОЛНЫМИ данными → активен!`);
            } else {
              console.log(`   🎉 Сотрудник ОБНОВЛЕН и имеет ПОЛНЫЕ данные → активен!`);
            }
          } else {
            if (isCreated) {
              console.log(`   📝 Новый сотрудник в статусе ЧЕРНОВИК (не хватает ${missingFields.length} полей)`);
            } else {
              console.log(`   📝 Сотрудник обновлен, статус ЧЕРНОВИК сохранен (не хватает ${missingFields.length} полей)`);
            }
          }

          // Обновляем КПП контрагента если нужно (некритичная операция)
          if (emp.kppToUpdate && !userCounterparty.kpp) {
            try {
              await userCounterparty.update({ kpp: emp.kppToUpdate });
              console.log(`   ✅ Обновлен КПП контрагента: ${emp.kppToUpdate}`);
            } catch (kppError) {
              console.warn(`   ⚠️  Не удалось обновить КПП контрагента: ${kppError.message}`);
              // Не добавляем в errors, т.к. сотрудник успешно создан
            }
          }

          console.log(`✅ ЗАВЕРШЕНО: ${emp.lastName} ${emp.firstName} - ${isCreated ? 'СОЗДАН' : 'ОБНОВЛЕН'}`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        } catch (error) {
          console.error(`❌ ОШИБКА при импорте сотрудника ${emp.lastName} ${emp.firstName}:`, error.message);
          console.error(`   Stack:`, error.stack);
          results.errors.push({
            rowIndex: emp.rowIndex,
            lastName: emp.lastName,
            error: error.message
          });
        }
      })
    );
  }

  console.log('✅ Импорт завершен:', results);
  return results;
};

