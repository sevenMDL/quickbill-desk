/**
 * Auto Backup Service - Scheduled backup management with cron jobs
 * @module services/AutoBackupService
 * @requires node-cron
 * @requires ../utils/backupManager
 * @requires ../models/Settings
 * @requires ../utils/logger
 */

const cron = require('node-cron');
const BackupManager = require('../utils/backupManager');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');
/**
 * Automatic backup service.
 * @class AutoBackupService
 */
class AutoBackupService {
  static jobs = new Map();

  /**
   * Start the auto-backup service
   * @returns {Promise<void>}
   */
  static async start() {
    try {
      logger.logSystemEvent('auto_backup_service_starting');
      
      const settings = await Settings.getSettings();
      
      if (settings.autoBackup) {
        await this.scheduleBackup(settings);
        logger.logSystemEvent('auto_backup_service_started', {
          schedule: settings.backupSchedule,
          encrypted: settings.backupEncryption
        });
      } else {
        logger.logSystemEvent('auto_backup_service_disabled');
      }
      
    } catch (error) {
      logger.error('Failed to start auto-backup service:', error);
    }
  }

  /**
   * Schedule backup job based on settings
   * @param {Object} settings - Application settings
   * @returns {Promise<void>}
   */
  static async scheduleBackup(settings) {
    // Stop existing job if any
    if (this.jobs.has('autoBackup')) {
      this.jobs.get('autoBackup').stop();
      this.jobs.delete('autoBackup');
    }

    if (!settings.autoBackup) {
      logger.debug('Auto-backup disabled, no schedule created');
      return;
    }

    try {
      // Use default schedule if not specified
      const schedule = settings.backupSchedule || '0 2 * * *'; // Default: daily at 2 AM
      
      const job = cron.schedule(schedule, async () => {
        await this.executeScheduledBackup(settings);
      });

      this.jobs.set('autoBackup', job);
      
      // Calculate and save next backup time
      const nextBackup = this.calculateNextBackup(schedule);
      await Settings.findOneAndUpdate(
        {},
        { nextBackup },
        { new: true }
      );

      logger.logSystemEvent('backup_scheduled', {
        schedule: schedule,
        nextBackup: nextBackup.toISOString(),
        encrypted: settings.backupEncryption
      });
    } catch (error) {
      logger.error('Failed to schedule backup:', error);
    }
  }

  /**
   * Execute scheduled backup with settings
   * @param {Object} settings - Application settings
   * @returns {Promise<void>}
   */
  static async executeScheduledBackup(settings) {
    try {
      logger.logSystemEvent('scheduled_backup_started', {
        schedule: settings.backupSchedule
      });
      
      const encryptionKey = settings.backupEncryption ? process.env.JWT_SECRET : null;
      const result = await BackupManager.createBackup(encryptionKey);
      
      // Update last backup time
      await Settings.findOneAndUpdate(
        {},
        { 
          lastBackup: new Date(),
          nextBackup: this.calculateNextBackup(settings.backupSchedule)
        },
        { new: true }
      );

      logger.logSystemEvent('scheduled_backup_completed', {
        filename: result.filename,
        encrypted: !!encryptionKey,
        stats: result.stats
      });

      // Cleanup old backups based on retention
      if (settings.retentionDays) {
        BackupManager.cleanupOldBackups(settings.retentionDays);
      }

    } catch (error) {
      logger.error('Scheduled backup failed:', error);
      
      // Update last backup time even on failure (to track attempts)
      await Settings.findOneAndUpdate(
        {},
        { 
          lastBackup: new Date(),
          nextBackup: this.calculateNextBackup(settings.backupSchedule)
        },
        { new: true }
      );
    }
  }

  /**
   * Calculate next backup time from cron schedule
   * @param {string} schedule - Cron schedule string
   * @returns {Date} Next backup execution time
   */
  static calculateNextBackup(schedule) {
    try {
      const cronParser = require('cron-parser');
      const interval = cronParser.parseExpression(schedule);
      return interval.next().toDate();
    } catch (error) {
      logger.error('Failed to calculate next backup time:', error);
      // Fallback: add 24 hours
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Update backup schedule when settings change
   * @returns {Promise<void>}
   */
  static async updateSchedule() {
    try {
      const settings = await Settings.getSettings();
      await this.scheduleBackup(settings);
      
      logger.logSystemEvent('backup_schedule_updated', {
        autoBackup: settings.autoBackup,
        schedule: settings.backupSchedule
      });
      
    } catch (error) {
      logger.error('Failed to update backup schedule:', error);
    }
  }

  /**
   * Stop the auto-backup service
   * @returns {Promise<void>}
   */
  static async stop() {
    if (this.jobs.has('autoBackup')) {
      this.jobs.get('autoBackup').stop();
      this.jobs.delete('autoBackup');
      logger.logSystemEvent('auto_backup_service_stopped');
    }
  }

  /**
   * Get current backup service status
   * @returns {Object} Service status information
   */
  static getStatus() {
    const hasJob = this.jobs.has('autoBackup');
    const job = hasJob ? this.jobs.get('autoBackup') : null;
    
    return {
      running: hasJob,
      scheduled: hasJob && job && typeof job.getStatus === 'function' ? job.getStatus() : 'unknown'
    };
  }
}

module.exports = AutoBackupService;
