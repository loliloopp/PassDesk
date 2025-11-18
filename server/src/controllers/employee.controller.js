import { Employee, Counterparty, User, Citizenship, File, UserEmployeeMapping, EmployeeCounterpartyMapping, Department, ConstructionSite } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import yandexDiskClient, { basePath } from '../config/storage.js';
import { buildEmployeeFilePath } from '../utils/transliterate.js';
import { AppError } from '../middleware/errorHandler.js';

// Функция для вычисления статуса заполнения карточки сотрудника
const calculateStatusCard = (employee) => {
  const requiresPatent = employee.citizenship?.requiresPatent !== false;
  
  // Базовые обязательные поля
  const baseRequiredFields = [
    employee.lastName,
    employee.firstName,
    employee.position,
    employee.citizenshipId,
    employee.birthDate,
    employee.inn,
    employee.snils,
    employee.passportNumber,
    employee.passportDate,
    employee.passportIssuer,
    employee.registrationAddress,
    employee.phone
  ];
  
  // Поля, зависящие от гражданства
  const conditionalFields = requiresPatent ? [
    employee.kig,
    employee.patentNumber,
    employee.patentIssueDate,
    employee.blankNumber
  ] : [];
  
  const allRequiredFields = [...baseRequiredFields, ...conditionalFields];
  const allFilled = allRequiredFields.every(field => field !== null && field !== undefined && field !== '');
  
  return allFilled ? 'completed' : 'draft';
};

