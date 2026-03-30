import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MonitorCheckLog = sequelize.define('MonitorCheckLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  monitorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('UP', 'DOWN'),
    allowNull: false,
  },
  responseTimeMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  checkedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'monitor_check_logs',
  timestamps: true,
  indexes: [
    { fields: ['monitorId'] },
    { fields: ['checkedAt'] },
  ],
});

export default MonitorCheckLog;
