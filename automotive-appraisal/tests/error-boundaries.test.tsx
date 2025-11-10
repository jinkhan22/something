import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { AppraisalDetailErrorBoundary } from '../src/renderer/components/AppraisalDetailErrorBoundary';
import { MarketValueCalculatorErrorBoundary } from '../src/renderer/components/MarketValueCalculatorErrorBoundary';

// Mock the store
jest.mock('../src/renderer/store', () => ({
  useAppStore: {
    getState: () => ({
      createError: jest.fn(),
      clearError: jest.fn()
    })
  }
}));

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('Error Boundaries', () => {
  // Suppress console errors during tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  describe('AppraisalDetailErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <BrowserRouter>
          <AppraisalDetailErrorBoundary>
            <div>Test content</div>
          </AppraisalDetailErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should display error UI when child component throws', () => {
      render(
        <BrowserRouter>
          <AppraisalDetailErrorBoundary>
            <ThrowError />
          </AppraisalDetailErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      expect(screen.getByText(/Test error/i)).toBeInTheDocument();
    });

    it('should show Try Again button', () => {
      render(
        <BrowserRouter>
          <AppraisalDetailErrorBoundary>
            <ThrowError />
          </AppraisalDetailErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should show Back to History button', () => {
      render(
        <BrowserRouter>
          <AppraisalDetailErrorBoundary>
            <ThrowError />
          </AppraisalDetailErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Back to History')).toBeInTheDocument();
    });

    it('should show Report Issue button', () => {
      render(
        <BrowserRouter>
          <AppraisalDetailErrorBoundary>
            <ThrowError />
          </AppraisalDetailErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Report Issue')).toBeInTheDocument();
    });
  });

  describe('MarketValueCalculatorErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <MarketValueCalculatorErrorBoundary>
          <div>Calculator content</div>
        </MarketValueCalculatorErrorBoundary>
      );

      expect(screen.getByText('Calculator content')).toBeInTheDocument();
    });

    it('should display inline error UI when child component throws', () => {
      render(
        <MarketValueCalculatorErrorBoundary>
          <ThrowError />
        </MarketValueCalculatorErrorBoundary>
      );

      expect(screen.getByText('Market Value Calculation Error')).toBeInTheDocument();
      expect(screen.getByText(/Test error/i)).toBeInTheDocument();
    });

    it('should show Retry Calculation button', () => {
      render(
        <MarketValueCalculatorErrorBoundary>
          <ThrowError />
        </MarketValueCalculatorErrorBoundary>
      );

      expect(screen.getByText('Retry Calculation')).toBeInTheDocument();
    });

    it('should show troubleshooting tips', () => {
      render(
        <MarketValueCalculatorErrorBoundary>
          <ThrowError />
        </MarketValueCalculatorErrorBoundary>
      );

      expect(screen.getByText('Troubleshooting Tips:')).toBeInTheDocument();
      expect(screen.getByText(/Ensure all comparable vehicles have valid data/i)).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = jest.fn();
      
      render(
        <MarketValueCalculatorErrorBoundary onRetry={onRetry}>
          <ThrowError />
        </MarketValueCalculatorErrorBoundary>
      );

      const retryButton = screen.getByText('Retry Calculation');
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });
});
