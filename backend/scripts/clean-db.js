#!/usr/bin/env node

/**
 * QuickBill Desk - Database Refresh Script
 * Usage: node scripts/refresh-db.js
 */

const { execSync } = require('child_process');
const readline = require('readline');
const mongoose = require('mongoose');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class DatabaseRefresher {
  constructor() {
    this.dbName = process.env.DB_NAME || 'quickbill';
    this.dbUri = process.env.MONGODB_URI || `mongodb://localhost:27017/${this.dbName}`;
  }

  async run() {
    console.log('🔄 QuickBill Desk - Database Refresh\n');

    try {
      // Check MongoDB connection
      await this.checkMongoDB();
      
      // Confirm action
      const confirmed = await this.confirmAction();
      if (!confirmed) {
        console.log('❌ Operation cancelled.');
        return;
      }

      // Drop database
      await this.dropDatabase();

      // Ask about sample data
      const createSample = await this.askSampleData();
      if (createSample) {
        await this.createSampleData();
      }

      console.log('\n🎉 Database refresh complete!');
      console.log(`📊 Database: ${this.dbName} is now empty and ready for use.`);

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      rl.close();
      await mongoose.disconnect();
    }
  }

  async checkMongoDB() {
    console.log('🔍 Checking MongoDB connection...');
    
    try {
      await mongoose.connect(this.dbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      throw new Error('MongoDB is not running. Please start MongoDB first.');
    }
  }

  confirmAction() {
    return new Promise((resolve) => {
      rl.question(`⚠️  This will DELETE ALL DATA in database '${this.dbName}'. Continue? (y/N): `, (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  async dropDatabase() {
    console.log('🗑️  Dropping database...');
    
    try {
      await mongoose.connection.db.dropDatabase();
      console.log('✅ Database dropped successfully');
    } catch (error) {
      throw new Error(`Failed to drop database: ${error.message}`);
    }
  }

  askSampleData() {
    return new Promise((resolve) => {
      rl.question('📥 Create sample data? (y/N): ', (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  async createSampleData() {
    console.log('📦 Creating sample data...');
    
    try {
      // Check if the sample data script exists
      const fs = require('fs');
      const sampleDataScript = './scripts/make_dummy_data.sh';
      
      if (fs.existsSync(sampleDataScript)) {
        execSync(`bash ${sampleDataScript}`, { stdio: 'inherit' });
        console.log('✅ Sample data created successfully');
      } else {
        console.log('ℹ️  Sample data script not found. Skipping sample data creation.');
      }
    } catch (error) {
      console.log('⚠️  Sample data creation failed, but database was refreshed.');
    }
  }
}

// Run the script
const refresher = new DatabaseRefresher();
refresher.run().catch(console.error);
