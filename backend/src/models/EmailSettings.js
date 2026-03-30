import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const EmailSettings = sequelize.define('EmailSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  smtpHost: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  smtpPort: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 587,
  },
  smtpUser: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  smtpPassword: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  smtpFrom: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  smtpSecure: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  notificationsEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'email_settings',
  timestamps: true,
});

export default EmailSettings;
