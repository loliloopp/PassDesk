import { Counterparty, Employee, Position, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

// Получить все контрагенты
export const getAllCounterparties = async (req, res) => {
  try {
    const { type, search, page = 1, limit = 10 } = req.query;
    
    const where = {};
    
    // Фильтр по типу
    if (type) {
      where.type = type;
    }
    
    // Поиск по названию или ИНН
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { inn: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows } = await Counterparty.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        counterparties: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching counterparties:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении контрагентов',
      error: error.message
    });
  }
};

// Получить контрагента по ID
export const getCounterpartyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const counterparty = await Counterparty.findByPk(id, {
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
          attributes: ['id', 'firstName', 'lastName', 'positionId']
        }
      ]
    });
    
    if (!counterparty) {
      return res.status(404).json({
        success: false,
        message: 'Контрагент не найден'
      });
    }
    
    res.json({
      success: true,
      data: counterparty
    });
  } catch (error) {
    console.error('Error fetching counterparty:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении контрагента',
      error: error.message
    });
  }
};

// Создать контрагента
export const createCounterparty = async (req, res) => {
  try {
    const counterpartyData = req.body;
    
    // Очищаем пустые строки для необязательных полей
    if (counterpartyData.email === '') counterpartyData.email = null;
    if (counterpartyData.phone === '') counterpartyData.phone = null;
    if (counterpartyData.kpp === '') counterpartyData.kpp = null;
    if (counterpartyData.ogrn === '') counterpartyData.ogrn = null;
    if (counterpartyData.legalAddress === '') counterpartyData.legalAddress = null;
    
    const counterparty = await Counterparty.create(counterpartyData);
    
    res.status(201).json({
      success: true,
      message: 'Контрагент успешно создан',
      data: counterparty
    });
  } catch (error) {
    console.error('Error creating counterparty:', error);
    
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
      message: 'Ошибка при создании контрагента',
      error: error.message
    });
  }
};

// Обновить контрагента
export const updateCounterparty = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Очищаем пустые строки для необязательных полей
    if (updates.email === '') updates.email = null;
    if (updates.phone === '') updates.phone = null;
    if (updates.kpp === '') updates.kpp = null;
    if (updates.ogrn === '') updates.ogrn = null;
    if (updates.legalAddress === '') updates.legalAddress = null;
    
    const counterparty = await Counterparty.findByPk(id);
    
    if (!counterparty) {
      return res.status(404).json({
        success: false,
        message: 'Контрагент не найден'
      });
    }
    
    await counterparty.update(updates);
    
    res.json({
      success: true,
      message: 'Контрагент успешно обновлен',
      data: counterparty
    });
  } catch (error) {
    console.error('Error updating counterparty:', error);
    
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
      message: 'Ошибка при обновлении контрагента',
      error: error.message
    });
  }
};

// Удалить контрагента
export const deleteCounterparty = async (req, res) => {
  try {
    const { id } = req.params;
    
    const counterparty = await Counterparty.findByPk(id);
    
    if (!counterparty) {
      return res.status(404).json({
        success: false,
        message: 'Контрагент не найден'
      });
    }
    
    // Проверяем есть ли связанные сотрудники (только если таблица существует)
    try {
      const employeesCount = await Employee.count({
        where: { counterparty_id: id }
      });
      
      if (employeesCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Невозможно удалить контрагента: есть ${employeesCount} связанных сотрудников`
        });
      }
    } catch (employeeCheckError) {
      // Если таблица employees не существует или нет поля counterparty_id - игнорируем
      console.warn('Warning checking employees:', employeeCheckError.message);
    }
    
    await counterparty.destroy();
    
    res.json({
      success: true,
      message: 'Контрагент успешно удален'
    });
  } catch (error) {
    console.error('Error deleting counterparty:', error);
    
    // Обработка ошибки внешнего ключа (контрагент используется в других таблицах)
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      const table = error.table || 'unknown';
      const tableNames = {
        'contracts': 'договорах',
        'employees': 'сотрудниках'
      };
      const tableName = tableNames[table] || table;
      
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить контрагента: он используется в ${tableName}`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении контрагента',
      error: error.message
    });
  }
};

// Получить статистику по контрагентам
export const getCounterpartiesStats = async (req, res) => {
  try {
    const stats = await Counterparty.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type']
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching counterparties stats:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики',
      error: error.message
    });
  }
};

