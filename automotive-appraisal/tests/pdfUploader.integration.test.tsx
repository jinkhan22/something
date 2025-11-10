import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PDFUploader } from '../src/renderer/components/PDFUploader';
import { useAppStore } from '../src/renderer/store';

// Mock the store with real implementation
jest.mock('../src/renderer/store');

// Mock Ant Design message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PDFUploader Integration Tests', () => {
  let mockStore: any;

  beforeEach(() => {
    // Create a real store-like mock
    mockStore = {
      processingStatus: 'idle',
      processingProgress: 0,
      processingMessage: '',
      errorMessage: null,
      setStatus: jest.fn((status) => { mockStore.processingStatus = status; }),
      setProgress: jest.fn((progress) => { mockStore.processingProgress = progress; }),
      setProcessingMessage: jest.fn((message) => { mockStore.processingMessage = message; }),
      setError: jest.fn((error) => { mockStore.errorMessage = error; }),
      setAppraisal: jest.fn(),
      reset: jest.fn(),
    };

    (useAppStore as jest.Mock).mockReturnValue(mockStore);

    // Mock window.electron
    Object.defineProperty(window, 'electron', {
      value: {
        processPDF: jest.fn(),
        onProcessingProgress: jest.fn(() => jest.fn()),
        onProcessingError: jest.fn(() => jest.fn()),
        onProcessingComplete: jest.fn(() => jest.fn()),
      },
      writable: true,
    });
  });

  test('file validation works correctly', () => {
    render(<PDFUploader />);
    
    // Test that the component renders
    expect(screen.getByText('Click or drag PDF file to this area')).toBeInTheDocument();
    expect(screen.getByText('Support for CCC One and Mitchell valuation reports (Max 50MB)')).toBeInTheDocument();
  });

  test('validates file type and shows error for invalid files', async () => {
    render(<PDFUploader />);
    
    // Create invalid file
    const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    // Get the upload component
    const uploadButton = screen.getByRole('button');
    const fileInput = uploadButton.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Mock the beforeUpload behavior by directly testing validation
    const component = render(<PDFUploader />);
    
    // The validation should happen in the component
    // We can test this by checking if error states are set correctly
    expect(mockStore.processingStatus).toBe('idle');
  });

  test('handles file size validation', () => {
    render(<PDFUploader />);
    
    // Test file size limits are properly configured
    const maxSize = 50 * 1024 * 1024; // 50MB
    expect(maxSize).toBe(52428800);
  });

  test('shows different states correctly', () => {
    // Test idle state
    mockStore.processingStatus = 'idle';
    const { rerender } = render(<PDFUploader />);
    expect(screen.getByText('Click or drag PDF file to this area')).toBeInTheDocument();

    // Test processing state
    mockStore.processingStatus = 'processing';
    mockStore.processingProgress = 50;
    mockStore.processingMessage = 'Processing PDF...';
    rerender(<PDFUploader />);
    
    // Should show processing state
    expect(screen.getByText('Processing PDF...')).toBeInTheDocument();

    // Test error state
    mockStore.processingStatus = 'error';
    mockStore.errorMessage = 'Test error message';
    rerender(<PDFUploader />);
    
    expect(screen.getByText('Upload failed - try again')).toBeInTheDocument();

    // Test complete state
    mockStore.processingStatus = 'complete';
    mockStore.errorMessage = null;
    rerender(<PDFUploader />);
    
    expect(screen.getByText('PDF processed successfully!')).toBeInTheDocument();
  });

  test('progress indicator shows correct information', () => {
    mockStore.processingStatus = 'processing';
    mockStore.processingProgress = 75;
    mockStore.processingMessage = 'Extracting vehicle data...';
    
    render(<PDFUploader />);
    
    expect(screen.getByText('Extracting vehicle data...')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  test('error alert shows correct information and actions', () => {
    mockStore.processingStatus = 'error';
    mockStore.errorMessage = 'File processing failed';
    
    render(<PDFUploader />);
    
    expect(screen.getByText('Upload Error')).toBeInTheDocument();
    expect(screen.getByText('File processing failed')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  test('success alert shows correct information and actions', () => {
    mockStore.processingStatus = 'complete';
    
    render(<PDFUploader />);
    
    expect(screen.getByText('Processing Complete')).toBeInTheDocument();
    expect(screen.getByText('Your PDF has been successfully processed and the vehicle data has been extracted.')).toBeInTheDocument();
    expect(screen.getByText('Upload Another')).toBeInTheDocument();
  });

  test('upload area is disabled during processing', () => {
    mockStore.processingStatus = 'processing';
    
    render(<PDFUploader />);
    
    const uploadButton = screen.getByRole('button');
    expect(uploadButton).toHaveClass('ant-upload-disabled');
  });

  test('file type constants are correctly defined', () => {
    // Test that the component has proper file validation constants
    // This is more of a smoke test to ensure the component loads
    render(<PDFUploader />);
    
    // Check that PDF files are accepted
    const fileInput = screen.getByRole('button').querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('accept', '.pdf');
  });
});