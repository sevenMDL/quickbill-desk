import { 
  Invoice, 
  Client, 
  DashboardStats, 
  Settings, 
  EmailHistory, 
  EmailOptions, 
  EmailResponse, 
  EmailHistoryResponse, 
  RevisionHistoryResponse, 
  AuthResponse, 
  SystemHealth, 
  BackupResponse, 
  BackupListResponse,
  BulkEmailRequest,
  BulkActionResponse,
  BulkDownloadResponse,
  RevisionHistory,
  Backup,
  InvoiceStatus,
  // ADD THESE PAYMENT TYPES:
  PaymentStatus,
  PaymentMethod,
  PaymentIntent,
  PaymentMethodOption,
  PaymentMethodsResponse,
  PaymentIntentResponse,
  PaymentStatusResponse
} from "./types";
import { mockInvoices, mockClients, mockStats } from "./mockData";
import { 
  processError, 
  logError, 
  handleError as handleAppError,
  isRetryableError 
} from './errorMessages';

// ==================== API CONFIGURATION ====================
/**
 * API service configuration with hardcoded values for reliability
 *
 * Uses direct URLs for consistent behavior across all environments
 * No environment variables required for basic functionality
 */

// Backend API base URL - update this when deploying to different environments
const API_BASE_URL = "http://localhost:3001/api";

// Mock data mode - set to true for testing without backend
const USE_MOCK_DATA = false;

// Debug mode - set to false to disable development logs
const DEBUG = true;

// Current environment - change to "production" when deploying
const ENVIRONMENT = "development";

/**
 * API logging utility
 * Provides consistent logging format for all API operations
 */
const apiLogger = {
  log: (...args: any[]): void => {
    if (DEBUG) {
      console.log(`[API:${ENVIRONMENT}]`, ...args);
    }
  },
  error: (...args: any[]): void => {
    console.error(`[API:${ENVIRONMENT}]`, ...args);
  }
};

// ==================== ERROR HANDLING ====================
/**
 * Unified API error handler - uses centralized error processing
 */
const handleApiError = (error: any, context?: string): never => {
  const errorInfo = processError(error);
  logError(errorInfo, context || 'API');
  
  // Create enhanced error with original context preserved
  const enhancedError = new Error(errorInfo.userMessage);
  (enhancedError as any).originalError = errorInfo.originalError;
  (enhancedError as any).category = errorInfo.category;
  
  throw enhancedError;
};

// ==================== DATA TRANSFORMATION UTILITIES ====================
/**
 * Normalizes database IDs for frontend compatibility with proper typing
 * @param {T} data - Data object to normalize
 * @returns {T} Data with normalized ID fields
 */
const normalizeIds = <T>(data: T): T => {
  if (Array.isArray(data)) {
    return data.map(item => normalizeIds(item)) as T;
  } else if (data && typeof data === 'object' && data !== null) {
    const normalized = { ...data } as any;

    if (normalized._id && !normalized.id) {
      normalized.id = normalized._id;
    }

    if (normalized.id && !normalized._id) {
      normalized._id = normalized.id;
    }

    Object.keys(normalized).forEach(key => {
      if (key !== '_id' && key !== 'id') {
        normalized[key] = normalizeIds(normalized[key]);
      }
    });

    return normalized as T;
  }
  return data;
};

/**
 * Cleaned invoice data for PDF generation with incompatible fields removed
 */
interface CleanPDFData extends Omit<Invoice,
  '_id' | 'id' | '__v' | 'createdAt' | 'updatedAt' | 
  'clientId' | 'revisedBy' | 'currentVersion' | 
  'emailHistory' | 'revisionHistory' | 'lastRevisedAt' | 'lastSentAt'
> {}

/**
 * Cleaned invoice data for operations with clientId preserved
 */
interface CleanInvoiceData extends Omit<Invoice, 
  '_id' | 'id' | '__v' | 'createdAt' | 'updatedAt' | 
  'revisedBy' | 'currentVersion' | 'emailHistory' | 
  'revisionHistory' | 'lastRevisedAt' | 'lastSentAt'
> {
  clientId: string;
}

/**
 * Cleans data for PDF generation by removing incompatible fields
 * @param {Invoice} data - Invoice data to clean
 * @returns {CleanPDFData} Cleaned data suitable for PDF generation
 */
const cleanDataForPDF = (data: Invoice): CleanPDFData => {
  if (Array.isArray(data)) {
    return data.map(item => cleanDataForPDF(item as any)) as any;
  } else if (data && typeof data === 'object') {
    const cleaned = { ...data } as any;

    delete cleaned._id;
    delete cleaned.id;
    delete cleaned.__v;
    delete cleaned.createdAt;
    delete cleaned.updatedAt;
    delete cleaned.clientId;
    delete cleaned.revisedBy;
    delete cleaned.currentVersion;
    delete cleaned.emailHistory;
    delete cleaned.revisionHistory;
    delete cleaned.lastRevisedAt;
    delete cleaned.lastSentAt;

    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] && typeof cleaned[key] === 'object') {
        cleaned[key] = cleanDataForPDF(cleaned[key] as any);
      }
    });

    return cleaned as CleanPDFData;
  }
  return data as CleanPDFData;
};

