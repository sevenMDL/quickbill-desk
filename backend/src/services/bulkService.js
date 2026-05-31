/**
 * Bulk Operations Service - Handle multiple invoice operations
 * @module services/bulkService
 * @requires ../models/Invoice
 * @requires ../models/Client
 * @requires ./emailService
 * @requires ../utils/zipGenerator
 */

const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const EmailService = require('./emailService');
const ZipGenerator = require('../utils/zipGenerator');
const logger = require('../utils/logger');

/**
 * Bulk operation service.
 * @class BulkService
 */
class BulkService {
  /**
   * Bulk update invoice statuses
   * @param {Array} invoiceIds - Array of invoice IDs to update
   * @param {string} status - New status value
   * @param {string} revisedBy - User who initiated the update
   * @returns {Promise<Object>} Bulk operation results
   */
  static async updateInvoiceStatus(invoiceIds, status, revisedBy = 'system') {
    try {
      const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        failures: []
      };

      for (const invoiceId of invoiceIds) {
        try {
          const invoice = await Invoice.findById(invoiceId);
          
          if (!invoice) {
            results.failures.push({
              invoiceId,
              error: 'Invoice not found'
            });
            results.failed++;
            continue;
          }

          // Track the status change
          const changes = [];
          if (invoice.status !== status) {
            changes.push({
              field: 'status',
              oldValue: invoice.status,
              newValue: status,
              description: `Status changed from "${invoice.status}" to "${status}"`
            });
          }

          // Update the invoice
          invoice.status = status;
          
          // Add revision tracking if there are changes
          if (changes.length > 0) {
            await invoice.trackRevision(changes, `Bulk status update to ${status}`, revisedBy);
          }
          
          await invoice.save();
          results.succeeded++;
          
        } catch (error) {
          results.failures.push({
            invoiceId,
            error: error.message
          });
          results.failed++;
        }
        
        results.processed++;
      }

      return results;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk delete invoices
   * @param {Array} invoiceIds - Array of invoice IDs to delete
   * @returns {Promise<Object>} Bulk deletion results
   */
  static async deleteInvoices(invoiceIds) {
    try {
      const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        failures: []
      };

      for (const invoiceId of invoiceIds) {
        try {
          const invoice = await Invoice.findById(invoiceId);
          
          if (!invoice) {
            results.failures.push({
              invoiceId,
              error: 'Invoice not found'
            });
            results.failed++;
            continue;
          }

          await Invoice.findByIdAndDelete(invoiceId);
          results.succeeded++;
          
        } catch (error) {
          results.failures.push({
            invoiceId,
            error: error.message
          });
          results.failed++;
        }
        
        results.processed++;
      }

      return results;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Send bulk emails for multiple invoices
   * @param {Array} invoiceIds - Array of invoice IDs to email
   * @param {Object} emailOptions - Email configuration options
   * @returns {Promise<Object>} Bulk email results
   */
  static async sendBulkEmails(invoiceIds, emailOptions = {}) {
    try {
      // Delegate to EmailService for bulk email processing
      const results = await EmailService.sendBulkInvoiceEmails(invoiceIds, emailOptions);

      return results;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get invoices for bulk operations with validation
   * @param {Array} invoiceIds - Array of invoice IDs to retrieve
   * @returns {Promise<Object>} Invoices and missing IDs
   */
  static async getInvoicesForBulkOperation(invoiceIds) {
    try {
      const invoices = await Invoice.find({
        _id: { $in: invoiceIds }
      }).populate('clientId', 'name email');

      // Check for missing invoices
      const foundIds = invoices.map(inv => inv._id.toString());
      const missingIds = invoiceIds.filter(id => !foundIds.includes(id));

      return {
        invoices,
        missingIds
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate ZIP file containing multiple invoice PDFs
   * @param {Array} invoiceIds - Array of invoice IDs to include
   * @returns {Promise<Object>} ZIP file data and metadata
   */
  static async generateBulkPDFs(invoiceIds) {
    try {
      const { invoices, missingIds } = await this.getInvoicesForBulkOperation(invoiceIds);

      if (missingIds.length > 0) {
        throw new Error(`Invoices not found: ${missingIds.join(', ')}`);
      }

      const result = await ZipGenerator.generateInvoiceZip(invoiceIds);

      return {
        success: true,
        data: {
          filename: result.filename,
          buffer: result.buffer,
          count: result.count
        }
      };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = BulkService;
