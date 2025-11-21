import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { User } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  try {
    // Получаем токен из заголовка
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Необходима авторизация', 401);
    }

    const token = authHeader.split(' ')[1];

    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Загружаем пользователя с counterpartyId и identificationNumber
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'role', 'counterpartyId', 'isActive', 'identificationNumber']
    });
    
    if (!user) {
      throw new AppError('Пользователь не найден', 401);
    }

    // Проверяем, активен ли пользователь
    if (!user.isActive) {
      throw new AppError('Ваш аккаунт не активирован администратором. УИН: ' + user.identificationNumber || 'не указан', 403);
    }
    
    // Добавляем данные пользователя в запрос
    req.user = {
      id: user.id,
      role: user.role,
      counterpartyId: user.counterpartyId
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Невалидный токен авторизации', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Время сессии истекло. Войдите снова', 401));
    }
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Необходима авторизация', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Недостаточно прав. Требуется роль: ${roles.join(' или ')}`, 403));
    }

    next();
  };
};

