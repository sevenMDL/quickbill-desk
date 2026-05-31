// First file: frontend/src/lib/errorMessages.ts - COMPLETE REPLACEMENT
/**
 * Environment-aware error handling center
 * Centralized error processing for entire application
 */

let overrideEnvironment: 'development' | 'production' | null = null;

export const setEnvironmentOverride = (env: 'development' | 'production') => {
  overrideEnvironment = env;
};

export const getEnvironment = (): 'development' | 'production' => {
  // Use override if set
  if (overrideEnvironment) return overrideEnvironment;

  // Otherwise use Vite's environment
  return import.meta.env.PROD ? 'production' : 'development';
};

// ==================== ERROR CATEGORIES ====================
export const ErrorCategories = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTH: 'authentication', 
  BUSINESS: 'business',
  SYSTEM: 'system'
} as const;

export type ErrorCategory = typeof ErrorCategories[keyof typeof ErrorCategories];

// ==================== STANDARD ERROR MESSAGES ====================
export const ErrorMessages = {
  // Network & Connection
  NETWORK: 'Please check your internet connection and try again.',
  OFFLINE: 'You appear to be offline. Please check your connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  
  // Authentication & Authorization
  AUTH_REQUIRED: 'Your session has expired. Please log in again.',
  AUTH_FAILED: 'Invalid username or password. Please try again.',
  AUTH_FORBIDDEN: 'You do not have permission to perform this action.',
  
  // Data Operations
  NOT_FOUND: 'The requested item was not found.',
  CREATE_FAILED: 'Failed to create item. Please try again.',
  UPDATE_FAILED: 'Failed to update item. Please try again.',
  DELETE_FAILED: 'Failed to delete item. Please try again.',
  FETCH_FAILED: 'Failed to load data. Please try again.',
  
  // Validation
  VALIDATION: 'Please check your input and try again.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_FORMAT: 'Please check the format of your input.',
  
  // File Operations
  FILE_TOO_LARGE: 'File is too large. Please choose a smaller file.',
  INVALID_FILE_TYPE: 'Invalid file type. Please choose a supported format.',
  UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  
  // Email & Notifications
  EMAIL_FAILED: 'Failed to send email. Please try again.',
  EMAIL_INVALID_RECIPIENT: 'Invalid email address. Please check the recipient.',
  
  // System & Server
  SERVER_ERROR: 'Our server is temporarily unavailable. Please try again in a few minutes.',
  MAINTENANCE: 'System is undergoing maintenance. Please try again later.',
  
  // Generic Fallbacks
  GENERIC: 'Something went wrong. Please try again.',
  UNEXPECTED: 'An unexpected error occurred. Please try again.',
} as const;

// ==================== ERROR PATTERNS ====================
const errorPatterns = [
  // Network errors - high specificity
  { 
    pattern: /failed to fetch|network error|offline|network request failed/i, 
    message: ErrorMessages.NETWORK,
    category: ErrorCategories.NETWORK 
  },
  { 
    pattern: /timeout|timed out|etimedout/i, 
    message: ErrorMessages.TIMEOUT,
    category: ErrorCategories.NETWORK 
  },
  
  // Authentication errors
  { 
    pattern: /401|unauthorized|invalid token|token expired/i, 
    message: ErrorMessages.AUTH_REQUIRED,
    category: ErrorCategories.AUTH 
  },
  { 
    pattern: /403|forbidden|access denied/i, 
    message: ErrorMessages.AUTH_FORBIDDEN,
    category: ErrorCategories.AUTH 
  },
  { 
    pattern: /invalid credentials|invalid password|invalid username/i, 
    message: ErrorMessages.AUTH_FAILED,
    category: ErrorCategories.AUTH 
  },
  
  // Resource errors
  { 
    pattern: /404|not found/i, 
    message: ErrorMessages.NOT_FOUND,
    category: ErrorCategories.BUSINESS 
  },
  
  // Server errors
  { 
    pattern: /500|internal server error|econnrefused/i, 
    message: ErrorMessages.SERVER_ERROR,
    category: ErrorCategories.SYSTEM 
  },
  { 
    pattern: /503|service unavailable|maintenance/i, 
    message: ErrorMessages.MAINTENANCE,
    category: ErrorCategories.SYSTEM 
  },
  
  // Validation errors
  { 
    pattern: /validation error|validation failed|invalid input/i, 
    message: ErrorMessages.VALIDATION,
    category: ErrorCategories.VALIDATION 
  },
  
  // Business logic errors
  { 
    pattern: /duplicate|already exists/i, 
    message: 'This item already exists. Please use a different value.',
    category: ErrorCategories.BUSINESS 
  },
  { 
    pattern: /client has invoices|cannot delete/i, 
    message: 'Cannot delete this item because it has associated records.',
    category: ErrorCategories.BUSINESS 
  }
];

// ==================== CORE ERROR PROCESSING ====================
export interface ProcessedError {
  userMessage: string;
  logMessage: string;
  category: ErrorCategory;
  originalError: any;
  shouldRetry: boolean;
}

/**
 * Enhanced error mapping for production with priority-based matching
 */
