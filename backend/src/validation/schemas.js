const Joi = require('joi');

/**
 * Validation Schemas for API Request Validation
 * Defines Joi schemas for all incoming request data validation
 */

/**
 * Authentication request schemas
 */
const authSchemas = {
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),

  validateToken: Joi.object({})
};

/**
 * Client management schemas
 */
const clientSchemas = {
  getClients: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().optional()
  }),

  createClient: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    address: Joi.string().required(),
    phone: Joi.string().optional().allow('')
  }),

  updateClient: Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    address: Joi.string().optional(),
    phone: Joi.string().optional().allow('')
  }),

  getClient: Joi.object({}),
  deleteClient: Joi.object({})
};

/**
 * Invoice management schemas
 */
const invoiceSchemas = {
  getInvoices: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().optional(),
    clientId: Joi.string().optional()
  }),

		createInvoice: Joi.object({
		  clientId: Joi.string().required(),
		  invoiceNumber: Joi.string().optional(),
		  items: Joi.array().items(
		    Joi.object({
		      description: Joi.string().required(),
		      quantity: Joi.number().min(1).required(),
		      price: Joi.number().min(0).required()
		    })
		  ).min(1).required(),
		  date: Joi.date().required(),
		  dueDate: Joi.date().required(),
		  clientName: Joi.string().required(),
		  clientEmail: Joi.string().email().required(),
		  clientAddress: Joi.string().required(),
		  businessName: Joi.string().required(),
		  businessEmail: Joi.string().email().required(),
		  businessAddress: Joi.string().required(),
		  businessLogo: Joi.string().optional().allow(''),
		  currency: Joi.string().optional().default('USD'),
		  taxRate: Joi.number().min(0).max(100).optional().default(0),
		  discount: Joi.number().min(0).optional().default(0),
		  status: Joi.string().valid('draft', 'unpaid', 'paid', 'overdue').optional().default('draft'),
		  paymentLink: Joi.string().uri().allow('').optional(),
		  // ADD THESE PAYMENT FIELDS:
		  paymentStatus: Joi.string().valid('pending', 'processing', 'paid', 'failed', 'refunded', 'manual').optional().default('pending'),
		  paymentMethod: Joi.string().valid('stripe', 'paypal', 'bank_transfer', 'crypto', 'manual', '').optional().default(''),
		  transactionId: Joi.string().optional().allow(''),
		  paymentGateway: Joi.string().valid('stripe', 'paypal', 'bank_transfer', 'crypto', 'manual', '').optional().default(''), // ← ADD THIS LINE
		  notes: Joi.string().optional().allow('')
		}),


		// In invoiceSchemas - ADD THIS:
		updateInvoice: Joi.object({
		  clientId: Joi.string().optional(),
		  invoiceNumber: Joi.string().optional(),
		  items: Joi.array().items(
		    Joi.object({
		      description: Joi.string().required(),
		      quantity: Joi.number().min(1).required(),
		      price: Joi.number().min(0).required()
		    })
		  ).min(1).optional(),
		  date: Joi.date().optional(),
		  dueDate: Joi.date().optional(),
		  clientName: Joi.string().optional(),
		  clientEmail: Joi.string().email().optional(),
		  clientAddress: Joi.string().optional(),
		  businessName: Joi.string().optional(),
		  businessEmail: Joi.string().email().optional(),
		  businessAddress: Joi.string().optional(),
		  businessLogo: Joi.string().optional().allow(''),
		  currency: Joi.string().optional(),
		  taxRate: Joi.number().min(0).max(100).optional(),
		  discount: Joi.number().min(0).optional(),
		  status: Joi.string().valid('draft', 'unpaid', 'paid', 'overdue').optional(),
		  paymentLink: Joi.string().uri().allow('').optional(),
		  paymentStatus: Joi.string().valid('pending', 'processing', 'paid', 'failed', 'refunded', 'manual').optional(),
		  paymentMethod: Joi.string().valid('stripe', 'paypal', 'bank_transfer', 'crypto', 'manual', '').optional(),
		  transactionId: Joi.string().optional().allow(''),
		  paymentGateway: Joi.string().valid('stripe', 'paypal', 'bank_transfer', 'crypto', 'manual', '').optional(),
		  notes: Joi.string().optional().allow('')
		}),

  getInvoice: Joi.object({}),
  deleteInvoice: Joi.object({}),
  updateInvoiceStatus: Joi.object({
    status: Joi.string().valid('draft', 'unpaid', 'paid', 'overdue').required()
  }),
  duplicateInvoice: Joi.object({}),
  getInvoiceStats: Joi.object({}),

  generatePDF: Joi.object({
    invoice: Joi.object({
      invoiceNumber: Joi.string().required(),
      clientName: Joi.string().required(),
      clientEmail: Joi.string().email().required(),
      clientAddress: Joi.string().required(),
      businessName: Joi.string().required(),
      businessEmail: Joi.string().email().required(),
      businessAddress: Joi.string().required(),
      date: Joi.date().required(),
      dueDate: Joi.date().required(),
      status: Joi.string().valid('draft', 'unpaid', 'paid', 'overdue').required(),
      items: Joi.array().items(
        Joi.object({
          description: Joi.string().required(),
          quantity: Joi.number().min(1).required(),
          price: Joi.number().min(0).required(),
          total: Joi.number().min(0).optional()
        })
      ).min(1).required(),
      currency: Joi.string().optional().default('USD'),
      taxRate: Joi.number().min(0).max(100).optional().default(0),
      discount: Joi.number().min(0).optional().default(0),
      notes: Joi.string().optional().allow(''),
      businessLogo: Joi.string().optional().allow(''),
      subtotal: Joi.number().min(0).optional(),
      tax: Joi.number().min(0).optional(),
      total: Joi.number().min(0).optional(),
      id: Joi.string().optional(),
      createdAt: Joi.date().optional(),
      updatedAt: Joi.date().optional(),
      paymentLink: Joi.string().uri().allow('').optional()
    }).required()
  }),

  getInvoiceRevisions: Joi.object({})
};

