import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Citizenship = sequelize.define('Citizenship', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        msg: 'Название гражданства не может быть пустым'
      }
    }
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Код страны (ISO 3166-1 alpha-2)'
  }
}, {
  sequelize,
  modelName: 'Citizenship',
  tableName: 'citizenships',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['name']
    }
  ]
});

export default Citizenship;

