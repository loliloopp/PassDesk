import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class CounterpartySubcounterpartyMapping extends Model {}

CounterpartySubcounterpartyMapping.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    parentCounterpartyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'parent_counterparty_id',
      references: {
        model: 'counterparties',
        key: 'id'
      },
      comment: 'ID контрагента-создателя (родитель)'
    },
    childCounterpartyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'child_counterparty_id',
      references: {
        model: 'counterparties',
        key: 'id'
      },
      comment: 'ID субподрядчика (ребенок)'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'ID пользователя, создавшего связь'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    modelName: 'CounterpartySubcounterpartyMapping',
    tableName: 'counterparties_subcounterparties_mapping',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_counterparty_subcounterparty_parent',
        fields: ['parent_counterparty_id']
      },
      {
        name: 'idx_counterparty_subcounterparty_child',
        fields: ['child_counterparty_id']
      },
      {
        name: 'unique_parent_child_pair',
        unique: true,
        fields: ['parent_counterparty_id', 'child_counterparty_id']
      }
    ]
  }
);

export default CounterpartySubcounterpartyMapping;