/**
 * Cleans data for invoice operations while preserving clientId
 * @param {Partial<Invoice>} data - Invoice data to clean
 * @returns {CleanInvoiceData} Cleaned data suitable for invoice operations
 */
const cleanDataForInvoice = (data: Partial<Invoice>): CleanInvoiceData => {
  if (Array.isArray(data)) {
    return data.map(item => cleanDataForInvoice(item as any)) as any;
  } else if (data && typeof data === 'object') {
    const cleaned = { ...data } as any;

    delete cleaned._id;
    delete cleaned.id;
    delete cleaned.__v;
    delete cleaned.createdAt;
    delete cleaned.updatedAt;
    delete cleaned.revisedBy;
    delete cleaned.currentVersion;
    delete cleaned.emailHistory;
    delete cleaned.revisionHistory;
    delete cleaned.lastRevisedAt;
    delete cleaned.lastSentAt;

    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] && typeof cleaned[key] === 'object') {
        cleaned[key] = cleanDataForInvoice(cleaned[key] as any);
      }
    });

    return cleaned as CleanInvoiceData;
  }
  return data as CleanInvoiceData;
};

/**
 * General data cleaning for API operations
 * @param {any} data - Data object to clean
 * @returns {any} Cleaned data with MongoDB-specific fields removed
 */
const cleanDataForGeneral = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(item => cleanDataForGeneral(item));
  } else if (data && typeof data === 'object') {
    const cleaned = { ...data };

    delete cleaned._id;
    delete cleaned.id;
    delete cleaned.__v;
    delete cleaned.createdAt;
    delete cleaned.updatedAt;

    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] && typeof cleaned[key] === 'object') {
        cleaned[key] = cleanDataForGeneral(cleaned[key]);
      }
    });

    return cleaned;
  }
  return data;
};

// ==================== AUTHENTICATION UTILITIES ====================
/**
 * Retrieves authentication headers for API requests
 * @returns {Object} Headers object with authorization token if available
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// ==================== CORE API CLIENT ====================
/**
 * API client with standardized request methods and error handling
 */
const apiClient = {
  /**
   * Performs GET request to API endpoint
   * @param {string} url - API endpoint path
   * @returns {Promise<T>} Response data
   */
  get: async <T = any>(url: string): Promise<T> => {
    const fullUrl = `${API_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;

    try {
      apiLogger.log(`GET: ${fullUrl}`);
      const response = await fetch(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        handleApiError(new Error('Authentication required'), 'Auth');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
      }

      const data = await response.json();
      return data.data as T;
    } catch (error) {
      // CHANGED: Use the new handleApiError with context
      return handleApiError(error, `GET ${url}`);
    }
  },

  /**
   * Performs POST request to API endpoint
   * @param {string} url - API endpoint path
   * @param {any} body - Request payload
   * @param {Function} cleaningFunction - Data cleaning function
   * @returns {Promise<T>} Response data
   */
  post: async <T = any>(
    url: string, 
    body: any, 
    cleaningFunction: (data: any) => any = cleanDataForGeneral
  ): Promise<T> => {
    const fullUrl = `${API_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
    const cleanedBody = cleaningFunction(body);

    try {
      apiLogger.log(`POST: ${fullUrl}`, cleanedBody);
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify(cleanedBody),
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        handleApiError(new Error('Authentication required'), 'Auth');
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Fallback to default error message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return normalizeIds(data.data) as T;
    } catch (error) {
      // CHANGED: Use the new handleApiError with context
      return handleApiError(error, `POST ${url}`);
    }
  },

  /**
   * Performs PUT request to API endpoint
   * @param {string} url - API endpoint path
   * @param {any} body - Request payload
   * @param {Function} cleaningFunction - Data cleaning function
   * @returns {Promise<T>} Response data
   */
  put: async <T = any>(
    url: string, 
    body: any, 
    cleaningFunction: (data: any) => any = cleanDataForGeneral
  ): Promise<T> => {
    const fullUrl = `${API_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
    const cleanedBody = cleaningFunction(body);

    try {
      apiLogger.log(`PUT: ${fullUrl}`, cleanedBody);
      const response = await fetch(fullUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify(cleanedBody),
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        handleApiError(new Error('Authentication required'), 'Auth');
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Fallback to default error message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return normalizeIds(data.data) as T;
    } catch (error) {
      // CHANGED: Use the new handleApiError with context
      return handleApiError(error, `PUT ${url}`);
    }
  },

  /**
   * Performs DELETE request to API endpoint
   * @param {string} url - API endpoint path
   * @returns {Promise<T | void>} Response data
   */
  delete: async <T = any>(url: string): Promise<T | void> => {
    const fullUrl = `${API_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;

    try {
      apiLogger.log(`DELETE: ${fullUrl}`);
      const response = await fetch(fullUrl, {
        method: "DELETE",
        headers: {
          ...getAuthHeaders()
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        handleApiError(new Error('Authentication required'), 'Auth');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
      }

      if (response.status === 204) return;
      const data = await response.json();
      return data;
    } catch (error) {
      // CHANGED: Use the new handleApiError with context
      return handleApiError(error, `DELETE ${url}`);
    }
  },
};

// ==================== MOCK DATA FALLBACK ====================
/**
 * Provides mock data fallback for development and testing with proper typing
 * @param {Function} realCall - Real API call function
 * @param {T} mockData - Mock data to return when using mock mode
 * @returns {Promise<T>} Either real API response or mock data
 */
const withMockFallback = <T>(
  realCall: () => Promise<T>, 
  mockData: T
): Promise<T> => {
  if (USE_MOCK_DATA) {
    return new Promise((resolve) => setTimeout(() => resolve(mockData), 500));
  }
  return realCall();
};

// ==================== AUTHENTICATION API ====================
/**
 * Authentication API methods for user login and logout
 */
export const authApi = {
  /**
   * Authenticates user with username and password
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @returns {Promise<AuthResponse>} Authentication result with token and user data
   */
  login: async (username: string, password: string): Promise<AuthResponse> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        data: {
          token: 'mock-jwt-token-' + Date.now(),
          user: {
            username: 'admin',
            role: 'admin',
          }
        }
      }), 1000));
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}: Login failed`);
      }

      const data = await response.json();

      if (data.success && data.token) {
        return {
          success: true,
          data: {
            token: data.token,
            user: data.user || {
              username: username,
              role: 'admin',
            }
          }
        };
      } else if (data.success) {
        if (data.data?.token) {
          return {
            success: true,
            data: {
              token: data.data.token,
              user: data.data.user || {
                username: username,
                role: 'admin',
              }
            }
          };
        } else {
          throw new Error('Login successful but no authentication token received');
        }
      } else {
        throw new Error(data.message || 'Login failed');
      }

    } catch (error: any) {
      // CHANGED: Use the new error handling
      return handleApiError(error, 'Auth Login');
    }
  },

  /**
   * Validates authentication token with backend
   * @returns {Promise<boolean>} True if token is valid
   */
  validateToken: async (): Promise<boolean> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => resolve(true), 500));
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/validate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (!response.ok) {
        throw new Error(`Token validation failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  },

  /**
   * Logs out user by removing authentication token
   * @returns {Promise<{success: boolean}>} Logout result
   */
  logout: async (): Promise<{ success: boolean }> => {
    localStorage.removeItem('auth_token');
    return { success: true };
  }
};

