import { Setting } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Получить все настройки (только для администратора)
 */
export const getSettings = async (req, res, next) => {
  try {
    const settings = await Setting.findAll({
      order: [['key', 'ASC']]
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    next(error);
  }
};

/**
 * Обновить настройку по ключу (только для администратора)
 */
export const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (!value) {
      throw new AppError('Значение настройки обязательно', 400);
    }

    const setting = await Setting.setSetting(key, value, description);

    res.json({
      success: true,
      message: 'Настройка обновлена',
      data: setting
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    next(error);
  }
};