const mapErrorToUserMessage = (message: string, code?: string, httpStatus?: number): string => {
  // 1. HTTP Status code mapping (most reliable)
  if (httpStatus) {
    switch (httpStatus) {
      case 400: return ErrorMessages.VALIDATION;
      case 401: return ErrorMessages.AUTH_REQUIRED;
      case 403: return ErrorMessages.AUTH_FORBIDDEN;
      case 404: return ErrorMessages.NOT_FOUND;
      case 408: return ErrorMessages.TIMEOUT;
      case 429: return 'Too many requests. Please wait a moment and try again.';
      case 500: return ErrorMessages.SERVER_ERROR;
      case 503: return ErrorMessages.MAINTENANCE;
    }
  }

  // 2. Code-based mapping (backend error codes)
  if (code) {
    const codeMessage = ErrorMessages[code as keyof typeof ErrorMessages];
    if (codeMessage) return codeMessage;
  }

  // 3. Pattern-based matching (intelligent text analysis)
  for (const { pattern, message: friendlyMessage } of errorPatterns) {
    if (pattern.test(message)) {
      return friendlyMessage;
    }
  }

  // 4. Context-aware generic messages
  if (message.includes('create') || message.includes('created')) {
    return ErrorMessages.CREATE_FAILED;
  }
  
  if (message.includes('update') || message.includes('updated')) {
    return ErrorMessages.UPDATE_FAILED;
  }

  if (message.includes('delete') || message.includes('deleted')) {
    return ErrorMessages.DELETE_FAILED;
  }

  if (message.includes('fetch') || message.includes('load')) {
    return ErrorMessages.FETCH_FAILED;
  }

  // 5. Final fallback
  return ErrorMessages.GENERIC;
};

/**
 * Error categorization for analytics and handling strategies
 */
const categorizeError = (message: string, code?: string, httpStatus?: number): ErrorCategory => {
  // HTTP status based categorization
  if (httpStatus) {
    if (httpStatus >= 500) return ErrorCategories.SYSTEM;
    if (httpStatus === 401 || httpStatus === 403) return ErrorCategories.AUTH;
    if (httpStatus === 400 || httpStatus === 422) return ErrorCategories.VALIDATION;
    if (httpStatus === 404) return ErrorCategories.BUSINESS;
  }

  // Pattern-based categorization
  for (const { pattern, category } of errorPatterns) {
    if (pattern.test(message)) {
      return category as ErrorCategory;
    }
  }

  return ErrorCategories.SYSTEM;
};

/**
 * Central error processor - The main gateway for all error handling
 * This function analyzes errors and returns environment-appropriate responses
 */
export const processError = (error: any): ProcessedError => {
  const environment = getEnvironment();
  const originalMessage = error?.message || String(error);
  
  // Extract backend error structure if available
  const backendError = error?.response?.data?.error || error?.data?.error;
  const backendMessage = backendError?.message || originalMessage;
  const errorCode = backendError?.code;
  const httpStatus = error?.status || error?.response?.status;

  let userMessage: string;
  let logMessage: string;
  let category: ErrorCategory;
  let shouldRetry = false;

  if (environment === 'development') {
    // Development: Show detailed errors for debugging
    userMessage = `[DEV] ${backendMessage}`;
    if (errorCode) userMessage += ` (Code: ${errorCode})`;
    if (httpStatus) userMessage += ` [HTTP ${httpStatus}]`;
    
    logMessage = `Development Error: ${backendMessage} - Stack: ${error?.stack || 'No stack'}`;
  } else {
    // Production: User-friendly messages
    userMessage = mapErrorToUserMessage(backendMessage, errorCode, httpStatus);
    logMessage = `Production Error: ${backendMessage} - Code: ${errorCode || 'N/A'} - HTTP: ${httpStatus || 'N/A'}`;
  }

  // Categorize error for better handling
  category = categorizeError(backendMessage, errorCode, httpStatus);
  
  // Determine if operation should be retried
  shouldRetry = category === ErrorCategories.NETWORK || httpStatus === 429;

  return {
    userMessage,
    logMessage,
    category,
    originalError: error,
    shouldRetry
  };
};

/**
 * Environment-aware error logging
 */
export const logError = (errorInfo: ProcessedError, context?: string) => {
  const { logMessage, category, originalError } = errorInfo;
  const environment = getEnvironment();
  
  const logContext = context ? `[${context}]` : '[App]';

  if (environment === 'development') {
    // Rich logging for developers
    console.group(`🔧 ${logContext} DEV Error - ${category.toUpperCase()}`);
    console.error('Message:', logMessage);
    console.error('Original Error:', originalError);
    console.error('Stack:', originalError?.stack);
    console.error('Timestamp:', new Date().toISOString());
    console.groupEnd();
  } else {
    // Structured logging for production
    console.error(`🚨 ${logContext} Production Error:`, {
      category,
      message: logMessage,
      timestamp: new Date().toISOString(),
      context,
    });
  }
};

/**
 * Quick error handler for components - one-liner usage
 */
export const handleError = (error: any, context?: string): string => {
  const errorInfo = processError(error);
  logError(errorInfo, context);
  return errorInfo.userMessage;
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  const errorInfo = processError(error);
  return errorInfo.shouldRetry;
};