// ==================== HEALTH MONITORING API ====================
/**
 * Health monitoring API for system status and metrics
 */
export const healthApi = {
  /**
   * Retrieves comprehensive system health information
   * @returns {Promise<SystemHealth>} Detailed system health status
   */
  getSystemHealth: async (): Promise<SystemHealth> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => resolve({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          latency: '15ms',
          type: 'mongodb'
        },
        services: {
          email: 'operational',
          pdf_generation: 'operational',
          backup: 'operational'
        },
        business_metrics: {
          total_invoices: 150,
          total_clients: 45,
          unpaid_amount: 12500.00
        }
      }), 500));
    }

    try {
      const [systemHealth, invoicesData, clientsData, backupData] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/health/detailed`, {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        }).then(res => res.ok ? res.json() : null),
        invoiceApi.getAll().catch(() => []),
        clientApi.getAll().catch(() => []),
        backupApi.listBackups().catch(() => ({ backups: [] }))
      ]);

      let systemStatus = 'healthy';
      let databaseStatus = 'unknown';
      let emailService = 'unknown';
      let pdfService = 'unknown';
      let backupService = 'unknown';

      if (systemHealth.status === 'fulfilled' && systemHealth.value) {
        const sysData = systemHealth.value.data || systemHealth.value;
        if (sysData.process) {
          const memoryUsage = sysData.process.memory?.heapUsed / sysData.process.memory?.heapTotal;
          systemStatus = memoryUsage > 0.8 ? 'degraded' : 'healthy';
        }
        databaseStatus = 'connected';
        emailService = 'operational';
        pdfService = 'operational';
        backupService = backupData.status === 'fulfilled' ? 'operational' : 'unknown';
      }

      let totalInvoices = 0;
      let totalClients = 0;
      let unpaidAmount = 0;

      if (invoicesData.status === 'fulfilled') {
        const invoices = invoicesData.value;
        totalInvoices = invoices.length;
        unpaidAmount = invoices
          .filter((inv: any) => inv.status === 'unpaid' || inv.status === 'overdue')
          .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      }

      if (clientsData.status === 'fulfilled') {
        totalClients = clientsData.value.length;
      }

      const hasBusinessData = totalInvoices > 0 || totalClients > 0;
      const finalStatus = hasBusinessData ? systemStatus : 'degraded';

      const finalHealthData: SystemHealth = {
        status: finalStatus as SystemHealthStatus,
        timestamp: new Date().toISOString(),
        database: {
          status: databaseStatus,
          latency: '15ms',
          type: 'mongodb'
        },
        services: {
          email: emailService,
          pdf_generation: pdfService,
          backup: backupService
        },
        business_metrics: {
          total_invoices: totalInvoices,
          total_clients: totalClients,
          unpaid_amount: unpaidAmount
        }
      };

      return finalHealthData;

    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          status: 'unknown',
          latency: 'unknown',
          type: 'unknown'
        },
        services: {
          email: 'unknown',
          pdf_generation: 'unknown',
          backup: 'unknown'
        },
        business_metrics: {
          total_invoices: 0,
          total_clients: 0,
          unpaid_amount: 0
        }
      };
    }
  },

  /**
   * Performs basic health check of the system
   * @returns {Promise<{status: string; timestamp: string}>} Basic health status
   */
  getBasicHealth: async (): Promise<{ status: string; timestamp: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        headers: getAuthHeaders()
      });

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  }
};

// ==================== BACKUP MANAGEMENT API ====================
/**
 * Backup management API for data protection and recovery
 */
export const backupApi = {
  /**
   * Creates a new system backup
   * @param {Object} options - Backup creation options
   * @param {boolean} options.encrypted - Whether to encrypt the backup
   * @returns {Promise<BackupResponse>} Backup creation result
   */
  createBackup: async (options: { encrypted?: boolean } = {}): Promise<BackupResponse> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        data: {
          filename: `quickbill-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json${options.encrypted ? '.enc' : ''}`,
          size: '2.4 MB',
          created: new Date().toISOString(),
          encrypted: options.encrypted || false,
          stats: {
            invoices: 45,
            clients: 23,
            settings: 1
          }
        }
      }), 2000));
    }

    try {
      const data = await apiClient.post("/admin/backup", options);
      return {
        success: true,
        data: data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create backup'
      };
    }
  },

		/**
		 * Retrieves list of available backups
		 * @returns {Promise<BackupListResponse>} List of backup files with metadata
		 */
		listBackups: async (): Promise<BackupListResponse> => {
		  if (USE_MOCK_DATA) {
		    const mockBackups: Backup[] = [
		      {
		        filename: `quickbill-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json.enc`,
		        size: '2.4 MB',
		        created: new Date().toISOString(),
		        encrypted: true,
		        stats: { invoices: 45, clients: 23, settings: 1 }
		      }
		    ];

		    return new Promise((resolve) => setTimeout(() => resolve({
		      success: true,
		      data: {
		        backups: mockBackups
		      }
		    }), 500));
		  }

		  try {
		    const response = await apiClient.get("/admin/backups");
		    
		    // Handle backend response structure: { backups: [], total: number }
		    const backups = response?.backups || [];
		    
		    return {
		      success: true,
		      data: {
		        backups: backups
		      }
		    };
		  } catch (error: any) {
		    return {
		      success: false,
		      data: {
		        backups: []
		      },
		      error: error.message
		    };
		  }
		},

  /**
   * Restores system from a backup file
   * @param {string} filename - Name of backup file to restore
   * @returns {Promise<BackupResponse>} Restore operation result
   */
  restoreBackup: async (filename: string): Promise<BackupResponse> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        message: 'Backup restored successfully'
      }), 1500));
    }

    try {
      const data = await apiClient.post("/admin/restore", { filename });
      return {
        success: true,
        ...data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to restore backup'
      };
    }
  },

  /**
   * Downloads a backup file
   * @param {string} filename - Name of backup file to download
   * @returns {Promise<void>} Download operation result
   */
  downloadBackup: async (filename: string): Promise<void> => {
    try {
      const encodedFilename = encodeURIComponent(filename);
      const url = `${API_BASE_URL}/admin/backup/download/${encodedFilename}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error: any) {
      throw error;
    }
  }
};

