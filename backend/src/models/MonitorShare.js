import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MonitorShare = sequelize.define('MonitorShare', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  monitorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'viewer'),
    allowNull: false,
    defaultValue: 'viewer',
  },
  invitedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'monitor_shares',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['monitorId', 'userId'],
      name: 'uniq_monitor_user_share',
    },
  ],
});

export default MonitorShare;
