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
      allowNull: true, // Разрешаем null для черновиков
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false, // Обязательное поле - минимум фамилия должна быть
      field: 'last_name'
    },
    middleName: {
      type: DataTypes.STRING,
      field: 'middle_name'
    },
    positionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'position_id',
      references: {
        model: 'positions',
        key: 'id'
      },
      comment: 'Должность сотрудника'
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
        // Пропускаем пустые значения (null, undefined, пустая строка)
        if (!value || value.trim() === '') {
          return;
        }
        if (value.length !== 10 && value.length !== 12) {
          throw new Error('ИНН должен содержать 10 или 12 цифр');
        }
        if (!/^\d+$/.test(value)) {
          throw new Error('ИНН должен содержать только цифры');
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
        // Пропускаем пустые значения (null, undefined, пустая строка)
        if (!value || value.trim() === '') {
          return;
        }
        // СНИЛС должен содержать только 11 цифр
        if (!/^\d{11}$/.test(value)) {
          throw new Error('СНИЛС должен содержать 11 цифр');
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
    validate: {
      isValidKig(value) {
        // Пропускаем пустые значения (null, undefined, пустая строка)
        if (!value || value.trim() === '') {
          return;
        }
        // КИГ должен быть в формате: 2 латинские буквы + 7 цифр (без пробела)
        if (!/^[A-Z]{2}\d{7}$/.test(value)) {
          throw new Error('КИГ должен быть в формате АА1234567 (2 латинские буквы + 7 цифр)');
        }
      }
    },
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
      type: DataTypes.STRING,
      validate: {
        isValidPhone(value) {
          // Пропускаем пустые значения (null, undefined, пустая строка)
          if (!value || value.trim() === '') {
            return;
          }
          // Телефон должен быть в формате +79101234567
          if (!/^\+\d{11}$/.test(value)) {
            throw new Error('Телефон должен быть в формате +79101234567');
          }
        }
      }
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
      allowNull: false, // Обязательное поле - каждый сотрудник должен иметь создателя
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
        fields: ['position_id']
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

