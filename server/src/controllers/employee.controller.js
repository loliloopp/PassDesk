import { Employee, Counterparty, User, Citizenship } from '../models/index.js';
import { Op } from 'sequelize';

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
          model: Counterparty,
          as: 'counterparty',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Citizenship,
          as: 'citizenship',
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        employees: rows,
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
          as: 'citizenship'
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

    res.json({
      success: true,
      data: employee
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
    
    const employeeData = {
      ...req.body,
      counterpartyId: req.user.counterpartyId,
      createdBy: req.user.id
    };
    
    console.log('Employee data to create:', JSON.stringify(employeeData, null, 2));

    const employee = await Employee.create(employeeData);

    res.status(201).json({
      success: true,
      message: 'Сотрудник создан',
      data: employee
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
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
    
    // Не перезаписываем counterpartyId при обновлении
    const { counterpartyId, ...updateData } = req.body;
    
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

    res.json({
      success: true,
      message: 'Сотрудник обновлен',
      data: employee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    
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
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден'
      });
    }

    await employee.destroy();

    res.json({
      success: true,
      message: 'Сотрудник удален'
    });
  } catch (error) {
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

