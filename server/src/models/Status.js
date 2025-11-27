import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Status extends Model {}

Status.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Имя статуса в формате группа_значение (например: status_new, status_card_draft)'
    },
    group: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Группа статуса: status, status_card, status_active, status_secure'
    }
  },
  {
    sequelize,
    modelName: 'Status',
    tableName: 'statuses',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['group']
      }
    ]
  }
);

export default Status;

