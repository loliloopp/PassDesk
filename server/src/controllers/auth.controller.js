import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler.js';
import { User, Setting, Counterparty } from '../models/index.js';
import sequelize from '../config/database.js';
import { isPasswordAllowed, getForbiddenPasswordMessage } from '../utils/forbiddenPasswords.js';

// Генерация JWT токена
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Генерация refresh токена
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

/**
 * Генерация уникального УИН (6-значный)
 */
const generateUniqueUIN = async () => {
  const maxAttempts = 1000;
  let attempts = 0;

  while (attempts < maxAttempts) {
    // Генерация случайного 6-значного числа
    const uin = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    
    // Проверка уникальности
    const existing = await User.findOne({ where: { identificationNumber: uin } });
    if (!existing) {
      return uin;
    }
    
    attempts++;
  }
  
  throw new AppError('Не удалось сгенерировать уникальный УИН', 500);
};

/**
 * Парсинг ФИО из строки
 * @param {string} fullName - ФИО в формате "Фамилия Имя Отчество"
 * @returns {object} - { lastName, firstName, middleName }
 */
const parseFullName = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  
  return {
    lastName: parts[0] || '',
    firstName: parts[1] || '',
    middleName: parts.slice(2).join(' ') || null
  };
};

export const register = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Логируем только в development и без персональных данных
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Registration attempt');
    }
    const { email, password, fullName, registrationCode } = req.body;

    // Валидация входных данных
    if (!email || !password || !fullName) {
      throw new AppError('Все обязательные поля должны быть заполнены', 400);
    }

    if (password.length < 8) {
      throw new AppError('Пароль должен содержать минимум 8 символов', 400);
    }

    // Проверяем, не является ли пароль запрещенным
    if (!isPasswordAllowed(password)) {
      throw new AppError(getForbiddenPasswordMessage(), 400);
    }

    // Парсим ФИО
    const { lastName, firstName, middleName } = parseFullName(fullName);

    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('Пользователь с таким email уже существует', 409);
    }

    // Определяем контрагента
    let counterpartyId;
    let isDefaultCounterparty = false;

    if (registrationCode) {
      // Регистрация по коду контрагента
      const counterparty = await Counterparty.findOne({ 
        where: { registrationCode } 
      });
      
      if (!counterparty) {
        throw new AppError('Неверный код регистрации', 400);
      }
      
      counterpartyId = counterparty.id;
      isDefaultCounterparty = false;
    } else {
      // Регистрация с контрагентом по умолчанию
      const defaultCounterpartyId = await Setting.getSetting('default_counterparty_id');
      
      if (!defaultCounterpartyId || defaultCounterpartyId === '') {
        throw new AppError('Регистрация временно недоступна. Обратитесь к администратору.', 503);
      }
      
      counterpartyId = defaultCounterpartyId;
      isDefaultCounterparty = true;
    }

    // Генерируем УИН
    const identificationNumber = await generateUniqueUIN();

    // Создаем пользователя (пароль автоматически хешируется в хуке модели)
    const user = await User.create({
      email,
      password,
      firstName: fullName, // Сохраняем полное ФИО в first_name
      lastName: null, // last_name теперь NULL
      role: 'user',
      counterpartyId,
      identificationNumber,
      isActive: false // Пользователь неактивен до активации администратором
    }, { transaction });

    // Коммитим транзакцию
    await transaction.commit();

    // Генерируем токены для автоматического входа
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Регистрация прошла успешно. Дождитесь активации аккаунта администратором.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          counterpartyId: user.counterpartyId,
          identificationNumber: user.identificationNumber,
          isActive: user.isActive,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Находим пользователя (включая поле password)
    const user = await User.findOne({
      where: { email },
      attributes: { include: ['password'] },
    });

    if (!user) {
      throw new AppError('Неверный email или пароль. Проверьте правильность введенных данных.', 401);
    }

    // Проверяем пароль
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Неверный email или пароль. Проверьте правильность введенных данных.', 401);
    }

    // Разрешаем вход даже неактивным пользователям
    // Они будут перенаправлены на страницу профиля на фронтенде

    // Генерируем токены
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Обновляем lastLogin
    await user.update({ lastLogin: new Date() });

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          counterpartyId: user.counterpartyId,
          identificationNumber: user.identificationNumber,
          isActive: user.isActive,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    // Здесь можно добавить логику инвалидации токена
    // Например, добавление токена в черный список в Redis

    res.json({
      success: true,
      message: 'Выход выполнен успешно',
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token не предоставлен', 400);
    }

    // Проверяем refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Находим пользователя
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    if (!user.isActive) {
      throw new AppError('Аккаунт деактивирован', 403);
    }

    // Генерируем новые токены
    const newToken = generateToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Неверный или истекший refresh token', 401));
    }
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          identificationNumber: user.identificationNumber,
          counterpartyId: user.counterpartyId,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

