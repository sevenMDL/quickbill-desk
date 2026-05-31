/**
 * Export Controller - Handles report generation and data exports
 * @module controllers/exportController
 * @requires ../models/Invoice
 * @requires ../models/Client
 * @requires ../utils/pdfGenerator
 * @requires ../utils/csvGenerator
 * @requires ../utils/excelGenerator
 */

const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const PDFGenerator = require('../utils/pdfGenerator');
const CSVGenerator = require('../utils/csvGenerator');
const ExcelGenerator = require('../utils/excelGenerator');
const logger = require('../utils/logger');

/**
 * Export Controller class
 */
class ExportController {
  /**
   * Generate export file based on request parameters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with export file information OR direct file download
   */
  static async generateExport(req, res) {
    try {
      const { reportType, format, filters = {}, options = {} } = req.body;

      // Validate required parameters
      if (!reportType || !format) {
        return res.status(400).json({
          success: false,
          message: 'Report type and format are required'
        });
      }

      let data;
      let filename;

      // Fetch data based on report type
      switch (reportType) {
        case 'dashboard_summary':
          data = await ExportController.getDashboardData(filters);
          filename = `dashboard-summary-${new Date().toISOString().split('T')[0]}`;
          break;
        
        case 'invoice_list':
          data = await ExportController.getInvoiceData(filters);
          filename = `invoices-${new Date().toISOString().split('T')[0]}`;
          break;
        
        case 'client_list':
          data = await ExportController.getClientData(filters);
          filename = `clients-${new Date().toISOString().split('T')[0]}`;
          break;
        
        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported report type'
          });
      }

      let fileBuffer;
      let mimeType;

      // Generate file based on format
      switch (format) {
        case 'pdf':
          fileBuffer = await PDFGenerator.generateReportPDF(reportType, data, options);
          mimeType = 'application/pdf';
          filename += '.pdf';
          break;
        
        case 'csv':
          fileBuffer = await CSVGenerator.generateReportCSV(reportType, data, options);
          mimeType = 'text/csv';
          filename += '.csv';
          break;
        
        case 'excel':
          fileBuffer = await ExcelGenerator.generateReportExcel(reportType, data, options);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          filename += '.xlsx';
          break;
        
        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported export format'
          });
      }

      // Check if client expects JSON response (SPA frontend) - FIXED DETECTION
      const acceptHeader = req.get('Accept');
      const contentTypeHeader = req.get('Content-Type');
      const wantsJSON = (acceptHeader && acceptHeader.includes('application/json')) || 
                       (contentTypeHeader && contentTypeHeader.includes('application/json'));
      
      if (wantsJSON) {
        // Convert buffer to base64 for JSON response (SPA frontend)
        const base64Data = fileBuffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        
        return res.status(200).json({
          success: true,
          data: {
            downloadUrl: dataUrl,
            filename: filename,
            expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour expiry
            fileSize: fileBuffer.length
          }
        });
      } else {
        // Direct file download (traditional approach)
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', fileBuffer.length);
        res.send(fileBuffer);
      }

    } catch (error) {
      logger.error('Export generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate export'
      });
    }
  }

  /**
   * Get dashboard data for export
   * @param {Object} filters - Data filters
   * @returns {Object} Dashboard data
   */
  static async getDashboardData(filters = {}) {
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
    
    const recentInvoices = await Invoice.find()
      .populate('clientId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    const topClients = await Invoice.aggregate([
      {
        $group: {
          _id: '$clientId',
          totalSpent: { $sum: '$total' },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'client'
        }
      },
      {
        $unwind: '$client'
      }
    ]);

    return {
      stats: stats[0] || {
        totalInvoices: 0,
        totalRevenue: 0,
        unpaidCount: 0,
        unpaidAmount: 0,
        overdueCount: 0,
        paidCount: 0
      },
      recentInvoices,
      topClients,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get invoice data for export
   * @param {Object} filters - Data filters
   * @returns {Object} Invoice data
   */
		static async getInvoiceData(filters = {}) {
		  let query = {};

		  // Handle invoiceIds filter - FIXED
		  if (filters.invoiceIds && Array.isArray(filters.invoiceIds) && filters.invoiceIds.length > 0) {
		    query._id = { $in: filters.invoiceIds.map(id => new mongoose.Types.ObjectId(id)) };
		  }

		  if (filters.status && filters.status !== 'all') {
		    query.status = filters.status;
		  }

		  if (filters.dateFrom || filters.dateTo) {
		    query.date = {};
		    if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
		    if (filters.dateTo) query.date.$lte = new Date(filters.dateTo);
		  }

		  const invoices = await Invoice.find(query)
		    .populate('clientId', 'name email phone')
		    .sort({ date: -1 });

		  return {
		    invoices,
		    totalCount: invoices.length,
		    generatedAt: new Date().toISOString()
		  };
		}

  /**
   * Get client data for export
   * @param {Object} filters - Data filters
   * @returns {Object} Client data
   */
  static async getClientData(filters = {}) {
    let query = {};

    if (filters.search) {
      query = {
        $or: [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } }
        ]
      };
    }

    const clients = await Client.find(query).sort({ name: 1 });

    // Enhance client data with invoice statistics
    const enhancedClients = await Promise.all(
      clients.map(async (client) => {
        const clientInvoices = await Invoice.find({ clientId: client._id });
        const totalRevenue = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const unpaidAmount = clientInvoices
          .filter(inv => inv.status === 'unpaid')
          .reduce((sum, inv) => sum + inv.total, 0);

        return {
          ...client.toObject(),
          totalInvoices: clientInvoices.length,
          totalRevenue,
          unpaidAmount
        };
      })
    );

    return {
      clients: enhancedClients,
      totalCount: clients.length,
      generatedAt: new Date().toISOString()
    };
  }

  // Convenience methods for specific export types
  static async exportDashboard(req, res) {
    req.body.reportType = 'dashboard_summary';
    return ExportController.generateExport(req, res);
  }

  static async exportInvoices(req, res) {
    req.body.reportType = 'invoice_list';
    return ExportController.generateExport(req, res);
  }

  static async exportClients(req, res) {
    req.body.reportType = 'client_list';
    return ExportController.generateExport(req, res);
  }
}

module.exports = ExportController;
