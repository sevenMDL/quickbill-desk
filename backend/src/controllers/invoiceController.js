const asyncHandler = require('../middleware/asyncHandler');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const { invoiceValidation } = require('../utils/validation');
const { generateInvoiceNumber } = require('../utils/invoiceNumber');
const PDFGenerator = require('../utils/pdfGenerator');

/**
 * Invoice Controller - Handles all invoice-related operations
 * @module controllers/invoiceController
 * @requires ../middleware/asyncHandler
 * @requires ../models/Invoice
 * @requires ../models/Client
 * @requires ../utils/validation
 * @requires ../utils/invoiceNumber
 * @requires ../utils/pdfGenerator
 */
class InvoiceController {
  /**
   * Get all invoices with optional filtering and search
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with invoices array
   */
  static async getInvoices(req, res) {
    const { search, status } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const invoices = await Invoice.find(query)
      .populate('clientId', 'name email phone')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  }

  /**
   * Get single invoice by ID with client population
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with invoice data
   */
  static async getInvoice(req, res) {
    const invoice = await Invoice.findById(req.params.id).populate('clientId');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  }

  /**
   * Create new invoice with auto-generated invoice number
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with created invoice
   */
  static async createInvoice(req, res) {
    // Validate request body
    const { error } = invoiceValidation.create.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Generate invoice number (override any frontend-provided value)
    const invoiceNumber = await generateInvoiceNumber();
    
    // Verify client exists
    const client = await Client.findById(req.body.clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const invoiceData = {
      ...req.body,
      invoiceNumber // Use backend-generated number, not frontend's
    };

    const invoice = await Invoice.create(invoiceData);
    
    res.status(201).json({
      success: true,
      data: invoice
    });
  }

  /**
   * Update existing invoice with revision tracking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with updated invoice and change tracking
   */
  static async updateInvoice(req, res) {
    let invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Validate request body
    const { error } = invoiceValidation.update.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Track changes before updating for audit trail
    const changes = [];
				const fieldsToTrack = [
				  'clientId', 'clientName', 'clientEmail', 'clientAddress',
				  'businessName', 'businessEmail', 'businessAddress', 'businessLogo',
				  'date', 'dueDate', 'taxRate', 'discount', 'notes', 'status', 'currency',
				  'paymentLink', 'paymentStatus', 'paymentMethod', 'transactionId' // ← ADD THESE
				];

    fieldsToTrack.forEach(field => {
      if (req.body[field] !== undefined && invoice[field]?.toString() !== req.body[field]?.toString()) {
        changes.push({
          field: field,
          oldValue: invoice[field],
          newValue: req.body[field],
          description: `${field} changed from "${invoice[field]}" to "${req.body[field]}"`
        });
      }
    });

    // Track items changes
    if (req.body.items && JSON.stringify(invoice.items) !== JSON.stringify(req.body.items)) {
      changes.push({
        field: 'items',
        oldValue: `[${invoice.items.length} items]`,
        newValue: `[${req.body.items.length} items]`,
        description: `Items updated from ${invoice.items.length} to ${req.body.items.length} items`
      });
    }

    // Update the invoice
    invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('clientId');

    // Add revision history if there are changes
    if (changes.length > 0) {
      await invoice.trackRevision(changes, `Invoice updated via API`);
      await invoice.save();
    }

    res.status(200).json({
      success: true,
      data: invoice,
      changes: changes.length > 0 ? changes : undefined,
      message: changes.length > 0 ? 'Invoice updated with revision tracking' : 'Invoice updated (no changes detected)'
    });
  }

  /**
   * Delete invoice by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with deletion result
   */
  static async deleteInvoice(req, res) {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  }

  /**
   * Update invoice status only
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with updated invoice
   */
  static async updateInvoiceStatus(req, res) {
    const { status } = req.body;
    
    if (!['draft', 'unpaid', 'paid', 'overdue'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('clientId');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  }

  /**
   * Duplicate existing invoice with new invoice number
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with duplicated invoice
   */
  static async duplicateInvoice(req, res) {
    const originalInvoice = await Invoice.findById(req.params.id);
    
    if (!originalInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Generate new invoice number for duplicate
    const invoiceNumber = await generateInvoiceNumber();
    
    // Create new invoice data from original
    const invoiceData = {
      ...originalInvoice.toObject(),
      _id: undefined,
      invoiceNumber,
      status: 'draft',
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdAt: undefined,
      updatedAt: undefined
    };

    const newInvoice = await Invoice.create(invoiceData);
    
    res.status(201).json({
      success: true,
      data: newInvoice
    });
  }

  /**
   * Get dashboard statistics for invoices
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with invoice statistics
   */
  static async getInvoiceStats(req, res) {
    const stats = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          unpaidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, 1, 0] }
          },
          unpaidAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, '$total', 0] }
          },
          overdueCount: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalInvoices: 0,
      totalRevenue: 0,
      unpaidCount: 0,
      unpaidAmount: 0,
      overdueCount: 0,
      paidCount: 0
    };

    // Remove _id field from response
    delete result._id;

    res.status(200).json({
      success: true,
      data: result
    });
  }

  /**
   * Generate professional PDF document for invoice
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Buffer} PDF file stream
   */
  static async generatePDF(req, res) {
    const { invoice } = req.body;

    if (!invoice) {
      return res.status(400).json({
        success: false,
        message: 'Invoice data is required'
      });
    }

    try {
      const pdfBuffer = await PDFGenerator.generateInvoicePDF(invoice);

      // Response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send the PDF file
      res.send(pdfBuffer);

    } catch (error) {
      logger.error('PDF generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF'
      });
    }
  }

  /**
   * Get invoice revision history for audit trail
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with revision history
   */
  static async getInvoiceRevisions(req, res) {
    const invoice = await Invoice.findById(req.params.id).select('revisionHistory currentVersion lastRevisedAt revisedBy');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        revisionHistory: invoice.revisionHistory || [],
        currentVersion: invoice.currentVersion,
        lastRevisedAt: invoice.lastRevisedAt,
        revisedBy: invoice.revisedBy
      }
    });
  }
}

module.exports = InvoiceController;
