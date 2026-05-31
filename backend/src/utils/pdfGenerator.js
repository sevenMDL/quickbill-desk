/**
 * PDF Generator - Professional invoice PDF generation for both download and email
 * @module utils/pdfGenerator
 * @requires pdfkit
 * @requires ./logger
 */

const PDFDocument = require('pdfkit');
const logger = require('./logger');

/**
 * PDF generator utility.
 * @class PDFGenerator
 */
class PDFGenerator {
  /**
   * Generate professional PDF buffer for invoice
   * @param {Object} invoice - Invoice data for PDF generation
   * @returns {Promise<Buffer>} PDF file buffer
   */
  static async generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: false,
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Use professional styling from invoice controller
        PDFGenerator.generatePDFContent(doc, invoice);
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate payment section for PDF invoices
   * @param {PDFDocument} doc - PDFKit document instance
   * @param {Object} invoice - Invoice data
   * @param {number} currentY - Current Y position in document
   * @returns {number} New Y position after payment section
   */
  static generatePaymentSection(doc, invoice, currentY) {
    if (invoice.paymentLink) {
      // Payment header
      doc.fontSize(14)
         .fillColor('#065f46')
         .text('Payment Instructions', 50, currentY);
      
      currentY += 25;
      
      // Payment amount
      doc.fontSize(12)
         .fillColor('#374151')
         .text(`Amount Due: ${invoice.currency} ${invoice.total.toFixed(2)}`, 50, currentY);
      
      currentY += 20;
      
      // Clickable "Pay Now" area
      const buttonWidth = 80;
      const buttonHeight = 25;
      
      // Green background "button"
      doc.rect(50, currentY, buttonWidth, buttonHeight)
         .fill('#10b981');
      
      // White text on button
      doc.fillColor('white')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('PAY NOW', 50 + 5, currentY + 8);
      
      // Make the entire button area clickable
      doc.link(50, currentY, buttonWidth, buttonHeight, invoice.paymentLink);
      
      currentY += 35;
      
      // Alternative payment instructions
      doc.fillColor('#374151')
         .fontSize(10)
         .font('Helvetica')
         .text('Alternative methods:', 50, currentY);
      
      currentY += 15;
      
      // Clickable text link
      doc.fillColor('#2563eb')
         .text('Click here to pay:', 50, currentY)
         .text(invoice.paymentLink, 50, currentY + 12, {
           link: invoice.paymentLink,
           underline: true
         });
      
      currentY += 40;
      
      // Separator line
      doc.moveTo(50, currentY)
         .lineTo(550, currentY)
         .strokeColor('#d1d5db')
         .lineWidth(1)
         .stroke();
      
      currentY += 20;
    }
    
    return currentY;
  }

