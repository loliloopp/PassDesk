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
 * Получить публичные настройки (доступно всем авторизованным пользователям)
 */
export const getPublicSettings = async (req, res, next) => {
  try {
    // Получаем настройки параллельно
    const [
      defaultCounterpartyId,
      employeeFormConfigDefault,
      employeeFormConfigExternal
    ] = await Promise.all([
      Setting.getSetting('default_counterparty_id'),
      Setting.getSetting('employee_form_config_default'),
      Setting.getSetting('employee_form_config_external')
    ]);

    // Парсим JSON конфиги, если они есть
    let formConfigDefault = null;
    let formConfigExternal = null;

    try {
      if (employeeFormConfigDefault) {
        formConfigDefault = JSON.parse(employeeFormConfigDefault);
      }
      if (employeeFormConfigExternal) {
        formConfigExternal = JSON.parse(employeeFormConfigExternal);
      }
    } catch (e) {
      console.error('Error parsing form configs:', e);
    }

    res.json({
      success: true,
      data: {
        defaultCounterpartyId: defaultCounterpartyId || null,
        employeeFormConfigDefault: formConfigDefault,
        employeeFormConfigExternal: formConfigExternal
      }
    });
  } catch (error) {
    console.error('Error getting public settings:', error);
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

