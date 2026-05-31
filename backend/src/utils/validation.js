/**
 * Input Validation & Sanitization - Joi schemas with XSS protection
 * @module utils/validation
 * @requires joi
 */

const Joi = require('joi');

/**
 * XSS protection sanitization function
 * @param {string} value - Input value to sanitize
 * @returns {string} Sanitized value
 */
const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  
  // Remove common XSS vectors
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/g, '/')
    .trim();
};

// Custom sanitization extension
const sanitizeExtension = (joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.sanitized': '{{#label}} contained potentially unsafe content that was removed'
  },
  rules: {
    sanitize: {
      method() {
        return this.$_addRule('sanitize');
      },
      validate(value, helpers) {
        const sanitized = sanitizeInput(value);
        if (sanitized !== value) {
          helpers.warn('string.sanitized');
        }
        return sanitized;
      }
    }
  }
});

const extendedJoi = Joi.extend(sanitizeExtension);

/**
 * Client validation schemas
 */
const clientValidation = {
  create: extendedJoi.object({
    name: extendedJoi.string().required().trim().min(1).max(255).sanitize(),
    email: extendedJoi.string().required().email().trim().lowercase().sanitize(),
    address: extendedJoi.string().required().trim().min(1).sanitize(),
    phone: extendedJoi.string().optional().allow('').trim().sanitize()
  }),
  
  update: extendedJoi.object({
    name: extendedJoi.string().trim().min(1).max(255).sanitize(),
    email: extendedJoi.string().email().trim().lowercase().sanitize(),
    address: extendedJoi.string().trim().min(1).sanitize(),
    phone: extendedJoi.string().optional().allow('').trim().sanitize()
  })
};

/**
 * Invoice validation schemas
 */
const invoiceValidation = {
		create: extendedJoi.object({
		  clientId: extendedJoi.string().required(),
		  clientName: extendedJoi.string().required().trim().sanitize(),
		  clientEmail: extendedJoi.string().required().email().trim().sanitize(),
		  clientAddress: extendedJoi.string().required().trim().sanitize(),
		  businessName: extendedJoi.string().required().trim().sanitize(),
		  businessEmail: extendedJoi.string().required().email().trim().sanitize(),
		  businessAddress: extendedJoi.string().required().trim().sanitize(),
		  businessLogo: extendedJoi.string().optional().allow('').sanitize(),
		  items: extendedJoi.array().items(
		    extendedJoi.object({
		      description: extendedJoi.string().required().trim().sanitize(),
		      quantity: extendedJoi.number().required().min(1),
		      price: extendedJoi.number().required().min(0),
		      total: extendedJoi.number().optional().min(0).default(0),
		      id: extendedJoi.string().optional()
		    })
		  ).min(1).required(),
		  taxRate: extendedJoi.number().required().min(0).max(100),
		  discount: extendedJoi.number().optional().min(0).default(0),
		  currency: extendedJoi.string().default('USD'),
		  status: extendedJoi.string().valid('draft', 'unpaid', 'paid', 'overdue').default('draft'),
		  date: extendedJoi.date().required(),
		  dueDate: extendedJoi.date().required(),
		  notes: extendedJoi.string().optional().allow('').sanitize(),
		  subtotal: extendedJoi.number().optional().min(0).default(0),
		  tax: extendedJoi.number().optional().min(0).default(0),
		  total: extendedJoi.number().optional().min(0).default(0),
		  invoiceNumber: extendedJoi.string().optional().sanitize(),
		  paymentLink: extendedJoi.string().uri().allow('').optional().sanitize(),
		  // ADD THESE PAYMENT FIELDS:
		  paymentStatus: extendedJoi.string().valid('pending', 'processing', 'paid', 'failed', 'refunded', 'manual').optional().default('pending'),
		  paymentMethod: extendedJoi.string().valid('stripe', 'paypal', 'bank_transfer', 'crypto', 'manual', '').optional().default(''),
		  transactionId: extendedJoi.string().optional().allow('').sanitize(),
		  paymentGateway: extendedJoi.string().valid('stripe', 'paypal', 'bank_transfer', 'crypto', 'manual', '').optional().default(''),
		  createdAt: extendedJoi.date().optional(),
		  updatedAt: extendedJoi.date().optional()
		}),

		update: extendedJoi.object({
		  clientId: extendedJoi.string().optional(),
		  clientName: extendedJoi.string().trim().sanitize(),
		  clientEmail: extendedJoi.string().email().trim().sanitize(),
		  clientAddress: extendedJoi.string().trim().sanitize(),
		  businessName: extendedJoi.string().trim().sanitize(),
		  businessEmail: extendedJoi.string().email().trim().sanitize(),
		  businessAddress: extendedJoi.string().trim().sanitize(),
		  businessLogo: extendedJoi.string().uri().optional().allow('').sanitize(),
		  items: extendedJoi.array().items(
		    extendedJoi.object({
		      description: extendedJoi.string().required().trim().sanitize(),
		      quantity: extendedJoi.number().required().min(1),
		      price: extendedJoi.number().required().min(0),
		      total: extendedJoi.number().optional().min(0).default(0),
		      id: extendedJoi.string().optional()
		    })
		  ).min(1),
		  taxRate: extendedJoi.number().min(0).max(100),
		  discount: extendedJoi.number().optional().min(0).default(0),
		  currency: extendedJoi.string().default('USD'),
		  status: extendedJoi.string().valid('draft', 'unpaid', 'paid', 'overdue'),
		  date: extendedJoi.date(),
		  dueDate: extendedJoi.date(),
		  notes: extendedJoi.string().optional().allow('').sanitize(),
		  subtotal: extendedJoi.number().optional().min(0).default(0),
		  tax: extendedJoi.number().optional().min(0).default(0),
		  total: extendedJoi.number().optional().min(0).default(0),
		  invoiceNumber: extendedJoi.string().optional().sanitize(),
		  paymentLink: extendedJoi.string().uri().allow('').optional().sanitize(),
		  // ADD THESE PAYMENT FIELDS:
		  paymentStatus: extendedJoi.string().valid('pending', 'processing', 'paid', 'failed', 'refunded', 'manual').optional(),
		  paymentMethod: extendedJoi.string().valid('stripe', 'paypal', 'bank_transfer', 'crypto', 'manual', '').optional(),
		  transactionId: extendedJoi.string().optional().allow('').sanitize(),
		  paymentGateway: extendedJoi.string().valid('stripe', 'paypal', 'bank_transfer', 'crypto', 'manual', '').optional()
		}),

  email: extendedJoi.object({
    to: extendedJoi.string().email().trim().lowercase().optional().sanitize(),
    subject: extendedJoi.string().trim().max(200).sanitize(),
    message: extendedJoi.string().trim().max(5000).sanitize(),
    includePDF: extendedJoi.boolean().default(true),
    paymentLink: extendedJoi.string().uri().allow('').optional().sanitize() // ← ADD THIS LINE (optional for email overrides)
  })
};

