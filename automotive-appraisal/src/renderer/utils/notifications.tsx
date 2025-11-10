import { App } from 'antd';
import { ErrorType, AppError } from '../../types';

// Helper to get App context - must be called within a React component
let appInstance: ReturnType<typeof App.useApp> | null = null;

export const setAppInstance = (instance: ReturnType<typeof App.useApp>) => {
  appInstance = instance;
};

const getAppInstance = () => {
  if (!appInstance) {
    console.warn('App instance not initialized. Make sure to call setAppInstance in your root component.');
    // Return mock functions to prevent crashes
    return {
      message: {
        success: () => {},
        error: () => {},
        warning: () => {},
        info: () => {},
        loading: () => {},
        destroy: () => {}
      },
      notification: {
        success: () => {},
        error: () => {},
        warning: () => {},
        info: () => {},
        close: () => {},
        destroy: () => {}
      }
    } as any;
  }
  return appInstance;
};

export interface NotificationOptions {
  duration?: number;
  onClose?: () => void;
  key?: string;
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}

export interface EnhancedNotificationOptions extends NotificationOptions {
  description?: string;
  icon?: React.ReactNode;
  btn?: React.ReactNode;
  showProgress?: boolean;
}

/**
 * Show success notification with enhanced styling
 */
export const showSuccess = (content: string, options?: NotificationOptions) => {
  const { message } = getAppInstance();
  message.success({
    content,
    duration: options?.duration || 3,
    onClose: options?.onClose,
    key: options?.key,
    className: 'animate-in slide-in-from-top-2 duration-300'
  });
};

/**
 * Show enhanced success notification with description
 */
export const showSuccessNotification = (
  title: string, 
  description?: string, 
  options?: EnhancedNotificationOptions
) => {
  const { notification } = getAppInstance();
  notification.success({
    message: title,
    description,
    duration: options?.duration || 4,
    placement: options?.placement || 'topRight',
    onClose: options?.onClose,
    key: options?.key,
    icon: options?.icon,
    btn: options?.btn,
    className: 'animate-in slide-in-from-right-2 duration-300'
  });
};

/**
 * Show error notification
 */
export const showError = (content: string, options?: NotificationOptions) => {
  const { message } = getAppInstance();
  message.error({
    content,
    duration: options?.duration || 6, // Errors stay longer
    onClose: options?.onClose,
    key: options?.key,
    className: 'animate-in slide-in-from-top-2 duration-300'
  });
};

/**
 * Show enhanced error notification with description
 */
export const showErrorNotification = (
  title: string, 
  description?: string, 
  options?: EnhancedNotificationOptions
) => {
  const { notification } = getAppInstance();
  notification.error({
    message: title,
    description,
    duration: options?.duration || 6,
    placement: options?.placement || 'topRight',
    onClose: options?.onClose,
    key: options?.key,
    icon: options?.icon,
    btn: options?.btn,
    className: 'animate-in slide-in-from-right-2 duration-300'
  });
};

/**
 * Show warning notification
 */
export const showWarning = (content: string, options?: NotificationOptions) => {
  const { message } = getAppInstance();
  message.warning({
    content,
    duration: options?.duration || 5,
    onClose: options?.onClose,
    key: options?.key,
    className: 'animate-in slide-in-from-top-2 duration-300'
  });
};

/**
 * Show info notification
 */
export const showInfo = (content: string, options?: NotificationOptions) => {
  const { message } = getAppInstance();
  message.info({
    content,
    duration: options?.duration || 4,
    onClose: options?.onClose,
    key: options?.key,
    className: 'animate-in slide-in-from-top-2 duration-300'
  });
};

/**
 * Show loading notification with progress
 */
export const showLoading = (content: string, key?: string) => {
  const { message } = getAppInstance();
  return message.loading({
    content,
    duration: 0, // Loading messages don't auto-dismiss
    key,
    className: 'animate-in slide-in-from-top-2 duration-300'
  });
};

/**
 * Show progress notification that can be updated
 */
