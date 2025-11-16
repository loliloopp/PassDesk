import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler.js';
import { User } from '../models/index.js';

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

export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role = 'user' } = req.body;

    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('Пользователь с таким email уже существует', 409);
    }

    // Создаем пользователя (пароль автоматически хешируется в хуке модели)
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    // Генерируем токены
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Обновляем lastLogin
    await user.update({ lastLogin: new Date() });

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
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
      throw new AppError('Неверный email или пароль', 401);
    }

    // Проверяем пароль
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Неверный email или пароль', 401);
    }

    // Проверяем, активен ли пользователь
    if (!user.isActive) {
      throw new AppError('Аккаунт деактивирован', 403);
    }

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

