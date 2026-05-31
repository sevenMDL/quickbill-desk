/**
 * Email Routes - Handles invoice email operations and history
 * @module routes/emailRoutes
 * @requires express
 * @requires ../middleware/auth
 * @requires ../middleware/validation
 * @requires express-rate-limit
 * @requires ../validation/schemas
 * @requires ../controllers/emailController
 */

const express = require('express');
const { auth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { rateLimit } = require('express-rate-limit');
const { emailSchemas } = require('../validation/schemas');
const {
  sendInvoiceEmail,
  getEmailHistory,
  quickSendInvoice
} = require('../controllers/emailController');

const router = express.Router();

// Apply authentication to all email routes
router.use(auth);

// Rate limiting for email operations (max 10 emails per minute)
const emailLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    message: 'Too many email requests, please try again later'
  }
});

// Send invoice via email (customizable)
router.post('/invoices/:id/send-email', emailLimiter, validateRequest(emailSchemas.sendInvoiceEmail), sendInvoiceEmail);

// Quick send using template
router.post('/invoices/:id/quick-send', emailLimiter, validateRequest(emailSchemas.quickSendInvoice), quickSendInvoice);

// Get email history for an invoice
router.get('/invoices/:id/email-history', validateRequest(emailSchemas.getEmailHistory), getEmailHistory);

module.exports = router;
