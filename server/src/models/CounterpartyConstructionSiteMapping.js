import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const CounterpartyConstructionSiteMapping = sequelize.define('CounterpartyConstructionSiteMapping', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  counterpartyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'counterparty_id',
    references: {
      model: 'counterparties',
      key: 'id'
    }
  },
  constructionSiteId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'construction_site_id',
    references: {
      model: 'construction_sites',
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
  tableName: 'counterparty_construction_sites_mapping',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_ccm_counterparty_id',
      fields: ['counterparty_id']
    },
    {
      name: 'idx_ccm_construction_site_id',
      fields: ['construction_site_id']
    }
  ]
});

export default CounterpartyConstructionSiteMapping;

