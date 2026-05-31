/**
 * CSV Generator - Handles CSV file generation for reports and exports
 * @module utils/csvGenerator
 * @requires json2csv
 */

const { Parser } = require('json2csv');
const logger = require('./logger');

/**
 * CSV Generator class for creating CSV files from various data types
 */
class CSVGenerator {
  /**
   * Generates CSV file for report data
   * @param {string} reportType - Type of report to generate
   * @param {Object} data - Data to convert to CSV
   * @param {Object} options - Generation options
   * @returns {Buffer} CSV file buffer
   */
  static async generateReportCSV(reportType, data, options = {}) {
    try {
      let csvContent;
      
      switch (reportType) {
        case 'dashboard_summary':
          csvContent = await CSVGenerator.generateDashboardCSV(data, options);
          break;
        
        case 'invoice_list':
          csvContent = await CSVGenerator.generateInvoiceCSV(data, options);
          break;
        
        case 'client_list':
          csvContent = await CSVGenerator.generateClientCSV(data, options);
          break;
        
        default:
          throw new Error(`Unsupported report type for CSV: ${reportType}`);
      }

      return Buffer.from(csvContent, 'utf8');
      
    } catch (error) {
      logger.error('CSV generation error:', error);
      throw new Error(`Failed to generate CSV: ${error.message}`);
    }
  }

  /**
   * Generates CSV for dashboard summary data
   * @param {Object} data - Dashboard data
   * @param {Object} options - Generation options
   * @returns {string} CSV content
   */
  static async generateDashboardCSV(data, options) {
    const { stats, recentInvoices = [], topClients = [], generatedAt } = data;
    
    const csvData = [];
    
    // Add header
    csvData.push(['QUICKBILL DASHBOARD SUMMARY']);
    csvData.push(['Generated at:', new Date(generatedAt).toLocaleString()]);
    csvData.push([]);
    
    // Add stats section
    csvData.push(['BUSINESS STATISTICS']);
    csvData.push(['Total Invoices', stats.totalInvoices || 0]);
    csvData.push(['Total Revenue', `$${(stats.totalRevenue || 0).toFixed(2)}`]);
    csvData.push(['Unpaid Invoices', stats.unpaidCount || 0]);
    csvData.push(['Unpaid Amount', `$${(stats.unpaidAmount || 0).toFixed(2)}`]);
    csvData.push(['Overdue Invoices', stats.overdueCount || 0]);
    csvData.push(['Paid Invoices', stats.paidCount || 0]);
    csvData.push([]);
    
    // Add recent invoices section
    if (recentInvoices.length > 0) {
      csvData.push(['RECENT INVOICES']);
      csvData.push(['Invoice Number', 'Client', 'Date', 'Due Date', 'Status', 'Amount']);
      
      recentInvoices.forEach(invoice => {
        csvData.push([
          invoice.invoiceNumber,
          invoice.clientName,
          new Date(invoice.date).toLocaleDateString(),
          new Date(invoice.dueDate).toLocaleDateString(),
          invoice.status,
          `$${invoice.total.toFixed(2)}`
        ]);
      });
      csvData.push([]);
    }
    
    // Add top clients section
    if (topClients.length > 0) {
      csvData.push(['TOP CLIENTS BY REVENUE']);
      csvData.push(['Client', 'Total Spent', 'Invoice Count']);
      
      topClients.forEach(client => {
        const clientName = client.client ? client.client.name : 'Unknown Client';
        csvData.push([
          clientName,
          `$${(client.totalSpent || 0).toFixed(2)}`,
          client.invoiceCount || 0
        ]);
      });
    }
    
    return csvData.map(row => row.join(',')).join('\n');
  }

  /**
   * Generates CSV for invoice list data
   * @param {Object} data - Invoice data
   * @param {Object} options - Generation options
   * @returns {string} CSV content
   */
  static async generateInvoiceCSV(data, options) {
    const { invoices = [], totalCount, generatedAt } = data;
    
    const csvData = [];
    
    // Add header
    csvData.push(['QUICKBILL INVOICE LIST']);
    csvData.push(['Generated at:', new Date(generatedAt).toLocaleString()]);
    csvData.push(['Total Invoices:', totalCount]);
    csvData.push([]);
    csvData.push(['Invoice Number', 'Client Name', 'Client Email', 'Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Discount', 'Total', 'Currency']);
    
    // Add invoice data
    invoices.forEach(invoice => {
      csvData.push([
        invoice.invoiceNumber,
        invoice.clientName,
        invoice.clientEmail,
        new Date(invoice.date).toLocaleDateString(),
        new Date(invoice.dueDate).toLocaleDateString(),
        invoice.status,
        invoice.subtotal.toFixed(2),
        invoice.tax.toFixed(2),
        invoice.discount.toFixed(2),
        invoice.total.toFixed(2),
        invoice.currency
      ]);
    });
    
    return csvData.map(row => row.join(',')).join('\n');
  }

  /**
   * Generates CSV for client list data
   * @param {Object} data - Client data
   * @param {Object} options - Generation options
   * @returns {string} CSV content
   */
  static async generateClientCSV(data, options) {
    const { clients = [], totalCount, generatedAt } = data;
    
    const csvData = [];
    
    // Add header
    csvData.push(['QUICKBILL CLIENT DIRECTORY']);
    csvData.push(['Generated at:', new Date(generatedAt).toLocaleString()]);
    csvData.push(['Total Clients:', totalCount]);
    csvData.push([]);
    csvData.push(['Name', 'Email', 'Phone', 'Address', 'Total Invoices', 'Total Revenue', 'Unpaid Amount']);
    
    // Add client data
    clients.forEach(client => {
      csvData.push([
        client.name,
        client.email,
        client.phone || 'N/A',
        client.address,
        client.totalInvoices || 0,
        `$${(client.totalRevenue || 0).toFixed(2)}`,
        `$${(client.unpaidAmount || 0).toFixed(2)}`
      ]);
    });
    
    return csvData.map(row => row.join(',')).join('\n');
  }
}

module.exports = CSVGenerator;
