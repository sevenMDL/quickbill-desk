/**
 * ZIP Generator - Create ZIP archives containing multiple invoice PDFs
 * @module utils/zipGenerator
 * @requires archiver
 * @requires pdfkit
 * @requires ../models/Invoice
 */

const archiver = require('archiver');
const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');

/**
 * ZIP generator utility.
 * @class ZipGenerator
 */
class ZipGenerator {
  /**
   * Generate a ZIP file containing multiple invoice PDFs
   * @param {Array} invoiceIds - Array of invoice IDs to include
   * @returns {Promise<Object>} ZIP file data and metadata
   */
  static async generateInvoiceZip(invoiceIds) {
    return new Promise(async (resolve, reject) => {
      try {
        // Get all invoices
        const invoices = await Invoice.find({
          _id: { $in: invoiceIds }
        }).populate('clientId');

        if (invoices.length === 0) {
          throw new Error('No invoices found for the provided IDs');
        }

        // Create archiver instance
        const archive = archiver('zip', {
          zlib: { level: 9 } // Maximum compression
        });

        const chunks = [];
        
        archive.on('data', (chunk) => chunks.push(chunk));
        archive.on('error', (error) => reject(error));
        archive.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            buffer,
            filename: `invoices-${Date.now()}.zip`,
            count: invoices.length
          });
        });

        // Generate PDF for each invoice and add to archive
        for (const invoice of invoices) {
          const pdfBuffer = await this.generateSinglePDF(invoice);
          const filename = `invoice-${invoice.invoiceNumber}.pdf`;
          archive.append(pdfBuffer, { name: filename });
        }