export const showProgressNotification = (
  title: string,
  progress: number,
  key: string = 'progress'
) => {
  const { notification } = getAppInstance();
  const description = (
    <div className="space-y-2">
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="text-xs text-gray-500">{Math.round(progress)}% complete</div>
    </div>
  );

  notification.info({
    message: title,
    description,
    duration: 0,
    key,
    placement: 'topRight',
    className: 'animate-in slide-in-from-right-2 duration-300'
  });
};

/**
 * Update progress notification
 */
export const updateProgressNotification = (
  title: string,
  progress: number,
  key: string = 'progress'
) => {
  const { notification } = getAppInstance();
  if (progress >= 100) {
    notification.close(key);
    showSuccessNotification(title, 'Operation completed successfully!');
  } else {
    showProgressNotification(title, progress, key);
  }
};

/**
 * Destroy all notifications
 */
export const destroyAll = () => {
  const { message, notification } = getAppInstance();
  message.destroy();
  notification.destroy();
};

/**
 * Show error notification based on AppError
 */
export const showAppError = (error: AppError, options?: NotificationOptions) => {
  const content = error.suggestedAction 
    ? `${error.message}. ${error.suggestedAction}`
    : error.message;
  
  showErrorNotification(
    'Error',
    content,
    {
      ...options,
      duration: options?.duration || 6
    }
  );
};

/**
 * Show error notification based on ErrorType with default messages
 */
export const showErrorByType = (type: ErrorType, customMessage?: string, options?: NotificationOptions) => {
  const defaultMessages: Record<ErrorType, string> = {
    [ErrorType.FILE_INVALID]: 'Invalid file format. Please select a valid PDF file.',
    [ErrorType.FILE_TOO_LARGE]: 'File is too large. Maximum size is 50MB.',
    [ErrorType.FILE_EMPTY]: 'File is empty. Please select a valid PDF file.',
    [ErrorType.FILE_CORRUPTED]: 'File appears to be corrupted. Please try another file.',
    [ErrorType.MIME_TYPE_INVALID]: 'Invalid file type. Only PDF files are supported.',
    [ErrorType.EXTENSION_INVALID]: 'Invalid file extension. Please select a .pdf file.',
    [ErrorType.PROCESSING_FAILED]: 'Failed to process the PDF. Please try again.',
    [ErrorType.EXTRACTION_FAILED]: 'Failed to extract vehicle data from the PDF.',
    [ErrorType.STORAGE_ERROR]: 'Failed to save data. Please check your storage permissions.',
    [ErrorType.NETWORK_ERROR]: 'Network error occurred. Please check your connection.',
    [ErrorType.PERMISSION_ERROR]: 'Permission denied. Please check your file permissions.',
    [ErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
  };

  const message = customMessage || defaultMessages[type];
  showErrorNotification('Error', message, options);
};

/**
 * Show processing progress notification
 */
export const showProcessingProgress = (progress: number, statusMessage: string) => {
  showProgressNotification(statusMessage, progress, 'processing');
};

/**
 * Show success notification for common actions
 */
export const showActionSuccess = (action: string, details?: string) => {
  const messages = {
    save: 'Saved successfully',
    delete: 'Deleted successfully',
    update: 'Updated successfully',
    create: 'Created successfully',
    export: 'Exported successfully',
    import: 'Imported successfully',
    calculate: 'Calculation completed',
    upload: 'Upload completed'
  };

  const title = messages[action as keyof typeof messages] || `${action} completed`;
  showSuccessNotification(title, details);
};

/**
 * Notification helper for common scenarios
 */
export const notifications = {
  success: showSuccess,
  successNotification: showSuccessNotification,
  error: showError,
  errorNotification: showErrorNotification,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  progress: showProgressNotification,
  updateProgress: updateProgressNotification,
  destroyAll,
  appError: showAppError,
  errorByType: showErrorByType,
  processingProgress: showProcessingProgress,
  actionSuccess: showActionSuccess
};

export default notifications;
