import { Contract, Counterparty, ConstructionSite } from '../models/index.js';
import { Op } from 'sequelize';

// Получить все договоры
export const getAllContracts = async (req, res) => {
  try {
    const { type, constructionSiteId, search, page = 1, limit = 10 } = req.query;
    
    const where = {};
    
    if (type) where.type = type;
    if (constructionSiteId) where.construction_site_id = constructionSiteId;
    if (search) {
      where.contract_number = { [Op.iLike]: `%${search}%` };
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows } = await Contract.findAndCountAll({
      where,
      include: [
        { model: ConstructionSite, as: 'constructionSite', attributes: ['id', 'shortName'] },
        { model: Counterparty, as: 'counterparty1', attributes: ['id', 'name', 'type'] },
        { model: Counterparty, as: 'counterparty2', attributes: ['id', 'name', 'type'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['contractDate', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        contracts: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
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

// Получить договор по ID
export const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const contract = await Contract.findByPk(id, {
      include: [
        { model: ConstructionSite, as: 'constructionSite' },
        { model: Counterparty, as: 'counterparty1' },
        { model: Counterparty, as: 'counterparty2' }
      ]
    });
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Договор не найден'
      });
    }
    
    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении договора',
      error: error.message
    });
  }
};

// Создать договор
export const createContract = async (req, res) => {
  try {
    const contract = await Contract.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Договор успешно создан',
      data: contract
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании договора',
      error: error.message
    });
  }
};

// Обновить договор
export const updateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findByPk(id);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Договор не найден'
      });
    }
    
    await contract.update(req.body);
    
    res.json({
      success: true,
      message: 'Договор успешно обновлен',
      data: contract
    });
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении договора',
      error: error.message
    });
  }
};

// Удалить договор
export const deleteContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findByPk(id);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Договор не найден'
      });
    }
    
    await contract.destroy();
    
    res.json({
      success: true,
      message: 'Договор успешно удален'
    });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении договора',
      error: error.message
    });
  }
};

