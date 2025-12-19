import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Модель для хранения наборов столбцов Excel
 * Каждый набор принадлежит контрагенту и доступен всем его пользователям
 */
const ExcelColumnSet = sequelize.define(
  'ExcelColumnSet',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Уникальный идентификатор набора',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Название набора столбцов',
      validate: {
        notEmpty: {
          msg: 'Название набора не может быть пустым',
        },
        len: {
          args: [1, 100],
          msg: 'Название набора должно быть от 1 до 100 символов',
        },
      },
    },
    counterpartyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'counterparty_id',
      comment: 'ID контрагента-владельца набора',
    },
    columns: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Массив объектов с информацией о столбцах',
      validate: {
        isValidColumns(value) {
          if (!Array.isArray(value)) {
            throw new Error('Columns должен быть массивом');
          }
          if (value.length === 0) {
            throw new Error('Набор должен содержать хотя бы один столбец');
          }
          // Проверяем структуру каждого элемента
          value.forEach((col, index) => {
            if (!col.key || !col.label || typeof col.enabled !== 'boolean' || typeof col.order !== 'number') {
              throw new Error(`Неверная структура столбца на позиции ${index}`);
            }
          });
        },
      },
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_default',
      comment: 'Флаг набора по умолчанию для контрагента',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
      comment: 'ID пользователя, создавшего набор',
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by',
      comment: 'ID пользователя, последним редактировавшего набор',
    },
  },
  {
    tableName: 'excel_column_sets',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['name', 'counterparty_id'],
        name: 'uk_excel_column_sets_name_counterparty',
      },
      {
        fields: ['counterparty_id'],
        name: 'idx_excel_column_sets_counterparty_id',
      },
      {
        fields: ['counterparty_id', 'is_default'],
        where: { is_default: true },
        name: 'idx_excel_column_sets_is_default',
      },
      {
        fields: ['created_by'],
        name: 'idx_excel_column_sets_created_by',
      },
    ],
  }
);

/**
 * Ассоциации модели
 */
ExcelColumnSet.associate = (models) => {
  // Набор принадлежит контрагенту
  ExcelColumnSet.belongsTo(models.Counterparty, {
    foreignKey: 'counterpartyId',
    as: 'counterparty',
    onDelete: 'CASCADE',
  });

  // Автор создания набора
  ExcelColumnSet.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator',
    onDelete: 'SET NULL',
  });

  // Последний редактор набора
  ExcelColumnSet.belongsTo(models.User, {
    foreignKey: 'updatedBy',
    as: 'updater',
    onDelete: 'SET NULL',
  });
};

export default ExcelColumnSet;

