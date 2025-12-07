import { Employee, Counterparty, User, Citizenship, File, UserEmployeeMapping, EmployeeCounterpartyMapping, Department, ConstructionSite, Position, Setting, Status, EmployeeStatusMapping } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import storageProvider from '../config/storage.js';
import { buildEmployeeFilePath } from '../utils/transliterate.js';
import { checkEmployeeAccess } from '../utils/permissionUtils.js';
import { AppError } from '../middleware/errorHandler.js';
import EmployeeStatusService from '../services/employeeStatusService.js';

// Опции для загрузки сотрудника с маппингами (для проверки прав)
const employeeAccessInclude = [
  {
    model: EmployeeCounterpartyMapping,
    as: 'employeeCounterpartyMappings',
    include: [{
      model: Counterparty,
      as: 'counterparty',
      attributes: ['id']
    }]
  }
];

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
    const { page = 1, limit = 100, search = '', activeOnly = 'false', dateFrom, dateTo } = req.query;
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

    // Статусы, которые исключаем из выгрузки (только если activeOnly = true)
    const isActiveOnly = activeOnly === 'true';
    const excludedStatuses = [
      'status_hr_fired_compl',
      'status_hr_new_compl',
      'status_draft',
      'status_active_inactive',
      'status_secure_block',
      'status_secure_block_compl'
    ];

    // Статусы для фильтрации по дате (если указан фильтр)
    const dateFilterStatuses = [
      'status_new',
      'status_tb_passed',
      'status_processed',
      'status_active_fired',
      'status_hr_fired_compl',
      'status_hr_new_compl',
      'status_hr_edited',
      'status_hr_edited_compl',
      'status_hr_fired_off'
    ];

    // Фильтрация по роли пользователя
    let employeeInclude = [
      {
        model: Citizenship,
        as: 'citizenship',
        attributes: ['id', 'name', 'code', 'requiresPatent']
      },
      {
        model: Citizenship,
        as: 'birthCountry',
        attributes: ['id', 'name', 'code']
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
      },
      // Подключаем EmployeeStatusMapping с его статусами для фильтрации
      {
        model: EmployeeStatusMapping,
        as: 'statusMappings',
        where: { isActive: true },
        include: [
          {
            model: Status,
            as: 'status',
            attributes: ['id', 'name', 'group']
          }
        ],
        attributes: ['id', 'statusId', 'isActive', 'isUpload', 'statusGroup', 'createdAt', 'updatedAt'],
        required: false
      }
    ];

    // Для роли 'user' - применяем фильтрацию
    // Для админа - показываем всех сотрудников всех контрагентов
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
        // Фильтруем по EmployeeCounterpartyMapping (индекс 4)
        employeeInclude[4].where = {
          counterpartyId: userCounterpartyId
        };
        employeeInclude[4].required = true;
      }
    }
    // Для админа и manager - ограничений по контрагенту нет (видят всех)

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

    // Фильтруем сотрудников - исключаем тех, у кого есть исключенные статусы (если activeOnly = true)
    let filteredRows = isActiveOnly ? rows.filter(employee => {
      const statusMappings = employee.statusMappings || [];
      
      // Проверяем наличие исключенного статуса
      const hasExcludedStatus = statusMappings.some(mapping => {
        if (mapping.status) {
          return excludedStatuses.includes(mapping.status.name);
        }
        return false;
      });
      
      return !hasExcludedStatus;
    }) : rows;

    // Фильтруем по дате, если указаны параметры
    if (dateFrom || dateTo) {
      const startDate = dateFrom ? new Date(dateFrom) : null;
      const endDate = dateTo ? new Date(dateTo) : null;
      
      // Устанавливаем время для startDate на начало дня
      if (startDate) {
        startDate.setHours(0, 0, 0, 0);
      }

      // Устанавливаем время для endDate на конец дня
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      console.log('🔍 Date filter params:', { dateFrom, dateTo, startDate, endDate });
      console.log('📊 Total rows before date filter:', filteredRows.length);
      console.log('📋 Allowed status names:', dateFilterStatuses);

      filteredRows = filteredRows.filter(employee => {
        const statusMappings = employee.statusMappings || [];
        
        if (statusMappings.length === 0) {
          console.log(`❌ Employee ${employee.id} has no status mappings`);
          return false;
        }

        // Логируем все статусы сотрудника
        console.log(`📋 Employee ${employee.id} statuses:`, statusMappings.map(m => ({ 
          statusGroup: m.statusGroup,
          statusName: m.status?.name,
          createdAt: m.createdAt, 
          updatedAt: m.updatedAt 
        })));

        // Проверяем, есть ли статусы из списка, которые попадают в диапазон дат
        const hasMatchingStatus = statusMappings.some(mapping => {
          // Получаем имя статуса
          const statusName = mapping.status?.name;
          
          // Проверяем, что статус в списке для фильтрации
          const isAllowedStatus = dateFilterStatuses.includes(statusName);
          if (!isAllowedStatus) {
            console.log(`   ⏭️  Status ${statusName} not in allowed list`);
            return false;
          }
          
          // Проверяем createdAt
          if (mapping.createdAt) {
            const createdDate = new Date(mapping.createdAt);
            const isInRange = startDate && createdDate >= startDate && (!endDate || createdDate <= endDate);
            console.log(`   📅 createdAt: ${mapping.createdAt} (parsed: ${createdDate.toISOString()}) - in range: ${isInRange}`);
            if (isInRange) {
              console.log(`✅ Employee ${employee.id} matched by createdAt (status: ${statusName})`);
              return true;
            }
          }
          
          // Проверяем updatedAt
          if (mapping.updatedAt) {
            const updatedDate = new Date(mapping.updatedAt);
            const isInRange = startDate && updatedDate >= startDate && (!endDate || updatedDate <= endDate);
            console.log(`   📅 updatedAt: ${mapping.updatedAt} (parsed: ${updatedDate.toISOString()}) - in range: ${isInRange}`);
            if (isInRange) {
              console.log(`✅ Employee ${employee.id} matched by updatedAt (status: ${statusName})`);
              return true;
            }
          }
          
          return false;
        });

        if (!hasMatchingStatus) {
          console.log(`❌ Employee ${employee.id} not matched any criteria`);
        }

        return hasMatchingStatus;
      });

      console.log('📊 Total rows after date filter:', filteredRows.length);
    }

    // Пересчитываем statusCard для каждого сотрудника
    const employeesWithStatus = filteredRows.map(employee => {
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
          total: filteredRows.length,
          pages: Math.ceil(filteredRows.length / limit)
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
          model: Citizenship,
          as: 'birthCountry',
          attributes: ['id', 'name', 'code']
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
        },
        {
          model: EmployeeStatusMapping,
          as: 'statusMappings',
          where: { isActive: true },
          required: false,
          include: [{
            model: Status,
            as: 'status',
            attributes: ['id', 'name', 'group']
          }]
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

    // ПРОВЕРКА ПРАВ ДОСТУПА (операция READ - разрешаем чтение для привязки)
    await checkEmployeeAccess(req.user, employee, 'read');

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
    // Логируем только в development и без персональных данных
    if (process.env.NODE_ENV === 'development') {
      console.log('=== CREATE EMPLOYEE REQUEST ===');
      console.log('User ID:', req.user?.id);
    }
    
    // 🎯 РЕЖИМ ПРИВЯЗКИ: проверяем наличие employeeId
    const { employeeId } = req.body;
    
    // Если передан employeeId - это режим привязки существующего сотрудника
    if (employeeId) {
      console.log('🔗 LINKING MODE: Привязка существующего сотрудника', employeeId);
      
      // Проверяем, что сотрудник существует
      const existingEmployee = await Employee.findByPk(employeeId);
      if (!existingEmployee) {
        return res.status(404).json({
          success: false,
          message: 'Сотрудник не найден'
        });
      }
      
      // Проверяем только для пользователей default контрагента
      const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');
      if (req.user.counterpartyId !== defaultCounterpartyId) {
        return res.status(403).json({
          success: false,
          message: 'Привязка сотрудников доступна только в контрагенте по умолчанию'
        });
      }
      
      // Проверяем, есть ли уже связь в user_employee_mapping
      const existingMapping = await UserEmployeeMapping.findOne({
        where: {
          userId: req.user.id,
          employeeId: employeeId
        }
      });
      
      if (existingMapping) {
        return res.status(400).json({
          success: false,
          message: 'Этот сотрудник уже привязан к вашему профилю'
        });
      }
      
      // ✅ ШАГ 1: Создаем новую связь в user_employee_mapping
      await UserEmployeeMapping.create({
        userId: req.user.id,
        employeeId: employeeId,
        counterpartyId: null // Для контрагента по умолчанию counterpartyId = NULL
      });
      
      console.log('✓ User-Employee mapping created (linking mode)');
      
      // ✅ ШАГ 2: Обновляем данные сотрудника (если они были изменены)
      // Удаляем служебные поля и employeeId
      const { 
        employeeId: _, 
        counterpartyId, 
        constructionSiteId, 
        statusActive, 
        status, 
        statusCard, 
        statusSecure,
        isDraft,
        ...cleanEmployeeData 
      } = req.body;
      
      // Обновляем сотрудника
      await existingEmployee.update({
        ...cleanEmployeeData,
        updatedBy: req.user.id
      });
      
      console.log('✓ Employee data updated after linking');
      
      // Возвращаем обновленного сотрудника
      const linkedEmployee = await Employee.findByPk(employeeId, {
        include: [
          {
            model: Citizenship,
            as: 'citizenship',
            attributes: ['id', 'name', 'code', 'requiresPatent']
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
      
      const employeeData = linkedEmployee.toJSON();
      const calculatedStatusCard = calculateStatusCard(employeeData);
      employeeData.statusCard = calculatedStatusCard;
      
      return res.status(201).json({
        success: true,
        message: 'Сотрудник успешно привязан',
        data: employeeData
      });
    }
    
    // 🔄 СТАНДАРТНЫЙ РЕЖИМ: создание нового сотрудника
    // Удаляем counterpartyId, constructionSiteId, и все поля статусов из данных сотрудника
    const { counterpartyId, constructionSiteId, statusActive, status, statusCard, statusSecure, ...cleanEmployeeData } = req.body;
    
    const employeeData = {
      ...cleanEmployeeData,
      createdBy: req.user.id
    };

    const employee = await Employee.create(employeeData);
    
    // Инициализируем статусы для нового сотрудника
    await EmployeeStatusService.initializeEmployeeStatuses(employee.id, req.user.id);
    
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
    
    // Получаем созданного сотрудника со всеми отношениями
    const createdEmployee = await Employee.findByPk(employee.id, {
      include: [
        {
          model: Citizenship,
          as: 'citizenship',
          attributes: ['id', 'name', 'code', 'requiresPatent']
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
    employeeDataWithStatus.statusCard = calculatedStatusCard;

    // Если все поля заполнены (статус 'completed') - обновляем статусы с draft на новые
    if (calculatedStatusCard === 'completed') {
      try {
        // Меняем status_draft → status_new
        await EmployeeStatusService.setStatusByName(employee.id, 'status_new', req.user.id);
        // Меняем status_card_draft → status_card_completed
        await EmployeeStatusService.setStatusByName(employee.id, 'status_card_completed', req.user.id);
        console.log('✓ Employee statuses updated to completed');
      } catch (statusError) {
        console.warn('Warning: could not update statuses:', statusError.message);
        // Не прерываем создание, если ошибка со статусами
      }
    }

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
    
    // Логируем только в development и без персональных данных
    if (process.env.NODE_ENV === 'development') {
      console.log('=== UPDATE EMPLOYEE REQUEST ===');
      console.log('Employee ID:', id);
    }
    
    // Не перезаписываем counterpartyId при обновлении, constructionSiteId идет в маппинг
    const { counterpartyId, constructionSiteId, isDraft, isFired, isInactive, ...updateData } = req.body;
    
    // Очищаем данные - преобразуем пустые строки в null для всех полей
    const cleanedData = {};
    const uuidFields = ['positionId', 'citizenshipId'];
    const dateFields = ['birthDate', 'passportDate', 'patentIssueDate'];
    const fieldsToIgnore = ['id', 'createdBy', 'createdAt', 'updatedAt', 'created_by', 'updated_at', 'citizenship', 'position', 'employeeCounterpartyMappings'];
    
    Object.keys(updateData).forEach(key => {
      // Пропускаем системные поля
      if (fieldsToIgnore.includes(key)) {
        return;
      }
      
      const value = updateData[key];
      
      // Преобразуем пустые строки в null
      if (value === '' || value === undefined) {
        cleanedData[key] = null;
      } else {
        cleanedData[key] = value;
      }
    });
    
    const updates = {
      ...cleanedData,
      updatedBy: req.user.id
    };

    const employee = await Employee.findByPk(id, {
      include: employeeAccessInclude
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }

    // 🔗 ВАРИАНТ Б: АВТОМАТИЧЕСКАЯ ПРИВЯЗКА
    // Если пользователь из default контрагента пытается обновить существующего сотрудника,
    // которого он не создавал, но который находится в том же контрагенте - автоматически привяжем его
    const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');
    if (req.user.counterpartyId === defaultCounterpartyId && req.user.role === 'user') {
      // Проверяем, есть ли уже связь в user_employee_mapping
      const existingMapping = await UserEmployeeMapping.findOne({
        where: {
          userId: req.user.id,
          employeeId: id,
          counterpartyId: null // Для default контрагента
        }
      });

      // Если связи нет, проверяем что сотрудник в default контрагенте
      if (!existingMapping) {
        const employeeInDefaultCounterparty = await EmployeeCounterpartyMapping.findOne({
          where: {
            employeeId: id,
            counterpartyId: defaultCounterpartyId
          }
        });

        // Если сотрудник в default контрагенте - автоматически привязываем его
        if (employeeInDefaultCounterparty) {
          console.log(`🔗 АВТОМАТИЧЕСКАЯ ПРИВЯЗКА: Привязываем сотрудника ${id} к пользователю ${req.user.id}`);
          await UserEmployeeMapping.create({
            userId: req.user.id,
            employeeId: id,
            counterpartyId: null // Для default контрагента
          });
          console.log(`✅ Сотрудник успешно привязан к пользователю`);
        }
      }
    }

    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);

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
    employeeDataWithStatus.statusCard = calculatedStatusCard;

    // Обновляем статусы на основе текущего состояния
    try {
      // Если все поля заполнены (статус 'completed') - меняем статусы с draft на новые
      if (calculatedStatusCard === 'completed') {
        // Меняем status_draft → status_new (если был в draft)
        const currentStatusMapping = await EmployeeStatusService.getCurrentStatus(id, 'status');
        if (currentStatusMapping?.status?.name === 'status_draft') {
          await EmployeeStatusService.setStatusByName(id, 'status_new', req.user.id);
        }
        // Меняем status_card_draft → status_card_completed (если был в draft)
        const currentCardStatus = await EmployeeStatusService.getCurrentStatus(id, 'status_card');
        if (currentCardStatus?.status?.name === 'status_card_draft') {
          await EmployeeStatusService.setStatusByName(id, 'status_card_completed', req.user.id);
        }
        console.log('✓ Employee statuses updated to completed');
      }

      // НОВАЯ ЛОГИКА: если в группе status_hr есть активный статус с is_upload=true - очищаем группу и активируем status_hr_edited
      console.log('=== CHECKING STATUS_HR GROUP ===');
      const currentHRStatusBeforeUpdate = await EmployeeStatusService.getCurrentStatus(id, 'status_hr');
      if (currentHRStatusBeforeUpdate?.isUpload === true) {
        console.log(`Found active status_hr with is_upload=true: ${currentHRStatusBeforeUpdate?.status?.name}`);
        
        // Деактивируем все статусы группы status_hr и устанавливаем is_upload = false
        await EmployeeStatusMapping.update(
          { isActive: false, isUpload: false },
          {
            where: {
              employeeId: id,
              statusGroup: 'status_hr'
            }
          }
        );
        console.log('✓ All status_hr statuses deactivated and is_upload set to false');
        
        // Активируем status_hr_edited с is_upload = false (создаем или обновляем)
        await EmployeeStatusService.activateOrCreateStatus(id, 'status_hr_edited', req.user.id, false);
        console.log('✓ status_hr_edited activated with is_upload=false');
      }

      // Проверяем, есть ли статус status_hr_new_compl - если да, присваиваем status_hr_edited
      const currentHRStatus = await EmployeeStatusService.getCurrentStatus(id, 'status_hr');
      if (currentHRStatus?.status?.name === 'status_hr_new_compl') {
        console.log('✓ Employee has status_hr_new_compl, setting status_hr_edited');
        await EmployeeStatusService.setStatusByName(id, 'status_hr_edited', req.user.id);
      }

      // Обновляем статус активности на основе чекбоксов
      console.log('=== UPDATING EMPLOYEE ACTIVE STATUS ===');
      console.log('isFired:', isFired);
      console.log('isInactive:', isInactive);
      
      // Получаем текущий статус активности
      const currentActiveStatus = await EmployeeStatusService.getCurrentStatus(id, 'status_active');
      const currentStatusName = currentActiveStatus?.status?.name;
      const currentIsUpload = currentActiveStatus?.isUpload;
      
      console.log('Current status_active:', currentStatusName);
      console.log('Current is_upload:', currentIsUpload);
      
      if (isFired || isInactive) {
        const statusName = isFired ? 'status_active_fired' : 'status_active_inactive';
        console.log(`Setting status_active to ${statusName}`);
        
        // СПЕЦИАЛЬНАЯ ЛОГИКА для status_active_fired: деактивируем status_hr_fired_off если он активен
        if (isFired) {
          console.log('Checking for active status_hr_fired_off to deactivate');
          const hrFiredOffStatus = await EmployeeStatusService.getCurrentStatus(id, 'status_hr');
          if (hrFiredOffStatus?.status?.name === 'status_hr_fired_off') {
            hrFiredOffStatus.isActive = false;
            hrFiredOffStatus.isUpload = false;
            hrFiredOffStatus.updatedBy = req.user.id;
            hrFiredOffStatus.updatedAt = new Date();
            await hrFiredOffStatus.save();
            console.log('✓ Deactivated status_hr_fired_off and set is_upload to false');
          }
        }
        
        await EmployeeStatusService.setStatusByName(id, statusName, req.user.id);
        console.log(`✓ Employee status_active updated to ${statusName}`);
      } else {
        // Если ни один чекбокс не выбран - сотрудник активен
        console.log('No checkboxes selected');
        
        // СПЕЦИАЛЬНАЯ ЛОГИКА: если был статус status_active_fired с is_upload = true
        if (currentStatusName === 'status_active_fired' && currentIsUpload === true) {
          console.log('Transitioning from status_active_fired with is_upload=true');
          
          // Деактивируем status_active_fired и устанавливаем is_upload = false
          if (currentActiveStatus) {
            currentActiveStatus.isActive = false;
            currentActiveStatus.isUpload = false;
            currentActiveStatus.updatedBy = req.user.id;
            currentActiveStatus.updatedAt = new Date();
            await currentActiveStatus.save();
            console.log('✓ Deactivated status_active_fired and set is_upload to false');
          }
          
          // Деактивируем status_hr_edited ДО активации status_hr_fired_off
          console.log('Looking for status_hr_edited to deactivate...');
          const hrEditedStatus = await EmployeeStatusService.getCurrentStatus(id, 'status_hr');
          console.log('Found status_hr:', hrEditedStatus?.status?.name, 'is_active:', hrEditedStatus?.isActive, 'is_upload:', hrEditedStatus?.isUpload);
          
          if (hrEditedStatus?.status?.name === 'status_hr_edited') {
            console.log('Deactivating status_hr_edited...');
            hrEditedStatus.isActive = false;
            hrEditedStatus.isUpload = false;
            hrEditedStatus.updatedBy = req.user.id;
            hrEditedStatus.updatedAt = new Date();
            await hrEditedStatus.save();
            console.log('✓ Deactivated status_hr_edited and set is_upload to false');
            
            // Перепроверяем, что сохранилось
            const verifyStatus = await EmployeeStatusService.getCurrentStatus(id, 'status_hr');
            console.log('Verification after deactivation:', verifyStatus?.status?.name, 'is_active:', verifyStatus?.isActive, 'is_upload:', verifyStatus?.isUpload);
          } else {
            console.log('status_hr_edited not found, might have been already deactivated or other status is active');
          }
          
          // Активируем status_hr_fired_off с is_upload = false (или создаем если не существует)
          console.log('Activating status_hr_fired_off...');
          await EmployeeStatusService.activateOrCreateStatus(id, 'status_hr_fired_off', req.user.id, false);
          console.log('✓ Activated or created status_hr_fired_off with is_upload=false');
        }
        
        // Устанавливаем status_active_employed
        if (currentStatusName !== 'status_active_employed') {
          console.log('Setting status_active to employed');
          await EmployeeStatusService.setStatusByName(id, 'status_active_employed', req.user.id);
          console.log('✓ Employee status_active updated to employed');
        }
      }
    } catch (statusError) {
      console.warn('Warning: could not update statuses:', statusError.message);
      // Не прерываем обновление, если ошибка со статусами
    }

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
    
    const employee = await Employee.findByPk(id, {
      include: employeeAccessInclude
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }
    
    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);
    
    // Получаем существующие маппинги сотрудника для текущего контрагента
    const existingMappings = await EmployeeCounterpartyMapping.findAll({
      where: {
        employeeId: id,
        counterpartyId: req.user.counterpartyId
      }
    });
    
    // Сохраняем существующий departmentId перед обновлением
    const existingDepartmentId = existingMappings.length > 0 
      ? existingMappings[0].departmentId 
      : null;
    
    // Если нет маппингов, создаем базовый
    if (existingMappings.length === 0) {
      // Если нет выбранных объектов - создаем маппинг с NULL
      if (!siteIds || siteIds.length === 0) {
        await EmployeeCounterpartyMapping.create({
          employeeId: id,
          counterpartyId: req.user.counterpartyId,
          constructionSiteId: null,
          departmentId: null
        });
      } else {
        // Создаем маппинги для каждого выбранного объекта
        for (const siteId of siteIds) {
          await EmployeeCounterpartyMapping.create({
            employeeId: id,
            counterpartyId: req.user.counterpartyId,
            constructionSiteId: siteId,
            departmentId: null
          });
        }
      }
    } else {
      // Удаляем все старые маппинги с объектами для этого контрагента
      await EmployeeCounterpartyMapping.destroy({
        where: {
          employeeId: id,
          counterpartyId: req.user.counterpartyId
        }
      });
      
      // Если нет выбранных объектов - создаем маппинг с NULL (сохраняем связь с контрагентом)
      if (!siteIds || siteIds.length === 0) {
        await EmployeeCounterpartyMapping.create({
          employeeId: id,
          counterpartyId: req.user.counterpartyId,
          constructionSiteId: null,
          departmentId: existingDepartmentId // Сохраняем подразделение
        });
      } else {
        // Создаем новые маппинги для каждого выбранного объекта, сохраняя departmentId
        for (const siteId of siteIds) {
          await EmployeeCounterpartyMapping.create({
            employeeId: id,
            counterpartyId: req.user.counterpartyId,
            constructionSiteId: siteId,
            departmentId: existingDepartmentId // Сохраняем подразделение
          });
        }
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
    
    const employee = await Employee.findByPk(id, {
      include: employeeAccessInclude
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }
    
    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);
    
    // Получаем ВСЕ маппинги сотрудника для текущего контрагента
    const mappings = await EmployeeCounterpartyMapping.findAll({
      where: {
        employeeId: id,
        counterpartyId: req.user.counterpartyId
      }
    });
    
    // Если маппингов нет, создаем новый
    if (mappings.length === 0) {
      await EmployeeCounterpartyMapping.create({
        employeeId: id,
        counterpartyId: req.user.counterpartyId,
        departmentId: departmentId || null,
        constructionSiteId: null
      });
    } else {
      // Обновляем departmentId во ВСЕХ маппингах сотрудника
      await EmployeeCounterpartyMapping.update(
        { departmentId: departmentId || null },
        {
          where: {
            employeeId: id,
            counterpartyId: req.user.counterpartyId
          }
        }
      );
    }
    
    res.json({
      success: true,
      message: 'Подразделение обновлено',
      data: {
        departmentId: departmentId || null
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

    const employee = await Employee.findByPk(id, {
      include: employeeAccessInclude
    });

    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }

    // ПРОВЕРКА ПРАВ ДОСТУПА
    try {
      await checkEmployeeAccess(req.user, employee);
    } catch (error) {
      await transaction.rollback();
      throw error;
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

    // 3. Удаляем каждый файл из хранилища
    for (const file of files) {
      try {
        console.log(`Deleting file from storage: ${file.filePath}`);
        await storageProvider.deleteFile(file.filePath);
        console.log(`✓ File deleted: ${file.filePath}`);
      } catch (error) {
        console.error(`✗ Error deleting file from storage: ${file.filePath}`);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
        // Продолжаем удаление, даже если файл уже отсутствует
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

    // 5. Удаляем папку сотрудника в хранилище
    if (employee.counterparty) {
      const employeeFullName = `${employee.lastName} ${employee.firstName} ${employee.middleName || ''}`.trim();
      const employeeFolderPath = buildEmployeeFilePath(employee.counterparty.name, employeeFullName).replace(/^\/+/, '');
      const fullPath = storageProvider.resolvePath(employeeFolderPath);

      console.log(`Deleting employee folder: ${fullPath}`);
      
      try {
        await storageProvider.deleteFile(fullPath);
        console.log(`✓ Employee folder deleted: ${fullPath}`);
      } catch (error) {
        console.error(`✗ Error deleting employee folder from storage: ${fullPath}`);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
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

/**
 * Обновить флаг is_upload для всех активных статусов сотрудника
 */
export const updateAllStatusesUploadFlag = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { isUpload } = req.body;
    const userId = req.user.id;

    // Обновляем все активные статусы сотрудника
    const [updatedCount] = await EmployeeStatusMapping.update(
      {
        isUpload: isUpload,
        updatedBy: userId
      },
      {
        where: {
          employeeId: employeeId,
          isActive: true
        }
      }
    );

    res.json({
      success: true,
      message: `Обновлено ${updatedCount} статусов`,
      data: {
        updatedCount: updatedCount
      }
    });
  } catch (error) {
    console.error('Error updating all statuses upload flag:', error);
    next(error);
  }
};

/**
 * Обновить флаг is_upload для одного статуса сотрудника
 */
export const updateStatusUploadFlag = async (req, res, next) => {
  try {
    const { employeeId, statusMappingId } = req.params;
    const { isUpload } = req.body;
    const userId = req.user.id;

    // Проверяем наличие статуса
    const statusMapping = await EmployeeStatusMapping.findByPk(statusMappingId);
    if (!statusMapping) {
      return res.status(404).json({
        success: false,
        message: 'Статус не найден'
      });
    }

    // Проверяем что статус принадлежит этому сотруднику
    if (statusMapping.employeeId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }

    // Обновляем флаг
    await statusMapping.update({
      isUpload: isUpload,
      updatedBy: userId
    });

    res.json({
      success: true,
      message: 'Флаг обновлен',
      data: {
        id: statusMapping.id,
        isUpload: statusMapping.isUpload
      }
    });
  } catch (error) {
    console.error('Error updating status upload flag:', error);
    next(error);
  }
};

/**
 * Установить статус "Редактирован" с флагом is_upload
 */
export const setEditedStatus = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { isUpload = true } = req.body;
    const userId = req.user.id;

    // Найти ID статуса "status_hr_edited"
    const editedStatusRecord = await Status.findOne({
      where: {
        name: 'status_hr_edited'
      }
    });

    if (!editedStatusRecord) {
      return res.status(400).json({
        success: false,
        message: 'Статус "status_hr_edited" не найден'
      });
    }

    // Проверяем есть ли активный статус status_hr_fired_off
    const firedOffMapping = await EmployeeStatusMapping.findOne({
      where: {
        employeeId: employeeId,
        statusGroup: 'status_hr',
        isActive: true
      },
      include: [
        {
          model: Status,
          as: 'status'
        }
      ]
    });

    // Если активен status_hr_fired_off - не создаем status_hr_edited
    if (firedOffMapping?.status?.name === 'status_hr_fired_off') {
      console.log('Employee has active status_hr_fired_off, skipping status_hr_edited creation');
      return res.json({
        success: true,
        message: 'Статус "Редактирован" не установлен (сотрудник в статусе "Повторно принят")',
        data: {
          statusUpdated: false,
          reason: 'status_hr_fired_off_active'
        }
      });
    }

    // Деактивируем все другие активные статусы группы status_hr
    await EmployeeStatusMapping.update(
      { isActive: false },
      {
        where: {
          employeeId: employeeId,
          statusGroup: 'status_hr',
          isActive: true
        }
      }
    );

    // Проверяем есть ли уже такой статус у сотрудника
    const existingMapping = await EmployeeStatusMapping.findOne({
      where: {
        employeeId: employeeId,
        statusId: editedStatusRecord.id,
        statusGroup: 'status_hr'
      }
    });

    if (existingMapping) {
      // Обновляем существующий
      existingMapping.isActive = true;
      existingMapping.isUpload = isUpload;
      existingMapping.updatedBy = userId;
      existingMapping.updatedAt = new Date();
      await existingMapping.save();
    } else {
      // Создаём новый статус для сотрудника
      await EmployeeStatusMapping.create({
        employeeId: employeeId,
        statusId: editedStatusRecord.id,
        statusGroup: 'status_hr',
        isUpload: isUpload,
        isActive: true,
        createdBy: userId,
        updatedBy: userId
      });
    }

    res.json({
      success: true,
      message: 'Статус "Редактирован" установлен',
      data: {
        statusUpdated: true
      }
    });
  } catch (error) {
    console.error('Error setting edited status:', error);
    next(error);
  }
};

/**
 * Уволить сотрудника
 * Очищает группу status_hr и устанавливает status_active_fired
 */
export const fireEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const employee = await Employee.findByPk(id, {
      include: employeeAccessInclude
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }

    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);

    console.log(`=== FIRING EMPLOYEE: ${employee.firstName} ${employee.lastName} ===`);

    // 1. Деактивируем все статусы группы status_hr и очищаем is_upload
    await EmployeeStatusMapping.update(
      { isActive: false, isUpload: false },
      {
        where: {
          employeeId: id,
          statusGroup: 'status_hr'
        }
      }
    );
    console.log('✓ All status_hr statuses deactivated and is_upload set to false');

    // 2. Активируем status_active_fired с is_upload = false
    await EmployeeStatusService.setStatusByName(id, 'status_active_fired', userId);
    
    // Обновляем is_upload = false для только что установленного статуса
    const firedMapping = await EmployeeStatusService.getCurrentStatus(id, 'status_active');
    if (firedMapping) {
      firedMapping.isUpload = false;
      firedMapping.updatedBy = userId;
      firedMapping.updatedAt = new Date();
      await firedMapping.save();
    }
    console.log('✓ status_active_fired activated with is_upload=false');

    res.json({
      success: true,
      message: `Сотрудник ${employee.firstName} ${employee.lastName} уволен`,
      data: {
        employeeId: id,
        action: 'fired'
      }
    });
  } catch (error) {
    console.error('Error firing employee:', error);
    next(error);
  }
};

/**
 * Принять уволенного сотрудника
 * Очищает группу status_hr кроме status_hr_fired_off и активирует status_hr_fired_off
 */
export const reinstateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const employee = await Employee.findByPk(id, {
      include: employeeAccessInclude
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }

    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);

    console.log(`=== REINSTATING EMPLOYEE: ${employee.firstName} ${employee.lastName} ===`);

    // 1. Получить статус status_hr_fired_off
    const firedOffStatus = await Status.findOne({
      where: { name: 'status_hr_fired_off' }
    });

    if (!firedOffStatus) {
      throw new Error('Статус status_hr_fired_off не найден');
    }

    // 2. Деактивируем все другие статусы группы status_hr и очищаем is_upload
    await EmployeeStatusMapping.update(
      { isActive: false, isUpload: false },
      {
        where: {
          employeeId: id,
          statusGroup: 'status_hr',
          statusId: { [Op.ne]: firedOffStatus.id }
        }
      }
    );
    console.log('✓ All status_hr statuses except status_hr_fired_off deactivated and is_upload set to false');

    // 3. Активируем status_hr_fired_off с is_upload = false (создаем или обновляем)
    await EmployeeStatusService.activateOrCreateStatus(id, 'status_hr_fired_off', userId, false);
    console.log('✓ status_hr_fired_off activated with is_upload=false');

    // 4. Деактивируем status_active_fired и устанавливаем status_active_employed
    const currentActiveStatus = await EmployeeStatusService.getCurrentStatus(id, 'status_active');
    if (currentActiveStatus?.status?.name === 'status_active_fired') {
      currentActiveStatus.isActive = false;
      currentActiveStatus.isUpload = false;
      currentActiveStatus.updatedBy = userId;
      currentActiveStatus.updatedAt = new Date();
      await currentActiveStatus.save();
      console.log('✓ status_active_fired deactivated');
    }

    // Активируем status_active_employed
    await EmployeeStatusService.setStatusByName(id, 'status_active_employed', userId);
    console.log('✓ status_active_employed activated');

    res.json({
      success: true,
      message: `Сотрудник ${employee.firstName} ${employee.lastName} восстановлен`,
      data: {
        employeeId: id,
        action: 'reinstated'
      }
    });
  } catch (error) {
    console.error('Error reinstating employee:', error);
    next(error);
  }
};

/**
 * Деактивировать сотрудника (установить status_active_inactive)
 */
export const deactivateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const employee = await Employee.findByPk(id, {
      include: employeeAccessInclude
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }

    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);

    console.log(`=== DEACTIVATING EMPLOYEE: ${employee.firstName} ${employee.lastName} ===`);

    // Устанавливаем status_active_inactive
    await EmployeeStatusService.setStatusByName(id, 'status_active_inactive', userId);
    console.log('✓ status_active_inactive activated');

    res.json({
      success: true,
      message: `Сотрудник ${employee.firstName} ${employee.lastName} деактивирован`,
      data: {
        employeeId: id,
        action: 'deactivated'
      }
    });
  } catch (error) {
    console.error('Error deactivating employee:', error);
    next(error);
  }
};

/**
 * Активировать сотрудника (установить status_active_employed)
 */
export const activateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const employee = await Employee.findByPk(id, {
      include: employeeAccessInclude
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }

    // ПРОВЕРКА ПРАВ ДОСТУПА
    await checkEmployeeAccess(req.user, employee);

    console.log(`=== ACTIVATING EMPLOYEE: ${employee.firstName} ${employee.lastName} ===`);

    // Деактивируем текущий статус из группы status_active
    const currentActiveStatus = await EmployeeStatusService.getCurrentStatus(id, 'status_active');
    if (currentActiveStatus) {
      currentActiveStatus.isActive = false;
      currentActiveStatus.isUpload = false;
      currentActiveStatus.updatedBy = userId;
      currentActiveStatus.updatedAt = new Date();
      await currentActiveStatus.save();
      console.log('✓ Previous status deactivated');
    }

    // Устанавливаем status_active_employed
    await EmployeeStatusService.setStatusByName(id, 'status_active_employed', userId);
    console.log('✓ status_active_employed activated');

    res.json({
      success: true,
      message: `Сотрудник ${employee.firstName} ${employee.lastName} активирован`,
      data: {
        employeeId: id,
        action: 'activated'
      }
    });
  } catch (error) {
    console.error('Error activating employee:', error);
    next(error);
  }
};

export const checkEmployeeByInn = async (req, res, next) => {
  try {
    const { inn } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userCounterpartyId = req.user.counterpartyId;

    console.log('🔍 checkEmployeeByInn - inn:', inn, 'userRole:', userRole, 'userCounterpartyId:', userCounterpartyId);

    // Валидация параметра
    if (!inn || typeof inn !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Параметр inn обязателен'
      });
    }

    // Нормализуем ИНН (убираем дефисы, оставляем только цифры)
    const normalizedInn = inn.replace(/[^\d]/g, '');
    console.log('🔍 Normalized INN:', normalizedInn);

    // Валидация длины ИНН
    if (normalizedInn.length !== 10 && normalizedInn.length !== 12) {
      return res.status(400).json({
        success: false,
        message: 'ИНН должен содержать 10 или 12 цифр'
      });
    }

    // Настраиваем include для маппинга контрагентов
    const mappingInclude = {
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
    };

    // ЭТАП 1: Проверяем сотрудника в контрагенте пользователя
    let where = { inn: normalizedInn };
    let userAccessMapping = { ...mappingInclude };

    const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');

    if (userRole !== 'admin') {
      // Для user и manager - проверяем только свой контрагент
      if (userCounterpartyId === defaultCounterpartyId) {
        // Контрагент по умолчанию: ищем сотрудников, созданных пользователем
        where.createdBy = userId;
      } else {
        // Другие контрагенты: ищем через маппинг
        userAccessMapping.where = { counterpartyId: userCounterpartyId };
        userAccessMapping.required = true;
      }
    }
    // Для админа - ограничений по контрагенту нет

    // Ищем сотрудника в контрагенте пользователя
    const employeeInUserAccess = await Employee.findOne({
      where,
      include: [
        {
          model: Citizenship,
          as: 'citizenship',
          attributes: ['id', 'name', 'code', 'requiresPatent']
        },
        {
          model: Position,
          as: 'position',
          attributes: ['id', 'name']
        },
        userAccessMapping
      ]
    });

    if (employeeInUserAccess) {
      // Сотрудник найден в контрагенте пользователя
      console.log('✅ Сотрудник найден в контрагенте пользователя:', employeeInUserAccess.id);
      return res.json({
        success: true,
        data: {
          employee: employeeInUserAccess.toJSON(),
          exists: true,
          isOwner: true // Сотрудник создан этим пользователем или найден в его контрагенте
        }
      });
    }

    // ЭТАП 2: Если не админ и сотрудника нет в его контрагенте - проверяем есть ли он в других
    if (userRole !== 'admin') {
      // 🎯 СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ USER В DEFAULT КОНТРАГЕНТЕ
      if (userRole === 'user' && userCounterpartyId === defaultCounterpartyId) {
        // Ищем сотрудника В DEFAULT контрагенте (неважно, есть ли он в других)
        const employeeInSameCounterparty = await Employee.findOne({
          where: { inn: normalizedInn },
          include: [
            {
              model: Citizenship,
              as: 'citizenship',
              attributes: ['id', 'name', 'code', 'requiresPatent']
            },
            {
              model: Position,
              as: 'position',
              attributes: ['id', 'name']
            },
            {
              model: EmployeeCounterpartyMapping,
              as: 'employeeCounterpartyMappings',
              where: { counterpartyId: defaultCounterpartyId },
              required: true,
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
          ]
        });

        if (employeeInSameCounterparty) {
          // ✅ Сотрудник найден в default контрагенте - можно привязать
          console.log('✅ Сотрудник найден в default контрагенте (создан другим пользователем):', employeeInSameCounterparty.id);
          return res.json({
            success: true,
            data: {
              employee: employeeInSameCounterparty.toJSON(),
              exists: true,
              isOwner: false, // Сотрудник создан другим пользователем
              canLink: true // Разрешить привязать к текущему пользователю
            }
          });
        }
      }

      // ❌ СТАНДАРТНАЯ ЛОГИКА ДЛЯ ОСТАЛЬНЫХ
      const employeeInAnotherCounterparty = await Employee.findOne({
        where: { inn: normalizedInn },
        include: [
          {
            model: EmployeeCounterpartyMapping,
            as: 'employeeCounterpartyMappings',
            attributes: ['counterpartyId'],
            required: true
          }
        ]
      });

      if (employeeInAnotherCounterparty) {
        // Сотрудник найден в ДРУГОМ контрагенте - ошибка доступа
        console.log('❌ Сотрудник найден в другом контрагенте:', employeeInAnotherCounterparty.id);
        return res.status(409).json({
          success: false,
          message: 'Сотрудник с таким ИНН уже существует. Обратитесь к администратору.'
        });
      }
    } else {
      // Для админа проверяем во всех контрагентах
      const anyEmployee = await Employee.findOne({
        where: { inn: normalizedInn },
        include: [
          {
            model: EmployeeCounterpartyMapping,
            as: 'employeeCounterpartyMappings',
            attributes: ['counterpartyId'],
            required: true
          }
        ]
      });

      if (anyEmployee) {
        // Сотрудник найден где-то - ошибка дублирования
        console.log('❌ Сотрудник с таким ИНН уже существует в системе:', anyEmployee.id);
        return res.status(409).json({
          success: false,
          message: 'Сотрудник с таким ИНН уже существует в системе'
        });
      }
    }

    // ЭТАП 3: Сотрудник не найден вообще
    console.log('ℹ️ Сотрудник не найден');
    return res.status(404).json({
      success: false,
      message: 'Сотрудник не найден'
    });
  } catch (error) {
    console.error('Error checking employee by inn:', error);
    next(error);
  }
};

export const searchEmployees = async (req, res, next) => {
  try {
    const { query, counterpartyId, position } = req.query;

    const where = {};
    const userId = req.user.id;

    if (query) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${query}%` } },
        { lastName: { [Op.iLike]: `%${query}%` } },
        { middleName: { [Op.iLike]: `%${query}%` } }
      ];
    }
    
    // Переопределяем логику поиска
    
    const include = [
        {
          model: Counterparty,
          as: 'counterparty',
          attributes: ['id', 'name']
        }
    ];
    
    // Если пользователь не админ, добавляем фильтр по маппингу или createdBy
    if (req.user.role !== 'admin') {
         const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');
         
         if (req.user.counterpartyId === defaultCounterpartyId) {
             where.createdBy = userId;
         } else {
             // Фильтруем через маппинг
             include.push({
                 model: EmployeeCounterpartyMapping,
                 as: 'employeeCounterpartyMappings',
                 where: { counterpartyId: req.user.counterpartyId },
                 required: true,
                 attributes: []
             });
         }
    } else if (counterpartyId) {
        // Админ может фильтровать по переданному counterpartyId
        include.push({
             model: EmployeeCounterpartyMapping,
             as: 'employeeCounterpartyMappings',
             where: { counterpartyId: counterpartyId },
             required: true,
             attributes: []
         });
    }

    if (position) {
      // Позиция теперь в таблице Position, а не поле position
      // Но здесь в старом коде было where.position. Исправим на связь.
       include.push({
           model: Position,
           as: 'position',
           where: { name: { [Op.iLike]: `%${position}%` } },
           attributes: ['id', 'name']
       });
    }

    const employees = await Employee.findAll({
      where,
      order: [['lastName', 'ASC']],
      include: include
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

    // Если маппинга нет, профиль сотрудника не был создан
    if (!mapping) {
      throw new AppError('Профиль сотрудника не создан. Создайте сотрудника через форму добавления.', 404);
    }

    if (!mapping.employee) {
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

/**
 * Перевести сотрудника в другую компанию (контрагента)
 * Создает запись в employee_counterparty_mapping
 * Доступно только для admin
 */
export const transferEmployeeToCounterparty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { counterpartyId } = req.body;
    const userId = req.user.id;

    // Проверяем, что сотрудник существует
    const employee = await Employee.findByPk(id);
    if (!employee) {
      throw new AppError('Сотрудник не найден', 404);
    }

    // Проверяем, что контрагент существует
    const counterparty = await Counterparty.findByPk(counterpartyId);
    if (!counterparty) {
      throw new AppError('Контрагент не найден', 404);
    }

    // Проверяем, нет ли уже такой связи
    const existingMapping = await EmployeeCounterpartyMapping.findOne({
      where: {
        employeeId: id,
        counterpartyId: counterpartyId
      }
    });

    if (existingMapping) {
      throw new AppError('Сотрудник уже привязан к этому контрагенту', 400);
    }

    // Создаем новую запись в маппинге
    const mapping = await EmployeeCounterpartyMapping.create({
      employeeId: id,
      counterpartyId: counterpartyId,
      departmentId: null,
      constructionSiteId: null
    });

    console.log(`✅ Сотрудник ${id} переведен в контрагента ${counterpartyId} пользователем ${userId}`);

    res.json({
      success: true,
      message: `Сотрудник успешно переведен в компанию "${counterparty.name}"`,
      data: {
        mapping,
        counterparty: {
          id: counterparty.id,
          name: counterparty.name,
          inn: counterparty.inn
        }
      }
    });
  } catch (error) {
    console.error('❌ Error transferring employee to counterparty:', error);
    next(error);
  }
};

/**
 * Импорт сотрудников из Excel
 * Шаг 1: Валидация и проверка контрагентов
 */
export const validateEmployeesImport = async (req, res, next) => {
  try {
    const { employees } = req.body;
    const userId = req.user.id;

    console.log('📥 validateEmployeesImport - входные данные:', {
      count: Array.isArray(employees) ? employees.length : 0,
      sample: employees?.[0]
    });

    if (!Array.isArray(employees) || employees.length === 0) {
      throw new AppError('Данные сотрудников не предоставлены', 400);
    }

    // 1. Проверяем наличие требуемых статусов
    const requiredStatuses = ['status_draft', 'status_card_draft'];
    const foundStatuses = await Status.findAll({
      where: {
        name: requiredStatuses
      }
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

    // 2. Валидируем данные и проверяем контрагентов
    const validationErrors = [];
    const counterpartyInnMap = {}; // Кеш для контрагентов

    const validatedEmployees = await Promise.all(
      employees.map(async (emp, index) => {
        const errors = [];

        // Обязательное поле - фамилия
        if (!emp.lastName || emp.lastName.toString().trim() === '') {
          errors.push('Фамилия (last_name) обязательна');
        }

        // Проверяем ИНН контрагента - ОБЯЗАТЕЛЕН для поиска контрагента
        if (!emp.counterpartyInn || emp.counterpartyInn.toString().trim() === '') {
          errors.push('ИНН контрагента обязателен');
        } else {
          const counterpartyInn = emp.counterpartyInn.toString().trim();

          // Кеш контрагентов
          if (!counterpartyInnMap[counterpartyInn]) {
            const counterparty = await Counterparty.findOne({
              where: { inn: counterpartyInn }
            });
            counterpartyInnMap[counterpartyInn] = counterparty;
          }

          if (!counterpartyInnMap[counterpartyInn]) {
            errors.push(`Контрагент с ИНН ${counterpartyInn} не найден`);
          }
        }

        // ИНН сотрудника - НЕ обязателен

        if (errors.length > 0) {
          console.log(`⚠️ Ошибки валидации в строке ${index + 1}:`, errors);
          validationErrors.push({
            rowIndex: index + 1,
            lastName: emp.lastName,
            errors
          });
          return null;
        }

        console.log(`✅ Строка ${index + 1} валидна:`, emp.lastName);

        return {
          firstName: emp.firstName ? emp.firstName.toString().trim() : null,
          lastName: emp.lastName.toString().trim(),
          middleName: emp.middleName ? emp.middleName.toString().trim() : null,
          inn: emp.inn ? emp.inn.toString().trim() : null,
          snils: emp.snils ? emp.snils.toString().trim() : null,
          idAll: emp.idAll ? emp.idAll.toString().trim() : null,
          counterpartyInn: emp.counterpartyInn.toString().trim(),
          rowIndex: index + 1
        };
      })
    );

    // Фильтруем null значения (невалидные строки)
    const validEmployees = validatedEmployees.filter(e => e !== null);

    console.log(`📊 Результаты валидации: ${validEmployees.length} валидных, ${validationErrors.length} ошибок`);

    // 3. Проверяем конфликты ИНН сотрудников
    const conflictingInns = [];
    const existingEmployees = {};

    if (validEmployees.length > 0) {
      const innsToCheck = validEmployees
        .map(e => e.inn)
        .filter(Boolean);

      if (innsToCheck.length > 0) {
        const existing = await Employee.findAll({
          where: {
            inn: innsToCheck
          }
        });

        existing.forEach(emp => {
          existingEmployees[emp.inn] = emp;
        });

        validEmployees.forEach(emp => {
          if (emp.inn && existingEmployees[emp.inn]) {
            console.log(`⚠️ Конфликт ИНН: ${emp.inn}`);
            conflictingInns.push({
              inn: emp.inn,
              newEmployee: emp,
              existingEmployee: {
                id: existingEmployees[emp.inn].id,
                firstName: existingEmployees[emp.inn].firstName,
                lastName: existingEmployees[emp.inn].lastName,
                middleName: existingEmployees[emp.inn].middleName
              }
            });
          }
        });
      }
    }

    console.log(`🔍 Конфликтов найдено: ${conflictingInns.length}`);

    const result = {
      validEmployees,
      validationErrors,
      conflictingInns,
      hasErrors: validationErrors.length > 0,
      hasConflicts: conflictingInns.length > 0
    };

    console.log('📤 Отправляем ответ:', {
      validEmployeesCount: validEmployees.length,
      validationErrorsCount: validationErrors.length,
      conflictingInnsCount: conflictingInns.length
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error validating employees import:', error);
    next(error);
  }
};

/**
 * Импорт сотрудников из Excel
 * Шаг 2: Финальный импорт с разрешением конфликтов
 */
export const importEmployees = async (req, res, next) => {
  try {
    const { employees, conflictResolutions } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(employees) || employees.length === 0) {
      throw new AppError('Данные сотрудников не предоставлены', 400);
    }

    // Получаем статусы
    const statuses = await Status.findAll({
      where: {
        name: ['status_draft', 'status_card_draft']
      }
    });

    const statusMap = {};
    statuses.forEach(s => {
      statusMap[s.name] = s.id;
    });

    // Кеш контрагентов
    const counterpartyCache = {};

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Обрабатываем батчами по 100
    const batchSize = 100;

    for (let i = 0; i < employees.length; i += batchSize) {
      const batch = employees.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (emp) => {
          try {
            // Получаем контрагент
            if (!counterpartyCache[emp.counterpartyInn]) {
              const counterparty = await Counterparty.findOne({
                where: { inn: emp.counterpartyInn }
              });
              counterpartyCache[emp.counterpartyInn] = counterparty;
            }

            const counterparty = counterpartyCache[emp.counterpartyInn];

            if (!counterparty) {
              throw new Error(`Контрагент с ИНН ${emp.counterpartyInn} не найден`);
            }

            // Сначала проверяем по id_all (это уникальный идентификатор из ЗУП)
            let employee;
            
            if (emp.idAll) {
              // Ищем сотрудника по id_all (уникальный ключ из ЗУП)
              employee = await Employee.findOne({
                where: { idAll: emp.idAll }
              });

              if (employee) {
                // Сотрудник с таким id_all существует - обновляем его
                console.log(`🔄 Обновляем сотрудника с id_all '${emp.idAll}'`);
                await employee.update({
                  firstName: emp.firstName,
                  lastName: emp.lastName,
                  middleName: emp.middleName,
                  inn: emp.inn || null,
                  snils: emp.snils || null,
                  updatedBy: userId
                });
                results.updated++;
              } else {
                // Сотрудника с таким id_all нет - проверяем конфликт по ИНН
                const resolution = conflictResolutions?.[emp.inn];

                if (emp.inn) {
                  const existingByInn = await Employee.findOne({
                    where: { inn: emp.inn }
                  });

                  if (existingByInn) {
                    // Конфликт по ИНН
                    if (resolution === 'skip') {
                      results.skipped++;
                      return;
                    }

                    if (resolution === 'update') {
                      // Обновляем существующего сотрудника
                      await existingByInn.update({
                        firstName: emp.firstName,
                        lastName: emp.lastName,
                        middleName: emp.middleName,
                        snils: emp.snils || null,
                        idAll: emp.idAll,
                        updatedBy: userId
                      });
                      employee = existingByInn;
                      results.updated++;
                    } else {
                      // По умолчанию пропускаем при конфликте
                      results.skipped++;
                      return;
                    }
                  } else {
                    // Создаем нового сотрудника с ИНН
                    employee = await Employee.create({
                      firstName: emp.firstName,
                      lastName: emp.lastName,
                      middleName: emp.middleName,
                      inn: emp.inn,
                      snils: emp.snils || null,
                      idAll: emp.idAll,
                      isActive: true,
                      createdBy: userId
                    });
                    results.created++;
                  }
                } else {
                  // Создаем сотрудника без ИНН
                  employee = await Employee.create({
                    firstName: emp.firstName,
                    lastName: emp.lastName,
                    middleName: emp.middleName,
                    snils: emp.snils || null,
                    idAll: emp.idAll,
                    isActive: true,
                    createdBy: userId
                  });
                  results.created++;
                }
              }
            } else {
              // Нет id_all - используем логику по ИНН
              const resolution = conflictResolutions?.[emp.inn];

              if (emp.inn) {
                const existingByInn = await Employee.findOne({
                  where: { inn: emp.inn }
                });

                if (existingByInn) {
                  if (resolution === 'skip') {
                    results.skipped++;
                    return;
                  }

                  if (resolution === 'update') {
                    await existingByInn.update({
                      firstName: emp.firstName,
                      lastName: emp.lastName,
                      middleName: emp.middleName,
                      snils: emp.snils || null,
                      updatedBy: userId
                    });
                    employee = existingByInn;
                    results.updated++;
                  } else {
                    results.skipped++;
                    return;
                  }
                } else {
                  employee = await Employee.create({
                    firstName: emp.firstName,
                    lastName: emp.lastName,
                    middleName: emp.middleName,
                    inn: emp.inn,
                    snils: emp.snils || null,
                    isActive: true,
                    createdBy: userId
                  });
                  results.created++;
                }
              } else {
                // Ни id_all ни ИНН - просто создаем нового
                employee = await Employee.create({
                  firstName: emp.firstName,
                  lastName: emp.lastName,
                  middleName: emp.middleName,
                  snils: emp.snils || null,
                  isActive: true,
                  createdBy: userId
                });
                results.created++;
              }
            }

            // Создаем связь с контрагентом
            await EmployeeCounterpartyMapping.findOrCreate({
              where: {
                employeeId: employee.id,
                counterpartyId: counterparty.id
              },
              defaults: {
                employeeId: employee.id,
                counterpartyId: counterparty.id
              }
            });

            // Создаем статусы
            for (const statusName of ['status_draft', 'status_card_draft']) {
              const statusId = statusMap[statusName];
              // statusGroup - это название группы (например, 'status_draft' или 'status_card_draft')
              const statusGroup = statusName.replace('status_', '').replace('_', ' ');
              
              await EmployeeStatusMapping.findOrCreate({
                where: {
                  employeeId: employee.id,
                  statusId: statusId
                },
                defaults: {
                  employeeId: employee.id,
                  statusId: statusId,
                  statusGroup: statusGroup,
                  createdBy: userId,
                  isActive: true,
                  isUpload: false
                }
              });
            }
          } catch (error) {
            console.error(`❌ Error importing employee at row ${emp.rowIndex}:`, error);
            results.errors.push({
              rowIndex: emp.rowIndex,
              lastName: emp.lastName,
              error: error.message
            });
          }
        })
      );
    }

    res.json({
      success: true,
      message: 'Импорт завершен',
      data: results
    });
  } catch (error) {
    console.error('❌ Error importing employees:', error);
    next(error);
  }
};

