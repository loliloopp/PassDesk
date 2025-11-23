import { Application, Counterparty, ConstructionSite, Contract, Employee, User, ApplicationEmployeeMapping, ApplicationFileMapping, File, Citizenship, EmployeeCounterpartyMapping, Position, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import storageProvider from '../config/storage.js';
import { generateApplicationDocument } from '../services/documentService.js';

// Функция генерации номера заявки
const generateApplicationNumber = async (constructionSiteId) => {
  try {
    // Загружаем объект строительства
    const site = await ConstructionSite.findByPk(constructionSiteId);
    
    if (site && site.shortName) {
      // Получаем первые 3 буквы названия объекта (только русские буквы)
      const sitePrefix = site.shortName
        .replace(/[^А-ЯЁа-яё]/g, '') // Оставляем только русские буквы
        .substring(0, 3)
        .toUpperCase();
      
      // Форматируем дату (ДДММГГ)
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).substring(2);
      const dateStr = `${day}${month}${year}`;
      
      // Получаем начало и конец текущего дня
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      // Подсчитываем количество заявок на этот объект за сегодня
      const count = await Application.count({
        where: {
          constructionSiteId: constructionSiteId,
          createdAt: {
            [Op.between]: [startOfDay, endOfDay]
          }
        }
      });
      
      // Порядковый номер (следующий)
      const sequence = String(count + 1).padStart(3, '0');
      
      // Формируем номер заявки: ЗИЛ-171125-001
      return `${sitePrefix}-${dateStr}-${sequence}`;
    }
  } catch (error) {
    console.error('Error generating application number:', error);
  }
  
  // В случае ошибки используем старый формат
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `APP-${timestamp}-${random}`;
};

// Получить все заявки
export const getAllApplications = async (req, res) => {
  try {
    const { counterpartyId, status, page = 1, limit = 10 } = req.query;
    
    const where = {};
    
    // Каждый пользователь видит только свои заявки
    where.createdBy = req.user.id;
    
    if (counterpartyId) {
      where.counterparty_id = counterpartyId;
    }
    
    if (status) {
      where.status = status;
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows } = await Application.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Counterparty,
          as: 'counterparty',
          attributes: ['id', 'name', 'type']
        },
        {
          model: ConstructionSite,
          as: 'constructionSite',
          attributes: ['id', 'shortName', 'fullName']
        },
        {
          model: Contract,
          as: 'subcontract',
          attributes: ['id', 'contractNumber']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Employee,
          as: 'employees',
          include: [
            { 
              model: Citizenship, 
              as: 'citizenship', 
              attributes: ['name'] 
            },
            {
              model: EmployeeCounterpartyMapping,
              as: 'employeeCounterpartyMappings',
              include: [
                {
                  model: Counterparty,
                  as: 'counterparty',
                  attributes: ['name', 'inn', 'kpp']
                }
              ]
            },
            {
              model: Position,
              as: 'position',
              attributes: ['id', 'name']
            }
          ],
          attributes: ['id', 'firstName', 'lastName', 'middleName', 'kig', 'birthDate', 'snils', 'inn', 'positionId'],
          through: { attributes: [] } // Не включать поля из связующей таблицы
        },
        {
          model: File,
          as: 'scanFile',
          attributes: ['id', 'fileKey', 'fileName', 'originalName', 'mimeType', 'fileSize', 'createdAt'],
          required: false // LEFT JOIN - заявка может существовать без скана
        },
        {
          model: File,
          as: 'files',
          attributes: ['id', 'fileName', 'originalName', 'mimeType', 'fileSize'],
          through: {
            attributes: ['employeeId'], // Включаем employeeId из маппинга
            as: 'fileMapping'
          }
        }
      ]
    });
    
    res.json({
      success: true,
      data: {
        applications: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении заявок',
      error: error.message
    });
  }
};

// Получить заявку по ID
export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await Application.findOne({
      where: {
        id: id,
        createdBy: req.user.id // Только свои заявки
      },
      include: [
        {
          model: Counterparty,
          as: 'counterparty'
        },
        {
          model: ConstructionSite,
          as: 'constructionSite'
        },
        {
          model: Contract,
          as: 'subcontract'
        },
        {
          model: User,
          as: 'creator'
        },
        {
          model: Employee,
          as: 'employees',
          include: [
            { 
              model: Citizenship, 
              as: 'citizenship', 
              attributes: ['name'] 
            },
            {
              model: EmployeeCounterpartyMapping,
              as: 'employeeCounterpartyMappings',
              include: [
                {
                  model: Counterparty,
                  as: 'counterparty',
                  attributes: ['name', 'inn', 'kpp']
                }
              ]
            },
            {
              model: Position,
              as: 'position',
              attributes: ['id', 'name']
            }
          ],
          attributes: ['id', 'firstName', 'lastName', 'middleName', 'kig', 'birthDate', 'snils', 'inn', 'positionId'],
          through: { attributes: [] }
        },
        {
          model: File,
          as: 'scanFile',
          attributes: ['id', 'fileKey', 'fileName', 'originalName', 'mimeType', 'fileSize', 'createdAt'],
          required: false // LEFT JOIN - заявка может существовать без скана
        }
      ]
    });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении заявки',
      error: error.message
    });
  }
};

