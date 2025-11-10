/**
 * Error Handler Service
 * Provides comprehensive error classification, recovery strategies, and user-friendly messaging
 */

export enum ErrorCategory {
  FILE_ACCESS = 'FILE_ACCESS',
  PDF_PROCESSING = 'PDF_PROCESSING',
  OCR_PROCESSING = 'OCR_PROCESSING',
  DATA_VALIDATION = 'DATA_VALIDATION',
  RESOURCE_CONSTRAINT = 'RESOURCE_CONSTRAINT',
  NETWORK = 'NETWORK',
  SYSTEM_DEPENDENCY = 'SYSTEM_DEPENDENCY',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  operation: string;
  timestamp: Date;
  userAction: string;
  systemState?: any;
  errorDetails?: any;
  filePath?: string;
  attemptNumber?: number;
}

export interface UserFriendlyError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  title: string;
  message: string;
  actionableGuidance: string[];
  technicalDetails?: string;
  canRetry: boolean;
  suggestedRetryParams?: any;
}

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableCategories: ErrorCategory[];
  parameterAdjustments?: (attempt: number) => any;
}

/**
 * Main Error Handler Class
 */
export class ErrorHandler {
  private static errorLog: Array<{ error: Error; context: ErrorContext; timestamp: Date }> = [];
  private static readonly MAX_LOG_SIZE = 100;

