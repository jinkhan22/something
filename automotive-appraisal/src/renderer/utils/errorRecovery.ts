import { ErrorType, AppError } from '../../types';
import { useAppStore } from '../store';
import { notifications } from './notifications';

/**
 * Error recovery strategies for different error types
 */
export interface RecoveryStrategy {
  canRecover: boolean;
  action?: () => Promise<void> | void;
  message?: string;
}

/**
 * Determine if an error is recoverable and provide recovery action
 */
export const getRecoveryStrategy = (error: AppError): RecoveryStrategy => {
  const store = useAppStore.getState();

  switch (error.type) {
    case ErrorType.FILE_INVALID:
    case ErrorType.FILE_TOO_LARGE:
    case ErrorType.FILE_EMPTY:
    case ErrorType.MIME_TYPE_INVALID:
    case ErrorType.EXTENSION_INVALID:
      return {
        canRecover: true,
        action: () => {
          store.resetProcessing();
          notifications.info('Please select a different file');
        },
        message: 'Select a different file'
      };

    case ErrorType.FILE_CORRUPTED:
      return {
        canRecover: true,
        action: () => {
          store.resetProcessing();
          notifications.info('Try re-downloading the PDF or selecting a different file');
        },
        message: 'Try a different file'
      };

    case ErrorType.PROCESSING_FAILED:
    case ErrorType.EXTRACTION_FAILED:
      return {
        canRecover: true,
        action: async () => {
          store.resetProcessing();
          notifications.info('You can try uploading the file again');
        },
        message: 'Retry processing'
      };

    case ErrorType.STORAGE_ERROR:
      return {
        canRecover: true,
        action: async () => {
          try {
            // Try to reload history to verify storage is working
            await store.loadHistory();
            store.clearError();
            notifications.success('Storage connection restored');
          } catch (e) {
            notifications.error('Storage is still unavailable. Please restart the application.');
          }
        },
        message: 'Retry storage operation'
      };

    case ErrorType.NETWORK_ERROR:
      return {
        canRecover: true,
        action: () => {
          store.clearError();
          notifications.info('Please check your network connection and try again');
        },
        message: 'Check network connection'
      };

    case ErrorType.PERMISSION_ERROR:
      return {
        canRecover: false,
        message: 'Please check file permissions and restart the application'
      };

    case ErrorType.UNKNOWN_ERROR:
    default:
      return {
        canRecover: true,
        action: () => {
          store.reset();
          notifications.info('Application state has been reset');
        },
        message: 'Reset application'
      };
  }
};

/**
 * Attempt to recover from an error automatically
 */
export const attemptAutoRecovery = async (error: AppError): Promise<boolean> => {
  const strategy = getRecoveryStrategy(error);
  
  if (!strategy.canRecover || !strategy.action) {
    return false;
  }

  try {
    await strategy.action();
    return true;
  } catch (recoveryError) {
    console.error('Auto-recovery failed:', recoveryError);
    return false;
  }
};

/**
 * Handle error with automatic recovery attempt
 */
export const handleErrorWithRecovery = async (error: AppError): Promise<void> => {
  const store = useAppStore.getState();
  
  // Set error in store
  store.setAppError(error);
  
  // Show error notification
  notifications.appError(error);
  
  // Attempt auto-recovery for certain error types
  const autoRecoverableTypes = [
    ErrorType.NETWORK_ERROR,
    ErrorType.STORAGE_ERROR
  ];
  
  if (autoRecoverableTypes.includes(error.type)) {
    const recovered = await attemptAutoRecovery(error);
    if (recovered) {
      console.log('Auto-recovery successful for error:', error.type);
    }
  }
};

/**
 * Create and handle an error in one call
 */
export const createAndHandleError = (
  type: ErrorType,
  message: string,
  details?: unknown,
  recoverable: boolean = true,
  suggestedAction?: string
): void => {
  const error: AppError = {
    type,
    message,
    details,
    timestamp: new Date(),
    recoverable,
    suggestedAction
  };
  
  handleErrorWithRecovery(error);
};

/**
 * Wrap an async function with error handling
 */
export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  errorType: ErrorType = ErrorType.UNKNOWN_ERROR,
  errorMessage?: string
) => {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = errorMessage || (error instanceof Error ? error.message : 'An error occurred');
      createAndHandleError(
        errorType,
        message,
        error,
        true,
        'Please try again or contact support if the issue persists'
      );
      return undefined;
    }
  };
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: Error | unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Retry attempt ${i + 1} failed, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

export const errorRecovery = {
  getRecoveryStrategy,
  attemptAutoRecovery,
  handleErrorWithRecovery,
  createAndHandleError,
  withErrorHandling,
  retryWithBackoff
};

export default errorRecovery;
