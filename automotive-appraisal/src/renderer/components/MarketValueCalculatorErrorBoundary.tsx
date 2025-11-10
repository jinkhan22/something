import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorType } from '../../types';
import { useAppStore } from '../store';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary specifically for MarketValueCalculator component
 * Provides inline error display with retry option without crashing the entire page
 */
class MarketValueCalculatorErrorBoundaryClass extends Component<Props, State> {
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
    console.error('MarketValueCalculator Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to store for debugging
    try {
      const store = useAppStore.getState();
      store.createError(
        ErrorType.PROCESSING_FAILED,
        `Market Value Calculation Error: ${error.message}`,
        {
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          context: 'MarketValueCalculator component'
        },
        true,
        'Try recalculating the market value or check your comparable data'
      );
    } catch (storeError) {
      console.error('Failed to log error to store:', storeError);
    }
  }

  handleRetry = () => {
    // Reset error state
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

    // Call custom retry handler if provided
    if (this.props.onRetry) {
      try {
        this.props.onRetry();
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
          <div className="flex items-start">
            {/* Error Icon */}
            <div className="flex-shrink-0">
              <svg 
                className="h-6 w-6 text-red-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>

            {/* Error Content */}
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Market Value Calculation Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  {this.state.error?.message || 'An error occurred while calculating or displaying the market value.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Calculation
                </button>
              </div>

              {/* Helpful Tips */}
              <div className="mt-4 p-3 bg-white rounded border border-red-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Troubleshooting Tips:</p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Ensure all comparable vehicles have valid data</li>
                  <li>Check that the loss vehicle information is complete</li>
                  <li>Try removing and re-adding comparables</li>
                  <li>Refresh the page if the issue persists</li>
                </ul>
              </div>

              {/* Development Details */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4 p-3 bg-white rounded border border-red-200">
                  <summary className="cursor-pointer text-xs font-medium text-gray-700 mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="space-y-2 text-xs font-mono">
                    <div>
                      <strong className="text-gray-700">Error:</strong>
                      <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-32">
                        {this.state.error?.stack}
                      </pre>
                    </div>
                    <div>
                      <strong className="text-gray-700">Component Stack:</strong>
                      <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-32">
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

// Export the error boundary
export const MarketValueCalculatorErrorBoundary = MarketValueCalculatorErrorBoundaryClass;
