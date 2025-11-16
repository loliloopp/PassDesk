import { AppError } from '../middleware/errorHandler.js';
import { User } from '../models/index.js';
import { Op } from 'sequelize';

export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, role, isActive } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Фильтр по поиску
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Фильтр по роли
    if (role) {
      where.role = role;
    }

    // Фильтр по активности
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role = 'user', counterpartyId } = req.body;

    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('Пользователь с таким email уже существует', 409);
    }

    // Создаем пользователя
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role,
      counterpartyId,
    });

    res.status(201).json({
      success: true,
      message: 'Пользователь создан успешно',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Не разрешаем обновлять пароль через этот endpoint
    delete updateData.password;

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    // Если обновляется email, проверяем уникальность
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({
        where: { email: updateData.email },
      });
      if (existingUser) {
        throw new AppError('Пользователь с таким email уже существует', 409);
      }
    }

    await user.update(updateData);

    res.json({
      success: true,
      message: 'Пользователь обновлен успешно',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Проверяем, что это не попытка удалить самого себя
    if (parseInt(id) === req.user.id) {
      throw new AppError('Вы не можете удалить собственный аккаунт', 400);
    }

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'Пользователь удален успешно',
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Только сам пользователь или admin может менять пароль
    if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
      throw new AppError('Недостаточно прав для изменения пароля', 403);
    }

    const user = await User.findByPk(id, {
      attributes: { include: ['password'] },
    });
    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    // Если не admin, требуем текущий пароль
    if (req.user.role !== 'admin') {
      if (!currentPassword) {
        throw new AppError('Необходимо указать текущий пароль', 400);
      }

      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new AppError('Неверный текущий пароль', 401);
      }
    }

    // Обновляем пароль
    await user.update({ password: newPassword });

    res.json({
      success: true,
      message: 'Пароль обновлен успешно',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    // Не разрешаем деактивировать самого себя
    if (parseInt(id) === req.user.id) {
      throw new AppError('Вы не можете деактивировать собственный аккаунт', 400);
    }

    await user.update({ isActive: !user.isActive });

    res.json({
      success: true,
      message: user.isActive
        ? 'Пользователь активирован'
        : 'Пользователь деактивирован',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

