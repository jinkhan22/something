import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Result } from 'antd';
import { useAppStore } from '../store';
import { ErrorType } from '../../types';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to store for debugging
    const store = useAppStore.getState();
    store.createError(
      ErrorType.UNKNOWN_ERROR,
      error.message,
      {
        stack: error.stack,
        componentStack: errorInfo.componentStack
      },
      true,
      'Try refreshing the page or restarting the application'
    );
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Clear error from store
    const store = useAppStore.getState();
    store.clearError();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          padding: '20px'
        }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle={this.state.error?.message || 'An unexpected error occurred'}
            extra={[
              <Button type="primary" key="reset" onClick={this.handleReset}>
                Try Again
              </Button>,
              <Button key="reload" onClick={this.handleReload}>
                Reload Application
              </Button>
            ]}
          >
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details style={{ 
                whiteSpace: 'pre-wrap', 
                textAlign: 'left',
                marginTop: '20px',
                padding: '10px',
                background: '#f5f5f5',
                borderRadius: '4px',
                maxWidth: '600px'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                  Error Details (Development Only)
                </summary>
                <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                  <strong>Error:</strong>
                  <pre>{this.state.error?.stack}</pre>
                  <strong>Component Stack:</strong>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </div>
              </details>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
