import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { Modal } from 'antd';

interface NavigationGuardOptions {
  when: boolean;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Hook to guard navigation when certain conditions are met
 * (e.g., unsaved changes, processing in progress)
 */
export function useNavigationGuard(options: NavigationGuardOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const { when, message, onConfirm, onCancel } = options;

  const defaultMessage = 'You have unsaved changes. Are you sure you want to leave?';

  const confirmNavigation = useCallback((targetPath: string) => {
    Modal.confirm({
      title: 'Confirm Navigation',
      content: message || defaultMessage,
      okText: 'Leave',
      cancelText: 'Stay',
      onOk: () => {
        onConfirm?.();
        navigate(targetPath);
      },
      onCancel: () => {
        onCancel?.();
      },
    });
  }, [message, defaultMessage, onConfirm, onCancel, navigate]);

  return { confirmNavigation };
}

/**
 * Hook to prevent navigation during processing
 */
export function useProcessingGuard() {
  const { processingStatus } = useAppStore();
  const isProcessing = processingStatus === 'processing' || processingStatus === 'uploading';

  return useNavigationGuard({
    when: isProcessing,
    message: 'PDF processing is in progress. Leaving this page may interrupt the process. Are you sure?',
  });
}