  /**
   * Generate PDF for reports (dashboard, client list, invoice list)
   * @param {string} reportType - Type of report
   * @param {Object} data - Report data
   * @param {Object} options - Generation options
   * @returns {Promise<Buffer>} PDF file buffer
   */
  static async generateReportPDF(reportType, data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: false,
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Generate different content based on report type
        switch (reportType) {
          case 'dashboard_summary':
            PDFGenerator.generateDashboardPDF(doc, data, options);
            break;
          case 'invoice_list':
            PDFGenerator.generateInvoiceListPDF(doc, data, options);
            break;
          case 'client_list':
            PDFGenerator.generateClientListPDF(doc, data, options);
            break;
          default:
            PDFGenerator.generateSimpleReportPDF(doc, reportType, data, options);
        }

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate dashboard summary PDF
   */
  static generateDashboardPDF(doc, data, options) {
    const { stats, recentInvoices = [], topClients = [], generatedAt } = data;

    // Theme colors for consistent styling
    const colors = {
      primary: '#2563eb',
      secondary: '#374151',
      lightGray: '#f3f4f6',
      border: '#e5e7eb',
      text: '#111827',
    };

    // Header
    doc
      .fillColor(colors.primary)
      .rect(0, 0, doc.page.width, 80)
      .fill()
      .fillColor('#ffffff')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('DASHBOARD SUMMARY', 50, 30)
      .fontSize(10)
      .text(`Generated: ${new Date(generatedAt).toLocaleString()}`, 50, 60);

    let y = 120;

    // Stats section
    doc
      .fillColor(colors.text)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('BUSINESS OVERVIEW', 50, y);

    y += 30;

    const statsData = [
      ['Total Invoices', stats.totalInvoices || 0],
      ['Total Revenue', `$${(stats.totalRevenue || 0).toFixed(2)}`],
      ['Unpaid Invoices', stats.unpaidCount || 0],
      ['Unpaid Amount', `$${(stats.unpaidAmount || 0).toFixed(2)}`],
      ['Paid Invoices', stats.paidCount || 0],
      ['Overdue Invoices', stats.overdueCount || 0]
    ];

    statsData.forEach(([label, value], i) => {
      const rowY = y + i * 20;
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(colors.secondary)
        .text(label, 50, rowY)
        .fillColor(colors.primary)
        .text(value, 200, rowY);
    });

    y += statsData.length * 20 + 30;

    // Recent invoices section
    if (recentInvoices.length > 0) {
      doc
        .fillColor(colors.text)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('RECENT INVOICES', 50, y);

      y += 25;

      // Table header for recent invoices
      doc
        .fillColor(colors.lightGray)
        .rect(50, y, doc.page.width - 100, 20)
        .fill()
        .fillColor(colors.primary)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Invoice #', 60, y + 6)
        .text('Client', 150, y + 6)
        .text('Amount', 350, y + 6)
        .text('Status', 450, y + 6);

      y += 25;

      recentInvoices.forEach((invoice, i) => {
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        // Alternating background
        if (i % 2 === 0) {
          doc.fillColor('#f9fafb').rect(50, y - 5, doc.page.width - 100, 15).fill();
        }

        const clientName = invoice.clientId?.name || invoice.clientName || 'N/A';

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(colors.secondary)
          .text(invoice.invoiceNumber, 60, y)
          .text(clientName, 150, y, { width: 180 })
          .text(`$${invoice.total.toFixed(2)}`, 350, y)
          .text(invoice.status, 450, y);

        y += 18;
      });

      y += 20;
    }

    // Top clients section
    if (topClients.length > 0) {
      if (y > doc.page.height - 150) {
        doc.addPage();
        y = 50;
      }

      doc
        .fillColor(colors.text)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('TOP CLIENTS', 50, y);

      y += 25;

      // Table header for top clients
      doc
        .fillColor(colors.lightGray)
        .rect(50, y, doc.page.width - 100, 20)
        .fill()
        .fillColor(colors.primary)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Client', 60, y + 6)
        .text('Total Spent', 350, y + 6)
        .text('Invoices', 450, y + 6);

      y += 25;

      topClients.forEach((client, i) => {
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        // Alternating background
        if (i % 2 === 0) {
          doc.fillColor('#f9fafb').rect(50, y - 5, doc.page.width - 100, 15).fill();
        }

        const clientName = client.client?.name || client._id?.name || 'N/A';

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(colors.secondary)
          .text(clientName, 60, y, { width: 270 })
          .text(`$${client.totalSpent.toFixed(2)}`, 350, y)
          .text(client.invoiceCount.toString(), 450, y);

        y += 18;
      });
    }

    // Footer
    const footerY = doc.page.height - 40;
    doc
      .fontSize(8)
      .fillColor(colors.secondary)
      .text('QuickBill Desk - Professional Invoicing Solution', 50, footerY, { align: 'center' });
  }

  /**
   * Generate invoice list PDF
   */
  static generateInvoiceListPDF(doc, data, options) {
    const { invoices = [], generatedAt } = data;

    // Theme colors for consistent styling
    const colors = {
      primary: '#2563eb',
      secondary: '#374151',
      lightGray: '#f3f4f6',
      border: '#e5e7eb',
      text: '#111827',
    };

    // Header
    doc
      .fillColor(colors.primary)
      .rect(0, 0, doc.page.width, 80)
      .fill()
      .fillColor('#ffffff')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('INVOICE LIST REPORT', 50, 30)
      .fontSize(10)
      .text(`Generated: ${new Date(generatedAt).toLocaleString()}`, 50, 60)
      .text(`Total Invoices: ${invoices.length}`, 400, 60, { align: 'right' });

    let y = 120;

    // Table header
    doc
      .fillColor(colors.lightGray)
      .rect(50, y, doc.page.width - 100, 20)
      .fill()
      .fillColor(colors.primary)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Invoice #', 60, y + 6)
      .text('Client', 120, y + 6)
      .text('Date', 250, y + 6)
      .text('Due Date', 320, y + 6)
      .text('Amount', 400, y + 6)
      .text('Status', 480, y + 6);

    y += 25;

    // Table rows
    invoices.forEach((invoice, i) => {
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 50;

        // Repeat header on new page
        doc
          .fillColor(colors.lightGray)
          .rect(50, y, doc.page.width - 100, 20)
          .fill()
          .fillColor(colors.primary)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Invoice #', 60, y + 6)
          .text('Client', 120, y + 6)
          .text('Date', 250, y + 6)
          .text('Due Date', 320, y + 6)
          .text('Amount', 400, y + 6)
          .text('Status', 480, y + 6);

        y += 25;
      }

      // Alternating row background
      if (i % 2 === 0) {
        doc.fillColor('#f9fafb').rect(50, y - 5, doc.page.width - 100, 15).fill();
      }

      const clientName = invoice.clientId?.name || invoice.clientName || 'N/A';
      const statusColor = invoice.status === 'paid' ? '#10b981' :
                         invoice.status === 'overdue' ? '#ef4444' :
                         colors.secondary;

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.text)
        .text(invoice.invoiceNumber, 60, y)
        .text(clientName, 120, y, { width: 120 })
        .text(new Date(invoice.date).toLocaleDateString(), 250, y)
        .text(new Date(invoice.dueDate).toLocaleDateString(), 320, y)
        .text(`$${invoice.total.toFixed(2)}`, 400, y)
        .fillColor(statusColor)
        .text(invoice.status.toUpperCase(), 480, y);

      y += 18;
    });