// Создать заявку
export const createApplication = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { employeeIds, selectedFiles, ...applicationData } = req.body;
    
    // Проверяем, что выбран хотя бы один сотрудник
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Необходимо выбрать хотя бы одного сотрудника'
      });
    }
    
    // Генерируем номер заявки
    const applicationNumber = await generateApplicationNumber(applicationData.constructionSiteId);
    
    // Создаем заявку
    const application = await Application.create({
      ...applicationData,
      applicationNumber,
      counterpartyId: req.user.counterpartyId,
      createdBy: req.user.id
    }, { transaction });
    
    // Добавляем сотрудников через таблицу маппинга
    const mappingRecords = employeeIds.map(employeeId => ({
      applicationId: application.id,
      employeeId: employeeId
    }));
    
    await ApplicationEmployeeMapping.bulkCreate(mappingRecords, { transaction });
    
    // Обновляем/создаем записи в employee_counterparty_mapping для каждого сотрудника
    for (const employeeId of employeeIds) {
      // Проверяем, есть ли уже запись для этой комбинации сотрудник-контрагент-объект
      let mapping = await EmployeeCounterpartyMapping.findOne({
        where: {
          employeeId: employeeId,
          counterpartyId: req.user.counterpartyId,
          constructionSiteId: applicationData.constructionSiteId
        },
        transaction
      });

      if (mapping) {
        // Связка уже существует - обновляем updated_at
        await mapping.save({ transaction });
      } else {
        // Связки нет - создаем новую
        await EmployeeCounterpartyMapping.create({
          employeeId: employeeId,
          counterpartyId: req.user.counterpartyId,
          constructionSiteId: applicationData.constructionSiteId,
          departmentId: null
        }, { transaction });
      }
    }
    
    // Добавляем файлы, если они выбраны
    // selectedFiles должен быть массивом объектов: [{ employeeId, fileId }, ...]
    if (selectedFiles && Array.isArray(selectedFiles) && selectedFiles.length > 0) {
      const fileRecords = selectedFiles.map(({ employeeId, fileId }) => ({
        applicationId: application.id,
        employeeId: employeeId,
        fileId: fileId
      }));
      
      await ApplicationFileMapping.bulkCreate(fileRecords, { transaction });
    }
    
    await transaction.commit();
    
    // Загружаем заявку с сотрудниками и файлами
    const result = await Application.findByPk(application.id, {
      include: [
        {
          model: Employee,
          as: 'employees',
          include: [
            {
              model: Position,
              as: 'position',
              attributes: ['id', 'name']
            }
          ],
          attributes: ['id', 'firstName', 'lastName', 'middleName', 'positionId'],
          through: { attributes: [] }
        },
        {
          model: File,
          as: 'files',
          attributes: ['id', 'fileName', 'originalName', 'mimeType', 'fileSize'],
          through: {
            attributes: ['employeeId'],
            as: 'fileMapping'
          }
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Заявка успешно создана',
      data: result
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating application:', error);
    
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
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании заявки',
      error: error.message
    });
  }
};