// ==================== EMAIL MANAGEMENT API ====================
/**
 * Email management API for invoice communication
 */
export const emailApi = {
  /**
   * Sends custom email for an invoice
   * @param {string} invoiceId - Target invoice ID
   * @param {EmailOptions} options - Email configuration options
   * @returns {Promise<EmailResponse>} Email sending result
   */
  send: async (invoiceId: string, options: EmailOptions): Promise<EmailResponse> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        message: 'Email sent successfully',
        data: {
          messageId: `mock-${Date.now()}`,
          status: 'sent',
          recipient: options.to || 'mock@example.com'
        }
      }), 1000));
    }

    try {
      const data = await apiClient.post(`/email/invoices/${invoiceId}/send-email`, options);
      return {
        success: true,
        ...data
      };
    } catch (error) {
      // CHANGED: Use the new error handling
      const errorInfo = processError(error);
      logError(errorInfo, 'Email Send');
      return {
        success: false,
        error: errorInfo.userMessage
      };
    }
  },

  /**
   * Sends invoice using predefined template
   * @param {string} invoiceId - Target invoice ID
   * @returns {Promise<EmailResponse>} Email sending result
   */
  quickSend: async (invoiceId: string): Promise<EmailResponse> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        message: 'Invoice sent successfully using template',
        data: {
          messageId: `mock-quick-${Date.now()}`,
          status: 'sent',
          recipient: 'mock@example.com'
        }
      }), 1000));
    }

    try {
      const data = await apiClient.post(`/email/invoices/${invoiceId}/quick-send`, {});
      return {
        success: true,
        ...data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  },

  /**
   * Retrieves email history for an invoice
   * @param {string} invoiceId - Target invoice ID
   * @returns {Promise<EmailHistoryResponse>} Email history data
   */
  getHistory: async (invoiceId: string): Promise<EmailHistoryResponse> => {
    if (USE_MOCK_DATA) {
      const mockHistory: EmailHistory[] = [
        {
          recipient: 'client@example.com',
          sentAt: new Date().toISOString(),
          status: 'sent',
          subject: 'Invoice INV-0001 from Your Business',
          messageId: 'mock-123'
        },
        {
          recipient: 'client@example.com',
          sentAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'delivered',
          subject: 'Reminder: Invoice INV-0001',
          messageId: 'mock-456'
        }
      ];

      return new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        data: {
          emailHistory: mockHistory,
          lastSentAt: new Date().toISOString()
        }
      }), 500));
    }

    try {
      const data = await apiClient.get(`/email/invoices/${invoiceId}/email-history`);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        data: {
          emailHistory: [],
          lastSentAt: undefined
        }
      };
    }
  }
};

