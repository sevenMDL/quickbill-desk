/**
 * Invoice Routes - Handles all invoice-related operations
 * @module routes/invoiceRoutes
 * @requires express
 * @requires ../middleware/auth
 * @requires ../middleware/validation
 * @requires ../validation/schemas
 * @requires ../controllers/invoiceController
 */

const express = require('express');
const { auth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { invoiceSchemas } = require('../validation/schemas');
const {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  duplicateInvoice,
  getInvoiceStats,
  generatePDF,
  getInvoiceRevisions
} = require('../controllers/invoiceController');

const router = express.Router();

// Apply authentication to all invoice routes
router.use(auth);

router.route('/')
  .get(validateRequest(invoiceSchemas.getInvoices), getInvoices)
  .post(validateRequest(invoiceSchemas.createInvoice), createInvoice);

router.route('/stats')
  .get(validateRequest(invoiceSchemas.getInvoiceStats), getInvoiceStats);

router.route('/:id')
  .get(validateRequest(invoiceSchemas.getInvoice), getInvoice)
  .put(validateRequest(invoiceSchemas.updateInvoice), updateInvoice)
  .delete(validateRequest(invoiceSchemas.deleteInvoice), deleteInvoice);

router.route('/:id/status')
  .put(validateRequest(invoiceSchemas.updateInvoiceStatus), updateInvoiceStatus);

router.route('/duplicate/:id')
  .post(validateRequest(invoiceSchemas.duplicateInvoice), duplicateInvoice);

router.route('/generate/pdf')
  .post(validateRequest(invoiceSchemas.generatePDF), generatePDF);

router.route('/:id/revisions')
  .get(validateRequest(invoiceSchemas.getInvoiceRevisions), getInvoiceRevisions);

module.exports = router;
