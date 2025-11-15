import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Employee extends Model {}

Employee.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'last_name'
    },
    middleName: {
      type: DataTypes.STRING,
      field: 'middle_name'
    },
    position: {
      type: DataTypes.STRING,
      allowNull: false
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      field: 'birth_date'
    },
    photoKey: {
      type: DataTypes.STRING,
      field: 'photo_key',
      comment: 'Ключ файла фото на Яндекс.Диске'
    },
    photoUrl: {
      type: DataTypes.STRING,
      field: 'photo_url',
      comment: 'URL фото на Яндекс.Диске'
    },
    notes: {
      type: DataTypes.TEXT
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      field: 'updated_by',
      references: {
        model: 'users',
        key: 'id'
      }
    }
  },
  {
    sequelize,
    modelName: 'Employee',
    tableName: 'employees',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['department']
      },
      {
        fields: ['position']
      },
      {
        fields: ['is_active']
      }
    ]
  }
);

export default Employee;