  /**
   * Classify an error into a specific category
   */
  static classifyError(error: Error, context: ErrorContext): ErrorCategory {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // File access errors
    if (
      errorMessage.includes('enoent') ||
      errorMessage.includes('eacces') ||
      errorMessage.includes('eperm') ||
      errorMessage.includes('file not found') ||
      errorMessage.includes('permission denied')
    ) {
      return ErrorCategory.FILE_ACCESS;
    }

    // PDF processing errors
    if (
      errorMessage.includes('pdf') ||
      errorMessage.includes('invalid pdf') ||
      errorMessage.includes('corrupted') ||
      errorName.includes('pdferror')
    ) {
      return ErrorCategory.PDF_PROCESSING;
    }

    // OCR processing errors
    if (
      errorMessage.includes('tesseract') ||
      errorMessage.includes('ocr') ||
      errorMessage.includes('image conversion') ||
      errorMessage.includes('worker')
    ) {
      return ErrorCategory.OCR_PROCESSING;
    }

    // Resource constraint errors
    if (
      errorMessage.includes('enomem') ||
      errorMessage.includes('out of memory') ||
      errorMessage.includes('heap') ||
      errorMessage.includes('resource') ||
      errorMessage.includes('emfile')
    ) {
      return ErrorCategory.RESOURCE_CONSTRAINT;
    }

    // Data validation errors
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid data') ||
      errorMessage.includes('vin') ||
      errorMessage.includes('format')
    ) {
      return ErrorCategory.DATA_VALIDATION;
    }

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('enotfound')
    ) {
      return ErrorCategory.NETWORK;
    }

    // System dependency errors
    if (
      errorMessage.includes('dependency') ||
      errorMessage.includes('not installed') ||
      errorMessage.includes('missing')
    ) {
      return ErrorCategory.SYSTEM_DEPENDENCY;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  static determineSeverity(category: ErrorCategory, error: Error): ErrorSeverity {
    switch (category) {
      case ErrorCategory.FILE_ACCESS:
        return error.message.includes('ENOENT') ? ErrorSeverity.ERROR : ErrorSeverity.CRITICAL;
      
      case ErrorCategory.PDF_PROCESSING:
        return ErrorSeverity.ERROR;
      
      case ErrorCategory.OCR_PROCESSING:
        return ErrorSeverity.WARNING;
      
      case ErrorCategory.DATA_VALIDATION:
        return ErrorSeverity.WARNING;
      
      case ErrorCategory.RESOURCE_CONSTRAINT:
        return ErrorSeverity.CRITICAL;
      
      case ErrorCategory.NETWORK:
        return ErrorSeverity.WARNING;
      
      case ErrorCategory.SYSTEM_DEPENDENCY:
        return ErrorSeverity.CRITICAL;
      
      default:
        return ErrorSeverity.ERROR;
    }
  }

  /**
   * Convert technical error to user-friendly error
   */
  static toUserFriendlyError(error: Error, context: ErrorContext): UserFriendlyError {
    const category = this.classifyError(error, context);
    const severity = this.determineSeverity(category, error);

    let title: string;
    let message: string;
    let actionableGuidance: string[];
    let canRetry: boolean;
    let suggestedRetryParams: any = undefined;

    switch (category) {
      case ErrorCategory.FILE_ACCESS:
        title = 'File Access Error';
        if (error.message.includes('ENOENT')) {
          message = 'The selected file could not be found.';
          actionableGuidance = [
            'Verify the file still exists at the selected location',
            'Check if the file was moved or deleted',
            'Try selecting the file again'
          ];
          canRetry = false;
        } else if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
          message = 'Permission denied when accessing the file.';
          actionableGuidance = [
            'Check file permissions and ensure you have read access',
            'Try running the application with appropriate permissions',
            'Move the file to a location you have access to'
          ];
          canRetry = true;
        } else {
          message = 'Unable to access the selected file.';
          actionableGuidance = [
            'Ensure the file is not open in another application',
            'Check if the file is on a network drive that may be disconnected',
            'Try copying the file to your local drive'
          ];
          canRetry = true;
        }
        break;

      case ErrorCategory.PDF_PROCESSING:
        title = 'PDF Processing Error';
        message = 'The PDF file could not be processed correctly.';
        actionableGuidance = [
          'Verify the file is a valid PDF document',
          'Try opening the PDF in another application to check if it\'s corrupted',
          'If the PDF is password-protected, remove the password first',
          'Try re-saving the PDF using a PDF editor'
        ];
        canRetry = true;
        suggestedRetryParams = { useOCR: true };
        break;

      case ErrorCategory.OCR_PROCESSING:
        title = 'OCR Processing Issue';
        message = 'Text recognition encountered difficulties with this document.';
        actionableGuidance = [
          'The document may have poor image quality',
          'Try scanning the document at a higher resolution',
          'Ensure the document is not skewed or rotated',
          'You can manually enter the data if OCR continues to fail'
        ];
        canRetry = true;
        suggestedRetryParams = { ocrQuality: 'accurate', preprocessImages: true };
        break;

      case ErrorCategory.DATA_VALIDATION:
        title = 'Data Validation Warning';
        message = 'Some extracted data may be inaccurate or incomplete.';
        actionableGuidance = [
          'Review the highlighted fields carefully',
          'Manually correct any incorrect values',
          'Verify the VIN and other critical information',
          'Consider re-processing with OCR if data quality is poor'
        ];
        canRetry = false;
        break;

      case ErrorCategory.RESOURCE_CONSTRAINT:
        title = 'System Resource Issue';
        message = 'The system is running low on available resources.';
        actionableGuidance = [
          'Close other applications to free up memory',
          'Try processing a smaller or lower-resolution document',
          'Restart the application to clear memory',
          'Consider upgrading system RAM for large documents'
        ];
        canRetry = true;
        suggestedRetryParams = { 
          batchSize: 1, 
          maxImageSize: { width: 1024, height: 1024 },
          parallelProcessing: false
        };
        break;

      case ErrorCategory.NETWORK:
        title = 'Network Connection Issue';
        message = 'A network operation failed.';
        actionableGuidance = [
          'Check your internet connection',
          'The application works offline for most operations',
          'Try again when connection is restored'
        ];
        canRetry = true;
        break;

      case ErrorCategory.SYSTEM_DEPENDENCY:
        title = 'System Dependency Missing';
        message = 'A required system component is not available.';
        actionableGuidance = [
          'Check the system requirements documentation',
          'Install any missing dependencies',
          'Contact support if the issue persists'
        ];
        canRetry = false;
        break;

      default:
        title = 'Unexpected Error';
        message = 'An unexpected error occurred during processing.';
        actionableGuidance = [
          'Try the operation again',
          'Restart the application if the problem persists',
          'Check the error log for more details',
          'Contact support with the error details if needed'
        ];
        canRetry = true;
        break;
    }

    return {
      category,
      severity,
      title,
      message,
      actionableGuidance,
      technicalDetails: `${error.name}: ${error.message}`,
      canRetry,
      suggestedRetryParams
    };
  }

  /**
   * Automatic retry logic with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const defaultOptions: RetryOptions = {
      maxAttempts: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
      retryableCategories: [
        ErrorCategory.FILE_ACCESS,
        ErrorCategory.PDF_PROCESSING,
        ErrorCategory.OCR_PROCESSING,
        ErrorCategory.RESOURCE_CONSTRAINT,
        ErrorCategory.NETWORK
      ],
      ...options
    };

    let lastError: Error | null = null;
    let lastUserFriendlyError: UserFriendlyError | null = null;

    for (let attempt = 1; attempt <= defaultOptions.maxAttempts; attempt++) {
      try {
        const updatedContext = { ...context, attemptNumber: attempt };
        
        // Apply parameter adjustments if provided
        if (defaultOptions.parameterAdjustments && attempt > 1) {
          const adjustedParams = defaultOptions.parameterAdjustments(attempt);
          // Parameters would be applied by the caller
        }

        return await operation();
      } catch (error) {
        lastError = error as Error;
        const errorCategory = this.classifyError(lastError, context);
        lastUserFriendlyError = this.toUserFriendlyError(lastError, context);

        // Log the error
        this.logError(lastError, context);

        // Check if error is retryable
        if (!defaultOptions.retryableCategories.includes(errorCategory)) {
          throw lastError;
        }

        // Check if we've exhausted attempts
        if (attempt >= defaultOptions.maxAttempts) {
          throw lastError;
        }

        // Wait before retrying with exponential backoff
        const delay = defaultOptions.delayMs * Math.pow(defaultOptions.backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        console.log(`Retrying operation (attempt ${attempt + 1}/${defaultOptions.maxAttempts})...`);
      }
    }

    throw lastError;
  }

  /**
   * Graceful degradation for resource constraints
   */
  static async handleResourceConstraint<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const category = this.classifyError(error as Error, context);
      
      if (category === ErrorCategory.RESOURCE_CONSTRAINT) {
        console.log('Resource constraint detected, attempting graceful degradation...');
        this.logError(error as Error, { ...context, userAction: 'Graceful degradation triggered' });
        
        try {
          return await fallbackOperation();
        } catch (fallbackError) {
          // If fallback also fails, throw the original error
          throw error;
        }
      }
      
      throw error;
    }
  }

  /**
   * Log error with context
   */
  static logError(error: Error, context: ErrorContext): void {
    const logEntry = {
      error,
      context,
      timestamp: new Date()
    };

    this.errorLog.push(logEntry);

    // Maintain log size limit
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog.shift();
    }

    // Console logging for development
    console.error('Error logged:', {
      category: this.classifyError(error, context),
      severity: this.determineSeverity(this.classifyError(error, context), error),
      operation: context.operation,
      message: error.message,
      timestamp: logEntry.timestamp
    });
  }

  /**
   * Get error log for diagnostics
   */
  static getErrorLog(): Array<{ error: Error; context: ErrorContext; timestamp: Date }> {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Export error log for support
   */
  static exportErrorLog(): string {
    return JSON.stringify(
      this.errorLog.map(entry => ({
        timestamp: entry.timestamp.toISOString(),
        operation: entry.context.operation,
        userAction: entry.context.userAction,
        errorName: entry.error.name,
        errorMessage: entry.error.message,
        category: this.classifyError(entry.error, entry.context),
        severity: this.determineSeverity(this.classifyError(entry.error, entry.context), entry.error)
      })),
      null,
      2
    );
  }
}

/**
 * Specialized error classes for better error handling
 */
export class PDFProcessingError extends Error {
  constructor(message: string, public readonly filePath?: string) {
    super(message);
    this.name = 'PDFProcessingError';
  }
}

export class OCRProcessingError extends Error {
  constructor(message: string, public readonly confidence?: number) {
    super(message);
    this.name = 'OCRProcessingError';
  }
}

export class DataValidationError extends Error {
  constructor(message: string, public readonly field?: string, public readonly value?: any) {
    super(message);
    this.name = 'DataValidationError';
  }
}

export class ResourceConstraintError extends Error {
  constructor(message: string, public readonly resourceType?: string) {
    super(message);
    this.name = 'ResourceConstraintError';
  }
}
