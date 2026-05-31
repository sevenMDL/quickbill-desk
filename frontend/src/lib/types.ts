/**
 * Application settings configuration interface
 */

/**
 * Invoice status constants for type-safe status management
 */
export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  UNPAID: 'unpaid',
  PAID: 'paid',
  OVERDUE: 'overdue'
} as const;

export type InvoiceStatus = typeof INVOICE_STATUSES[keyof typeof INVOICE_STATUSES];

/**
 * Email status constants for type-safe email status management
 */
export const EMAIL_STATUSES = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed'
} as const;

export type EmailStatus = typeof EMAIL_STATUSES[keyof typeof EMAIL_STATUSES];

/**
 * System health status constants for type-safe health monitoring
 */
export const SYSTEM_HEALTH_STATUSES = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy'
} as const;

export type SystemHealthStatus = typeof SYSTEM_HEALTH_STATUSES[keyof typeof SYSTEM_HEALTH_STATUSES];

/**
 * Payment status constants for type-safe payment status management
 */
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  MANUAL: 'manual'
} as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[keyof typeof PAYMENT_STATUSES];

/**
 * Payment method constants for type-safe payment method management
 */
export const PAYMENT_METHODS = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer',
  CRYPTO: 'crypto',
  MANUAL: 'manual'
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

/**
 * Standardized API response wrapper for consistent API communication
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorType?: string;
}

/**
 * Paginated API response for list data with pagination metadata
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Standardized error response structure
 */
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
  timestamp?: string;
}

/**
 * Backup file information
 */
export interface Backup {
  filename: string;
  size: string;
  created: string;
  encrypted: boolean;
  stats: {
    invoices: number;
    clients: number;
    settings: number;
  };
}

export interface Settings {
  defaultCurrency: string;
  defaultTaxRate: number;
  invoicePrefix: string;
  autoNumbering: boolean;
  businessName: string;
  businessEmail: string;
  businessAddress: string;
  businessLogo?: string;
  paymentTerms?: string;
  defaultDueDays?: number;
  emailSubject?: string;
  emailTemplate?: string;
  emailFrom?: string;
  autoBackup?: boolean;
  backupEncryption?: boolean;
  retentionDays?: number;
  paymentGateway: string;
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  paypalClientId?: string;
  paymentInstructions: string;
  autoPaymentStatusCheck: boolean;
}

/**
 * Individual change record within a revision
 */
export interface RevisionChange {
  field: string;
  oldValue: any;
  newValue: any;
  description: string;
}

/**
 * Complete revision history entry
 */
export interface RevisionHistory {
  revisedAt: string;
  revisedBy: string;
  changes: RevisionChange[];
  notes: string;
  version: number;
}

/**
 * Invoice item within an invoice
 */
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

/**
 * Email history entry for sent communications
 */
export interface EmailHistory {
  recipient: string;
  sentAt: string;
  status: EmailStatus;
  subject: string;
  errorMessage?: string;
  messageId?: string;
}

/**
 * Complete invoice document with business data
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  businessName: string;
  businessEmail: string;
  businessAddress: string;
  businessLogo?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  date: string;
  dueDate: string;
  paymentLink?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  emailHistory?: EmailHistory[];
  lastSentAt?: string;
  revisionHistory?: RevisionHistory[];
  lastRevisedAt?: string;
  revisedBy?: string;
  currentVersion?: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  paymentDate?: string;
  paymentGateway?: string;
}

/**
 * Client/customer information
 */
export interface Client {
  _id: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  paymentPreferences?: {
    preferredMethod?: PaymentMethod;
    taxId?: string;
  };
}

/**
 * Email configuration options
 */
export interface EmailOptions {
  to?: string;
  subject?: string;
  message?: string;
  includePDF?: boolean;
  paymentLink?: string;
}

/**
 * Email operation response
 */
export interface EmailResponse extends ApiResponse<{
  messageId?: string;
  status: string;
  recipient: string;
}> {}

/**
 * Email history retrieval response
 */
export interface EmailHistoryResponse extends ApiResponse<{
  emailHistory: EmailHistory[];
  lastSentAt?: string;
}> {}

/**
 * Revision history retrieval response
 */
export interface RevisionHistoryResponse extends ApiResponse<{
  revisionHistory: RevisionHistory[];
  currentVersion: number;
  lastRevisedAt?: string;
  revisedBy?: string;
}> {}

/**
 * Backup operation response
 */
