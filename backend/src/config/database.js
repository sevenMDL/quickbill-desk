/**
 * Database Manager - MongoDB connection handler with fallback strategies
 * @module utils/database
 * @requires mongoose
 * @requires ./index.js
 * @requires ../utils/logger
 */

const mongoose = require('mongoose');
const config = require('./index.js');
const logger = require('../utils/logger');

/**
 * Database manager.
 * @class DatabaseManager
 */
class DatabaseManager {
  /**
   * Main database connection method with fallback strategies
   * @returns {Promise<mongoose.Connection>} MongoDB connection
   */
  static async connectDB() {
    logger.info('Starting database connection...');

    if (config.env === 'production') {

      if (!process.env.MONGODB_URI) {
        logger.error('MONGODB_URI is required in production environment');
        process.exit(1);
      }

      return await DatabaseManager.connectWithURI(process.env.MONGODB_URI, 'production');
    }

    // Development environment logic (with safety checks)
    try {
      if (process.env.MONGODB_URI) {
        return await DatabaseManager.connectWithURI(process.env.MONGODB_URI, 'user-provided');
      }

      // Development fallbacks...
      if (await DatabaseManager.isLocalMongoRunning()) {
        logger.info('Using local MongoDB instance');
        return await DatabaseManager.connectWithURI('mongodb://localhost:27017/quickbill', 'local-mongodb');
      }

      // Only auto-start Docker in development if explicitly enabled
      if (process.env.USE_DOCKER_AUTOSTART === 'true' && await DatabaseManager.isDockerAvailable()) {
        logger.info('Starting MongoDB via Docker');
        return await DatabaseManager.startDockerMongo();
      }

      // Final fallback with clear warning
      logger.warn('No persistent database found, using in-memory MongoDB');
      return await DatabaseManager.startInMemoryMongo();

    } catch (error) {
      logger.error('All database connection attempts failed:', error);
      return await DatabaseManager.startInMemoryMongo(true);
    }
  }

  /**
   * Connect to MongoDB using provided URI
   * @param {string} uri - MongoDB connection URI
   * @param {string} source - Connection source for logging
   * @returns {Promise<mongoose.Connection>} MongoDB connection
   */
  static async connectWithURI(uri, source) {
    try {
      logger.info(`Connecting to MongoDB: ${source}`);
      
      const conn = await mongoose.connect(uri, config.mongoose.options);
      
      logger.info(`Connected to MongoDB successfully`, {
        host: conn.connection.host,
        database: conn.connection.name,
        source
      });
      
      return conn;
    } catch (error) {
      logger.error(`Failed to connect to MongoDB (${source}):`, error);
      throw error;
    }
  }

  /**
   * Check if local MongoDB instance is running
   * @returns {Promise<boolean>} True if local MongoDB is available
   */
  static async isLocalMongoRunning() {
    return new Promise((resolve) => {
      const testConnection = mongoose.createConnection('mongodb://localhost:27017/test', {
        serverSelectionTimeoutMS: 2000,
      });

      testConnection.on('connected', () => {
        testConnection.close();
        resolve(true);
      });

      testConnection.on('error', () => {
        resolve(false);
      });

      setTimeout(() => {
        testConnection.close();
        resolve(false);
      }, 2500);
    });
  }

  /**
   * Check if Docker is available on the system
   * @returns {Promise<boolean>} True if Docker is available
   */
  static async isDockerAvailable() {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      exec('docker --version', (error) => {
        resolve(!error);
      });
    });
  }

  /**
   * Start MongoDB using Docker Compose
   * @returns {Promise<mongoose.Connection>} MongoDB connection
   */
  static async startDockerMongo() {
    return new Promise(async (resolve, reject) => {
      logger.info('Starting MongoDB Docker container...');
      
      try {
        const { exec } = require('child_process');
        const fs = require('fs');
        
        // Create docker-compose file if it doesn't exist
        await this.ensureDockerCompose();
        
        exec('docker-compose up -d mongodb', async (error) => {
          if (error) {
            logger.error('Failed to start Docker MongoDB:', error);
            reject(error);
            return;
          }

          logger.info('Waiting for MongoDB container to start...');
          
          // Wait for MongoDB to be ready
          try {
            await this.waitForMongoDB('mongodb://localhost:27017/quickbill');
            const conn = await this.connectWithURI('mongodb://localhost:27017/quickbill', 'docker');
            resolve(conn);
          } catch (waitError) {
            logger.error('MongoDB container failed to start:', waitError);
            reject(waitError);
          }
        });
      } catch (error) {
        logger.error('Docker MongoDB startup failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Ensure docker-compose.yml exists for MongoDB
   */
  static async ensureDockerCompose() {
    const dockerComposeContent = `version: '3.8'
services:
  mongodb:
    image: mongo:latest
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: quickbill
    volumes:
      - quickbill_mongodb_data:/data/db

volumes:
  quickbill_mongodb_data:`;

    const composeFile = 'docker-compose.yml';
    const fs = require('fs');
    
    if (!fs.existsSync(composeFile)) {
      fs.writeFileSync(composeFile, dockerComposeContent);
      logger.info('Created docker-compose.yml for persistent data');
    }
  }

  /**
   * Start in-memory MongoDB for development/fallback
   * @param {boolean} isErrorFallback - Whether this is an error fallback
   * @returns {Promise<mongoose.Connection>} MongoDB connection
   */
  static async startInMemoryMongo(isErrorFallback = false) {
    logger.info('Starting in-memory MongoDB server...');
    
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      
      const conn = await this.connectWithURI(uri, 'in-memory');
      
      // Store reference for cleanup
      global.mongoServer = mongoServer;
      
      this.showInMemoryWarning(isErrorFallback);
      return conn;
    } catch (error) {
      logger.error('Failed to start in-memory MongoDB:', error);
      throw error;
    }
  }

  /**
   * Show warning about in-memory database limitations
   * @param {boolean} isErrorFallback - Whether this is an error fallback
   */
  static showInMemoryWarning(isErrorFallback) {
    logger.warn('Using in-memory MongoDB - DATA WILL BE LOST ON RESTART', {
      isErrorFallback,
      environment: config.env
    });
    
    if (isErrorFallback) {
      logger.warn('Using in-memory database due to previous connection errors');
    }
  }

  /**
   * Wait for MongoDB to be ready to accept connections
   * @param {string} uri - MongoDB connection URI
   * @param {number} maxAttempts - Maximum number of connection attempts
   * @returns {Promise<boolean>} True when MongoDB is ready
   */
  static async waitForMongoDB(uri, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const tempConnection = mongoose.createConnection(uri, { 
          serverSelectionTimeoutMS: 1000 
        });
        
        await new Promise((resolve, reject) => {
          tempConnection.on('connected', resolve);
          tempConnection.on('error', reject);
        });
        
        await tempConnection.close();
        return true;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('MongoDB failed to start within 30 seconds');
  }
}

// Database event handlers for production
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected successfully');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = DatabaseManager.connectDB;
