/**
 * Export Routes - Handles report generation and data exports
 * @module routes/exportRoutes
 * @requires express
 * @requires ../middleware/auth
 * @requires ../controllers/exportController
 */

const express = require('express');
const { auth } = require('../middleware/auth');
const {
  generateExport,
  exportDashboard,
  exportInvoices,
  exportClients
} = require('../controllers/exportController');

const router = express.Router();

// Apply authentication to all export routes
router.use(auth);

router.route('/generate')
  .post(generateExport);

router.route('/dashboard')
  .post(exportDashboard);

router.route('/invoices')
  .post(exportInvoices);

router.route('/clients')  
  .post(exportClients);

module.exports = router;
