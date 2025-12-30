import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Модель для логирования критических действий пользователей
 * Используется для расследования инцидентов безопасности
 */
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Уникальный идентификатор записи в audit log'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    comment: 'ID пользователя, выполнившего действие'
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Тип действия (EMPLOYEE_IMPORT, EMPLOYEE_DELETE, USER_CREATE, и т.д.)'
  },
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'entity_type',
    comment: 'Тип сущности (employee, user, application)'
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'entity_id',
    comment: 'ID затронутой сущности'
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Дополнительная информация о действии (JSON)'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
    comment: 'IP адрес пользователя'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent',
    comment: 'User-Agent браузера'
  },
  status: {
    type: DataTypes.ENUM('success', 'failed', 'partial'),
    allowNull: false,
    defaultValue: 'success',
    comment: 'Статус выполнения действия'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message',
    comment: 'Сообщение об ошибке (если status = failed)'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'audit_logs',
  timestamps: false, // Только createdAt, нет updatedAt (audit log не изменяется)
  indexes: [
    {
      fields: ['user_id'],
      name: 'idx_audit_logs_user_id'
    },
    {
      fields: ['action'],
      name: 'idx_audit_logs_action'
    },
    {
      fields: ['created_at'],
      name: 'idx_audit_logs_created_at'
    },
    {
      fields: ['entity_type', 'entity_id'],
      name: 'idx_audit_logs_entity'
    }
  ]
});

export default AuditLog;

