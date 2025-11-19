import { Position } from '../models/index.js';
import { Op } from 'sequelize';
import { Setting } from '../models/index.js';

// Вспомогательная функция для получения ID контрагента по умолчанию
const getDefaultCounterpartyId = async () => {
  const setting = await Setting.findOne({
    where: { key: 'default_counterparty_id' }
  });
  return setting?.value || null;
};

// Получить все должности
export const getAllPositions = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search
      ? { name: { [Op.iLike]: `%${search}%` } }
      : {};

    const { count, rows: positions } = await Position.findAndCountAll({
      where: whereClause,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: ['id', 'name', 'createdAt', 'updatedAt']
    });

    res.json({
      success: true,
      data: {
        positions,
        totalCount: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    next(error);
  }
};

// Получить должность по ID
export const getPositionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const position = await Position.findByPk(id, {
      attributes: ['id', 'name', 'createdAt', 'updatedAt']
    });

    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Должность не найдена'
      });
    }

    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error('Error fetching position:', error);
    next(error);
  }
};

// Создать должность
export const createPosition = async (req, res, next) => {
  try {
    const { name } = req.body;

    // Проверка прав: только пользователи контрагента по умолчанию
    const defaultCounterpartyId = await getDefaultCounterpartyId();
    
    if (!defaultCounterpartyId || req.user.counterpartyId !== defaultCounterpartyId) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав. Добавлять должности могут только пользователи контрагента по умолчанию.'
      });
    }

    // Валидация
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Название должности обязательно'
      });
    }

    // Создаём должность
    const position = await Position.create({
      name: name.trim(),
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Должность создана',
      data: position
    });
  } catch (error) {
    console.error('Error creating position:', error);
    
    // Обработка ошибки уникальности
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Должность с таким названием уже существует',
        errors: [{
          field: 'name',
          message: 'Название должности должно быть уникальным'
        }]
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
    
    next(error);
  }
};

// Обновить должность
export const updatePosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Проверка прав: только пользователи контрагента по умолчанию
    const defaultCounterpartyId = await getDefaultCounterpartyId();
    
    if (!defaultCounterpartyId || req.user.counterpartyId !== defaultCounterpartyId) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав. Редактировать должности могут только пользователи контрагента по умолчанию.'
      });
    }

    const position = await Position.findByPk(id);

    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Должность не найдена'
      });
    }

    // Валидация
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Название должности обязательно'
      });
    }

    await position.update({
      name: name.trim(),
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Должность обновлена',
      data: position
    });
  } catch (error) {
    console.error('Error updating position:', error);
    
    // Обработка ошибки уникальности
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Должность с таким названием уже существует',
        errors: [{
          field: 'name',
          message: 'Название должности должно быть уникальным'
        }]
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
    
    next(error);
  }
};

// Удалить должность
export const deletePosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверка прав: только пользователи контрагента по умолчанию
    const defaultCounterpartyId = await getDefaultCounterpartyId();
    
    if (!defaultCounterpartyId || req.user.counterpartyId !== defaultCounterpartyId) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав. Удалять должности могут только пользователи контрагента по умолчанию.'
      });
    }
    
    const position = await Position.findByPk(id);

    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Должность не найдена'
      });
    }

    // Проверяем, используется ли должность сотрудниками
    const employeesCount = await position.countEmployees();
    
    if (employeesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить должность. Она используется у ${employeesCount} сотрудник(ов)`,
        errors: [{
          field: 'employees',
          message: 'Сначала измените должность у всех сотрудников'
        }]
      });
    }

    await position.destroy();

    res.json({
      success: true,
      message: 'Должность удалена'
    });
  } catch (error) {
    console.error('Error deleting position:', error);
    next(error);
  }
};

// Импорт должностей из Excel (массовое создание с upsert)
export const importPositions = async (req, res, next) => {
  try {
    const { positions } = req.body;

    // Проверка прав: только пользователи контрагента по умолчанию
    const defaultCounterpartyId = await getDefaultCounterpartyId();
    
    if (!defaultCounterpartyId || req.user.counterpartyId !== defaultCounterpartyId) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав. Импортировать должности могут только пользователи контрагента по умолчанию.'
      });
    }

    if (!Array.isArray(positions) || positions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Список должностей пуст или некорректен'
      });
    }

    // Фильтруем и подготавливаем данные
    const validPositions = positions
      .map(name => name?.trim())
      .filter(name => name && name.length > 0)
      .filter((name, index, self) => self.indexOf(name) === index); // Убираем дубликаты в самом массиве

    if (validPositions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Не найдено валидных должностей для импорта'
      });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Батчинг по 20 записей
    const BATCH_SIZE = 20;
    const batches = [];
    
    for (let i = 0; i < validPositions.length; i += BATCH_SIZE) {
      batches.push(validPositions.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 Импорт должностей: всего ${validPositions.length}, батчей: ${batches.length}`);

    // Обрабатываем каждый батч
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        // Подготавливаем данные для bulkCreate
        const positionsData = batch.map(name => ({
          name: name,
          createdBy: req.user.id,
          updatedBy: req.user.id
        }));

        // Используем bulkCreate с updateOnDuplicate для upsert
        // При конфликте обновляем updated_by и updated_at
        const result = await Position.bulkCreate(positionsData, {
          updateOnDuplicate: ['updatedBy', 'updatedAt'], // Поля для обновления при конфликте
          returning: true,
          validate: true
        });

        // Подсчитываем созданные и обновленные записи
        // Sequelize не различает created vs updated в bulkCreate, 
        // поэтому считаем все как успешные операции
        results.created += result.length;

        console.log(`✅ Батч ${batchIndex + 1}/${batches.length}: обработано ${result.length} записей`);
      } catch (error) {
        console.error(`❌ Ошибка в батче ${batchIndex + 1}:`, error.message);
        // Если батч упал, пробуем обработать записи по одной
        for (const name of batch) {
          try {
            await Position.upsert({
              name: name,
              createdBy: req.user.id,
              updatedBy: req.user.id
            });
            results.created++;
          } catch (singleError) {
            results.errors.push({ 
              name: name, 
              error: singleError.message 
            });
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Импорт завершён. Обработано: ${results.created}, Ошибок: ${results.errors.length}`,
      data: {
        processed: results.created,
        errors: results.errors,
        total: validPositions.length
      }
    });
  } catch (error) {
    console.error('Error importing positions:', error);
    next(error);
  }
};

