import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Setting extends Model {
  /**
   * Получить значение настройки по ключу
   * @param {string} key - Ключ настройки
   * @returns {Promise<string|null>} - Значение настройки или null
   */
  static async getSetting(key) {
    const setting = await this.findOne({
      where: { key }
    });
    return setting ? setting.value : null;
  }

  /**
   * Установить значение настройки
   * @param {string} key - Ключ настройки
   * @param {string} value - Значение настройки
   * @param {string} description - Описание настройки (необязательно)
   * @returns {Promise<Setting>} - Объект настройки
   */
  static async setSetting(key, value, description = null) {
    const [setting] = await this.upsert({
      key,
      value,
      description
    });
    return setting;
  }
}

Setting.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Уникальный ключ настройки'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Значение настройки'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Описание настройки'
    }
  },
  {
    sequelize,
    modelName: 'Setting',
    tableName: 'settings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['key']
      }
    ]
  }
);

export default Setting;

