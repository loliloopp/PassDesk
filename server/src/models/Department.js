import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Department extends Model {}

Department.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'Уникальный идентификатор подразделения'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Название подразделения не может быть пустым'
        }
      },
      comment: 'Название подразделения'
    },
    counterpartyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'counterparty_id',
      references: {
        model: 'counterparties',
        key: 'id'
      },
      comment: 'ID контрагента, к которому относится подразделение'
    }
  },
  {
    sequelize,
    modelName: 'Department',
    tableName: 'departments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['counterparty_id']
      },
      {
        unique: true,
        fields: ['name', 'counterparty_id'],
        name: 'unique_department_name_per_counterparty'
      }
    ]
  }
);

export default Department;

