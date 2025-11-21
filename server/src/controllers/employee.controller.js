import { Employee, Counterparty, User, Citizenship, File, UserEmployeeMapping, EmployeeCounterpartyMapping, Department, ConstructionSite, Position, Setting } from '../models/index.js';
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
    employee.positionId, // Изменено с position на positionId
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
    const userId = req.user.id;
    const userRole = req.user.role;
    const userCounterpartyId = req.user.counterpartyId;

    const where = {};
    
    // Поиск по ФИО, email, телефону
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { middleName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Фильтрация по роли пользователя
    let employeeInclude = [
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
        model: Position,
        as: 'position',
        attributes: ['id', 'name']
      },
      {
        model: EmployeeCounterpartyMapping,
        as: 'employeeCounterpartyMappings',
        include: [
          {
            model: Counterparty,
            as: 'counterparty',
            attributes: ['id', 'name', 'type', 'inn', 'kpp']
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
    ];

    // Для роли 'user' - применяем фильтрацию
    if (userRole === 'user') {
      // Получаем контрагента по умолчанию
      const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');
      
      if (userCounterpartyId === defaultCounterpartyId) {
        // Контрагент по умолчанию: показываем только сотрудников, созданных пользователем
        // Используем UserEmployeeMapping где counterpartyId = NULL
        employeeInclude.push({
          model: UserEmployeeMapping,
          as: 'userEmployeeMappings',
          where: {
            userId: userId,
            counterpartyId: null
          },
          required: true
        });
      } else {
        // Другие контрагенты: показываем всех сотрудников контрагента
        employeeInclude[3].where = {
          counterpartyId: userCounterpartyId
        };
        employeeInclude[3].required = true;
      }
    }

    const { count, rows } = await Employee.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['lastName', 'ASC']],
      include: employeeInclude,
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
      },
      distinct: true // Важно для правильного подсчета при фильтрации через include
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
        },
        {
          model: Position, // Добавлена связь с Position
          as: 'position',
          attributes: ['id', 'name']
        },
        {
          model: EmployeeCounterpartyMapping,
          as: 'employeeCounterpartyMappings',
          include: [
            {
              model: Counterparty,
              as: 'counterparty',
              attributes: ['id', 'name', 'type', 'inn', 'kpp']
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
      // Добавляем подсчет файлов
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
    
    // Удаляем counterpartyId, constructionSiteId и status из данных сотрудника
    // status ВСЕГДА должен быть 'new' при создании
    const { counterpartyId, constructionSiteId, status, statusActive, ...cleanEmployeeData } = req.body;
    
    const employeeData = {
      ...cleanEmployeeData,
      createdBy: req.user.id,
      status: 'new', // При создании сотрудника статус всегда "Новый"
      statusActive: null // При создании statusActive всегда null
    };
    
    console.log('Employee data to create:', JSON.stringify(employeeData, null, 2));

    const employee = await Employee.create(employeeData);
    
    // Создаём запись в маппинге (сотрудник-контрагент-объект)
    await EmployeeCounterpartyMapping.create({
      employeeId: employee.id,
      counterpartyId: req.user.counterpartyId,
      departmentId: null, // Подразделение можно будет назначить позже
      constructionSiteId: constructionSiteId || null // Объект из формы, если был выбран
    });
    
    console.log('✓ Employee-Counterparty mapping created');
    
    // Для пользователей с контрагентом по умолчанию создаем UserEmployeeMapping
    const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');
    if (req.user.counterpartyId === defaultCounterpartyId) {
      await UserEmployeeMapping.create({
        userId: req.user.id,
        employeeId: employee.id,
        counterpartyId: null // Для контрагента по умолчанию counterpartyId = NULL
      });
      console.log('✓ User-Employee mapping created');
    }
    
    // Получаем созданного сотрудника с гражданством для правильного расчета statusCard
    const createdEmployee = await Employee.findByPk(employee.id, {
      include: [
        {
          model: Citizenship,
          as: 'citizenship',
          attributes: ['id', 'name', 'code', 'requiresPatent']
        },
        {
          model: Position, // Добавлена связь с Position
          as: 'position',
          attributes: ['id', 'name']
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
    const calculatedStatusCard = calculateStatusCard(employeeDataWithStatus);
    
    // Сохраняем вычисленный statusCard в базу данных
    await employee.update({ statusCard: calculatedStatusCard });
    employeeDataWithStatus.statusCard = calculatedStatusCard;

    res.status(201).json({
      success: true,
      message: 'Сотрудник создан',
      data: employeeDataWithStatus
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.parent) {
      console.error('Parent error:', error.parent);
    }
    
    // Обработка ошибки NOT NULL constraint (если миграция не применена)
    if (error.name === 'SequelizeDatabaseError' && error.parent?.code === '23502') {
      return res.status(500).json({
        success: false,
        message: 'Ошибка БД: не применена миграция для поддержки черновиков. Выполните миграцию 20241121_allow_null_for_drafts.sql',
        errors: [{
          field: error.parent.column,
          message: `Поле ${error.parent.column} требует значение (миграция не применена)`
        }]
      });
    }
    
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
    
    console.log('=== UPDATE EMPLOYEE REQUEST ===');
    console.log('Employee ID:', id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Не перезаписываем counterpartyId при обновлении, constructionSiteId идет в маппинг
    const { counterpartyId, constructionSiteId, ...updateData } = req.body;
    
    const updates = {
      ...updateData,
      updatedBy: req.user.id
    };
    
    console.log('Updates to apply:', JSON.stringify(updates, null, 2));

    const employee = await Employee.findByPk(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }

    // Проверка прав доступа для обычных пользователей (не admin)
    if (req.user.role !== 'admin') {
      const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');
      
      // Для контрагента по умолчанию - только свои созданные сотрудники
      if (req.user.counterpartyId === defaultCounterpartyId) {
        if (employee.createdBy !== req.user.id) {
          throw new AppError('Недостаточно прав. Вы можете редактировать только созданных вами сотрудников.', 403);
        }
      }
      // Для остальных контрагентов - все сотрудники доступны для редактирования
    }

    await employee.update(updates);
    
    // Если был передан constructionSiteId, обновляем маппинг
    if (constructionSiteId !== undefined) {
      // Сначала получаем текущий маппинг
      const currentMapping = await EmployeeCounterpartyMapping.findOne({
        where: { 
          employeeId: id,
          counterpartyId: req.user.counterpartyId 
        }
      });
      
      // Проверяем, нужно ли обновлять (если значение изменилось)
      const newConstructionSiteId = constructionSiteId || null;
      if (currentMapping && currentMapping.constructionSiteId !== newConstructionSiteId) {
        await currentMapping.update({
          constructionSiteId: newConstructionSiteId
        });
      }
    }
    
    // Получаем обновленного сотрудника с гражданством для правильного расчета statusCard
    const updatedEmployee = await Employee.findByPk(id, {
      include: [
        {
          model: Citizenship,
          as: 'citizenship',
          attributes: ['id', 'name', 'code', 'requiresPatent']
        },
        {
          model: Position, // Добавлена связь с Position
          as: 'position',
          attributes: ['id', 'name']
        }
      ]
    });
    
    const employeeDataWithStatus = updatedEmployee.toJSON();
    const calculatedStatusCard = calculateStatusCard(employeeDataWithStatus);
    
    // Сохраняем вычисленный statusCard в базу данных
    await employee.update({ statusCard: calculatedStatusCard });
    employeeDataWithStatus.statusCard = calculatedStatusCard;

    res.json({
      success: true,
      message: 'Сотрудник обновлен',
      data: employeeDataWithStatus
    });
  } catch (error) {
    console.error('=== ERROR UPDATING EMPLOYEE ===');
    console.error('Error:', error);
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
      console.error('=== VALIDATION ERRORS ===');
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message,
          value: e.value
        }))
      });
    }
    
    next(error);
  }
};

// Обновить объекты строительства для сотрудника
export const updateEmployeeConstructionSites = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { siteIds } = req.body;
    
    const employee = await Employee.findByPk(id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }
    
    // Проверка прав доступа для обычных пользователей (не admin)
    if (req.user.role !== 'admin') {
      const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');
      
      // Для контрагента по умолчанию - только свои созданные сотрудники
      if (req.user.counterpartyId === defaultCounterpartyId) {
        if (employee.createdBy !== req.user.id) {
          throw new AppError('Недостаточно прав. Вы можете редактировать только созданных вами сотрудников.', 403);
        }
      }
      // Для остальных контрагентов - все сотрудники доступны для редактирования
    }
    
    // Получаем существующие маппинги сотрудника для текущего контрагента
    const existingMappings = await EmployeeCounterpartyMapping.findAll({
      where: {
        employeeId: id,
        counterpartyId: req.user.counterpartyId
      }
    });
    
    // Если нет маппингов, создаем базовый
    if (existingMappings.length === 0) {
      // Создаем маппинги для каждого выбранного объекта
      for (const siteId of siteIds) {
        await EmployeeCounterpartyMapping.create({
          employeeId: id,
          counterpartyId: req.user.counterpartyId,
          constructionSiteId: siteId,
          departmentId: null
        });
      }
    } else {
      // Удаляем все старые маппинги с объектами для этого контрагента
      await EmployeeCounterpartyMapping.destroy({
        where: {
          employeeId: id,
          counterpartyId: req.user.counterpartyId
        }
      });
      
      // Создаем новые маппинги для каждого выбранного объекта
      for (const siteId of siteIds) {
        await EmployeeCounterpartyMapping.create({
          employeeId: id,
          counterpartyId: req.user.counterpartyId,
          constructionSiteId: siteId,
          departmentId: null
        });
      }
    }
    
    // Просто возвращаем успех без лишней загрузки данных
    res.json({
      success: true,
      message: 'Объекты обновлены'
    });
  } catch (error) {
    console.error('Error updating construction sites:', error);
    next(error);
  }
};

