import React from 'react';
import { formatErrorForDisplay } from '../services/errorMessageMapper';

export interface ErrorRecoveryUIProps {
  error: Error | string | unknown;
  onRetry?: () => void;
  onReportIssue?: () => void;
  onDismiss?: () => void;
  showRetry?: boolean;
  showReportIssue?: boolean;
  className?: string;
}

/**
 * ErrorRecoveryUI Component
 * 
 * Displays error messages with recovery options (Retry, Report Issue, Dismiss).
 * Maps technical errors to user-friendly messages automatically.
 */
export const ErrorRecoveryUI: React.FC<ErrorRecoveryUIProps> = ({
  error,
  onRetry,
  onReportIssue,
  onDismiss,
  showRetry = true,
  showReportIssue = true,
  className = ''
}) => {
  const errorInfo = formatErrorForDisplay(error);

  const handleReportIssue = () => {
    if (onReportIssue) {
      onReportIssue();
    } else {
      // Default behavior: copy error details to clipboard
      const errorDetails = error instanceof Error 
        ? `Error: ${error.message}\n\nStack: ${error.stack}`
        : `Error: ${String(error)}`;
      
      navigator.clipboard.writeText(errorDetails).then(() => {
        alert('Error details copied to clipboard. Please email them to support.');
      }).catch(() => {
        alert('Failed to copy error details. Please manually copy the error message.');
      });
    }
  };

  return (
    <div
      className={`bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        {/* Error Icon */}
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-red-600"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Error Content */}
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-red-900 mb-1">
            {errorInfo.title}
          </h3>
          <p className="text-sm text-red-800 mb-2">
            {errorInfo.message}
          </p>
          {errorInfo.action && (
            <p className="text-sm text-red-700 bg-red-100 p-2 rounded border border-red-200 mb-3">
              <span className="font-semibold">What to do:</span> {errorInfo.action}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {showRetry && onRetry && errorInfo.isRecoverable && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Retry
              </button>
            )}

            {showReportIssue && (
              <button
                onClick={handleReportIssue}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-white hover:bg-red-50 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Report Issue
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {/* Close Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 flex-shrink-0 text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
            aria-label="Dismiss error"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Compact error recovery UI for inline display
 */
export const CompactErrorRecoveryUI: React.FC<ErrorRecoveryUIProps> = ({
  error,
  onRetry,
  onDismiss,
  showRetry = true,
  className = ''
}) => {
  const errorInfo = formatErrorForDisplay(error);

  return (
    <div
      className={`flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md ${className}`}
      role="alert"
    >
      <div className="flex items-center flex-1 min-w-0">
        <svg
          className="w-5 h-5 text-red-600 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <p className="ml-2 text-sm text-red-800 truncate">
          {errorInfo.message}
        </p>
      </div>

      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        {showRetry && onRetry && errorInfo.isRecoverable && (
          <button
            onClick={onRetry}
            className="text-sm font-medium text-red-700 hover:text-red-900 focus:outline-none focus:underline"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 focus:outline-none"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
