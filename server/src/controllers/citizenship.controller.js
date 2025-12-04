import { Citizenship, CitizenshipSynonym } from '../models/index.js';
import { Op } from 'sequelize';

// Получить все гражданства с синонимами
export const getAllCitizenships = async (req, res) => {
  try {
    const { search = '' } = req.query;
    
    const where = {};
    
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    
    const citizenships = await Citizenship.findAll({
      where,
      include: [{
        model: CitizenshipSynonym,
        as: 'synonyms',
        attributes: ['id', 'synonym']
      }],
      order: [
        ['name', 'ASC'],
        [{ model: CitizenshipSynonym, as: 'synonyms' }, 'synonym', 'ASC']
      ]
    });
    
    res.json({
      success: true,
      data: { citizenships }
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
    const { name, code, requiresPatent } = req.body;
    
    const citizenship = await Citizenship.create({ 
      name, 
      code,
      requiresPatent: requiresPatent !== undefined ? requiresPatent : true
    });
    
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

// Обновить гражданство
export const updateCitizenship = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, requiresPatent } = req.body;
    
    const citizenship = await Citizenship.findByPk(id);
    
    if (!citizenship) {
      return res.status(404).json({
        success: false,
        message: 'Гражданство не найдено'
      });
    }
    
    await citizenship.update({ 
      name, 
      code,
      requiresPatent
    });
    
    res.json({
      success: true,
      message: 'Гражданство обновлено',
      data: citizenship
    });
  } catch (error) {
    console.error('Error updating citizenship:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Такое гражданство уже существует'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении гражданства',
      error: error.message
    });
  }
};

// Добавить синоним к гражданству
export const addSynonym = async (req, res) => {
  try {
    const { citizenshipId } = req.params;
    const { synonym } = req.body;
    
    if (!synonym || synonym.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Синоним не может быть пустым'
      });
    }
    
    const citizenship = await Citizenship.findByPk(citizenshipId);
    
    if (!citizenship) {
      return res.status(404).json({
        success: false,
        message: 'Гражданство не найдено'
      });
    }
    
    const citizenshipSynonym = await CitizenshipSynonym.create({
      citizenshipId,
      synonym: synonym.trim()
    });
    
    res.status(201).json({
      success: true,
      message: 'Синоним добавлен',
      data: citizenshipSynonym
    });
  } catch (error) {
    console.error('Error adding synonym:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Такой синоним уже существует для этого гражданства'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении синонима',
      error: error.message
    });
  }
};

// Обновить синоним
export const updateSynonym = async (req, res) => {
  try {
    const { id } = req.params;
    const { synonym } = req.body;
    
    if (!synonym || synonym.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Синоним не может быть пустым'
      });
    }
    
    const citizenshipSynonym = await CitizenshipSynonym.findByPk(id);
    
    if (!citizenshipSynonym) {
      return res.status(404).json({
        success: false,
        message: 'Синоним не найден'
      });
    }
    
    await citizenshipSynonym.update({ synonym: synonym.trim() });
    
    res.json({
      success: true,
      message: 'Синоним обновлен',
      data: citizenshipSynonym
    });
  } catch (error) {
    console.error('Error updating synonym:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Такой синоним уже существует для этого гражданства'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении синонима',
      error: error.message
    });
  }
};

// Удалить синоним
export const deleteSynonym = async (req, res) => {
  try {
    const { id } = req.params;
    
    const citizenshipSynonym = await CitizenshipSynonym.findByPk(id);
    
    if (!citizenshipSynonym) {
      return res.status(404).json({
        success: false,
        message: 'Синоним не найден'
      });
    }
    
    await citizenshipSynonym.destroy();
    
    res.json({
      success: true,
      message: 'Синоним удален'
    });
  } catch (error) {
    console.error('Error deleting synonym:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении синонима',
      error: error.message
    });
  }
};

// Удалить гражданство
export const deleteCitizenship = async (req, res) => {
  try {
    const { id } = req.params;
    
    const citizenship = await Citizenship.findByPk(id);
    
    if (!citizenship) {
      return res.status(404).json({
        success: false,
        message: 'Гражданство не найдено'
      });
    }
    
    // Удаляем все синонимы перед удалением гражданства
    await CitizenshipSynonym.destroy({
      where: { citizenshipId: id }
    });
    
    await citizenship.destroy();
    
    res.json({
      success: true,
      message: 'Гражданство удалено'
    });
  } catch (error) {
    console.error('Error deleting citizenship:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении гражданства',
      error: error.message
    });
  }
};