// ==================== PAYMENT MANAGEMENT API ====================
/**
 * Payment management API for payment processing
 */
export const paymentApi = {
  /**
   * Get available payment methods for an invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<PaymentMethodsResponse>} Available payment methods
   */
  getPaymentMethods: async (invoiceId: string): Promise<PaymentMethodsResponse> => {
    if (USE_MOCK_DATA) {
      const mockMethods: PaymentMethodOption[] = [
        {
          id: 'manual',
          name: 'Manual Payment',
          description: 'Bank transfer or other manual payment method',
          requiresRedirect: false
        },
        {
          id: 'bank_transfer',
          name: 'Bank Transfer',
          description: 'Direct bank transfer',
          requiresRedirect: false
        },
        {
          id: 'stripe',
          name: 'Credit/Debit Card',
          description: 'Pay with credit card, debit card, or other Stripe methods',
          requiresRedirect: true
        }
      ];

      return new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        data: { methods: mockMethods }
      }), 500));
    }

    try {
      const data = await apiClient.get(`/payments/invoices/${invoiceId}/payment-methods`);
      return {
        success: true,
        data: { methods: data }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        data: { methods: [] }
      };
    }
  },

  /**
   * Create payment intent for an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {string} gateway - Payment gateway to use
   * @returns {Promise<PaymentIntentResponse>} Payment intent data
   */
  createPaymentIntent: async (invoiceId: string, gateway: string = 'stripe'): Promise<PaymentIntentResponse> => {
    if (USE_MOCK_DATA) {
      const mockIntent: PaymentIntent = {
        id: `pi_mock_${Date.now()}`,
        client_secret: `pi_mock_${Date.now()}_secret`,
        status: 'requires_payment_method',
        amount: 10000, // $100.00 in cents
        currency: 'usd',
        invoice_id: invoiceId
      };

      return new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        data: mockIntent
      }), 500));
    }

    try {
      const data = await apiClient.post(`/payments/invoices/${invoiceId}/payment-intent`, { gateway });
      return {
        success: true,
        data: data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Check payment status for an invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<PaymentStatusResponse>} Current payment status
   */
  getPaymentStatus: async (invoiceId: string): Promise<PaymentStatusResponse> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        data: {
          paymentStatus: 'pending',
          transactionId: '',
          paymentMethod: 'manual'
        }
      }), 500));
    }

    try {
      const data = await apiClient.get(`/payments/invoices/${invoiceId}/payment-status`);
      return {
        success: true,
        data: data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },

		/**
		 * Update payment status manually (for bank transfers, etc.)
		 * @param {string} invoiceId - Invoice ID
		 * @param {PaymentStatus} status - New payment status
		 * @param {string} transactionId - Transaction ID
		 * @returns {Promise<ApiResponse<Invoice>>} Update result with full invoice data
		 */
		updatePaymentStatus: async (
		  invoiceId: string, 
		  status: PaymentStatus, 
		  transactionId?: string
		): Promise<ApiResponse<Invoice>> => {
		  if (USE_MOCK_DATA) {
		    const mockInvoice: Invoice = {
		      // ... mock invoice data with updated payment status
		      id: invoiceId,
		      paymentStatus: status,
		      status: status === 'paid' ? 'paid' : 'unpaid',
		      transactionId: transactionId,
		      paymentDate: status === 'paid' ? new Date().toISOString() : undefined
		      // ... other required fields
		    };
		    
		    return new Promise((resolve) => setTimeout(() => resolve({
		      success: true,
		      data: mockInvoice,
		      message: `Payment status updated to ${status}`
		    }), 500));
		  }

		  try {
		    const data = await apiClient.put(`/payments/invoices/${invoiceId}/payment-status`, {
		      paymentStatus: status,
		      transactionId
		    });
		    return {
		      success: true,
		      data: data, // This now contains the full updated invoice
		      message: `Payment status updated to ${status}`
		    };
		  } catch (error: any) {
		    return {
		      success: false,
		      error: error.message
		    };
		  }
		}
};

