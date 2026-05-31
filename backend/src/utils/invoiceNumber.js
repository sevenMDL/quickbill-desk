/**
 * Invoice Number Generator - Automatic invoice numbering system
 * @module utils/invoiceNumber
 * @requires ../models/Settings
 * @requires ../models/Invoice
 */

const Settings = require('../models/Settings');
const Invoice = require('../models/Invoice');

/**
 * Generate unique invoice number based on settings
 * @returns {Promise<string>} Generated invoice number
 */
const generateInvoiceNumber = async () => {
  const settings = await Settings.getSettings();
  
  if (!settings.autoNumbering) {
    return `${settings.invoicePrefix}-${Date.now()}`;
  }

  // Find the highest invoice number with the current prefix
  const lastInvoice = await Invoice.findOne({
    invoiceNumber: new RegExp(`^${settings.invoicePrefix}-\\d+$`)
  }).sort({ invoiceNumber: -1 });

  let nextNumber = 1;
  
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
    nextNumber = lastNumber + 1;
  }

  return `${settings.invoicePrefix}-${nextNumber.toString().padStart(4, '0')}`;
};

module.exports = { generateInvoiceNumber };
