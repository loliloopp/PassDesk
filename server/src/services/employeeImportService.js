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
  EmployeeStatusMapping
} from '../models/index.js';
import {
  validateEmployeeForImport,
  checkEmployeeConflict,
  validateKppConsistency
} from '../utils/importValidation.js';
import { AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';

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

  // Получаем статусы
  const statuses = await Status.findAll({
    where: { name: ['status_draft', 'status_card_draft'] }
  });

  const statusMap = {};
  statuses.forEach(s => {
    statusMap[s.name] = s.id;
  });

  if (!statusMap['status_draft'] || !statusMap['status_card_draft']) {
    throw new AppError('Ошибка системы: не найдены требуемые статусы', 500);
  }

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  const counterpartyCache = {};
  const batchSize = 100;

  for (let i = 0; i < validatedEmployees.length; i += batchSize) {
    const batch = validatedEmployees.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (emp) => {
        try {
          // Получаем контрагент
          if (!counterpartyCache[emp.counterparty.inn]) {
            counterpartyCache[emp.counterparty.inn] = emp.counterparty;
          }

          const counterparty = counterpartyCache[emp.counterparty.inn];

          // 🔒 ПРОВЕРКА БЕЗОПАСНОСТИ: Контрагент должен принадлежать пользователю
          if (counterparty.id !== userCounterpartyId) {
            throw new Error(`Нет прав для импорта в контрагента "${counterparty.name}"`);
          }

          // Проверяем конфликт по ИНН
          const resolution = emp.inn ? conflictResolutions?.[emp.inn] : null;

          let employee;
          let isCreated = false;

          if (emp.inn) {
            const existingByInn = await Employee.findOne({
              where: { inn: emp.inn }
            });

            if (existingByInn) {
              // Конфликт найден
              if (resolution === 'skip') {
                console.log(`⏭️  Пропускаем сотрудника с ИНН ${emp.inn}`);
                results.skipped++;
                return;
              }

              if (resolution === 'update') {
                // Обновляем только заполненные поля из файла
                const updateData = {};

                if (emp.firstName) updateData.firstName = emp.firstName;
                if (emp.lastName) updateData.lastName = emp.lastName;
                if (emp.middleName) updateData.middleName = emp.middleName;
                if (emp.inn) updateData.inn = emp.inn;
                if (emp.snils) updateData.snils = emp.snils;
                if (emp.kig) updateData.kig = emp.kig;
                if (emp.birthDate) updateData.birthDate = emp.birthDate;
                if (emp.kigEndDate) updateData.kigEndDate = emp.kigEndDate;
                if (emp.position?.id) updateData.positionId = emp.position.id;
                if (emp.citizenship?.id) updateData.citizenshipId = emp.citizenship.id;

                updateData.updatedBy = userId;

                await existingByInn.update(updateData);
                console.log(`🔄 Обновлен сотрудник с ИНН ${emp.inn}`);
                results.updated++;
                employee = existingByInn;
              }
            } else {
              // Создаем нового сотрудника
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
              console.log(`✨ Создан новый сотрудник ${emp.lastName} ${emp.firstName}`);
              results.created++;
            }
          } else {
            // Создаем без проверки конфликтов (нет ИНН)
            employee = await Employee.create({
              firstName: emp.firstName,
              lastName: emp.lastName,
              middleName: emp.middleName,
              snils: emp.snils,
              kig: emp.kig,
              birthDate: emp.birthDate,
              kigEndDate: emp.kigEndDate,
              positionId: emp.position?.id,
              citizenshipId: emp.citizenship?.id,
              createdBy: userId
            });
            isCreated = true;
            console.log(`✨ Создан сотрудник (без ИНН) ${emp.lastName} ${emp.firstName}`);
            results.created++;
          }

          // Создаем маппинг сотрудник-контрагент
          const existingMapping = await EmployeeCounterpartyMapping.findOne({
            where: {
              employeeId: employee.id,
              counterpartyId: counterparty.id
            }
          });

          if (!existingMapping) {
            await EmployeeCounterpartyMapping.create({
              employeeId: employee.id,
              counterpartyId: counterparty.id,
              createdBy: userId
            });
          }

          // Устанавливаем статусы черновика если это новый сотрудник
          if (isCreated) {
            // status_draft (основной статус)
            await EmployeeStatusMapping.create({
              employeeId: employee.id,
              statusId: statusMap['status_draft'],
              statusGroup: 'status',
              createdBy: userId
            });

            // status_card_draft (статус карточки)
            await EmployeeStatusMapping.create({
              employeeId: employee.id,
              statusId: statusMap['status_card_draft'],
              statusGroup: 'status_card',
              createdBy: userId
            });
          }

          // Обновляем КПП контрагента если нужно (некритичная операция)
          if (emp.kppToUpdate && counterparty?.id && !counterparty.kpp) {
            try {
              const counterpartyModel = await Counterparty.findByPk(counterparty.id);
              if (counterpartyModel && !counterpartyModel.kpp) {
                await counterpartyModel.update({ kpp: emp.kppToUpdate });
                console.log(`✅ Обновлен КПП контрагента: ${emp.kppToUpdate}`);
              }
            } catch (kppError) {
              console.warn(`⚠️  Не удалось обновить КПП контрагента: ${kppError.message}`);
              // Не добавляем в errors, т.к. сотрудник успешно создан
            }
          }
        } catch (error) {
          console.error(`❌ Ошибка при импорте сотрудника:`, error.message);
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

