const express = require('express');
const { auth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { bulkSchemas } = require('../validation/schemas');
const {
  bulkUpdateStatus,
  bulkDeleteInvoices,
  bulkSendEmails,
  bulkDownloadPDFs,
  validateBulkOperation
} = require('../controllers/bulkController');

const router = express.Router();

/**
 * Bulk Operations Routes
 * Handles bulk actions on multiple invoices
 * All routes require authentication
 */
router.use(auth);

// Bulk invoice status updates
router.put('/invoices/status', validateRequest(bulkSchemas.bulkUpdateStatus), bulkUpdateStatus);

// Bulk invoice deletion
router.delete('/invoices', validateRequest(bulkSchemas.bulkDeleteInvoices), bulkDeleteInvoices);

// Bulk email sending
router.post('/invoices/send-email', validateRequest(bulkSchemas.bulkSendEmails), bulkSendEmails);

// Bulk PDF downloads
router.post('/invoices/download-pdfs', validateRequest(bulkSchemas.bulkDownloadPDFs), bulkDownloadPDFs);

// Bulk operation validation
router.post('/invoices/validate', validateRequest(bulkSchemas.validateBulkOperation), validateBulkOperation);

/**
 * Health check endpoint for bulk operations
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bulk operations API is operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

module.exports = router;
