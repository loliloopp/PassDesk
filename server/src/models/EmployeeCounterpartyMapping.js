import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class EmployeeCounterpartyMapping extends Model {}

EmployeeCounterpartyMapping.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'Уникальный идентификатор записи маппинга'
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
    counterpartyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'counterparty_id',
      references: {
        model: 'counterparties',
        key: 'id'
      },
      comment: 'ID контрагента'
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'department_id',
      references: {
        model: 'departments',
        key: 'id'
      },
      comment: 'ID подразделения (может быть NULL)'
    }
  },
  {
    sequelize,
    modelName: 'EmployeeCounterpartyMapping',
    tableName: 'employee_counterparty_mapping',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['employee_id']
      },
      {
        fields: ['counterparty_id']
      },
      {
        fields: ['department_id']
      },
      {
        unique: true,
        fields: ['employee_id', 'counterparty_id'],
        name: 'unique_employee_counterparty'
      }
    ]
  }
);

export default EmployeeCounterpartyMapping;

