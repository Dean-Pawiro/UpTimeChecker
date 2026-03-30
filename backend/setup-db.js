#!/usr/bin/env node

/**
 * Database initialization script
 * Creates the database if it doesn't exist
 * 
 * Usage:
 *   node setup-db.js (for local development)
 *   
 * For Hostinger:
 *   1. Create the database through Hostinger's control panel
 *   2. Update .env with database credentials
 *   3. Run this script or let the app auto-sync on startup
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const dbName = process.env.DB_NAME || 'uptime_checker';

async function setupDatabase() {
  try {
    console.log('Connecting to MySQL server...');
    const connection = await mysql.createConnection(config);

    console.log(`Creating database "${dbName}" if it doesn't exist...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);

    console.log(`✓ Database "${dbName}" is ready`);
    console.log('\nNext steps:');
    console.log('1. Start the server with: npm run dev');
    console.log('2. The server will automatically create tables on startup');
    
    await connection.end();
  } catch (error) {
    console.error('Error setting up database:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n❌ Invalid MySQL credentials');
      console.error('Check your .env file for DB_USER and DB_PASSWORD');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Cannot connect to MySQL server');
      console.error('Make sure MySQL is running on the configured host/port');
    }
    process.exit(1);
  }
}

setupDatabase();
