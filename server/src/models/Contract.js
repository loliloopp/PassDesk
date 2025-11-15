import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Contract = sequelize.define('Contract', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  contractNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'contract_number',
    validate: {
      notEmpty: {
        msg: 'Номер договора не может быть пустым'
      }
    }
  },
  contractDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'contract_date',
    validate: {
      notEmpty: {
        msg: 'Дата договора не может быть пустой'
      },
      isDate: {
        msg: 'Введите корректную дату'
      }
    }
  },
  constructionSiteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'construction_site_id',
    references: {
      model: 'construction_sites',
      key: 'id'
    }
  },
  counterparty1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'counterparty1_id',
    references: {
      model: 'counterparties',
      key: 'id'
    }
  },
  counterparty2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'counterparty2_id',
    references: {
      model: 'counterparties',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('subcontract', 'general_contract'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['subcontract', 'general_contract']],
        msg: 'Тип должен быть: subcontract или general_contract'
      }
    },
    comment: 'subcontract - договор подряда, general_contract - договор генподряда'
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
  tableName: 'contracts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_contracts_number',
      fields: ['contract_number']
    },
    {
      name: 'idx_contracts_construction_site',
      fields: ['construction_site_id']
    },
    {
      name: 'idx_contracts_counterparty1',
      fields: ['counterparty1_id']
    },
    {
      name: 'idx_contracts_counterparty2',
      fields: ['counterparty2_id']
    }
  ],
  validate: {
    differentCounterparties() {
      if (this.counterparty1Id === this.counterparty2Id) {
        throw new Error('Контрагенты в договоре должны быть разными');
      }
    }
  }
});

// Виртуальное поле для отображения типа на русском
Contract.prototype.getTypeDisplay = function() {
  const typeMap = {
    'subcontract': 'Договор подряда',
    'general_contract': 'Договор генподряда'
  };
  return typeMap[this.type] || this.type;
};

export default Contract;

