const asyncHandler = require('../middleware/asyncHandler');
const EmailService = require('../services/emailService');
const Invoice = require('../models/Invoice');
const { invoiceValidation } = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Email Controller - Handles invoice email operations
 * @module controllers/emailController
 * @requires ../middleware/asyncHandler
 * @requires ../services/emailService
 * @requires ../models/Invoice
 * @requires ../utils/validation
 */
class EmailController {
  /**
   * Send invoice via email with optional PDF attachment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with email sending result
   */
  static async sendInvoiceEmail(req, res) {
    const { id } = req.params;
    
    // Validate invoice exists
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Validate request body
    const { error } = invoiceValidation.email.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { to, subject, message, includePDF = true } = req.body;

    // Use client email from invoice if not provided
    const recipientEmail = to || invoice.clientEmail;
    
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'No recipient email provided and invoice has no client email'
      });
    }

    try {
      // Send email using our service
      const result = await EmailService.sendInvoiceEmail(id, {
        to: recipientEmail,
        subject: subject,
        message: message,
        includePDF: includePDF
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Invoice sent successfully',
          data: {
            messageId: result.messageId,
            status: result.status,
            recipient: recipientEmail
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Failed to send email: ${result.error}`,
          error: result.error,
          errorType: result.errorType
        });
      }

    } catch (error) {
      logger.error('Email controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during email sending'
      });
    }
  }

  /**
   * Get email history for an invoice
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with email history
   */
  static async getEmailHistory(req, res) {
    const { id } = req.params;

    const invoice = await Invoice.findById(id).select('emailHistory lastSentAt');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        emailHistory: invoice.emailHistory || [],
        lastSentAt: invoice.lastSentAt
      }
    });
  }

  /**
   * Quick send invoice using template settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with quick send result
   */
  static async quickSendInvoice(req, res) {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (!invoice.clientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Invoice has no client email address'
      });
    }

    try {
      // Quick send uses template from settings, no custom message
      const result = await EmailService.sendInvoiceEmail(id, {
        to: invoice.clientEmail,
        includePDF: true
        // subject and message will be auto-generated from templates
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Invoice sent successfully using template',
          data: {
            messageId: result.messageId,
            status: result.status,
            recipient: invoice.clientEmail
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Failed to send email: ${result.error}`,
          error: result.error,
          errorType: result.errorType
        });
      }

    } catch (error) {
      logger.error('Quick send controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during quick send'
      });
    }
  }
}

module.exports = EmailController;
