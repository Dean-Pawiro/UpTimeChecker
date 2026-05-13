import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Monitor from './Monitor.js';

const ContactInfo = sequelize.define('ContactInfo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  monitorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: Monitor,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
});

ContactInfo.belongsTo(Monitor, { foreignKey: 'monitorId', onDelete: 'CASCADE' });
Monitor.hasOne(ContactInfo, { foreignKey: 'monitorId', onDelete: 'CASCADE' });

export default ContactInfo;
