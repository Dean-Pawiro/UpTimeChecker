import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Monitor = sequelize.define('Monitor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  url: {
    type: DataTypes.STRING(2048),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  currentStatus: {
    type: DataTypes.ENUM('UP', 'DOWN', 'UNKNOWN'),
    allowNull: false,
    defaultValue: 'UNKNOWN',
  },
  lastCheckedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastResponseTimeMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  lastError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  currentStatusSinceAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastStatusChangeAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastStatusChangeFrom: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  lastStatusChangeTo: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  lastAlertSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastAlertStatus: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  lastAlertError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  alertRecipientUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  alertRecipientUserIds: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  intervalMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      min: 1,
      max: 1440,
    },
  },
}, {
  tableName: 'monitors',
  timestamps: true,
});

export default Monitor;
