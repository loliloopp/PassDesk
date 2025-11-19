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
    citizenshipId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'citizenship_id',
      references: {
        model: 'citizenships',
        key: 'id'
      },
      comment: 'Гражданство'
    },
  birthDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'birth_date',
    comment: 'Дата рождения'
  },
  inn: {
    type: DataTypes.STRING(12),
    allowNull: true,
    unique: true,
    field: 'inn',
    validate: {
      isValidInn(value) {
        if (value && value.length > 0) {
          if (value.length !== 10 && value.length !== 12) {
            throw new Error('ИНН должен содержать 10 или 12 цифр');
          }
          if (!/^\d+$/.test(value)) {
            throw new Error('ИНН должен содержать только цифры');
          }
        }
      }
    },
    comment: 'ИНН сотрудника (уникальный)'
  },
  snils: {
    type: DataTypes.STRING(14),
    allowNull: true,
    unique: true,
    field: 'snils',
    validate: {
      isValidSnils(value) {
        if (value && value.length > 0) {
          if (!/^\d{3}-\d{3}-\d{3}\s\d{2}$/.test(value)) {
            throw new Error('СНИЛС должен быть в формате XXX-XXX-XXX XX');
          }
        }
      }
    },
    comment: 'СНИЛС сотрудника (уникальный)'
  },
  kig: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    field: 'kig',
    comment: 'КИГ (Карта иностранного гражданина) (уникальный)'
  },
    passportNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      field: 'passport_number',
      comment: 'Номер паспорта (уникальный)'
    },
    passportDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'passport_date',
      comment: 'Дата выдачи паспорта'
    },
    passportIssuer: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'passport_issuer',
      comment: 'Кем выдан паспорт'
    },
    registrationAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'registration_address',
      comment: 'Адрес регистрации'
    },
    patentNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'patent_number',
      comment: 'Номер патента'
    },
    patentIssueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'patent_issue_date',
      comment: 'Дата выдачи патента'
    },
    blankNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'blank_number',
      comment: 'Номер бланка документа'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isValidEmail(value) {
          if (value && value.length > 0) {
            // Простая проверка email
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              throw new Error('Введите корректный email');
            }
          }
        }
      }
    },
    phone: {
      type: DataTypes.STRING
    },
    notes: {
      type: DataTypes.TEXT
    },
    statusCard: {
      type: DataTypes.STRING(20),
      defaultValue: 'draft',
      allowNull: false,
      field: 'status_card',
      validate: {
        isIn: [['draft', 'completed']]
      },
      comment: 'Статус заполнения данных сотрудника: draft (черновик), completed (заполнено)'
    },
    status: {
      type: DataTypes.ENUM('new', 'tb_passed', 'processed'),
      defaultValue: 'new',
      allowNull: false,
      field: 'status',
      comment: 'Статус сотрудника: new (Новый), tb_passed (Проведен ТБ), processed (Обработан)'
    },
    statusActive: {
      type: DataTypes.ENUM('fired', 'inactive', 'fired_compl'),
      allowNull: true,
      field: 'status_active',
      comment: 'Активность сотрудника: fired (Уволен), inactive (Неактивный), fired_compl (Уволен и обработан), NULL (Активен)'
    },
    statusSecure: {
      type: DataTypes.ENUM('allow', 'block', 'block_compl'),
      defaultValue: 'allow',
      allowNull: false,
      field: 'status_secure',
      comment: 'Статус безопасности: allow (Разрешен), block (Заблокирован), block_compl (Заблокирован и обработан)'
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
        fields: ['position']
      },
      {
        fields: ['is_active']
      },
    {
      fields: ['counterparty_id']
    },
    {
      fields: ['citizenship_id']
    },
    {
      fields: ['inn']
    },
    {
      fields: ['snils']
    },
    {
      fields: ['kig']
    }
    ]
  }
);

export default Employee;

