/**
 * Settings Routes - Handles application settings management
 * @module routes/settingsRoutes
 * @requires express
 * @requires ../middleware/auth
 * @requires ../middleware/validation
 * @requires ../validation/schemas
 * @requires ../controllers/settingsController
 */

const express = require('express');
const { auth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { settingsSchemas } = require('../validation/schemas');
const {
  getSettings,
  updateSettings
} = require('../controllers/settingsController');

const router = express.Router();

// Apply authentication to all settings routes
router.use(auth);

router.route('/')
  .get(validateRequest(settingsSchemas.getSettings), getSettings)
  .put(validateRequest(settingsSchemas.updateSettings), updateSettings);

module.exports = router;
