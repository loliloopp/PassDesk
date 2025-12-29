import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class CounterpartyTypeMapping extends Model {}

CounterpartyTypeMapping.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    counterpartyId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'counterparty_id',
      references: {
        model: 'counterparties',
        key: 'id'
      },
      comment: 'ID контрагента (уникальный)'
    },
    types: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'JSONB массив типов: customer, contractor, general_contractor, subcontractor'
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
    modelName: 'CounterpartyTypeMapping',
    tableName: 'counterparties_types_mapping',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_counterparty_types_mapping_counterparty_id',
        unique: true,
        fields: ['counterparty_id']
      },
      {
        name: 'idx_counterparties_types_mapping_types',
        using: 'GIN',
        fields: ['types']
      }
    ]
  }
);

export default CounterpartyTypeMapping;

