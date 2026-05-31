/**
 * Settings Model - Application configuration and preferences
 * @module models/Settings
 * @requires mongoose
 */

const mongoose = require('mongoose');

/**
 * Settings schema definition for application configuration
 * @typedef {Object} SettingsSchema
 * @property {string} defaultCurrency - Default currency code
 * @property {number} defaultTaxRate - Default tax rate percentage
 * @property {string} invoicePrefix - Prefix for invoice numbering
 * @property {boolean} autoNumbering - Enable automatic invoice numbering
 * @property {string} businessName - Registered business name
 * @property {string} businessEmail - Business contact email
 * @property {string} businessAddress - Business physical address
 * @property {string} businessLogo - URL or base64 encoded logo
 * @property {string} paymentTerms - Default payment terms description
 * @property {number} defaultDueDays - Default due days for invoices
 * @property {string} emailSubject - Email subject template
 * @property {string} emailTemplate - Email body template
 * @property {string} emailFrom - Default sender email address
 * @property {boolean} autoBackup - Enable automatic backups
 * @property {boolean} backupEncryption - Enable backup encryption
 * @property {number} retentionDays - Backup retention period in days
 * @property {string} backupSchedule - Cron schedule for automatic backups
 */
const settingsSchema = new mongoose.Schema({
  defaultCurrency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  defaultTaxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  invoicePrefix: {
    type: String,
    default: 'INV'
  },
  autoNumbering: {
    type: Boolean,
    default: true
  },
  businessName: {
    type: String,
    default: ''
  },
  businessEmail: {
    type: String,
    default: ''
  },
  businessAddress: {
    type: String,
    default: ''
  },
  businessLogo: {
    type: String,
    default: ''
  },
  paymentTerms: {
    type: String,
    default: 'Payment is due within 30 days. Late payments may incur additional charges.'
  },
  defaultDueDays: {
    type: Number,
    default: 30,
    min: 1
  },
  emailSubject: {
    type: String,
    default: 'Invoice {invoiceNumber} from {businessName}'
  },
  emailTemplate: {
    type: String,
    default: `Dear {clientName},\n\nPlease find your invoice {invoiceNumber} for {totalAmount} attached.\n\nDue date: {dueDate}\n\nThank you for your business!\n\n{businessName}`
  },
  emailFrom: {
    type: String,
    default: ''
  },
		// Add to settingsSchema, around line 40-50
		paymentGateway: {
		  type: String,
		  enum: ['stripe', 'paypal', 'bank_transfer', 'crypto', 'manual'],
		  default: 'manual'
		},
		stripeSecretKey: {
		  type: String,
		  default: ''
		},
		stripePublishableKey: {
		  type: String,
		  default: ''
		},
		paypalClientId: {
		  type: String,
		  default: ''
		},
		paymentInstructions: {
		  type: String,
		  default: 'Please use the payment link above to complete your payment.'
		},
		autoPaymentStatusCheck: {
		  type: Boolean,
		  default: true
		},
  autoBackup: {
    type: Boolean,
    default: false
  },
  backupEncryption: {
    type: Boolean,
    default: false
  },
  retentionDays: {
    type: Number,
    default: 30,
    min: 1,
    max: 365
  },
  backupSchedule: {
    type: String,
    default: '0 2 * * *', // Daily at 2 AM
    validate: {
      validator: function(v) {
        try {
          require('cron-parser').parseExpression(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid cron schedule format'
    }
  }
}, {
  timestamps: true
});

/**
 * Get or create settings document (singleton pattern)
 * @returns {Promise<Object>} Settings document
 */
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
