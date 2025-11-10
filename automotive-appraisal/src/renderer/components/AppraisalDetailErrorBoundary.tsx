import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorType } from '../../types';
import { useAppStore } from '../store';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary specifically for AppraisalDetail page
 * Provides fallback UI with navigation options and error reporting
 */
class AppraisalDetailErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppraisalDetail Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to store for debugging
    try {
      const store = useAppStore.getState();
      store.createError(
        ErrorType.UNKNOWN_ERROR,
        `Appraisal Detail Error: ${error.message}`,
        {
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          context: 'AppraisalDetail page'
        },
        true,
        'Try going back to history and reopening the appraisal'
      );
    } catch (storeError) {
      console.error('Failed to log error to store:', storeError);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Clear error from store
    try {
      const store = useAppStore.getState();
      store.clearError();
    } catch (err) {
      console.error('Failed to clear error from store:', err);
    }
  };

  handleReportIssue = () => {
    const errorDetails = {
      message: this.state.error?.message || 'Unknown error',
      stack: this.state.error?.stack || 'No stack trace',
      componentStack: this.state.errorInfo?.componentStack || 'No component stack',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Create a formatted error report
    const reportText = `
Error Report - Appraisal Detail
================================
Time: ${errorDetails.timestamp}
URL: ${errorDetails.url}
User Agent: ${errorDetails.userAgent}

Error Message:
${errorDetails.message}

Stack Trace:
${errorDetails.stack}

Component Stack:
${errorDetails.componentStack}
    `.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(reportText).then(() => {
      alert('Error details copied to clipboard. Please share this with support.');
    }).catch(() => {
      // Fallback: show in console
      console.log('Error Report:', reportText);
      alert('Error details logged to console. Please check the console and share with support.');
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
            <div className="text-center">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg 
                  className="h-10 w-10 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>

              {/* Error Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Something Went Wrong
              </h2>

              {/* Error Message */}
              <p className="text-gray-600 mb-6">
                {this.state.error?.message || 'An unexpected error occurred while displaying the appraisal details.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <button
                  onClick={this.handleReset}
                  className="btn-primary inline-flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
                
                <BackToHistoryButton />
                
                <button
                  onClick={this.handleReportIssue}
                  className="btn-secondary inline-flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Report Issue
                </button>
              </div>

              {/* Development Details */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="text-left mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <strong className="text-gray-700">Error:</strong>
                      <pre className="mt-1 p-2 bg-white rounded border border-gray-200 overflow-auto">
                        {this.state.error?.stack}
                      </pre>
                    </div>
                    <div>
                      <strong className="text-gray-700">Component Stack:</strong>
                      <pre className="mt-1 p-2 bg-white rounded border border-gray-200 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Helper component to handle navigation (needs to be inside Router context)
function BackToHistoryButton() {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate('/history')}
      className="btn-secondary inline-flex items-center justify-center"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to History
    </button>
  );
}

// Export the error boundary
export const AppraisalDetailErrorBoundary = AppraisalDetailErrorBoundaryClass;