export const getAllEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 100, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    
    // Поиск по ФИО, должности, email, телефону
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { middleName: { [Op.iLike]: `%${search}%` } },
        { position: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Employee.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['lastName', 'ASC']],
      include: [
        {
          model: Citizenship,
          as: 'citizenship',
          attributes: ['id', 'name', 'code', 'requiresPatent']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: EmployeeCounterpartyMapping,
          as: 'employeeCounterpartyMappings',
          include: [
            {
              model: Counterparty,
              as: 'counterparty',
              attributes: ['id', 'name', 'type']
            },
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'name']
            },
            {
              model: ConstructionSite,
              as: 'constructionSite',
              attributes: ['id', 'shortName', 'fullName']
            }
          ]
        }
      ],
      // Добавляем подсчет файлов для каждого сотрудника
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*)::int
              FROM files
              WHERE files.entity_type = 'employee'
                AND files.entity_id = "Employee"."id"
                AND files.is_deleted = false
            )`),
            'filesCount'
          ]
        ]
      }
    });

    // Пересчитываем statusCard для каждого сотрудника
    const employeesWithStatus = rows.map(employee => {
      const employeeData = employee.toJSON();
      employeeData.statusCard = calculateStatusCard(employeeData);
      return employeeData;
    });

    res.json({
      success: true,
      data: {
        employees: employeesWithStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id, {
      include: [
        {
          model: Counterparty,
          as: 'counterparty'
        },
        {
          model: Citizenship,
          as: 'citizenship',
          attributes: ['id', 'name', 'code', 'requiresPatent']
        },
        {
          model: User,
          as: 'creator'
        },
        {
          model: User,
          as: 'updater'
        }
      ]
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }

    // Пересчитываем statusCard
    const employeeData = employee.toJSON();
    employeeData.statusCard = calculateStatusCard(employeeData);

    res.json({
      success: true,
      data: employeeData
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    console.log('=== CREATE EMPLOYEE REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User ID:', req.user?.id);
    console.log('User Counterparty ID:', req.user?.counterpartyId);
    
    const employeeData = {
      ...req.body,
      createdBy: req.user.id,
      status: 'new' // При создании сотрудника статус всегда "Новый"
    };
    
    // Удаляем counterpartyId и constructionSiteId из данных сотрудника
    const { counterpartyId, constructionSiteId, ...cleanEmployeeData } = employeeData;
    
    console.log('Employee data to create:', JSON.stringify(cleanEmployeeData, null, 2));

    const employee = await Employee.create(cleanEmployeeData);
    
    // Создаём запись в маппинге (сотрудник-контрагент-объект)
    await EmployeeCounterpartyMapping.create({
      employeeId: employee.id,
      counterpartyId: req.user.counterpartyId,
      departmentId: null, // Подразделение можно будет назначить позже
      constructionSiteId: constructionSiteId || null // Объект из формы, если был выбран
    });
    
    console.log('✓ Employee-Counterparty mapping created');
    
    // Получаем созданного сотрудника с гражданством для правильного расчета statusCard
    const createdEmployee = await Employee.findByPk(employee.id, {
      include: [
        {
          model: Citizenship,
          as: 'citizenship',
          attributes: ['id', 'name', 'code', 'requiresPatent']
        },
        {
          model: EmployeeCounterpartyMapping,
          as: 'employeeCounterpartyMappings',
          include: [
            {
              model: Counterparty,
              as: 'counterparty',
              attributes: ['id', 'name']
            },
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });
    
    const employeeDataWithStatus = createdEmployee.toJSON();
    employeeDataWithStatus.statusCard = calculateStatusCard(employeeDataWithStatus);

    res.status(201).json({
      success: true,
      message: 'Сотрудник создан',
      data: employeeDataWithStatus
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Обработка ошибки уникальности
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;
      let fieldName = field;
      
      // Переводим названия полей на русский
      const fieldNames = {
        'inn': 'ИНН',
        'snils': 'СНИЛС',
        'kig': 'КИГ',
        'passport_number': 'Номер паспорта'
      };
      
      if (fieldNames[field]) {
        fieldName = fieldNames[field];
      }
      
      return res.status(400).json({
        success: false,
        message: `${fieldName} уже используется другим сотрудником`,
        errors: [{
          field: field,
          message: `${fieldName} должен быть уникальным`
        }]
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      console.error('Validation errors:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Не перезаписываем counterpartyId при обновлении, constructionSiteId идет в маппинг
    const { counterpartyId, constructionSiteId, ...updateData } = req.body;
    
    const updates = {
      ...updateData,
      updatedBy: req.user.id
    };

    const employee = await Employee.findByPk(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }

    await employee.update(updates);
    
    // Если был передан constructionSiteId, обновляем маппинг
    if (constructionSiteId !== undefined) {
      await EmployeeCounterpartyMapping.update(
        { constructionSiteId: constructionSiteId || null },
        { 
          where: { 
            employeeId: id,
            counterpartyId: req.user.counterpartyId 
          } 
        }
      );
    }
    
    // Получаем обновленного сотрудника с гражданством для правильного расчета statusCard
    const updatedEmployee = await Employee.findByPk(id, {
      include: [
        {
          model: Citizenship,
          as: 'citizenship',
          attributes: ['id', 'name', 'code', 'requiresPatent']
        }
      ]
    });
    
    const employeeDataWithStatus = updatedEmployee.toJSON();
    employeeDataWithStatus.statusCard = calculateStatusCard(employeeDataWithStatus);

    res.json({
      success: true,
      message: 'Сотрудник обновлен',
      data: employeeDataWithStatus
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    
    // Обработка ошибки уникальности
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;
      let fieldName = field;
      
      // Переводим названия полей на русский
      const fieldNames = {
        'inn': 'ИНН',
        'snils': 'СНИЛС',
        'kig': 'КИГ',
        'passport_number': 'Номер паспорта'
      };
      
      if (fieldNames[field]) {
        fieldName = fieldNames[field];
      }
      
      return res.status(400).json({
        success: false,
        message: `${fieldName} уже используется другим сотрудником`,
        errors: [{
          field: field,
          message: `${fieldName} должен быть уникальным`
        }]
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id);

    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }

    console.log('=== DELETING EMPLOYEE ===');
    console.log('Employee:', {
      id: employee.id,
      name: `${employee.lastName} ${employee.firstName} ${employee.middleName || ''}`
    });

    // 1. Находим связанного пользователя (если есть)
    const userMapping = await UserEmployeeMapping.findOne({
      where: { employeeId: id },
      transaction
    });

    if (userMapping) {
      console.log(`Found linked user: ${userMapping.userId}`);
      
      // Удаляем только связь, пользователь остаётся
      await userMapping.destroy({ transaction });
      console.log('✓ User-Employee mapping deleted (user remains intact)');
    }

    // 2. Получаем все файлы сотрудника из БД
    const files = await File.findAll({
      where: {
        entityType: 'employee',
        entityId: id
      },
      transaction
    });

    console.log(`Found ${files.length} files to delete`);

    // 3. Удаляем каждый файл с Яндекс.Диска
    for (const file of files) {
      try {
        console.log(`Deleting file from Yandex.Disk: ${file.filePath}`);
        await yandexDiskClient.delete('/resources', {
          params: {
            path: file.filePath,
            permanently: true
          }
        });
        console.log(`✓ File deleted: ${file.filePath}`);
      } catch (error) {
        console.error(`✗ Error deleting file from Yandex.Disk: ${file.filePath}`);
        console.error('Error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        // Продолжаем удаление, даже если файл уже отсутствует на диске
      }
    }

    // 4. Физически удаляем файлы из БД
    const deletedCount = await File.destroy({
      where: {
        entityType: 'employee',
        entityId: id
      },
      transaction
    });
    console.log(`Deleted ${deletedCount} file records from DB`);

    // 5. Удаляем папку сотрудника с Яндекс.Диска
    if (employee.counterparty) {
      const employeeFullName = `${employee.lastName} ${employee.firstName} ${employee.middleName || ''}`.trim();
      const employeeFolderPath = buildEmployeeFilePath(employee.counterparty.name, employeeFullName);
      const fullPath = `${basePath}${employeeFolderPath}`;

      console.log(`Deleting employee folder: ${fullPath}`);
      
      try {
        await yandexDiskClient.delete('/resources', {
          params: {
            path: fullPath,
            permanently: true
          }
        });
        console.log(`✓ Employee folder deleted: ${fullPath}`);
      } catch (error) {
        console.error(`✗ Error deleting employee folder from Yandex.Disk: ${fullPath}`);
        console.error('Error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        // Продолжаем, даже если папка уже отсутствует
      }
    }

    // 6. Удаляем сотрудника из БД
    await employee.destroy({ transaction });
    console.log('✓ Employee deleted from DB');
    
    // Коммитим транзакцию
    await transaction.commit();
    console.log('=== DELETE COMPLETE ===');

    res.json({
      success: true,
      message: 'Сотрудник и связанный пользователь удалены'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting employee:', error);
    next(error);
  }
};

export const searchEmployees = async (req, res, next) => {
  try {
    const { query, counterpartyId, position } = req.query;

    const where = {};

    if (query) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${query}%` } },
        { lastName: { [Op.iLike]: `%${query}%` } },
        { middleName: { [Op.iLike]: `%${query}%` } }
      ];
    }

    if (counterpartyId) {
      where.counterpartyId = counterpartyId;
    }

    if (position) {
      where.position = { [Op.iLike]: `%${position}%` };
    }

    const employees = await Employee.findAll({
      where,
      order: [['lastName', 'ASC']],
      include: [
        {
          model: Counterparty,
          as: 'counterparty',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        employees
      }
    });
  } catch (error) {
    console.error('Error searching employees:', error);
    next(error);
  }
};

