/**
 * Email Service - Invoice email delivery with PDF attachments
 * @module services/emailService
 * @requires nodemailer
 * @requires ../utils/pdfGenerator
 * @requires ../models/Invoice
 * @requires ../models/Settings
 */

const nodemailer = require('nodemailer');
const PDFGenerator = require('../utils/pdfGenerator');
const Invoice = require('../models/Invoice');
const Settings = require('../models/Settings');

/**
 * Email handling service.
 * @class EmailService
 */
class EmailService {
  /**
   * Create SMTP transporter for email delivery
   * @returns {Promise<Object>} Nodemailer transporter instance
   */
  static async createTransporter() {
    const settings = await Settings.getSettings();

    // Use environment variables for SMTP configuration
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Validate email format
   * @param {string} email - Email address to validate
   * @returns {boolean} True if email is valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Categorize email errors for better user feedback
   * @param {Error} error - Email error object
   * @returns {string} Error category
   */
  static categorizeError(error) {
    if (error.code === 'EAUTH') return 'authentication';
    if (error.code === 'ECONNECTION') return 'connection';
    if (error.code === 'EENVELOPE') return 'envelope';
    return 'unknown';
  }

  /**
   * Render email template with invoice data (without payment section - handled separately)
   * @param {string} template - Template string with placeholders
   * @param {Object} invoice - Invoice data for template rendering
   * @returns {string} Rendered template
   */
  static renderTemplate(template, invoice) {
    if (!template) return '';

    return template
      .replace(/{businessName}/g, invoice.businessName || '')
      .replace(/{invoiceNumber}/g, invoice.invoiceNumber || '')
      .replace(/{clientName}/g, invoice.clientName || '')
      .replace(/{totalAmount}/g, `${invoice.currency || 'USD'} ${(invoice.total || 0).toFixed(2)}`)
      .replace(/{dueDate}/g, invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '');
  }

  /**
   * Convert plain text email to HTML with proper styling and payment section
   * @param {string} textMessage - Plain text message
   * @param {Object} invoice - Invoice data
   * @returns {string} HTML formatted email
   */
  static convertToHtmlEmail(textMessage, invoice) {
    // Convert plain text to HTML paragraphs
    const lines = textMessage.split('\n').filter(line => line.trim());
    const htmlLines = lines.map(line => {
      if (line.trim() === '') return '<br>';
      return `<p style="margin: 8px 0; color: #374151; line-height: 1.5; font-family: Arial, sans-serif;">${line}</p>`;
    });

    // Build proper email HTML structure
    let htmlBody = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Notification</title>
  <style type="text/css">
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #374151; background: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #2563eb; color: #ffffff; padding: 30px 40px; }
    .content { padding: 40px; }
    .footer { padding: 20px 40px; background: #f8fafc; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
    .button { background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; }
    .payment-section { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }
    @media only screen and (max-width: 600px) {
      .content { padding: 20px; }
      .header { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Invoice Notification</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">${invoice.businessName || 'QuickBill Desk'}</p>
    </div>
    
    <div class="content">
      ${htmlLines.join('')}
    `;

    // Add payment section if payment link exists
    if (invoice.paymentLink) {
      htmlBody += this.addPaymentSectionToEmail(invoice);
    }

    htmlBody += `
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 8px 0;">Thank you for your business!</p>
      <p style="margin: 0; font-size: 12px;">If you have any questions, please contact us.</p>
    </div>
  </div>
</body>
</html>
    `;

    return htmlBody;
  }

  /**
   * Enhanced payment section detection
   */
  static addPaymentSectionToEmail(invoice) {
    // No payment link? No payment section
    if (!invoice.paymentLink) {
      return '';
    }

    // Detect payment gateway and return appropriate section
    if (invoice.paymentLink.includes('stripe.com') || invoice.paymentLink.includes('checkout.stripe.com')) {
      return this.addStripePaymentSection(invoice);
    } else if (invoice.paymentLink.includes('paypal.com') || invoice.paymentLink.includes('paypal.me')) {
      return this.addPayPalPaymentSection(invoice);
    } else {
      return this.addGenericPaymentSection(invoice);
    }
  }

  /**
   * Professional Stripe payment section
   */
  static addStripePaymentSection(invoice) {
    return `
<div class="payment-section" style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
  <h3 style="color: #065f46; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Ready to Pay Your Invoice?</h3>
  <p style="color: #047857; margin: 0 0 20px 0; font-size: 14px;">
    Amount Due: <strong style="font-size: 16px;">${invoice.currency} ${invoice.total.toFixed(2)}</strong>
  </p>
  <a href="${invoice.paymentLink}" class="button" style="background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
    💳 Pay Invoice ${invoice.invoiceNumber}
  </a>
  <div style="margin-top: 16px;">
    <p style="color: #047857; margin: 0; font-size: 13px;">
      Secure payment processed by Stripe<br/>
      <span style="color: #059669; word-break: break-all; font-size: 12px;">${invoice.paymentLink}</span>
    </p>
  </div>
</div>
    `;
  }

  /**
   * PayPal payment section
   */
  static addPayPalPaymentSection(invoice) {
    return `
<div class="payment-section" style="background: #f0f9ff; border: 2px solid #bae6fd; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
  <h3 style="color: #075985; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Pay with PayPal</h3>
  <p style="color: #0369a1; margin: 0 0 20px 0; font-size: 14px;">
    Amount Due: <strong style="font-size: 16px;">${invoice.currency} ${invoice.total.toFixed(2)}</strong>
  </p>
  <a href="${invoice.paymentLink}" class="button" style="background: #0070ba; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
    🅿️ Pay with PayPal
  </a>
</div>
    `;
  }

  /**
   * Generic payment section for bank transfers, etc.
   */
  static addGenericPaymentSection(invoice) {
    return `
<div class="payment-section" style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
  <h3 style="color: #475569; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Payment Instructions</h3>
  <p style="color: #64748b; margin: 0 0 16px 0; font-size: 14px;">
    Amount Due: <strong>${invoice.currency} ${invoice.total.toFixed(2)}</strong>
  </p>
  <a href="${invoice.paymentLink}" style="color: #3b82f6; text-decoration: underline; font-size: 14px;">
    Click here to make payment
  </a>
</div>
    `;
  }

  /**
   * Send automatic payment confirmation
   */
  static async sendPaymentConfirmation(invoice) {
    try {
      if (!invoice.clientEmail) {
        console.log('⚠️ No client email for payment confirmation');
        return { success: false, error: 'No client email' };
      }

      const transporter = await this.createTransporter();
      await transporter.verify();

      const subject = `Payment Confirmation - Invoice ${invoice.invoiceNumber}`;
      
      const htmlBody = this.generatePaymentConfirmationTemplate(invoice);
      const textBody = this.generateTextPaymentConfirmation(invoice);

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: invoice.clientEmail,
        subject: subject,
        html: htmlBody,
        text: textBody
      };

      const result = await transporter.sendMail(mailOptions);

      console.log(`✅ Payment confirmation sent for invoice ${invoice.invoiceNumber}`);

      return {
        success: true,
        messageId: result.messageId,
        status: 'sent'
      };

    } catch (error) {
      console.error('❌ Payment confirmation email failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Payment confirmation email template
   */
  static generatePaymentConfirmationTemplate(invoice) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #10b981; color: #ffffff; padding: 30px 40px; }
    .content { padding: 40px; }
    .footer { padding: 20px 40px; background: #f8fafc; color: #6b7280; font-size: 14px; }
    .payment-details { background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Payment Confirmed</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">${invoice.businessName || 'QuickBill Desk'}</p>
    </div>
    
    <div class="content">
      <h2 style="color: #065f46; margin: 0 0 16px 0;">Thank You for Your Payment!</h2>
      
      <div class="payment-details">
        <h3 style="color: #065f46; margin: 0 0 12px 0;">Payment Details</h3>
        <p style="margin: 8px 0;"><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
        <p style="margin: 8px 0;"><strong>Amount Paid:</strong> ${invoice.currency} ${invoice.total.toFixed(2)}</p>
        <p style="margin: 8px 0;"><strong>Date Paid:</strong> ${new Date(invoice.paymentDate).toLocaleDateString()}</p>
        <p style="margin: 8px 0;"><strong>Payment Method:</strong> ${invoice.paymentMethod || 'Credit Card'}</p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        Your payment has been successfully processed. We appreciate your business!
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">If you have any questions about this payment, please contact us.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Text version of payment confirmation
   */
  static generateTextPaymentConfirmation(invoice) {
    return `
Payment Confirmation - Invoice ${invoice.invoiceNumber}

Thank you for your payment!

Payment Details:
- Invoice: ${invoice.invoiceNumber}
- Amount Paid: ${invoice.currency} ${invoice.total.toFixed(2)}
- Date Paid: ${new Date(invoice.paymentDate).toLocaleDateString()}
- Payment Method: ${invoice.paymentMethod || 'Credit Card'}

Your payment has been successfully processed. We appreciate your business!

If you have any questions about this payment, please contact us.
    `.trim();
  }

  /**
   * Strip HTML tags for plain text fallback
   * @param {string} html - HTML content
   * @returns {string} Plain text content
   */
  static stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Send bulk emails for multiple invoices
   * @param {Array} invoiceIds - Array of invoice IDs to email
   * @param {Object} emailOptions - Email configuration options
   * @returns {Promise<Object>} Bulk email results with statistics
   */
  static async sendBulkInvoiceEmails(invoiceIds, emailOptions = {}) {
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      failures: []
    };

    try {
      // Create transporter once for all emails
      const transporter = await this.createTransporter();
      await transporter.verify();

      const settings = await Settings.getSettings();

      for (const invoiceId of invoiceIds) {
        try {
          const invoice = await Invoice.findById(invoiceId);
          if (!invoice) {
            throw new Error('Invoice not found');
          }

          // Validate recipient email
          const recipientEmail = emailOptions.to || invoice.clientEmail;
          if (!this.isValidEmail(recipientEmail)) {
            throw new Error(`Invalid email address: ${recipientEmail}`);
          }

          // Render templates
          const subject = this.renderTemplate(
            emailOptions.subject || settings.emailSubject,
            invoice
          );

          let message = this.renderTemplate(
            emailOptions.message || settings.emailTemplate,
            invoice
          );

          const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || settings.emailFrom;

          // Prepare email data - consistent with single email method
          const mailOptions = {
            from: fromEmail,
            to: recipientEmail,
            subject: subject,
          };

          // Enhanced email with HTML support - SAME LOGIC AS SINGLE EMAIL
          if (emailOptions.html !== false) {
            // Convert plain text to HTML or enhance existing HTML
            const htmlMessage = this.convertToHtmlEmail(message, invoice);
            mailOptions.html = htmlMessage;
            // Also include plain text version for email clients that don't support HTML
            mailOptions.text = this.stripHtml(htmlMessage);
          } else {
            mailOptions.text = message;
          }

          // Add PDF attachment if requested
          if (emailOptions.includePDF !== false) {
            const pdfBuffer = await PDFGenerator.generateInvoicePDF(invoice);
            mailOptions.attachments = [{
              filename: `invoice-${invoice.invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }];
          }

          const result = await transporter.sendMail(mailOptions);

          // Track successful email
          await this.trackEmail(invoiceId, {
            recipient: recipientEmail,
            subject: subject,
            status: 'sent',
            messageId: result.messageId
          });

          results.succeeded++;

        } catch (error) {
          const errorType = this.categorizeError(error);

          // Track failed email
          await this.trackEmail(invoiceId, {
            recipient: emailOptions.to,
            subject: emailOptions.subject,
            status: 'failed',
            errorMessage: error.message
          });

          results.failures.push({
            invoiceId,
            error: error.message,
            errorType
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
   * Send single invoice email with payment section
   * @param {string} invoiceId - Invoice ID to email
   * @param {Object} emailOptions - Email configuration options
   * @returns {Promise<Object>} Email sending result
   */
  static async sendInvoiceEmail(invoiceId, emailOptions = {}) {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const settings = await Settings.getSettings();

      // Validate recipient email
      const recipientEmail = emailOptions.to || invoice.clientEmail;
      if (!this.isValidEmail(recipientEmail)) {
        throw new Error(`Invalid email address: ${recipientEmail}`);
      }

      // Create transporter and verify connection
      const transporter = await this.createTransporter();
      await transporter.verify();

      // Render templates
      const subject = this.renderTemplate(
        emailOptions.subject || settings.emailSubject,
        invoice
      );

      let message = this.renderTemplate(
        emailOptions.message || settings.emailTemplate,
        invoice
      );

      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || settings.emailFrom;

      // Prepare email data
      const mailOptions = {
        from: fromEmail,
        to: recipientEmail,
        subject: subject,
      };

      // Enhanced email with HTML support
      if (emailOptions.html !== false) {
        // Convert plain text to HTML or enhance existing HTML
        const htmlMessage = this.convertToHtmlEmail(message, invoice);
        mailOptions.html = htmlMessage;
        // Also include plain text version for email clients that don't support HTML
        mailOptions.text = this.stripHtml(htmlMessage);
      } else {
        mailOptions.text = message;
      }

      // Add PDF attachment if requested
      if (emailOptions.includePDF !== false) {
        const pdfBuffer = await PDFGenerator.generateInvoicePDF(invoice);
        mailOptions.attachments = [{
          filename: `invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }];
      }

      const result = await transporter.sendMail(mailOptions);

      // Track successful email
      await this.trackEmail(invoiceId, {
        recipient: recipientEmail,
        subject: subject,
        status: 'sent',
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId,
        status: 'sent'
      };

    } catch (error) {
      const errorType = this.categorizeError(error);

      // Track failed email
      if (invoiceId) {
        await this.trackEmail(invoiceId, {
          recipient: emailOptions.to,
          subject: emailOptions.subject,
          status: 'failed',
          errorMessage: error.message
        });
      }

      return {
        success: false,
        error: error.message,
        status: 'failed',
        errorType: errorType
      };
    }
  }

  /**
   * Track email in invoice history for audit purposes
   * @param {string} invoiceId - Invoice ID to update
   * @param {Object} emailData - Email tracking data
   * @returns {Promise<void>}
   */
  static async trackEmail(invoiceId, emailData) {
    try {
      const updateData = {
        $push: {
          emailHistory: {
            recipient: emailData.recipient,
            sentAt: new Date(),
            status: emailData.status,
            subject: emailData.subject,
            errorMessage: emailData.errorMessage,
            messageId: emailData.messageId
          }
        },
        lastSentAt: new Date()
      };

      await Invoice.findByIdAndUpdate(invoiceId, updateData);
    } catch (error) {
      // Log tracking errors but don't disrupt email flow
      console.warn('Email tracking failed:', error);
    }
  }
}

module.exports = EmailService;
