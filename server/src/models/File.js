import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class File extends Model {}

File.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fileKey: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_key',
      comment: 'Ключ файла на Яндекс.Диске'
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_name'
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'original_name'
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'mime_type'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'file_size',
      comment: 'Размер файла в байтах'
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_path',
      comment: 'Полный путь на Яндекс.Диске'
    },
    publicUrl: {
      type: DataTypes.STRING,
      field: 'public_url',
      comment: 'Публичная ссылка на файл'
    },
    resourceId: {
      type: DataTypes.STRING,
      field: 'resource_id',
      comment: 'Resource ID от Яндекс.Диска'
    },
    entityType: {
      type: DataTypes.ENUM('employee', 'pass', 'other'),
      field: 'entity_type',
      comment: 'Тип связанной сущности'
    },
    entityId: {
      type: DataTypes.INTEGER,
      field: 'entity_id',
      comment: 'ID связанной сущности'
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      field: 'uploaded_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_deleted'
    }
  },
  {
    sequelize,
    modelName: 'File',
    tableName: 'files',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['file_key'],
        unique: true
      },
      {
        fields: ['entity_type', 'entity_id']
      },
      {
        fields: ['uploaded_by']
      }
    ]
  }
);

export default File;