// Обновить заявку
export const updateApplication = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { employeeIds, ...updates } = req.body;
    
    const application = await Application.findOne({
      where: {
        id: id,
        createdBy: req.user.id // Только свои заявки
      },
      transaction
    });
    
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    // Обновляем данные заявки (не перезаписываем counterpartyId)
    const { counterpartyId, ...updateData } = updates;
    
    await application.update({
      ...updateData,
      updatedBy: req.user.id
    }, { transaction });
    
    // Если переданы employeeIds, обновляем связи
    if (employeeIds && Array.isArray(employeeIds)) {
      if (employeeIds.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Необходимо выбрать хотя бы одного сотрудника'
        });
      }
      
      // Получаем старый список сотрудников из заявки
      const oldEmployeeMappings = await ApplicationEmployeeMapping.findAll({
        where: { applicationId: id },
        attributes: ['employeeId'],
        transaction
      });
      const oldEmployeeIds = oldEmployeeMappings.map(m => m.employeeId);
      
      // Определяем сотрудников, у которых были сняты чекбоксы
      const removedEmployeeIds = oldEmployeeIds.filter(empId => !employeeIds.includes(empId));
      
      // Удаляем старые связи
      await ApplicationEmployeeMapping.destroy({
        where: { applicationId: id },
        transaction
      });
      
      // Создаем новые связи
      const mappingRecords = employeeIds.map(employeeId => ({
        applicationId: id,
        employeeId: employeeId
      }));
      
      await ApplicationEmployeeMapping.bulkCreate(mappingRecords, { transaction });
      
      // Обновляем/создаем записи в employee_counterparty_mapping для добавленных сотрудников
      for (const employeeId of employeeIds) {
        // Проверяем, есть ли уже запись для этой комбинации сотрудник-контрагент-объект
        let mapping = await EmployeeCounterpartyMapping.findOne({
          where: {
            employeeId: employeeId,
            counterpartyId: application.counterpartyId,
            constructionSiteId: application.constructionSiteId
          },
          transaction
        });

        if (mapping) {
          // Связка уже существует - обновляем updated_at
          await mapping.save({ transaction });
        } else {
          // Связки нет - создаем новую
          await EmployeeCounterpartyMapping.create({
            employeeId: employeeId,
            counterpartyId: application.counterpartyId,
            constructionSiteId: application.constructionSiteId,
            departmentId: null
          }, { transaction });
        }
      }
      
      // Удаляем записи из employee_counterparty_mapping для сотрудников, у которых сняли чекбоксы
      for (const employeeId of removedEmployeeIds) {
        await EmployeeCounterpartyMapping.destroy({
          where: {
            employeeId: employeeId,
            counterpartyId: application.counterpartyId,
            constructionSiteId: application.constructionSiteId
          },
          transaction
        });
      }
    }
    
    await transaction.commit();
    
    // Загружаем обновленную заявку с сотрудниками
    const result = await Application.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employees',
          include: [
            {
              model: Position,
              as: 'position',
              attributes: ['id', 'name']
            }
          ],
          attributes: ['id', 'firstName', 'lastName', 'middleName', 'positionId'],
          through: { attributes: [] }
        }
      ]
    });
    
    res.json({
      success: true,
      message: 'Заявка успешно обновлена',
      data: result
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating application:', error);
    
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
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении заявки',
      error: error.message
    });
  }
};

// Удалить заявку
export const deleteApplication = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    const application = await Application.findOne({
      where: {
        id: id,
        createdBy: req.user.id // Только свои заявки
      },
      include: [
        {
          model: Employee,
          as: 'employees',
          attributes: ['id'],
          through: { attributes: [] }
        },
        {
          model: Counterparty,
          as: 'counterparty',
          attributes: ['id', 'name']
        }
      ],
      transaction
    });
    
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    console.log('=== DELETING APPLICATION ===');
    console.log('Application:', {
      id: application.id,
      number: application.applicationNumber
    });
    
    // 1. Удаляем файлы, прикрепленные к заявке
    const files = await File.findAll({
      where: {
        entityType: 'application',
        entityId: id,
        isDeleted: false
      },
      transaction
    });
    
    console.log(`Found ${files.length} files to delete`);
    
    // Удаляем каждый файл из хранилища
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
    
    // Физически удаляем файлы из БД
    const deletedFilesCount = await File.destroy({
      where: {
        entityType: 'application',
        entityId: id
      },
      transaction
    });
    console.log(`Deleted ${deletedFilesCount} file records from DB`);
    
    // 2. Удаляем записи из employee_counterparty_mapping для сотрудников этой заявки
    // Удаляем только те записи, которые соответствуют комбинации:
    // сотрудник из заявки + контрагент заявки + объект заявки
    const employeeIds = application.employees.map(emp => emp.id);
    
    if (employeeIds.length > 0) {
      const deletedMappingsCount = await EmployeeCounterpartyMapping.destroy({
        where: {
          employeeId: employeeIds,
          counterpartyId: application.counterpartyId,
          constructionSiteId: application.constructionSiteId
        },
        transaction
      });
      console.log(`Deleted ${deletedMappingsCount} employee-counterparty mappings`);
    }
    
    // 3. Удаляем саму заявку (каскадно удалятся записи из application_employees_mapping)
    await application.destroy({ transaction });
    
    await transaction.commit();
    
    console.log('✓ Application deleted successfully');
    
    res.json({
      success: true,
      message: 'Заявка успешно удалена'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting application:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении заявки',
      error: error.message
    });
  }
};