// Обновить подразделение сотрудника
export const updateEmployeeDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { departmentId } = req.body;
    
    const employee = await Employee.findByPk(id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }
    
    // Проверка прав доступа для обычных пользователей (не admin)
    if (req.user.role !== 'admin') {
      const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');
      
      // Для контрагента по умолчанию - только свои созданные сотрудники
      if (req.user.counterpartyId === defaultCounterpartyId) {
        if (employee.createdBy !== req.user.id) {
          throw new AppError('Недостаточно прав. Вы можете редактировать только созданных вами сотрудников.', 403);
        }
      }
      // Для остальных контрагентов - все сотрудники доступны для редактирования
    }
    
    // Получаем первый маппинг сотрудника для текущего контрагента
    let mapping = await EmployeeCounterpartyMapping.findOne({
      where: {
        employeeId: id,
        counterpartyId: req.user.counterpartyId
      }
    });
    
    // Если маппинга нет, создаем новый
    if (!mapping) {
      mapping = await EmployeeCounterpartyMapping.create({
        employeeId: id,
        counterpartyId: req.user.counterpartyId,
        departmentId: departmentId || null,
        constructionSiteId: null
      });
    } else {
      // Обновляем departmentId в существующем маппинге
      await mapping.update({
        departmentId: departmentId || null
      });
    }
    
    res.json({
      success: true,
      message: 'Подразделение обновлено',
      data: {
        departmentId: mapping.departmentId
      }
    });
  } catch (error) {
    console.error('Error updating department:', error);
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
      'firstName', 'lastName', 'middleName', 'positionId', // Изменено с position на positionId
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
        },
        {
          model: Position, // Добавлена связь с Position
          as: 'position',
          attributes: ['id', 'name']
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