export interface BackupResponse extends ApiResponse<Backup> {}

/**
 * Backup list retrieval response
 */
export interface BackupListResponse extends ApiResponse<{
  backups: Backup[];
}> {}

/**
 * Authentication operation response
 */
export interface AuthResponse extends ApiResponse<{
  token: string;
  user: {
    username: string;
    role: string;
  };
}> {}

/**
 * Bulk operation request payload
 */
export interface BulkActionRequest {
  invoiceIds: string[];
  status?: InvoiceStatus;
  sendEmail?: boolean;
}

/**
 * Bulk operation response
 */
export interface BulkActionResponse extends ApiResponse<{
  processed: number;
  succeeded: number;
  failed: number;
  failures?: Array<{
    invoiceId: string;
    error: string;
  }>;
}> {}

/**
 * Bulk email request configuration
 */
export interface BulkEmailRequest {
  invoiceIds: string[];
  subject?: string;
  message?: string;
  includePDF?: boolean;
  paymentLink?: string;
}

/**
 * Bulk download operation response
 */
export interface BulkDownloadResponse extends ApiResponse<{
  downloadUrl: string;
  filename: string;
}> {}

/**
 * System health status information
 */
export interface SystemHealth {
  status: SystemHealthStatus;
  timestamp: string;
  database: {
    status: string;
    latency: string;
    type: string;
  };
  services: {
    email: string;
    pdf_generation: string;
    backup: string;
  };
  business_metrics: {
    total_invoices: number;
    total_clients: number;
    unpaid_amount: number;
  };
}

/**
 * Dashboard statistics and metrics
 */
export interface DashboardStats {
  totalInvoices: number;
  totalRevenue: number;
  unpaidCount: number;
  unpaidAmount: number;
  overdueCount: number;
  paidCount: number;
}

/**
 * Export format constants
 */
export const EXPORT_FORMATS = {
  PDF: 'pdf',
  CSV: 'csv',
  EXCEL: 'excel'
} as const;

export type ExportFormat = typeof EXPORT_FORMATS[keyof typeof EXPORT_FORMATS];

/**
 * Report types for different export scenarios
 */
export const REPORT_TYPES = {
  DASHBOARD_SUMMARY: 'dashboard_summary',
  INVOICE_LIST: 'invoice_list',
  CLIENT_LIST: 'client_list',
  INVOICE_DETAILS: 'invoice_details'
} as const;

export type ReportType = typeof REPORT_TYPES[keyof typeof REPORT_TYPES];

/**
 * Export request configuration
 */
export interface ExportRequest {
  reportType: ReportType;
  format: ExportFormat;
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: InvoiceStatus;
    clientId?: string;
  };
  options?: {
    includeCharts?: boolean;
    includeDetails?: boolean;
    paperSize?: 'A4' | 'LETTER';
  };
}

/**
 * Export response with download information
 */
export interface ExportResponse extends ApiResponse<{
  downloadUrl: string;
  filename: string;
  expiresAt: string;
  fileSize: number;
}> {}

/**
 * Basic report data structures for CSV exports
 */
export interface InvoiceExportData {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  date: string;
  dueDate: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  daysOverdue?: number;
}

export interface ClientExportData {
  name: string;
  email: string;
  phone: string;
  address: string;
  totalInvoices: number;
  totalRevenue: number;
  unpaidAmount: number;
}

export interface DashboardExportData {
  period: string;
  totalInvoices: number;
  totalRevenue: number;
  unpaidCount: number;
  unpaidAmount: number;
  paidCount: number;
  overdueCount: number;
  averageInvoice: number;
}

export interface PaymentIntent {
  id: string;
  client_secret?: string;
  status: string;
  amount: number;
  currency: string;
  invoice_id: string;
}

export interface PaymentMethodOption {
  id: string;
  name: string;
  description: string;
  requiresRedirect: boolean;
}

export interface PaymentGatewayConfig {
  stripePublishableKey?: string;
  paypalClientId?: string;
  defaultGateway: string;
  paymentInstructions: string;
  autoPaymentStatusCheck: boolean;
}

export interface PaymentMethodsResponse extends ApiResponse<{
  methods: PaymentMethodOption[];
}> {}

export interface PaymentIntentResponse extends ApiResponse<PaymentIntent> {}

export interface PaymentStatusResponse extends ApiResponse<{
  paymentStatus: PaymentStatus;
  transactionId?: string;
  paymentMethod?: PaymentMethod;
}> {}
