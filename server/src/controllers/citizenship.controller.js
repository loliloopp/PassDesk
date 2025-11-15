import { Citizenship } from '../models/index.js';
import { Op } from 'sequelize';

// Получить все гражданства
export const getAllCitizenships = async (req, res) => {
  try {
    const { search = '' } = req.query;
    
    const where = {};
    
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    
    const citizenships = await Citizenship.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: { citizenships } // Wrapped in object for consistency
    });
  } catch (error) {
    console.error('Error fetching citizenships:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка гражданств',
      error: error.message
    });
  }
};

// Создать новое гражданство
export const createCitizenship = async (req, res) => {
  try {
    const { name, code } = req.body;
    
    const citizenship = await Citizenship.create({ name, code });
    
    res.status(201).json({
      success: true,
      message: 'Гражданство добавлено',
      data: citizenship
    });
  } catch (error) {
    console.error('Error creating citizenship:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Такое гражданство уже существует'
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
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании гражданства',
      error: error.message
    });
  }
};

