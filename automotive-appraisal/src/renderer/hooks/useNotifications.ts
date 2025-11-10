import { App } from 'antd';
import { ErrorType, AppError } from '../../types';

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

export const useNotifications = () => {
  const { message, notification } = App.useApp();

  /**
   * Show success notification with enhanced styling
   */
  const showSuccess = (content: string, options?: NotificationOptions) => {
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
  const showSuccessNotification = (
    title: string, 
    description?: string, 
    options?: EnhancedNotificationOptions
  ) => {
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
  const showError = (content: string, options?: NotificationOptions) => {
    message.error({
      content,
      duration: options?.duration || 6, // Errors stay longer
      onClose: options?.onClose,
      key: options?.key,
      className: 'animate-in slide-in-from-top-2 duration-300'
    });
  };

  /**
   * Show success notification for common actions
   */
  const showActionSuccess = (action: string, details?: string) => {
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

  return {
    success: showSuccess,
    successNotification: showSuccessNotification,
    error: showError,
    actionSuccess: showActionSuccess,
    message,
    notification
  };
};