/**
 * Email operation schemas
 */
const emailSchemas = {
  sendInvoiceEmail: Joi.object({
    to: Joi.string().email().optional(),
    subject: Joi.string().optional(),
    includePDF: Joi.boolean().default(true),
    message: Joi.string().optional(),
    cc: Joi.string().email().optional(),
    bcc: Joi.string().email().optional(),
    paymentLink: Joi.string().uri().allow('').optional() // ← ADDED THIS LINE
  }),
  quickSendInvoice: Joi.object({}).optional(),
  getEmailHistory: Joi.object({})
};

/**
 * Bulk operation schemas
 */
const bulkSchemas = {
  bulkUpdateStatus: Joi.object({
    invoiceIds: Joi.array().items(Joi.string()).min(1).max(100).required(),
    status: Joi.string().valid('draft', 'unpaid', 'paid', 'overdue').required()
  }),
  bulkDeleteInvoices: Joi.object({
    invoiceIds: Joi.array().items(Joi.string()).min(1).max(100).required()
  }),
		bulkSendEmails: Joi.object({
		  invoiceIds: Joi.array().items(Joi.string()).min(1).max(50).required(),
		  templateId: Joi.string().optional(),
		  includePDF: Joi.boolean().default(true), // ← ADD THIS LINE
		  paymentLink: Joi.string().uri().allow('').optional() // ← Also add for consistency
		}),
  bulkDownloadPDFs: Joi.object({
    invoiceIds: Joi.array().items(Joi.string()).min(1).max(50).required()
  }),
  validateBulkOperation: Joi.object({
    invoiceIds: Joi.array().items(Joi.string()).min(1).max(100).required(),
    operation: Joi.string().required()
  })
};


/**
 * Application settings schemas
 */
const settingsSchemas = {
  getSettings: Joi.object({}),
  updateSettings: Joi.object({  // ← MOVE IT HERE!
    businessName: Joi.string().optional().allow(''),
    businessEmail: Joi.string().email().optional().allow(''),
    businessAddress: Joi.string().optional().allow(''),
    businessLogo: Joi.string().optional().allow(''),
    defaultCurrency: Joi.string().optional().uppercase(),
    defaultTaxRate: Joi.number().min(0).max(100).optional(),
    invoicePrefix: Joi.string().optional(),
    autoNumbering: Joi.boolean().optional(),
    paymentTerms: Joi.string().optional().allow(''),
    defaultDueDays: Joi.number().min(1).optional(),
    emailSubject: Joi.string().optional().allow(''),
    emailTemplate: Joi.string().optional().allow(''),
    emailFrom: Joi.string().email().optional().allow(''),
    autoBackup: Joi.boolean().optional(),
    backupEncryption: Joi.boolean().optional(),
    retentionDays: Joi.number().min(1).max(365).optional(),
    // ADD PAYMENT SETTINGS:
    paymentGateway: Joi.string().valid('stripe', 'paypal', 'bank_transfer', 'crypto', 'manual').optional(),
    stripeSecretKey: Joi.string().optional().allow(''),
    stripePublishableKey: Joi.string().optional().allow(''),
    paypalClientId: Joi.string().optional().allow(''),
    paymentInstructions: Joi.string().optional().allow(''),
    autoPaymentStatusCheck: Joi.boolean().optional()
  })
};

/**
 * System health check schemas
 */
const healthSchemas = {
  getHealth: Joi.object({
    detailed: Joi.boolean().optional(),
    checks: Joi.array().items(Joi.string()).optional()
  }),
  refreshHealthData: Joi.object({
    force: Joi.boolean().optional()
  }),
  getDetailedHealth: Joi.object({
    include: Joi.array().items(Joi.string().valid('process', 'environment', 'system', 'all')).optional(),
    format: Joi.string().valid('json', 'minimal').optional()
  })
};

module.exports = {
  authSchemas,
  clientSchemas,
  invoiceSchemas,
  emailSchemas,
  bulkSchemas,
  settingsSchemas,
  healthSchemas
};
