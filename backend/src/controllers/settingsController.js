const asyncHandler = require('../middleware/asyncHandler');
const Settings = require('../models/Settings');
const { settingsValidation } = require('../utils/validation');
const AutoBackupService = require('../services/AutoBackupService');

/**
 * Settings Controller - Handles application configuration and settings
 * @module controllers/settingsController
 * @requires ../middleware/asyncHandler
 * @requires ../models/Settings
 * @requires ../utils/validation
 * @requires ../services/AutoBackupService
 */
class SettingsController {
  /**
   * Get current application settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with settings data
   */
  static async getSettings(req, res) {
    const settings = await Settings.getSettings();
    
    res.status(200).json({
      success: true,
      data: settings
    });
  }

  /**
   * Update application settings with validation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with updated settings
   */
  static async updateSettings(req, res) {
    // Validate request body
    const { error } = settingsValidation.update.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    let settings = await Settings.findOne();
    
    if (!settings) {
      // Initialize with defaults including new backup fields
      settings = await Settings.create({
        ...req.body,
        backupSchedule: req.body.backupSchedule || '0 2 * * *'
      });
    } else {
      settings = await Settings.findOneAndUpdate(
        {},
        req.body,
        { new: true, runValidators: true }
      );
    }

    // Update backup schedule when settings change
    await AutoBackupService.updateSchedule();

    res.status(200).json({
      success: true,
      data: settings
    });
  }
}

module.exports = SettingsController;
