import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Counterparty = sequelize.define('Counterparty', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Название не может быть пустым'
      }
    }
  },
  inn: {
    type: DataTypes.STRING(12),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'ИНН не может быть пустым'
      },
      len: {
        args: [10, 12],
        msg: 'ИНН должен содержать 10 или 12 цифр'
      },
      isNumeric: {
        msg: 'ИНН должен содержать только цифры'
      }
    }
  },
  kpp: {
    type: DataTypes.STRING(9),
    allowNull: true,
    validate: {
      len: {
        args: [9, 9],
        msg: 'КПП должен содержать 9 цифр'
      },
      isNumeric: {
        msg: 'КПП должен содержать только цифры'
      }
    }
  },
  ogrn: {
    type: DataTypes.STRING(15),
    allowNull: true,
    validate: {
      len: {
        args: [13, 15],
        msg: 'ОГРН должен содержать 13 или 15 цифр'
      },
      isNumeric: {
        msg: 'ОГРН должен содержать только цифры'
      }
    }
  },
  legalAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'legal_address'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      customEmailValidation(value) {
        // Проверяем email только если он не пустой
        if (value && value.trim() !== '') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error('Введите корректный email');
          }
        }
      }
    }
  },
  type: {
    type: DataTypes.ENUM('customer', 'contractor', 'owner'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['customer', 'contractor', 'owner']],
        msg: 'Тип должен быть: customer, contractor или owner'
      }
    },
    comment: 'customer - заказчик, contractor - подрядчик, owner - владелец'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'updated_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'counterparties',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_counterparties_inn',
      fields: ['inn']
    },
    {
      name: 'idx_counterparties_type',
      fields: ['type']
    }
  ]
});

// Виртуальное поле для отображения типа на русском
Counterparty.prototype.getTypeDisplay = function() {
  const typeMap = {
    'customer': 'Заказчик',
    'contractor': 'Подрядчик',
    'owner': 'Владелец'
  };
  return typeMap[this.type] || this.type;
};

export default Counterparty;

