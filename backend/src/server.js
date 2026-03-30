import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DataTypes } from 'sequelize';
import sequelize from './config/database.js';
import authRoutes from './routes/auth.js';
import monitorRoutes from './routes/monitors.js';
import settingsRoutes from './routes/settings.js';
import './models/MonitorCheckLog.js';
import './models/EmailSettings.js';
import './models/MonitorShare.js';
import { startMonitoringWorker } from './workers/monitorWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/monitors', monitorRoutes);
app.use('/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    await sequelize.sync({ alter: false });
    console.log('✓ Database models synchronized');

    const queryInterface = sequelize.getQueryInterface();
    const monitorTable = await queryInterface.describeTable('monitors');
    if (!monitorTable.name) {
      await queryInterface.addColumn('monitors', 'name', {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
      console.log('✓ Added monitors.name column');
    }

    if (!monitorTable.currentStatus) {
      await queryInterface.addColumn('monitors', 'currentStatus', {
        type: DataTypes.ENUM('UP', 'DOWN', 'UNKNOWN'),
        allowNull: false,
        defaultValue: 'UNKNOWN',
      });
      console.log('✓ Added monitors.currentStatus column');
    }

    if (!monitorTable.lastCheckedAt) {
      await queryInterface.addColumn('monitors', 'lastCheckedAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('✓ Added monitors.lastCheckedAt column');
    }

    if (!monitorTable.lastResponseTimeMs) {
      await queryInterface.addColumn('monitors', 'lastResponseTimeMs', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      console.log('✓ Added monitors.lastResponseTimeMs column');
    }

    if (!monitorTable.lastError) {
      await queryInterface.addColumn('monitors', 'lastError', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      console.log('✓ Added monitors.lastError column');
    }

    if (!monitorTable.currentStatusSinceAt) {
      await queryInterface.addColumn('monitors', 'currentStatusSinceAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('✓ Added monitors.currentStatusSinceAt column');
    }

    if (!monitorTable.lastStatusChangeAt) {
      await queryInterface.addColumn('monitors', 'lastStatusChangeAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('✓ Added monitors.lastStatusChangeAt column');
    }

    if (!monitorTable.lastStatusChangeFrom) {
      await queryInterface.addColumn('monitors', 'lastStatusChangeFrom', {
        type: DataTypes.STRING(16),
        allowNull: true,
      });
      console.log('✓ Added monitors.lastStatusChangeFrom column');
    }

    if (!monitorTable.lastStatusChangeTo) {
      await queryInterface.addColumn('monitors', 'lastStatusChangeTo', {
        type: DataTypes.STRING(16),
        allowNull: true,
      });
      console.log('✓ Added monitors.lastStatusChangeTo column');
    }

    if (!monitorTable.lastAlertSentAt) {
      await queryInterface.addColumn('monitors', 'lastAlertSentAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('✓ Added monitors.lastAlertSentAt column');
    }

    if (!monitorTable.lastAlertStatus) {
      await queryInterface.addColumn('monitors', 'lastAlertStatus', {
        type: DataTypes.STRING(16),
        allowNull: true,
      });
      console.log('✓ Added monitors.lastAlertStatus column');
    }

    if (!monitorTable.lastAlertError) {
      await queryInterface.addColumn('monitors', 'lastAlertError', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      console.log('✓ Added monitors.lastAlertError column');
    }

    if (!monitorTable.alertRecipientUserId) {
      await queryInterface.addColumn('monitors', 'alertRecipientUserId', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      console.log('✓ Added monitors.alertRecipientUserId column');
    }

    if (!monitorTable.alertRecipientUserIds) {
      await queryInterface.addColumn('monitors', 'alertRecipientUserIds', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      console.log('✓ Added monitors.alertRecipientUserIds column');
    }

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      startMonitoringWorker();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