// Копировать заявку
export const copyApplication = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    const original = await Application.findOne({
      where: {
        id: id,
        createdBy: req.user.id // Только свои заявки
      },
      include: [
        {
          model: Employee,
          as: 'employees',
          attributes: ['id'],
          through: { attributes: [] }
        }
      ],
      transaction
    });
    
    if (!original) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    // Создаем копию
    const copy = await Application.create({
      counterpartyId: original.counterpartyId,
      constructionSiteId: original.constructionSiteId,
      subcontractId: original.subcontractId,
      notes: original.notes ? `Копия: ${original.notes}` : 'Копия заявки',
      status: 'draft',
      createdBy: req.user.id
    }, { transaction });
    
    // Копируем сотрудников
    const employeeIds = original.employees.map(emp => emp.id);
    await copy.addEmployees(employeeIds, { transaction });
    
    await transaction.commit();
    
    // Загружаем копию с сотрудниками
    const result = await Application.findByPk(copy.id, {
      include: [
        {
          model: Employee,
          as: 'employees',
          include: [
            {
              model: Position,
              as: 'position',
              attributes: ['id', 'name']
            }
          ],
          attributes: ['id', 'firstName', 'lastName', 'middleName', 'positionId'],
          through: { attributes: [] }
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Заявка успешно скопирована',
      data: result
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error copying application:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при копировании заявки',
      error: error.message
    });
  }
};

// Получить договоры для выбранного контрагента и объекта
export const getContractsForApplication = async (req, res) => {
  try {
    const { counterpartyId, constructionSiteId } = req.query;
    
    if (!counterpartyId || !constructionSiteId) {
      return res.status(400).json({
        success: false,
        message: 'Требуются counterpartyId и constructionSiteId'
      });
    }
    
    // Получаем контрагента
    const counterparty = await Counterparty.findByPk(counterpartyId);
    
    if (!counterparty) {
      return res.status(404).json({
        success: false,
        message: 'Контрагент не найден'
      });
    }
    
    const result = {
      generalContract: null,
      subcontracts: []
    };
    
    // Ищем договор генподряда для этого объекта
    const generalContract = await Contract.findOne({
      where: {
        construction_site_id: constructionSiteId,
        type: 'general_contract',
        [Op.or]: [
          { counterparty1_id: counterpartyId },
          { counterparty2_id: counterpartyId }
        ]
      },
      include: [
        { model: Counterparty, as: 'counterparty1' },
        { model: Counterparty, as: 'counterparty2' }
      ]
    });
    
    if (generalContract) {
      result.generalContract = generalContract;
    }
    
    // Если контрагент - подрядчик, ищем договоры подряда
    if (counterparty.type === 'contractor') {
      const subcontracts = await Contract.findAll({
        where: {
          construction_site_id: constructionSiteId,
          type: 'subcontract',
          [Op.or]: [
            { counterparty1_id: counterpartyId },
            { counterparty2_id: counterpartyId }
          ]
        },
        include: [
          { model: Counterparty, as: 'counterparty1' },
          { model: Counterparty, as: 'counterparty2' }
        ]
      });
      
      result.subcontracts = subcontracts;
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении договоров',
      error: error.message
    });
  }
};

// Получить сотрудников для выбранного контрагента
export const getEmployeesForApplication = async (req, res) => {
  try {
    const { counterpartyId } = req.query;
    
    if (!counterpartyId) {
      return res.status(400).json({
        success: false,
        message: 'Требуется counterpartyId'
      });
    }
    
    // Теперь сотрудники связаны с контрагентами через маппинг
    const employees = await Employee.findAll({
      include: [
        {
          model: EmployeeCounterpartyMapping,
          as: 'employeeCounterpartyMappings',
          where: {
            counterpartyId: counterpartyId
          },
          attributes: []
        },
        {
          model: Position,
          as: 'position',
          attributes: ['id', 'name']
        }
      ],
      attributes: ['id', 'firstName', 'lastName', 'middleName', 'positionId'],
      order: [['lastName', 'ASC']]
    });
    
    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении сотрудников',
      error: error.message
    });
  }
};

// Экспортировать заявку в Word
export const exportApplicationToWord = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем доступ к заявке
    const application = await Application.findOne({
      where: {
        id: id,
        createdBy: req.user.id // Только свои заявки
      }
    });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }
    
    // Генерируем документ Word
    const buffer = await generateApplicationDocument(id);
    
    // Формируем имя файла
    const fileName = `Заявка_${application.applicationNumber}.docx`;
    
    // Отправляем файл
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error('Error exporting application to Word:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при экспорте заявки',
      error: error.message
    });
  }
};


