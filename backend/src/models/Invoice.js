/**
 * Invoice Model - MongoDB schema for invoice management with revision tracking
 * @module models/Invoice
 * @requires mongoose
 * @requires ./Client
 */

const mongoose = require('mongoose');

/**
 * Invoice item sub-schema
 * @typedef {Object} InvoiceItemSchema
 * @property {string} description - Item description (required)
 * @property {number} quantity - Item quantity (required, min: 1)
 * @property {number} price - Item unit price (required, min: 0)
 * @property {number} total - Calculated item total (auto-calculated)
 */
const invoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Item description is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Item quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: [true, 'Item price is required'],
    min: [0, 'Price cannot be negative']
  },
  total: {
    type: Number,
    default: 0,
    min: [0, 'Total cannot be negative']
  }
});

/**
 * Email history sub-schema
 * @typedef {Object} EmailHistorySchema
 * @property {string} recipient - Recipient email address (required)
 * @property {Date} sentAt - Email sent timestamp
 * @property {string} status - Email delivery status
 * @property {string} subject - Email subject line
 * @property {string} errorMessage - Error message if failed
 * @property {string} messageId - Email provider message ID
 */
const emailHistorySchema = new mongoose.Schema({
  recipient: {
    type: String,
    required: [true, 'Recipient email is required']
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed'],
    default: 'sent'
  },
  subject: String,
  errorMessage: String,
  messageId: String
});

/**
 * Revision history sub-schema for audit trail
 * @typedef {Object} RevisionHistorySchema
 * @property {Date} revisedAt - Revision timestamp
 * @property {string} revisedBy - User who made the revision
 * @property {Array} changes - Array of field changes
 * @property {string} notes - Revision notes
 * @property {number} version - Revision version number
 */
const revisionHistorySchema = new mongoose.Schema({
  revisedAt: {
    type: Date,
    default: Date.now
  },
  revisedBy: {
    type: String,
    default: 'system'
  },
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    description: String
  }],
  notes: {
    type: String,
    default: ''
  },
  version: {
    type: Number,
    default: 1
  }
});

/**
 * Main invoice schema with comprehensive tracking
 * @typedef {Object} InvoiceSchema
 * @property {string} invoiceNumber - Unique invoice identifier (required)
 * @property {ObjectId} clientId - Reference to Client model (required)
 * @property {string} clientName - Client name (required)
 * @property {string} clientEmail - Client email (required)
 * @property {string} clientAddress - Client address (required)
 * @property {string} businessName - Business name (required)
 * @property {string} businessEmail - Business email (required)
 * @property {string} businessAddress - Business address (required)
 * @property {string} businessLogo - Business logo URL
 * @property {Array} items - Array of invoice items
 * @property {number} subtotal - Calculated subtotal (auto-calculated)
 * @property {number} tax - Calculated tax amount (auto-calculated)
 * @property {number} taxRate - Tax rate percentage (required)
 * @property {number} discount - Discount amount
 * @property {number} total - Final total amount (auto-calculated)
 * @property {string} currency - Currency code
 * @property {string} status - Invoice status
 * @property {Date} date - Invoice date (required)
 * @property {Date} dueDate - Payment due date (required)
 * @property {string} notes - Additional notes
 * @property {Array} emailHistory - Email sending history
 * @property {Date} lastSentAt - Last email sent timestamp
 * @property {Array} revisionHistory - Revision audit trail
 * @property {Date} lastRevisedAt - Last revision timestamp
 * @property {string} revisedBy - Last revision author
 * @property {number} currentVersion - Current document version
 */
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
  clientName: {
    type: String,
    required: [true, 'Client name is required']
  },
  clientEmail: {
    type: String,
    required: [true, 'Client email is required']
  },
  clientAddress: {
    type: String,
    required: [true, 'Client address is required']
  },
  businessName: {
    type: String,
    required: [true, 'Business name is required']
  },
  businessEmail: {
    type: String,
    required: [true, 'Business email is required']
  },
  businessAddress: {
    type: String,
    required: [true, 'Business address is required']
  },
  businessLogo: {
    type: String,
    default: ''
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    default: 0,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    required: [true, 'Tax amount is required'],
    min: [0, 'Tax cannot be negative']
  },
  taxRate: {
    type: Number,
    default: 0,
    required: [true, 'Tax rate is required'],
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  total: {
    type: Number,
    default: 0,
    min: [0, 'Total cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  status: {
    type: String,
    enum: ['draft', 'unpaid', 'paid', 'overdue'],
    default: 'draft'
  },
  date: {
    type: Date,
    required: [true, 'Invoice date is required']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
		// Add to the main invoiceSchema, around line 120-130
		paymentLink: {
		  type: String,
		  default: '',
		  validate: {
		    validator: function(v) {
		      // Allow empty strings or valid URLs
		      return v === '' || /^https?:\/\/.+\..+/.test(v);
		    },
		    message: 'Please provide a valid payment URL'
		  }
		},
		// Add to the main invoiceSchema, around line 120-130 (after paymentLink)
		paymentStatus: {
		  type: String,
		  enum: ['pending', 'processing', 'paid', 'failed', 'refunded', 'manual'],
		  default: 'pending'
		},
		paymentMethod: {
		  type: String,
		  enum: ['stripe', 'paypal', 'bank_transfer', 'crypto', 'manual', ''],
		  default: ''
		},
		transactionId: {
		  type: String,
		  default: ''
		},
		paymentDate: {
		  type: Date
		},
		paymentGateway: {
		  type: String,
		  default: ''
		},
		paymentGatewayData: {
		  type: mongoose.Schema.Types.Mixed,
		  default: {}
		},
  notes: {
    type: String,
    default: ''
  },
  emailHistory: [emailHistorySchema],
  lastSentAt: Date,
  revisionHistory: [revisionHistorySchema],
  lastRevisedAt: Date,
  revisedBy: {
    type: String,
    default: 'system'
  },
  currentVersion: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
invoiceSchema.index({ clientId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ date: -1 });

/**
 * Pre-save middleware to auto-calculate totals
 * @param {Function} next - Mongoose next middleware function
 */
invoiceSchema.pre('save', function(next) {
  // Calculate items total
  this.items.forEach(item => {
    item.total = item.quantity * item.price;
  });
  
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  
  // Calculate tax and total
  this.tax = (this.subtotal * this.taxRate) / 100;
  this.total = this.subtotal + this.tax - this.discount;
  
  next();
});

/**
 * Track revision changes for audit trail
 * @param {Array} changes - Array of field changes
 * @param {string} notes - Revision notes
 * @param {string} revisedBy - User who made the revision
 * @returns {Object} Invoice document instance
 */
invoiceSchema.methods.trackRevision = function(changes, notes = '', revisedBy = 'system') {
  const newVersion = this.currentVersion + 1;
  
  this.revisionHistory.push({
    revisedAt: new Date(),
    revisedBy: revisedBy,
    changes: changes,
    notes: notes,
    version: newVersion
  });
  
  this.lastRevisedAt = new Date();
  this.revisedBy = revisedBy;
  this.currentVersion = newVersion;
  
  return this;
};

module.exports = mongoose.model('Invoice', invoiceSchema);