// ==================== BULK OPERATIONS API ====================
/**
 * Bulk operations API for batch processing
 */
export const bulkApi = {
  /**
   * Updates status for multiple invoices
   * @param {string[]} invoiceIds - Array of invoice IDs to update
   * @param {InvoiceStatus} status - New status to apply
   * @returns {Promise<BulkActionResponse>} Bulk operation result
   */
  updateStatus: async (invoiceIds: string[], status: InvoiceStatus): Promise<BulkActionResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/bulk/invoices/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ invoiceIds, status }),
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        handleApiError(new Error('Authentication required'), 'Auth');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // CHANGED: Use the new handleApiError with context
      return handleApiError(error, 'Bulk Update Status');
    }
  },

  /**
   * Deletes multiple invoices
   * @param {string[]} invoiceIds - Array of invoice IDs to delete
   * @returns {Promise<BulkActionResponse>} Bulk operation result
   */
  delete: async (invoiceIds: string[]): Promise<BulkActionResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/bulk/invoices`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ invoiceIds }),
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        handleApiError(new Error('Authentication required'), 'Auth');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // CHANGED: Use the new handleApiError with context
      return handleApiError(error, 'Bulk Delete');
    }
  },

  /**
   * Sends emails for multiple invoices
   * @param {BulkEmailRequest} request - Bulk email configuration
   * @returns {Promise<BulkActionResponse>} Bulk operation result
   */
  sendEmail: async (request: BulkEmailRequest): Promise<BulkActionResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/bulk/invoices/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify(request),
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        handleApiError(new Error('Authentication required'), 'Auth');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // CHANGED: Use the new handleApiError with context
      return handleApiError(error, 'Bulk Send Email');
    }
  },

  /**
   * Downloads multiple invoices as PDFs in ZIP format
   * @param {string[]} invoiceIds - Array of invoice IDs to download
   * @returns {Promise<BulkDownloadResponse>} Download operation result
   */
  downloadPDFs: async (invoiceIds: string[]): Promise<BulkDownloadResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/bulk/invoices/download-pdfs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ invoiceIds }),
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        handleApiError(new Error('Authentication required'), 'Auth');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `invoices-${Date.now()}.zip`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      return {
        success: true,
        data: {
          downloadUrl: url,
          filename: filename
        }
      };
    } catch (error) {
      // CHANGED: Use the new handleApiError with context
      return handleApiError(error, 'Bulk Download PDFs');
    }
  }
};

// ==================== INVOICE MANAGEMENT API ====================
/**
 * Invoice management API for CRUD operations and business logic
 */
export const invoiceApi = {
  /**
   * Retrieves all invoices
   * @returns {Promise<Invoice[]>} Array of invoice objects
   */
  getAll: async (): Promise<Invoice[]> => {
    return withMockFallback(
      async () => {
        const data = await apiClient.get("/invoices");
        return normalizeIds(data);
      },
      mockInvoices
    );
  },

  /**
   * Retrieves specific invoice by ID
   * @param {string} id - Invoice ID to retrieve
   * @returns {Promise<Invoice>} Invoice object
   */
  getById: async (id: string): Promise<Invoice> => {
    if (USE_MOCK_DATA) {
      const invoice = mockInvoices.find(inv => inv.id === id);
      if (!invoice) throw new Error("Invoice not found");
      return new Promise((resolve) => setTimeout(() => resolve(invoice), 500));
    }

    try {
      const data = await apiClient.get(`/invoices/${id}`);
      return normalizeIds(data);
    } catch (error) {
      return handleApiError(error, `Invoice GetById ${id}`);
    }
  },

  /**
   * Creates new invoice
   * @param {Partial<Invoice>} invoice - Invoice data to create
   * @returns {Promise<Invoice>} Created invoice with generated ID
   */
  create: async (invoice: Partial<Invoice>): Promise<Invoice> => {
    return withMockFallback(
      async () => {
        const data = await apiClient.post("/invoices", invoice, cleanDataForInvoice);
        return normalizeIds(data);
      },
      { ...invoice, id: Date.now().toString() } as Invoice
    );
  },

  /**
   * Updates existing invoice
   * @param {string} id - Invoice ID to update
   * @param {Partial<Invoice>} invoice - Updated invoice data
   * @returns {Promise<Invoice>} Updated invoice object
   */
  update: async (id: string, invoice: Partial<Invoice>): Promise<Invoice> => {
    return withMockFallback(
      async () => {
        const data = await apiClient.put(`/invoices/${id}`, invoice, cleanDataForInvoice);
        return normalizeIds(data);
      },
      { ...invoice, id } as Invoice
    );
  },

  /**
   * Deletes invoice by ID
   * @param {string} id - Invoice ID to delete
   * @returns {Promise<void>} Delete operation result
   */
  delete: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => resolve(), 500));
    }
    try {
      return await apiClient.delete(`/invoices/${id}`);
    } catch (error) {
      return handleApiError(error, `Invoice Delete ${id}`);
    }
  },

  /**
   * Updates invoice status
   * @param {string} id - Invoice ID to update
   * @param {string} status - New status value
   * @returns {Promise<Invoice>} Updated invoice object
   */
  updateStatus: async (id: string, status: string): Promise<Invoice> => {
    const validStatuses = ['draft', 'unpaid', 'paid', 'overdue'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    if (USE_MOCK_DATA) {
      const mockInvoice = mockInvoices.find(inv => inv.id === id) || mockInvoices[0];
      const updatedMockInvoice = {
        ...mockInvoice,
        id,
        status: status as InvoiceStatus,
        updatedAt: new Date().toISOString()
      };
      return new Promise((resolve) => setTimeout(() => resolve(updatedMockInvoice), 500));
    }

    try {
      const data = await apiClient.put(`/invoices/${id}/status`, { status });
      return normalizeIds(data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Duplicates existing invoice
   * @param {string} id - Invoice ID to duplicate
   * @returns {Promise<Invoice>} New duplicated invoice
   */
  duplicate: async (id: string): Promise<Invoice> => {
    return withMockFallback(
      async () => {
        const data = await apiClient.post(`/invoices/duplicate/${id}`, {});
        return normalizeIds(data);
      },
      mockInvoices[0]
    );
  },

  /**
   * Generates PDF for invoice
   * @param {Invoice} invoice - Invoice data for PDF generation
   * @returns {Promise<Blob>} PDF file as Blob
   */
  generatePDF: async (invoice: Invoice): Promise<Blob> => {
    if (USE_MOCK_DATA) {
      const pdfContent = `Invoice: ${invoice.invoiceNumber}`;
      return new Promise((resolve) =>
        setTimeout(() => resolve(new Blob([pdfContent], { type: 'application/pdf' })), 500)
      );
    }

    try {
      const cleanedInvoice = cleanDataForPDF(invoice);

      const response = await fetch(`${API_BASE_URL}/invoices/generate/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ invoice: cleanedInvoice }),
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        handleApiError(new Error('Authentication required'), 'Auth');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'PDF generation failed'}`);
      }

      return response.blob();
    } catch (error) {
      return handleApiError(error, 'Invoice Generate PDF');
    }
  },

  /**
   * Retrieves dashboard statistics
   * @returns {Promise<DashboardStats>} Business metrics and statistics
   */
  getStats: async (): Promise<DashboardStats> => {
    return withMockFallback(
      async () => {
        const data = await apiClient.get("/invoices/stats");
        return normalizeIds(data);
      },
      mockStats
    );
  },

  /**
   * Retrieves revision history for invoice
   * @param {string} invoiceId - Invoice ID to get revisions for
   * @returns {Promise<RevisionHistoryResponse>} Revision history data
   */
  getRevisions: async (invoiceId: string): Promise<RevisionHistoryResponse> => {
    if (USE_MOCK_DATA) {
      const mockRevisions: RevisionHistory[] = [
        {
          revisedAt: new Date().toISOString(),
          revisedBy: 'system',
          changes: [
            {
              field: 'total',
              oldValue: 150,
              newValue: 175,
              description: 'Total updated from 150 to 175'
            }
          ],
          notes: 'Added new service item',
          version: 2
        }
      ];

      return new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        data: {
          revisionHistory: mockRevisions,
          currentVersion: 2,
          lastRevisedAt: new Date().toISOString(),
          revisedBy: 'system'
        }
      }), 500));
    }

    try {
      const data = await apiClient.get(`/invoices/${invoiceId}/revisions`);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        data: {
          revisionHistory: [],
          currentVersion: 1,
          lastRevisedAt: undefined,
          revisedBy: undefined
        }
      };
    }
  },

  // Add these payment-related methods to the existing invoiceApi object:
  getPaymentMethods: paymentApi.getPaymentMethods,
  createPaymentIntent: paymentApi.createPaymentIntent,
  getPaymentStatus: paymentApi.getPaymentStatus,
  updatePaymentStatus: paymentApi.updatePaymentStatus,

  bulk: bulkApi,
  sendEmail: emailApi.send,
  quickSendEmail: emailApi.quickSend,
  getEmailHistory: emailApi.getHistory,
};

// ==================== CLIENT MANAGEMENT API ====================
/**
 * Client management API for customer data operations
 */
export const clientApi = {
  /**
   * Retrieves all clients
   * @returns {Promise<Client[]>} Array of client objects
   */
  getAll: async (): Promise<Client[]> => {
    return withMockFallback(
      async () => {
        const data = await apiClient.get("/clients");
        return normalizeIds(data);
      },
      mockClients
    );
  },

  /**
   * Creates new client
   * @param {Partial<Client>} client - Client data to create
   * @returns {Promise<Client>} Created client with generated ID
   */
  create: async (client: Partial<Client>): Promise<Client> => {
    return withMockFallback(
      async () => {
        const data = await apiClient.post("/clients", client);
        return normalizeIds(data);
      },
      { ...client, id: Date.now().toString() } as Client
    );
  },

  /**
   * Updates existing client
   * @param {string} id - Client ID to update
   * @param {Partial<Client>} client - Updated client data
   * @returns {Promise<Client>} Updated client object
   */
  update: async (id: string, client: Partial<Client>): Promise<Client> => {
    return withMockFallback(
      async () => {
        const data = await apiClient.put(`/clients/${id}`, client);
        return normalizeIds(data);
      },
      { ...client, id } as Client
    );
  },

  /**
   * Deletes client by ID
   * @param {string} id - Client ID to delete
   * @returns {Promise<void>} Delete operation result
   */
  delete: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => resolve(), 500));
    }
    try {
      return await apiClient.delete(`/clients/${id}`);
    } catch (error) {
      return handleApiError(error, `Client Delete ${id}`);
    }
  },
};

// ==================== APPLICATION SETTINGS API ====================
/**
 * Application settings API for configuration management
 */
export const settingsApi = {
  /**
   * Retrieves current application settings
   * @returns {Promise<Settings>} Current settings configuration
   */
  get: async (): Promise<Settings> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => resolve({
        defaultCurrency: "USD",
        defaultTaxRate: 0,
        invoicePrefix: "INV",
        autoNumbering: true,
        businessName: "",
        businessEmail: "",
        businessAddress: "",
        businessLogo: "",
      }), 500));
    }
    try {
      const data = await apiClient.get("/settings");
      return normalizeIds(data);
    } catch (error) {
      return handleApiError(error, 'Settings Get');
    }
  },

  /**
   * Updates application settings
   * @param {Partial<Settings>} settings - New settings values
   * @returns {Promise<Settings>} Updated settings configuration
   */
  update: async (settings: Partial<Settings>): Promise<Settings> => {
    return withMockFallback(
      async () => {
        try {
          const data = await apiClient.put("/settings", settings);
          return normalizeIds(data);
        } catch (error: any) {
          let errorMessage = "Failed to update settings";
          if (error?.message) {
            if (error.message.includes('validation')) {
              const match = error.message.match(/\[(.*?)\]/);
              if (match) {
                errorMessage = `Validation error: ${match[1]}`;
              } else {
                errorMessage = "Please check your input fields";
              }
            } else {
              errorMessage = error.message;
            }
          }

          throw new Error(errorMessage);
        }
      },
      settings as Settings
    );
  },
};

// ==================== EXPORT & REPORTING API ====================
/**
 * Export and reporting API for data export functionality
 */
export const exportApi = {
  /**
   * Generates export file for various report types
   * @param {ExportRequest} request - Export configuration
   * @returns {Promise<ExportResponse>} Export operation result
   */
  generateExport: async (request: ExportRequest): Promise<ExportResponse> => {
    if (USE_MOCK_DATA) {
      return new Promise((resolve) => setTimeout(() => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${request.reportType}-${timestamp}.${request.format}`;
        
        resolve({
          success: true,
          data: {
            downloadUrl: `mock-download-url-${Date.now()}`,
            filename,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            fileSize: 1024
          }
        });
      }, 1500));
    }

    try {
      const response = await fetch(`${API_BASE_URL}/exports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",  // CRITICAL: Tell backend we want JSON response
          ...getAuthHeaders()
        },
        body: JSON.stringify(request),
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        handleApiError(new Error('Authentication required'), 'Auth');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Export failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Quick export for dashboard data
   * @param {ExportFormat} format - Export format
   * @returns {Promise<ExportResponse>} Export operation result
   */
  exportDashboard: async (format: ExportFormat): Promise<ExportResponse> => {
    const request: ExportRequest = {
      reportType: 'dashboard_summary',
      format,
      options: {
        includeCharts: true,
        includeDetails: true
      }
    };
    return exportApi.generateExport(request);
  },

  /**
   * Quick export for invoice list
   * @param {ExportFormat} format - Export format
   * @param {string[]} invoiceIds - Specific invoice IDs to export
   * @returns {Promise<ExportResponse>} Export operation result
   */
  exportInvoices: async (format: ExportFormat, invoiceIds?: string[]): Promise<ExportResponse> => {
    const request: ExportRequest = {
      reportType: 'invoice_list',
      format,
      filters: invoiceIds ? { invoiceIds } : undefined
    };
    return exportApi.generateExport(request);
  },

  /**
   * Quick export for client list
   * @param {ExportFormat} format - Export format
   * @returns {Promise<ExportResponse>} Export operation result
   */
  exportClients: async (format: ExportFormat): Promise<ExportResponse> => {
    const request: ExportRequest = {
      reportType: 'client_list',
      format,
      options: {
        includeDetails: true
      }
    };
    return exportApi.generateExport(request);
  }
};
