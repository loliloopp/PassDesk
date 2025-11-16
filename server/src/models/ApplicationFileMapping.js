import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ApplicationFileMapping = sequelize.define('ApplicationFileMapping', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  applicationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'application_id',
    references: {
      model: 'applications',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'employee_id',
    references: {
      model: 'employees',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  fileId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'file_id',
    references: {
      model: 'files',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  sequelize,
  modelName: 'ApplicationFileMapping',
  tableName: 'application_files_mapping',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['application_id']
    },
    {
      fields: ['employee_id']
    },
    {
      fields: ['file_id']
    },
    {
      unique: true,
      fields: ['application_id', 'file_id'],
      name: 'unique_application_file'
    }
  ]
});

export default ApplicationFileMapping;

