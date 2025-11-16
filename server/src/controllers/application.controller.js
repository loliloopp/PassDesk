import { Application, Counterparty, ConstructionSite, Contract, Employee, User, ApplicationEmployeeMapping, ApplicationFileMapping, File, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

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
          as: 'generalContract',
          attributes: ['id', 'contractNumber']
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
          attributes: ['id', 'firstName', 'lastName', 'middleName', 'position'],
          through: { attributes: [] } // Не включать поля из связующей таблицы
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
          as: 'generalContract'
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
          attributes: ['id', 'firstName', 'lastName', 'middleName', 'position'],
          through: { attributes: [] }
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
    
    // Создаем заявку
    const application = await Application.create({
      ...applicationData,
      counterpartyId: req.user.counterpartyId,
      createdBy: req.user.id
    }, { transaction });
    
    // Добавляем сотрудников через таблицу маппинга
    const mappingRecords = employeeIds.map(employeeId => ({
      applicationId: application.id,
      employeeId: employeeId
    }));
    
    await ApplicationEmployeeMapping.bulkCreate(mappingRecords, { transaction });
    
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
          attributes: ['id', 'firstName', 'lastName', 'middleName', 'position'],
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
    }
    
    await transaction.commit();
    
    // Загружаем обновленную заявку с сотрудниками
    const result = await Application.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employees',
          attributes: ['id', 'firstName', 'lastName', 'middleName', 'position'],
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
  try {
    const { id } = req.params;
    
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
    
    await application.destroy();
    
    res.json({
      success: true,
      message: 'Заявка успешно удалена'
    });
  } catch (error) {
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
      generalContractId: original.generalContractId,
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
          attributes: ['id', 'firstName', 'lastName', 'middleName', 'position'],
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
    
    const employees = await Employee.findAll({
      where: {
        counterparty_id: counterpartyId,
        is_active: true
      },
      attributes: ['id', 'firstName', 'lastName', 'middleName', 'position'],
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

