import { ConstructionSite, Contract } from '../models/index.js';
import { Op } from 'sequelize';

// Получить все объекты строительства
export const getAllConstructionSites = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    const where = {};
    
    // Поиск по названию или адресу
    if (search) {
      where[Op.or] = [
        { shortName: { [Op.iLike]: `%${search}%` } },
        { fullName: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows } = await ConstructionSite.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        constructionSites: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching construction sites:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении объектов строительства',
      error: error.message
    });
  }
};

// Получить объект по ID
export const getConstructionSiteById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const site = await ConstructionSite.findByPk(id, {
      include: [
        {
          model: Contract,
          as: 'contracts',
          attributes: ['id', 'contractNumber', 'contractDate', 'type']
        }
      ]
    });
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Объект строительства не найден'
      });
    }
    
    res.json({
      success: true,
      data: site
    });
  } catch (error) {
    console.error('Error fetching construction site:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении объекта строительства',
      error: error.message
    });
  }
};

// Создать объект строительства
export const createConstructionSite = async (req, res) => {
  try {
    const site = await ConstructionSite.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Объект строительства успешно создан',
      data: site
    });
  } catch (error) {
    console.error('Error creating construction site:', error);
    
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
      message: 'Ошибка при создании объекта строительства',
      error: error.message
    });
  }
};

// Обновить объект строительства
export const updateConstructionSite = async (req, res) => {
  try {
    const { id } = req.params;
    
    const site = await ConstructionSite.findByPk(id);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Объект строительства не найден'
      });
    }
    
    await site.update(req.body);
    
    res.json({
      success: true,
      message: 'Объект строительства успешно обновлен',
      data: site
    });
  } catch (error) {
    console.error('Error updating construction site:', error);
    
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
      message: 'Ошибка при обновлении объекта строительства',
      error: error.message
    });
  }
};

// Удалить объект строительства
export const deleteConstructionSite = async (req, res) => {
  try {
    const { id } = req.params;
    
    const site = await ConstructionSite.findByPk(id);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Объект строительства не найден'
      });
    }
    
    // Проверяем есть ли связанные договоры
    const contractsCount = await Contract.count({
      where: { construction_site_id: id }
    });
    
    if (contractsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить объект: есть ${contractsCount} связанных договоров`
      });
    }
    
    await site.destroy();
    
    res.json({
      success: true,
      message: 'Объект строительства успешно удален'
    });
  } catch (error) {
    console.error('Error deleting construction site:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении объекта строительства',
      error: error.message
    });
  }
};

