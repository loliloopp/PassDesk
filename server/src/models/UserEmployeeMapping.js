import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class UserEmployeeMapping extends Model {}

UserEmployeeMapping.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID пользователя'
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'employee_id',
      references: {
        model: 'employees',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID сотрудника'
    },
    counterpartyId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'counterparty_id',
      references: {
        model: 'counterparties',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'ID контрагента для быстрой фильтрации (NULL для контрагента по умолчанию)'
    }
  },
  {
    sequelize,
    modelName: 'UserEmployeeMapping',
    tableName: 'user_employee_mapping',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['employee_id']
      },
      {
        fields: ['counterparty_id']
      },
      {
        unique: true,
        fields: ['user_id', 'employee_id']
      }
    ]
  }
);

export default UserEmployeeMapping;

