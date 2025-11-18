import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class CitizenshipSynonym extends Model {}

CitizenshipSynonym.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    citizenshipId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'citizenship_id',
      references: {
        model: 'citizenships',
        key: 'id'
      },
      comment: 'ID гражданства (UUID)'
    },
    synonym: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Синоним названия гражданства'
    }
  },
  {
    sequelize,
    modelName: 'CitizenshipSynonym',
    tableName: 'citizenship_synonyms',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['synonym']
      },
      {
        fields: ['citizenship_id']
      },
      {
        unique: true,
        fields: ['citizenship_id', 'synonym'],
        name: 'unique_citizenship_synonym'
      }
    ]
  }
);

export default CitizenshipSynonym;