    // Calculate totals
    const totals = invoices.reduce((acc, invoice) => {
      acc.totalAmount += invoice.total;
      if (invoice.status === 'unpaid') acc.unpaidAmount += invoice.total;
      if (invoice.status === 'paid') acc.paidAmount += invoice.total;
      return acc;
    }, { totalAmount: 0, unpaidAmount: 0, paidAmount: 0 });

    // Add summary section
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 50;
    }

    y += 20;
    doc
      .fillColor(colors.text)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('SUMMARY', 50, y);

    y += 20;
    const summaryData = [
      ['Total Invoice Amount:', `$${totals.totalAmount.toFixed(2)}`],
      ['Paid Amount:', `$${totals.paidAmount.toFixed(2)}`],
      ['Unpaid Amount:', `$${totals.unpaidAmount.toFixed(2)}`]
    ];

    summaryData.forEach(([label, value], i) => {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(colors.secondary)
        .text(label, 50, y + i * 18)
        .fillColor(colors.primary)
        .text(value, 200, y + i * 18);
    });

    // Footer
    const footerY = doc.page.height - 40;
    doc
      .fontSize(8)
      .fillColor(colors.secondary)
      .text('QuickBill Desk - Professional Invoicing Solution', 50, footerY, { align: 'center' });
  }

  /**
   * Generate client list PDF
   */
  static generateClientListPDF(doc, data, options) {
    const { clients = [], generatedAt } = data;

    // Theme colors for consistent styling
    const colors = {
      primary: '#2563eb',
      secondary: '#374151',
      lightGray: '#f3f4f6',
      border: '#e5e7eb',
      text: '#111827',
    };

    // Header
    doc
      .fillColor(colors.primary)
      .rect(0, 0, doc.page.width, 80)
      .fill()
      .fillColor('#ffffff')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('CLIENT DIRECTORY', 50, 30)
      .fontSize(10)
      .text(`Generated: ${new Date(generatedAt).toLocaleString()}`, 50, 60)
      .text(`Total Clients: ${clients.length}`, 400, 60, { align: 'right' });

    let y = 120;

    // Table header
    doc
      .fillColor(colors.lightGray)
      .rect(50, y, doc.page.width - 100, 20)
      .fill()
      .fillColor(colors.primary)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Client Name', 60, y + 6)
      .text('Email', 180, y + 6)
      .text('Phone', 320, y + 6)
      .text('Invoices', 420, y + 6)
      .text('Total Revenue', 470, y + 6);

    y += 25;

    // Table rows
    clients.forEach((client, i) => {
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 50;

        // Repeat header on new page
        doc
          .fillColor(colors.lightGray)
          .rect(50, y, doc.page.width - 100, 20)
          .fill()
          .fillColor(colors.primary)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Client Name', 60, y + 6)
          .text('Email', 180, y + 6)
          .text('Phone', 320, y + 6)
          .text('Invoices', 420, y + 6)
          .text('Total Revenue', 470, y + 6);

        y += 25;
      }

      // Alternating row background
      if (i % 2 === 0) {
        doc.fillColor('#f9fafb').rect(50, y - 5, doc.page.width - 100, 15).fill();
      }

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.text)
        .text(client.name, 60, y, { width: 110 })
        .text(client.email || 'N/A', 180, y, { width: 130 })
        .text(client.phone || 'N/A', 320, y, { width: 90 })
        .text((client.totalInvoices || 0).toString(), 420, y)
        .text(`$${(client.totalRevenue || 0).toFixed(2)}`, 470, y);

      y += 18;
    });

    // Calculate totals
    const totals = clients.reduce((acc, client) => {
      acc.totalClients += 1;
      acc.totalInvoices += client.totalInvoices || 0;
      acc.totalRevenue += client.totalRevenue || 0;
      return acc;
    }, { totalClients: 0, totalInvoices: 0, totalRevenue: 0 });

    // Add summary section
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 50;
    }

    y += 20;
    doc
      .fillColor(colors.text)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('SUMMARY', 50, y);

    y += 20;
    const summaryData = [
      ['Total Clients:', totals.totalClients],
      ['Total Invoices:', totals.totalInvoices],
      ['Total Revenue:', `$${totals.totalRevenue.toFixed(2)}`]
    ];

    summaryData.forEach(([label, value], i) => {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(colors.secondary)
        .text(label, 50, y + i * 18)
        .fillColor(colors.primary)
        .text(value.toString(), 200, y + i * 18);
    });

    // Footer
    const footerY = doc.page.height - 40;
    doc
      .fontSize(8)
      .fillColor(colors.secondary)
      .text('QuickBill Desk - Professional Invoicing Solution', 50, footerY, { align: 'center' });
  }

  /**
   * Simple fallback PDF generator
   */
  static generateSimpleReportPDF(doc, title, data, options) {
    const colors = {
      primary: '#2563eb',
      secondary: '#374151',
      text: '#111827',
    };

    doc
      .fillColor(colors.primary)
      .rect(0, 0, doc.page.width, 80)
      .fill()
      .fillColor('#ffffff')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(title.toUpperCase(), 50, 30)
      .fontSize(10)
      .text(`Generated: ${new Date().toLocaleString()}`, 50, 60);

    doc
      .fillColor(colors.text)
      .fontSize(12)
      .text('Report PDF export is available.', 50, 120)
      .text('Detailed formatting coming in future updates.', 50, 140);
  }

  /**
   * Generate PDF content with professional invoice formatting
   * @param {PDFDocument} doc - PDFKit document instance
   * @param {Object} invoice - Invoice data for content generation
   */
  static generatePDFContent(doc, invoice) {
    // Theme colors for professional appearance (from invoice controller)
    const colors = {
      primary: '#2563eb',
      secondary: '#374151',
      lightGray: '#f3f4f6',
      border: '#e5e7eb',
      text: '#111827',
    };

    // Header section with business information
    doc
      .rect(0, 0, doc.page.width, 100)
      .fill(colors.primary);

    let headerX = 50;
    if (invoice.businessLogo && invoice.businessLogo.startsWith('data:image/')) {
      try {
        doc.image(invoice.businessLogo, headerX, 25, { width: 45, height: 45 });
        headerX += 60;
      } catch (err) {
        // Logo load failed, continue without logo
      }
    }

    doc
      .fillColor('#ffffff')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(invoice.businessName || 'QuickBill Desk', headerX, 30);

    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#e0e7ff')
      .text('INVOICE', headerX, 60);

    // Invoice info (right aligned)
    const infoY = 30;
    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .text(`Invoice #: ${invoice.invoiceNumber}`, 400, infoY, { align: 'right' })
      .text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 400, infoY + 15, { align: 'right' })
      .text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 400, infoY + 30, { align: 'right' })
      .text(`Status: ${invoice.status.toUpperCase()}`, 400, infoY + 45, { align: 'right' });

    // From/To sections
    let y = 130;

    const section = (title, lines, x) => {
      doc
        .fillColor(colors.text)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(title, x, y);

      doc
        .font('Helvetica')
        .fillColor(colors.secondary)
        .fontSize(9);
      lines.forEach((line, i) => {
        doc.text(line || '', x, y + 15 + i * 13, { width: 230 });
      });
    };

    section('FROM:', [
      invoice.businessName,
      invoice.businessEmail,
      invoice.businessAddress
    ], 50);

    section('BILL TO:', [
      invoice.clientName,
      invoice.clientEmail,
      invoice.clientAddress
    ], 320);

    // Table header
    y = 210;
    doc
      .fillColor(colors.lightGray)
      .rect(50, y, doc.page.width - 100, 25)
      .fill();

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(colors.primary)
      .text('Description', 60, y + 8)
      .text('Qty', 350, y + 8)
      .text('Price', 410, y + 8)
      .text('Amount', 480, y + 8);

    // Table rows with alternating background
    y += 30;
    invoice.items.forEach((item, i) => {
      const rowY = y + i * 20;

      // Alternating background for readability
      if (i % 2 === 0) {
        doc.fillColor('#f9fafb').rect(50, rowY - 5, doc.page.width - 100, 20).fill();
      }

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(colors.text)
        .text(item.description, 60, rowY, { width: 270 })
        .text(item.quantity.toString(), 350, rowY)
        .text(`${invoice.currency} ${item.price.toFixed(2)}`, 410, rowY)
        .text(`${invoice.currency} ${item.total.toFixed(2)}`, 480, rowY);
    });

    y += invoice.items.length * 20 + 25;

    // Add payment section if payment link exists
    y = this.generatePaymentSection(doc, invoice, y);

    // Totals section with clean alignment
    const totalsLabelX = 360;
    const totalsValueX = 480;
    let ty = y;

    const addTotalLine = (label, value, bold = false, color = colors.text) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 10 : 9)
        .fillColor(color)
        .text(label, totalsLabelX, ty, { width: 100, align: 'right' })
        .text(value, totalsValueX, ty, { width: 80, align: 'right' });
      ty += 18;
    };

    addTotalLine('Subtotal:', `${invoice.currency} ${invoice.subtotal.toFixed(2)}`);
    addTotalLine(`Tax (${invoice.taxRate}%):`, `${invoice.currency} ${invoice.tax.toFixed(2)}`);

    if (invoice.discount > 0) {
      addTotalLine('Discount:', `-${invoice.currency} ${invoice.discount.toFixed(2)}`);
    }

    // Divider before total
    doc
      .moveTo(totalsLabelX - 20, ty - 5)
      .lineTo(totalsValueX + 50, ty - 5)
      .strokeColor(colors.border)
      .lineWidth(0.7)
      .stroke();

    // Final total
    addTotalLine('Total:', `${invoice.currency} ${invoice.total.toFixed(2)}`, true, colors.primary);

    // Notes section if provided
    if (invoice.notes) {
      y = ty + 40;
      doc
        .fillColor(colors.lightGray)
        .rect(50, y - 10, doc.page.width - 100, 25)
        .fill();

      doc
        .fillColor(colors.primary)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('PAYMENT TERMS & NOTES:', 60, y);

      doc
        .font('Helvetica')
        .fillColor(colors.secondary)
        .fontSize(9)
        .text(invoice.notes, 60, y + 20, {
          width: doc.page.width - 120,
          align: 'left',
        });
    }

    // Footer with generation timestamp
    const footerY = doc.page.height - 60;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(colors.secondary)
      .text('Thank you for your business!', 50, footerY, { align: 'center' })
      .text(`Generated on ${new Date().toLocaleString()}`, 50, footerY + 10, { align: 'center' });
  }
}

module.exports = PDFGenerator;