/**
 * Получить профиль сотрудника текущего пользователя
 */
export const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Находим связь пользователь-сотрудник
    let mapping = await UserEmployeeMapping.findOne({
      where: { userId },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            {
              model: Counterparty,
              as: 'counterparty',
              attributes: ['id', 'name', 'type']
            },
            {
              model: Citizenship,
              as: 'citizenship',
              attributes: ['id', 'name', 'code']
            }
          ]
        }
      ]
    });

    // Если mapping не найден, создаем пустой профиль сотрудника
    if (!mapping) {
      console.log(`Creating employee profile for user ${userId}`);
      
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError('Пользователь не найден', 404);
      }

      // Создаем запись сотрудника с минимальными данными
      const employee = await Employee.create({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        middleName: null,
        position: '',
        email: user.email,
        counterpartyId: user.counterpartyId,
        isActive: true,
        createdBy: userId
      });

      // Создаем связь
      mapping = await UserEmployeeMapping.create({
        userId: user.id,
        employeeId: employee.id
      });

      // Перезагружаем с отношениями
      mapping = await UserEmployeeMapping.findOne({
        where: { userId },
        include: [
          {
            model: Employee,
            as: 'employee',
            include: [
              {
                model: Counterparty,
                as: 'counterparty',
                attributes: ['id', 'name', 'type']
              },
              {
                model: Citizenship,
                as: 'citizenship',
                attributes: ['id', 'name', 'code']
              }
            ]
          }
        ]
      });
    }

    if (!mapping || !mapping.employee) {
      throw new AppError('Профиль сотрудника не найден', 404);
    }

    res.json({
      success: true,
      data: {
        employee: mapping.employee
      }
    });
  } catch (error) {
    console.error('Error getting my profile:', error);
    next(error);
  }
};

/**
 * Обновить профиль сотрудника текущего пользователя
 */
export const updateMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    console.log('📝 Update profile request:', {
      userId,
      updateData
    });

    // Находим связь пользователь-сотрудник
    const mapping = await UserEmployeeMapping.findOne({
      where: { userId }
    });

    if (!mapping) {
      throw new AppError('Профиль сотрудника не найден', 404);
    }

    const employee = await Employee.findByPk(mapping.employeeId);
    if (!employee) {
      throw new AppError('Сотрудник не найден', 404);
    }

    // Пользователи не могут изменять контрагента и некоторые системные поля
    const allowedFields = [
      'firstName', 'lastName', 'middleName', 'position',
      'citizenshipId', 'birthDate',
      'inn', 'snils', 'kig',
      'passportNumber', 'passportDate', 'passportIssuer', 'registrationAddress',
      'patentNumber', 'patentIssueDate', 'blankNumber',
      'email', 'phone', 'notes'
    ];

    const filteredData = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    console.log('✅ Filtered data:', filteredData);

    // Обновляем профиль
    await employee.update({
      ...filteredData,
      updatedBy: userId
    });

    // Загружаем обновленные данные с отношениями
    const updatedEmployee = await Employee.findByPk(employee.id, {
      include: [
        {
          model: Counterparty,
          as: 'counterparty'
        },
        {
          model: Citizenship,
          as: 'citizenship'
        }
      ]
    });

    res.json({
      success: true,
      message: 'Профиль успешно обновлен',
      data: {
        employee: updatedEmployee
      }
    });
  } catch (error) {
    console.error('❌ Error updating my profile:', error);
    
    // Если это ошибка валидации Sequelize, возвращаем детали
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      console.error('Validation errors:', validationErrors);
      
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации',
        errors: validationErrors
      });
    }
    
    next(error);
  }
};


