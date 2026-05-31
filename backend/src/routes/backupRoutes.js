/**
 * Backup Routes - Handles database backup and restoration operations
 * @module routes/backupRoutes
 * @requires express
 * @requires ../middleware/auth
 * @requires ../utils/backupManager
 * @requires ../utils/logger
 */

const express = require('express');
const { auth } = require('../middleware/auth');
const BackupManager = require('../utils/backupManager');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication to all backup routes
router.use(auth);

// Rate limiting for backup operations (max 2 per hour)
const backupLimiter = require('express-rate-limit')({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2,
  message: {
    success: false,
    message: 'Too many backup requests, please try again later'
  }
});

/**
 * Create a new database backup
 * @param {boolean} [encrypt] - Override encryption setting
 */
router.post('/backup', backupLimiter, async (req, res) => {
  try {
    // Get settings to determine encryption preference
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();

    // Use setting from database, allow override via API
    const encrypt = req.body.encrypt !== undefined ? req.body.encrypt : settings.backupEncryption;
    const encryptionKey = encrypt ? process.env.JWT_SECRET : null;

    const result = await BackupManager.createBackup(encryptionKey);

    res.status(200).json({
      success: true,
      message: 'Backup created successfully',
      data: result
    });

  } catch (error) {
    logger.error('Backup creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
});

/**
 * List all available backups
 */
router.get('/backups', async (req, res) => {
  try {
    const backups = BackupManager.listBackups();

    res.status(200).json({
      success: true,
      data: {
        backups,
        total: backups.length
      }
    });

  } catch (error) {
    logger.error('Backup listing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: error.message
    });
  }
});

/**
 * Restore database from backup file
 * @param {string} filename - Name of backup file to restore
 * @param {string} [encryptionKey] - Encryption key for encrypted backups
 */
router.post('/restore', backupLimiter, async (req, res) => {
  try {
    const { filename, encryptionKey = process.env.JWT_SECRET } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required for restoration'
      });
    }

    const backupDir = require('path').join(process.cwd(), 'backups');
    const filePath = require('path').join(backupDir, filename);

    const result = await BackupManager.restoreBackup(filePath, encryptionKey);

    res.status(200).json({
      success: true,
      message: 'Backup restored successfully',
      data: result
    });

  } catch (error) {
    logger.error('Backup restoration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
      error: error.message
    });
  }
});

/**
 * Trigger automatic backup based on schedule settings
 */
router.post('/backup/auto', backupLimiter, async (req, res) => {
  try {
    const result = await BackupManager.autoBackup();

    if (!result) {
      return res.status(200).json({
        success: true,
        message: 'No data to backup',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      message: 'Auto-backup completed successfully',
      data: result
    });

  } catch (error) {
    logger.error('Auto-backup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Auto-backup failed',
      error: error.message
    });
  }
});

/**
 * Get backup system status and settings
 */
router.get('/backup/status', async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();
    const AutoBackupService = require('../services/AutoBackupService');
    const backupStatus = AutoBackupService.getStatus();
    const backups = BackupManager.listBackups();

    res.status(200).json({
      success: true,
      data: {
        settings: {
          autoBackup: settings.autoBackup,
          backupEncryption: settings.backupEncryption,
          backupSchedule: settings.backupSchedule,
          retentionDays: settings.retentionDays,
          lastBackup: settings.lastBackup,
          nextBackup: settings.nextBackup
        },
        service: backupStatus,
        backups: {
          total: backups.length,
          latest: backups[0] || null
        }
      }
    });

  } catch (error) {
    logger.error('Backup status check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup status',
      error: error.message
    });
  }
});

/**
 * Download backup file
 * @param {string} filename - Name of backup file to download
 */
router.get('/backup/download/:filename', async (req, res) => {
  try {
    let { filename } = req.params;
    filename = decodeURIComponent(filename);
    
    // Security validation for backup filenames
    if (!filename.startsWith('quickbill-backup-') || 
        (!filename.endsWith('.json') && !filename.endsWith('.json.enc'))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup filename'
      });
    }

    const backupDir = require('path').join(process.cwd(), 'backups');
    const filePath = require('path').join(backupDir, filename);

    // Check if file exists
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }

    // Get file stats
    const stats = require('fs').statSync(filePath);

    // Read file synchronously and send
    const fileContent = require('fs').readFileSync(filePath);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-cache');

    res.send(fileContent);

  } catch (error) {
    logger.error('Backup download failed:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Download failed',
        error: error.message
      });
    }
  }
});

module.exports = router;