/**
 * Settings validation schemas
 */
const settingsValidation = {
  update: extendedJoi.object({
    defaultCurrency: extendedJoi.string().default('USD'),
    defaultTaxRate: extendedJoi.number().min(0).max(100).default(0),
    invoicePrefix: extendedJoi.string().trim().default('INV').sanitize(),
    autoNumbering: extendedJoi.boolean().default(true),
    businessName: extendedJoi.string().trim().default('').sanitize(),
    businessEmail: extendedJoi.string().email().trim().default('').sanitize(),
    businessAddress: extendedJoi.string().trim().default('').sanitize(),
    businessLogo: extendedJoi.string().uri().optional().allow('').sanitize(),
    paymentTerms: extendedJoi.string().trim().default('').sanitize(),
    defaultDueDays: extendedJoi.number().min(1).default(30),
    emailSubject: extendedJoi.string().trim().max(200).default('Invoice {invoiceNumber} from {businessName}').sanitize(),
    emailTemplate: extendedJoi.string().trim().max(5000).default(`Dear {clientName},\n\nPlease find your invoice {invoiceNumber} for {totalAmount} attached.\n\nDue date: {dueDate}\n\nThank you for your business!\n\n{businessName}`).sanitize(),
    emailFrom: extendedJoi.string().email().trim().default('').sanitize(),
    autoBackup: extendedJoi.boolean().default(false),
    backupEncryption: extendedJoi.boolean().default(false),
    retentionDays: extendedJoi.number().min(1).max(365).default(30),
    // ADD THESE PAYMENT SETTINGS FIELDS:
    paymentGateway: extendedJoi.string().valid('stripe', 'paypal', 'bank_transfer', 'crypto', 'manual').optional().default('manual'),
    stripeSecretKey: extendedJoi.string().optional().allow('').sanitize(),
    stripePublishableKey: extendedJoi.string().optional().allow('').sanitize(),
    paypalClientId: extendedJoi.string().optional().allow('').sanitize(),
    paymentInstructions: extendedJoi.string().optional().allow('').sanitize(),
    autoPaymentStatusCheck: extendedJoi.boolean().optional().default(true)
  })
};

/**
 * Bulk operations validation schemas
 */
const bulkValidation = {
  invoiceIds: extendedJoi.object({
    invoiceIds: extendedJoi.array().items(extendedJoi.string().hex().length(24)).min(1).required()
      .messages({
        'array.min': 'At least one invoice ID is required',
        'string.hex': 'Invoice ID must be a valid MongoDB ID',
        'string.length': 'Invoice ID must be 24 characters long'
      })
  }),

  bulkStatus: extendedJoi.object({
    invoiceIds: extendedJoi.array().items(extendedJoi.string().hex().length(24)).min(1).required(),
    status: extendedJoi.string().valid('draft', 'unpaid', 'paid', 'overdue').required()
  }),

  bulkEmail: extendedJoi.object({
    invoiceIds: extendedJoi.array().items(extendedJoi.string().hex().length(24)).min(1).required(),
    subject: extendedJoi.string().max(200).optional().sanitize(),
    message: extendedJoi.string().max(5000).optional().sanitize(),
    includePDF: extendedJoi.boolean().default(true), // ← ADD THIS LINE
    paymentLink: extendedJoi.string().uri().allow('').optional().sanitize() // ← Also add paymentLink for consistency
  })
};

module.exports = {
  clientValidation,
  invoiceValidation,
  settingsValidation,
  bulkValidation
};
