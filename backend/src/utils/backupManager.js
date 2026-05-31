const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const logger = require('./logger');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Settings = require('../models/Settings');

/**
 * Backup manager utility.
 * @class BackupManager
 */
class BackupManager {
  /**
   * Create a complete database backup
   * @param {string} encryptionKey - Optional encryption key
   * @returns {Object} Backup result with file info and stats
   */
  static async createBackup(encryptionKey = null) {
    try {
      logger.logSystemEvent('backup_started');
      
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        collections: {}
      };

      const [invoices, clients, settings] = await Promise.all([
        Invoice.find().lean(),
        Client.find().lean(),
        Settings.find().lean()
      ]);

      backupData.collections.invoices = invoices;
      backupData.collections.clients = clients;
      backupData.collections.settings = settings;

      backupData.stats = {
        invoices: invoices.length,
        clients: clients.length,
        settings: settings.length,
        totalSize: JSON.stringify(backupData).length
      };

      let backupContent = JSON.stringify(backupData, null, 2);
      
      const backupSize = Buffer.byteLength(backupContent, 'utf8');
      const maxBackupSize = 100 * 1024 * 1024;
      
      if (backupSize > maxBackupSize) {
        throw new Error(`Backup size too large: ${(backupSize / 1024 / 1024).toFixed(2)}MB exceeds maximum ${maxBackupSize / 1024 / 1024}MB`);
      }

      logger.debug(`Backup size: ${(backupSize / 1024 / 1024).toFixed(2)}MB`);
      
      if (encryptionKey) {
        backupContent = this.simpleEncrypt(backupContent, encryptionKey);
      }

      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `quickbill-backup-${timestamp}.json${encryptionKey ? '.enc' : ''}`;
      const filePath = path.join(backupDir, filename);

      fs.writeFileSync(filePath, backupContent);

      const fileStats = fs.statSync(filePath);
      if (fileStats.size === 0) {
        throw new Error('Backup file creation failed - file is empty');
      }

      logger.logSystemEvent('backup_completed', {
        filePath,
        stats: backupData.stats,
        fileSize: `${(fileStats.size / 1024 / 1024).toFixed(2)}MB`,
        encrypted: !!encryptionKey
      });

      return {
        success: true,
        filePath,
        filename,
        stats: backupData.stats,
        fileSize: fileStats.size,
        fileSizeMB: (fileStats.size / 1024 / 1024).toFixed(2),
        encrypted: !!encryptionKey,
        timestamp: backupData.timestamp
      };

    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw error;
    }
  }

  /**
   * Simple encryption using XOR with SHA256 key hash
   * @param {string} text - Text to encrypt
   * @param {string} key - Encryption key
   * @returns {string} Base64 encoded encrypted text
   */
  static simpleEncrypt(text, key) {
    try {
      const keyHash = crypto.createHash('sha256').update(key).digest();
      const textBytes = Buffer.from(text, 'utf8');
      const result = Buffer.alloc(textBytes.length);
      
      for (let i = 0; i < textBytes.length; i++) {
        result[i] = textBytes[i] ^ keyHash[i % keyHash.length];
      }
      
      return result.toString('base64');
    } catch (error) {
      logger.error('Simple encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt backup file content
   * @param {string} encryptedText - Base64 encoded encrypted text
   * @param {string} key - Decryption key
   * @returns {string} Decrypted text
   */
  static simpleDecrypt(encryptedText, key) {
    try {
      const keyHash = crypto.createHash('sha256').update(key).digest();
      const encryptedBytes = Buffer.from(encryptedText, 'base64');
      const result = Buffer.alloc(encryptedBytes.length);
      
      for (let i = 0; i < encryptedBytes.length; i++) {
        result[i] = encryptedBytes[i] ^ keyHash[i % keyHash.length];
      }
      
      return result.toString('utf8');
    } catch (error) {
      logger.error('Simple decryption failed:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup file
   * @param {string} filePath - Path to backup file
   * @param {string} encryptionKey - Optional decryption key
   * @returns {Object} Restoration results
   */
  static async restoreBackup(filePath, encryptionKey = null) {
    try {
      logger.logSystemEvent('restore_started', { filePath });
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Backup file not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      const maxFileSize = 100 * 1024 * 1024;
      
      if (stats.size > maxFileSize) {
        throw new Error(`Backup file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${maxFileSize / 1024 / 1024}MB`);
      }

      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      logger.debug(`Backup file size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);

      let backupContent = fs.readFileSync(filePath, 'utf8');
      
      if (!backupContent || backupContent.trim().length === 0) {
        throw new Error('Backup file appears to be corrupted or empty');
      }
      
      if (encryptionKey && filePath.endsWith('.enc')) {
        backupContent = this.simpleDecrypt(backupContent, encryptionKey);
        
        if (!backupContent || backupContent.trim().length === 0) {
          throw new Error('Failed to decrypt backup file - invalid encryption key or corrupted file');
        }
      }

      const backupData = JSON.parse(backupContent);

      if (!backupData.collections || !backupData.timestamp) {
        throw new Error('Invalid backup file format - missing required structure');
      }

      if (!backupData.collections.invoices || !backupData.collections.clients || !backupData.collections.settings) {
        throw new Error('Invalid backup file format - missing collection data');
      }

      await Promise.all([
        Invoice.deleteMany({}),
        Client.deleteMany({}),
        Settings.deleteMany({})
      ]);

      const results = {
        invoices: 0,
        clients: 0,
        settings: 0
      };

      if (backupData.collections.invoices) {
        await Invoice.insertMany(backupData.collections.invoices);
        results.invoices = backupData.collections.invoices.length;
      }

      if (backupData.collections.clients) {
        await Client.insertMany(backupData.collections.clients);
        results.clients = backupData.collections.clients.length;
      }

      if (backupData.collections.settings) {
        await Settings.insertMany(backupData.collections.settings);
        results.settings = backupData.collections.settings.length;
      }

      logger.logSystemEvent('restore_completed', {
        filePath,
        results,
        fileSize: `${(stats.size / 1024 / 1024).toFixed(2)}MB`,
        backupTimestamp: backupData.timestamp
      });

      return {
        success: true,
        message: 'Backup restored successfully',
        results,
        fileSize: stats.size,
        fileSizeMB: (stats.size / 1024 / 1024).toFixed(2),
        backupTimestamp: backupData.timestamp
      };

    } catch (error) {
      logger.error('Backup restoration failed:', error);
      throw error;
    }
  }

  /**
   * List all available backups
   * @returns {Array} List of backup files with metadata
   */
  static listBackups() {
    try {
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        return [];
      }

      const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('quickbill-backup-') && (file.endsWith('.json') || file.endsWith('.json.enc')))
        .map(file => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            filename: file,
            filePath,
            size: stats.size,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
            created: stats.birthtime,
            encrypted: file.endsWith('.enc'),
            isValid: stats.size > 0 && stats.size <= 100 * 1024 * 1024
          };
        })
        .sort((a, b) => b.created - a.created);

      return files;
    } catch (error) {
      logger.error('Failed to list backups:', error);
      throw error;
    }
  }

  /**
   * Automated backup creation with encryption
   * @returns {Object} Backup result or null if no data
   */
  static async autoBackup() {
    try {
      const invoiceCount = await Invoice.countDocuments();
      if (invoiceCount === 0) {
        logger.debug('Skipping auto-backup: No data to backup');
        return null;
      }

      const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
      
      const result = await this.createBackup(encryptionKey);
      
      logger.logSystemEvent('auto_backup_completed', {
        filename: result.filename,
        stats: result.stats,
        fileSize: result.fileSizeMB
      });

      this.cleanupOldBackups(10);

      return result;
    } catch (error) {
      logger.error('Auto-backup failed:', error);
      return null;
    }
  }

  /**
   * Clean up old backups based on retention policy
   * @param {number} retentionDays - Number of days to keep backups
   * @returns {number} Number of backups deleted
   */
  static cleanupOldBackups(retentionDays = 30) {
    try {
      const backups = this.listBackups();
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      
      const toDelete = backups.filter(backup => {
        return backup.created.getTime() < cutoffTime;
      });
      
      if (toDelete.length > 0) {
        toDelete.forEach(backup => {
          try {
            fs.unlinkSync(backup.filePath);
            logger.debug('Deleted old backup due to retention policy', { 
              filename: backup.filename,
              age: `${Math.round((Date.now() - backup.created.getTime()) / (24 * 60 * 60 * 1000))} days`,
              retentionDays
            });
          } catch (error) {
            logger.warn('Failed to delete backup file:', { 
              filename: backup.filename,
              error: error.message 
            });
          }
        });
        
        logger.logSystemEvent('backup_cleanup_completed', {
          deleted: toDelete.length,
          retentionDays,
          remaining: backups.length - toDelete.length
        });
      }
      
      return toDelete.length;
    } catch (error) {
      logger.error('Backup cleanup failed:', error);
      return 0;
    }
  }
}

module.exports = BackupManager;
