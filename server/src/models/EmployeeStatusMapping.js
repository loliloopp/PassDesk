import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class EmployeeStatusMapping extends Model {}

EmployeeStatusMapping.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'employee_id',
      references: {
        model: 'employees',
        key: 'id'
      },
      comment: 'ID сотрудника'
    },
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'status_id',
      references: {
        model: 'statuses',
        key: 'id'
      },
      comment: 'ID статуса'
    },
    statusGroup: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'status_group',
      comment: 'Группа статуса для оптимизации поиска'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'ID пользователя, создавшего запись'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'ID пользователя, обновившего запись'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_active',
      comment: 'Активен ли этот статус для группы в данный момент'
    },
    isUpload: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_upload',
      comment: 'Флаг для отслеживания загрузки в ЗУП (true - загружено, false - не загружено)'
    }
  },
  {
    sequelize,
    modelName: 'EmployeeStatusMapping',
    tableName: 'employees_statuses_mapping',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['employee_id']
      },
      {
        fields: ['status_id']
      },
      {
        fields: ['status_group']
      }
    ]
  }
);

export default EmployeeStatusMapping;

