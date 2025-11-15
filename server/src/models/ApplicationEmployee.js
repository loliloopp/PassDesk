import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ApplicationEmployeeMapping = sequelize.define('ApplicationEmployeeMapping', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  applicationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'application_id',
    references: {
      model: 'applications',
      key: 'id'
    }
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'employee_id',
    references: {
      model: 'employees',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'ApplicationEmployeeMapping',
  tableName: 'application_employees_mapping',
  timestamps: true,
  underscored: true,
  updatedAt: false, // Только created_at
  indexes: [
    {
      unique: true,
      fields: ['application_id', 'employee_id']
    },
    {
      fields: ['application_id']
    },
    {
      fields: ['employee_id']
    }
  ]
});

export default ApplicationEmployeeMapping;

