const asyncHandler = require('../middleware/asyncHandler');
const BulkService = require('../services/bulkService');
const { bulkValidation } = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Bulk Operations Controller - Handles bulk invoice operations
 * @module controllers/bulkController
 * @requires ../middleware/asyncHandler
 * @requires ../services/bulkService
 * @requires ../utils/validation
 */
class BulkController {
  /**
   * Bulk update invoice status for multiple invoices
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with bulk operation results
   */
  static async bulkUpdateStatus(req, res) {
    // Validate request body
    const { error } = bulkValidation.bulkStatus.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { invoiceIds, status } = req.body;

    try {
      const results = await BulkService.updateInvoiceStatus(invoiceIds, status, 'user');

      if (results.failed > 0 && results.succeeded === 0) {
        return res.status(400).json({
          success: false,
          message: 'All operations failed',
          data: results
        });
      }

      const message = results.failed > 0 
        ? `Updated ${results.succeeded} invoices, ${results.failed} failed`
        : `Successfully updated ${results.succeeded} invoices`;

      res.status(200).json({
        success: true,
        message,
        data: results
      });

    } catch (error) {
      logger.error('Bulk status update controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during bulk status update'
      });
    }
  }

  /**
   * Bulk delete multiple invoices
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with deletion results
   */
  static async bulkDeleteInvoices(req, res) {
    // Validate request body
    const { error } = bulkValidation.invoiceIds.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { invoiceIds } = req.body;

    try {
      const results = await BulkService.deleteInvoices(invoiceIds);

      if (results.failed > 0 && results.succeeded === 0) {
        return res.status(400).json({
          success: false,
          message: 'All delete operations failed',
          data: results
        });
      }

      const message = results.failed > 0 
        ? `Deleted ${results.succeeded} invoices, ${results.failed} failed`
        : `Successfully deleted ${results.succeeded} invoices`;

      res.status(200).json({
        success: true,
        message,
        data: results
      });

    } catch (error) {
      logger.error('Bulk delete controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during bulk delete'
      });
    }
  }

  /**
   * Bulk send emails for multiple invoices
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with email sending results
   */
  static async bulkSendEmails(req, res) {
    // Validate request body
    const { error } = bulkValidation.bulkEmail.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { invoiceIds, subject, message, includePDF } = req.body;

    try {
      const emailOptions = {
        subject,
        message,
        includePDF
      };

      const results = await BulkService.sendBulkEmails(invoiceIds, emailOptions);

      if (results.failed > 0 && results.succeeded === 0) {
        return res.status(400).json({
          success: false,
          message: 'All email operations failed',
          data: results
        });
      }

      const messageText = results.failed > 0 
        ? `Sent ${results.succeeded} emails, ${results.failed} failed`
        : `Successfully sent ${results.succeeded} emails`;

      res.status(200).json({
        success: true,
        message: messageText,
        data: results
      });

    } catch (error) {
      logger.error('Bulk email controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during bulk email sending'
      });
    }
  }

  /**
   * Bulk download PDFs for multiple invoices as ZIP archive
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Buffer} ZIP file containing all requested PDFs
   */
  static async bulkDownloadPDFs(req, res) {
    // Validate request body
    const { error } = bulkValidation.invoiceIds.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { invoiceIds } = req.body;

    try {
      const result = await BulkService.generateBulkPDFs(invoiceIds);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to generate PDF bundle'
        });
      }

      // Set response headers for file download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);
      res.setHeader('Content-Length', result.data.buffer.length);

      // Send the ZIP file
      res.send(result.data.buffer);

    } catch (error) {
      logger.error('Bulk PDF download controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during bulk PDF download'
      });
    }
  }

  /**
   * Validate invoices for bulk operations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with validation results
   */
  static async validateBulkOperation(req, res) {
    // Validate request body
    const { error } = bulkValidation.invoiceIds.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { invoiceIds } = req.body;

    try {
      const { invoices, missingIds } = await BulkService.getInvoicesForBulkOperation(invoiceIds);

      res.status(200).json({
        success: true,
        data: {
          validCount: invoices.length,
          invalidCount: missingIds.length,
          missingIds,
          invoices: invoices.map(inv => ({
            id: inv._id,
            invoiceNumber: inv.invoiceNumber,
            clientName: inv.clientName,
            total: inv.total,
            status: inv.status
          }))
        }
      });

    } catch (error) {
      logger.error('Bulk validation controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during bulk validation'
      });
    }
  }
}

module.exports = BulkController;