        // Finalize the archive
        archive.finalize();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate single PDF buffer for an invoice
   * @param {Object} invoice - Invoice data for PDF generation
   * @returns {Promise<Buffer>} PDF file buffer
   */
  static async generateSinglePDF(invoice) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4',
          bufferPages: true
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Generate PDF content using professional formatting
        this.generatePDFContent(doc, invoice);
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate PDF content with professional invoice formatting
   * @param {PDFDocument} doc - PDFKit document instance
   * @param {Object} invoice - Invoice data for content generation
   */
  static generatePDFContent(doc, invoice) {
    const primaryColor = '#4f46e5';
    const secondaryColor = '#6b7280';
    const borderColor = '#e5e7eb';
    const backgroundColor = '#f8fafc';

    // Header with background
    doc.fillColor(primaryColor).rect(0, 0, doc.page.width, 100).fill();
    
    // Header content with logo support
    let headerX = 50;
    
    if (invoice.businessLogo && invoice.businessLogo.startsWith('data:image/')) {
      try {
        doc.image(invoice.businessLogo, headerX, 25, { 
          width: 40, 
          height: 40,
          fit: [40, 40]
        });
        headerX += 60;
      } catch (error) {
        headerX = 50;
      }
    }
    
    // Business name and invoice title
    doc.fillColor('#ffffff')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text(invoice.businessName || 'QuickBill Desk', headerX, 30);
    
    doc.fillColor('rgba(255,255,255,0.8)')
       .fontSize(12)
       .font('Helvetica')
       .text('INVOICE', headerX, 55);

    // Invoice details in header
    doc.fillColor('#ffffff')
       .fontSize(9)
       .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 30, { align: 'right' })
       .text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 400, 45, { align: 'right' })
       .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 400, 60, { align: 'right' })
       .text(`Status: ${invoice.status.toUpperCase()}`, 400, 75, { align: 'right' });

    // From/To sections
    let yPosition = 130;
    
    // From section
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('FROM:', 50, yPosition);
    
    doc.fillColor(secondaryColor)
       .fontSize(9)
       .font('Helvetica')
       .text(invoice.businessName, 50, yPosition + 15)
       .text(invoice.businessEmail, 50, yPosition + 30)
       .text(invoice.businessAddress, 50, yPosition + 45, { width: 200 });

    // To section
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('BILL TO:', 300, yPosition);
    
    doc.fillColor(secondaryColor)
       .fontSize(9)
       .font('Helvetica')
       .text(invoice.clientName, 300, yPosition + 15)
       .text(invoice.clientEmail, 300, yPosition + 30)
       .text(invoice.clientAddress, 300, yPosition + 45, { width: 200 });

    // Line items table
    yPosition = 210;
    
    // Table header
    doc.fillColor(backgroundColor)
       .rect(50, yPosition, doc.page.width - 100, 20)
       .fill();
    
    doc.fillColor(primaryColor)
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('Description', 55, yPosition + 6)
       .text('Qty', 350, yPosition + 6)
       .text('Price', 400, yPosition + 6)
       .text('Amount', 470, yPosition + 6);
    
    yPosition += 25;

    // Table rows
    doc.fillColor('#000000')
       .fontSize(8)
       .font('Helvetica');

    invoice.items.forEach((item, index) => {
      const rowY = yPosition + (index * 15);
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.fillColor(backgroundColor)
           .rect(50, rowY - 3, doc.page.width - 100, 15)
           .fill();
      }

      doc.fillColor('#000000')
         .text(item.description, 55, rowY, { width: 250 })
         .text(item.quantity.toString(), 350, rowY)
         .text(`${invoice.currency} ${item.price.toFixed(2)}`, 400, rowY)
         .text(`${invoice.currency} ${item.total.toFixed(2)}`, 470, rowY);
    });

    // Update Y position after items
    yPosition += (invoice.items.length * 15) + 25;

    // Totals section
    const totalsX = 350;
    
    doc.fillColor(secondaryColor)
       .fontSize(9)
       .text('Subtotal:', totalsX, yPosition, { align: 'right' })
       .text(`Tax (${invoice.taxRate}%):`, totalsX, yPosition + 12, { align: 'right' });
    
    if (invoice.discount > 0) {
      doc.text('Discount:', totalsX, yPosition + 24, { align: 'right' });
      yPosition += 12;
    }
    
    doc.font('Helvetica-Bold')
       .text('Total:', totalsX, yPosition + 24, { align: 'right' });

    doc.fillColor('#000000')
       .fontSize(9)
       .font('Helvetica')
       .text(`${invoice.currency} ${invoice.subtotal.toFixed(2)}`, 470, yPosition)
       .text(`${invoice.currency} ${invoice.tax.toFixed(2)}`, 470, yPosition + 12);
    
    if (invoice.discount > 0) {
      doc.text(`-${invoice.currency} ${invoice.discount.toFixed(2)}`, 470, yPosition + 24);
    }
    
    doc.font('Helvetica-Bold')
       .fontSize(10)
       .text(`${invoice.currency} ${invoice.total.toFixed(2)}`, 470, yPosition + 36);

    // Notes section if available
    if (invoice.notes && yPosition < 650) {
      yPosition += 80;
      
      // Notes header with background
      doc.fillColor(backgroundColor)
         .rect(50, yPosition - 5, doc.page.width - 100, 20)
         .fill();
      
      doc.fillColor(primaryColor)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('PAYMENT TERMS & NOTES:', 60, yPosition + 5);
      
      yPosition += 25;
      
      // Notes content
      doc.fillColor(secondaryColor)
         .fontSize(9)
         .font('Helvetica')
         .text(invoice.notes, 60, yPosition, { 
           width: doc.page.width - 120,
           align: 'left'
         });
    }

    // Footer
    const footerY = doc.page.height - 30;
    
    doc.fillColor(secondaryColor)
       .fontSize(7)
       .font('Helvetica')
       .text('Thank you for your business!', 50, footerY, { align: 'center' })
       .text(`Generated on: ${new Date().toLocaleDateString()}`, 400, footerY, { align: 'right' });
  }
}

module.exports = ZipGenerator;
