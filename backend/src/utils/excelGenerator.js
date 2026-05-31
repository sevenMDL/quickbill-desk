/**
 * Excel Generator - Handles Excel file generation for reports and exports
 * @module utils/excelGenerator
 * @requires exceljs
 */

const ExcelJS = require('exceljs');
const logger = require('./logger');

/**
 * Excel Generator class for creating Excel files from various data types
 */
class ExcelGenerator {
  /**
   * Generates Excel file for report data
   * @param {string} reportType - Type of report to generate
   * @param {Object} data - Data to convert to Excel
   * @param {Object} options - Generation options
   * @returns {Promise<Buffer>} Excel file buffer
   */
  static async generateReportExcel(reportType, data, options = {}) {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'QuickBill Desk';
      workbook.lastModifiedBy = 'QuickBill Desk';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      switch (reportType) {
        case 'dashboard_summary':
          await ExcelGenerator.generateDashboardExcel(workbook, data, options);
          break;
        
        case 'invoice_list':
          await ExcelGenerator.generateInvoiceExcel(workbook, data, options);
          break;
        
        case 'client_list':
          await ExcelGenerator.generateClientExcel(workbook, data, options);
          break;
        
        default:
          throw new Error(`Unsupported report type for Excel: ${reportType}`);
      }

      // Return buffer
      return await workbook.xlsx.writeBuffer();
      
    } catch (error) {
      logger.error('Excel generation error:', error);
      throw new Error(`Failed to generate Excel: ${error.message}`);
    }
  }

  /**
   * Generates Excel for dashboard summary data
   * @param {ExcelJS.Workbook} workbook - Workbook instance
   * @param {Object} data - Dashboard data
   * @param {Object} options - Generation options
   */
  static async generateDashboardExcel(workbook, data, options) {
    const { stats, recentInvoices = [], topClients = [], generatedAt } = data;
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Title
    summarySheet.mergeCells('A1:D1');
    summarySheet.getCell('A1').value = 'QUICKBILL DASHBOARD SUMMARY';
    summarySheet.getCell('A1').font = { bold: true, size: 16 };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // Generated at
    summarySheet.getCell('A2').value = 'Generated at:';
    summarySheet.getCell('B2').value = new Date(generatedAt);
    summarySheet.getCell('B2').numFmt = 'yyyy-mm-dd hh:mm:ss';
    
    // Stats section
    summarySheet.getCell('A4').value = 'BUSINESS STATISTICS';
    summarySheet.getCell('A4').font = { bold: true, size: 14 };
    
    const statsData = [
      ['Total Invoices', stats.totalInvoices || 0],
      ['Total Revenue', stats.totalRevenue || 0],
      ['Unpaid Invoices', stats.unpaidCount || 0],
      ['Unpaid Amount', stats.unpaidAmount || 0],
      ['Paid Invoices', stats.paidCount || 0],
      ['Overdue Invoices', stats.overdueCount || 0]
    ];
    
    summarySheet.addTable({
      name: 'StatsTable',
      ref: 'A5',
      columns: [
        { name: 'Metric', filterButton: true },
        { name: 'Value', filterButton: true }
      ],
      rows: statsData
    });

    // Recent Invoices sheet
    if (recentInvoices.length > 0) {
      const invoicesSheet = workbook.addWorksheet('Recent Invoices');
      
      invoicesSheet.addTable({
        name: 'RecentInvoicesTable',
        ref: 'A1',
        columns: [
          { name: 'Invoice Number', filterButton: true },
          { name: 'Client', filterButton: true },
          { name: 'Date', filterButton: true },
          { name: 'Due Date', filterButton: true },
          { name: 'Status', filterButton: true },
          { name: 'Amount', filterButton: true }
        ],
        rows: recentInvoices.map(invoice => [
          invoice.invoiceNumber,
          invoice.clientId?.name || invoice.clientName || 'N/A',
          new Date(invoice.date),
          new Date(invoice.dueDate),
          invoice.status,
          invoice.total
        ])
      });

      // Format date columns
      [2, 3].forEach(colIndex => {
        invoicesSheet.getColumn(colIndex).numFmt = 'yyyy-mm-dd';
      });
      
      // Format amount column
      invoicesSheet.getColumn(6).numFmt = '"$"#,##0.00';
    }

    // Top Clients sheet
    if (topClients.length > 0) {
      const clientsSheet = workbook.addWorksheet('Top Clients');
      
      clientsSheet.addTable({
        name: 'TopClientsTable',
        ref: 'A1',
        columns: [
          { name: 'Client', filterButton: true },
          { name: 'Total Spent', filterButton: true },
          { name: 'Invoice Count', filterButton: true }
        ],
        rows: topClients.map(client => [
          client.client?.name || client._id?.name || 'N/A',
          client.totalSpent || 0,
          client.invoiceCount || 0
        ])
      });
      
      // Format total spent
      clientsSheet.getColumn(2).numFmt = '"$"#,##0.00';
    }
  }

  /**
   * Generates Excel for invoice list data
   * @param {ExcelJS.Workbook} workbook - Workbook instance
   * @param {Object} data - Invoice data
   * @param {Object} options - Generation options
   */
  static async generateInvoiceExcel(workbook, data, options) {
    const { invoices = [], totalCount, generatedAt } = data;
    
    const sheet = workbook.addWorksheet('Invoices');
    
    // Title
    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = 'QUICKBILL INVOICE LIST';
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    
    sheet.getCell('A2').value = 'Generated at:';
    sheet.getCell('B2').value = new Date(generatedAt);
    sheet.getCell('B2').numFmt = 'yyyy-mm-dd hh:mm:ss';
    
    sheet.getCell('A3').value = 'Total Invoices:';
    sheet.getCell('B3').value = totalCount;
    
    // Table
    if (invoices.length > 0) {
      sheet.addTable({
        name: 'InvoicesTable',
        ref: 'A5',
        columns: [
          { name: 'Invoice Number', filterButton: true },
          { name: 'Client Name', filterButton: true },
          { name: 'Client Email', filterButton: true },
          { name: 'Date', filterButton: true },
          { name: 'Due Date', filterButton: true },
          { name: 'Status', filterButton: true },
          { name: 'Subtotal', filterButton: true },
          { name: 'Tax', filterButton: true },
          { name: 'Discount', filterButton: true },
          { name: 'Total', filterButton: true },
          { name: 'Currency', filterButton: true }
        ],
        rows: invoices.map(invoice => [
          invoice.invoiceNumber,
          invoice.clientName,
          invoice.clientEmail,
          new Date(invoice.date),
          new Date(invoice.dueDate),
          invoice.status,
          invoice.subtotal,
          invoice.tax,
          invoice.discount,
          invoice.total,
          invoice.currency
        ])
      });

      // Format date columns
      [3, 4].forEach(colIndex => {
        sheet.getColumn(colIndex + 1).numFmt = 'yyyy-mm-dd';
      });
      
      // Format currency columns
      [6, 7, 8, 9].forEach(colIndex => {
        sheet.getColumn(colIndex + 1).numFmt = '"$"#,##0.00';
      });
    }
  }

  /**
   * Generates Excel for client list data
   * @param {ExcelJS.Workbook} workbook - Workbook instance
   * @param {Object} data - Client data
   * @param {Object} options - Generation options
   */
  static async generateClientExcel(workbook, data, options) {
    const { clients = [], totalCount, generatedAt } = data;
    
    const sheet = workbook.addWorksheet('Clients');
    
    // Title
    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = 'QUICKBILL CLIENT DIRECTORY';
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    
    sheet.getCell('A2').value = 'Generated at:';
    sheet.getCell('B2').value = new Date(generatedAt);
    sheet.getCell('B2').numFmt = 'yyyy-mm-dd hh:mm:ss';
    
    sheet.getCell('A3').value = 'Total Clients:';
    sheet.getCell('B3').value = totalCount;
    
    // Table
    if (clients.length > 0) {
      sheet.addTable({
        name: 'ClientsTable',
        ref: 'A5',
        columns: [
          { name: 'Name', filterButton: true },
          { name: 'Email', filterButton: true },
          { name: 'Phone', filterButton: true },
          { name: 'Address', filterButton: true },
          { name: 'Total Invoices', filterButton: true },
          { name: 'Total Revenue', filterButton: true },
          { name: 'Unpaid Amount', filterButton: true }
        ],
        rows: clients.map(client => [
          client.name,
          client.email,
          client.phone || 'N/A',
          client.address,
          client.totalInvoices || 0,
          client.totalRevenue || 0,
          client.unpaidAmount || 0
        ])
      });
      
      // Format currency columns
      [5, 6].forEach(colIndex => {
        sheet.getColumn(colIndex + 1).numFmt = '"$"#,##0.00';
      });
    }
  }
}

module.exports = ExcelGenerator;
