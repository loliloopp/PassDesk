import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  applicationNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'application_number',
    comment: 'Уникальный номер заявки'
  },
  counterpartyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'counterparty_id',
    references: {
      model: 'counterparties',
      key: 'id'
    },
    comment: 'Контрагент, от имени которого заявка'
  },
  constructionSiteId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'construction_site_id',
    references: {
      model: 'construction_sites',
      key: 'id'
    },
    comment: 'Объект строительства (необязательно)'
  },
  subcontractId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'subcontract_id',
    references: {
      model: 'contracts',
      key: 'id'
    },
    comment: 'Договор подряда (только для подрядчиков)'
  },
  applicationType: {
    type: DataTypes.ENUM('biometric', 'customer'),
    allowNull: false,
    field: 'application_type',
    defaultValue: 'biometric',
    comment: 'Тип заявки: биометрия или заказчик'
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Статус заявки'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Примечания к заявке'
  },
  passValidUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'pass_valid_until',
    comment: 'Дата окончания действия пропусков'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true, // Разрешаем NULL при удалении пользователя
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL' // При удалении пользователя устанавливаем NULL
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL' // При удалении пользователя устанавливаем NULL
  }
}, {
  sequelize,
  modelName: 'Application',
  tableName: 'applications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['counterparty_id']
    },
    {
      fields: ['construction_site_id']
    },
    {
      fields: ['application_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    }
  ],
  hooks: {
    beforeValidate: (application) => {
      // Генерация запасного номера заявки если не указан (не должно происходить)
      if (!application.applicationNumber) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        application.applicationNumber = `APP-${timestamp}-${random}`;
      }
    }
  }
});

// Виртуальное поле для отображения статуса на русском
Application.prototype.getStatusDisplay = function() {
  const statusMap = {
    'draft': 'Черновик',
    'submitted': 'Подана',
    'approved': 'Одобрена',
    'rejected': 'Отклонена'
  };
  return statusMap[this.status] || this.status;
};

export default Application;

