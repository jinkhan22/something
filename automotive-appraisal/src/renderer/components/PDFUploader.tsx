import React, { useEffect, useCallback } from 'react';
import { Upload, Progress, Alert, Tooltip } from 'antd';
import { InboxOutlined, FileTextOutlined, CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAppStore } from '../store';
import { ErrorType } from '../../types';
import { useNotifications } from '../hooks/useNotifications';

const { Dragger } = Upload;

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MIN_FILE_SIZE = 1024; // 1KB minimum
const ALLOWED_MIME_TYPES = ['application/pdf'];
const ALLOWED_EXTENSIONS = ['.pdf'];

// Error messages with user-friendly explanations and suggestions
const ERROR_MESSAGES: Record<ErrorType, {
  title: string;
  getMessage: (...args: unknown[]) => string;
  suggestion: string;
}> = {
  [ErrorType.EXTENSION_INVALID]: {
    title: 'Invalid File Type',
    getMessage: (...args: unknown[]) => `Only PDF files are supported. You selected a ${String(args[0] || '')} file.`,
    suggestion: 'Please select a PDF file (.pdf extension) and try again.'
  },
  [ErrorType.MIME_TYPE_INVALID]: {
    title: 'Invalid File Format',
    getMessage: (...args: unknown[]) => `Expected a PDF file, but received ${String(args[0] || 'unknown')} format.`,
    suggestion: 'Make sure the file is a valid PDF document.'
  },
  [ErrorType.FILE_TOO_LARGE]: {
    title: 'File Too Large',
    getMessage: (...args: unknown[]) => `File size is ${String(args[0] || '')}MB, but maximum allowed is ${String(args[1] || '')}MB.`,
    suggestion: 'Try compressing the PDF or use a smaller file.'
  },
  [ErrorType.FILE_EMPTY]: {
    title: 'Empty File',
    getMessage: () => 'The selected file appears to be empty or corrupted.',
    suggestion: 'Please check the file and try uploading a different PDF.'
  },
  [ErrorType.FILE_CORRUPTED]: {
    title: 'Corrupted File',
    getMessage: () => 'The PDF file appears to be corrupted or damaged.',
    suggestion: 'Try opening the file in a PDF viewer to verify it works, then try uploading again.'
  },
  [ErrorType.PROCESSING_FAILED]: {
    title: 'Processing Failed',
    getMessage: (...args: unknown[]) => String(args[0] || 'Unable to process the PDF file.'),
    suggestion: 'This might be due to an unsupported PDF format. Try with a different file.'
  },
  [ErrorType.EXTRACTION_FAILED]: {
    title: 'Data Extraction Failed',
    getMessage: () => 'Could not extract vehicle information from this PDF.',
    suggestion: 'Make sure this is a CCC One or Mitchell valuation report.'
  },
  [ErrorType.FILE_INVALID]: {
    title: 'Invalid File',
    getMessage: () => 'The selected file is not valid.',
    suggestion: 'Please select a valid PDF file and try again.'
  },
  [ErrorType.STORAGE_ERROR]: {
    title: 'Storage Error',
    getMessage: (...args: unknown[]) => String(args[0] || 'Failed to save the processed data.'),
    suggestion: 'Please try again or check available storage space.'
  },
  [ErrorType.NETWORK_ERROR]: {
    title: 'Network Error',
    getMessage: (...args: unknown[]) => String(args[0] || 'Network connection failed.'),
    suggestion: 'Please check your internet connection and try again.'
  },
  [ErrorType.PERMISSION_ERROR]: {
    title: 'Permission Error',
    getMessage: (...args: unknown[]) => String(args[0] || 'Insufficient permissions to access the file.'),
    suggestion: 'Please check file permissions and try again.'
  },
  [ErrorType.UNKNOWN_ERROR]: {
    title: 'Unknown Error',
    getMessage: (...args: unknown[]) => String(args[0] || 'An unexpected error occurred.'),
    suggestion: 'Please try again or contact support if the problem persists.'
  }
};

export function PDFUploader() {
  const { message } = useNotifications();
  const { 
    setStatus, 
    setAppraisal, 
    setError, 
    setProgress, 
    processingStatus, 
    processingProgress, 
    errorMessage,
    setProcessingMessage,
    processingMessage,
    ocrProcessingActive,
    ocrConfidence,
    extractionMethod,
    setOCRStatus,
    setExtractionMethod,
    settings
  } = useAppStore();
  
  const [assetsAvailable, setAssetsAvailable] = React.useState<boolean>(true);
  const [checkingAssets, setCheckingAssets] = React.useState<boolean>(true);
  
  // Enhanced file validation with detailed error types
  const validateFile = (file: File): { isValid: boolean; errorType?: ErrorType; errorDetails?: Record<string, unknown> } => {
    // Check file extension
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return { 
        isValid: false, 
        errorType: ErrorType.EXTENSION_INVALID,
        errorDetails: { extension: fileExtension, fileName: file.name }
      };
    }
    
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { 
        isValid: false, 
        errorType: ErrorType.MIME_TYPE_INVALID,
        errorDetails: { mimeType: file.type, fileName: file.name }
      };
    }
    
    // Check if file is empty
    if (file.size === 0) {
      return { 
        isValid: false, 
        errorType: ErrorType.FILE_EMPTY,
        errorDetails: { fileName: file.name }
      };
    }
    
    // Check minimum file size (PDFs should be at least 1KB)
    if (file.size < MIN_FILE_SIZE) {
      return { 
        isValid: false, 
        errorType: ErrorType.FILE_CORRUPTED,
        errorDetails: { size: file.size, fileName: file.name }
      };
    }
    
    // Check maximum file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      return { 
        isValid: false, 
        errorType: ErrorType.FILE_TOO_LARGE,
        errorDetails: { sizeMB, maxSizeMB, fileName: file.name }
      };
    }
    
    return { isValid: true };
  };

  // Generate user-friendly error message
  const getErrorMessage = (errorType: ErrorType, errorDetails?: Record<string, unknown>): { message: string; suggestion: string } => {
    const errorConfig = ERROR_MESSAGES[errorType];
    if (!errorConfig) {
      return {
        message: 'An unexpected error occurred.',
        suggestion: 'Please try again or contact support if the problem persists.'
      };
    }

    let message: string;
    switch (errorType) {
      case ErrorType.EXTENSION_INVALID:
        message = errorConfig.getMessage(errorDetails?.extension);
        break;
      case ErrorType.MIME_TYPE_INVALID:
        message = errorConfig.getMessage(errorDetails?.mimeType);
        break;
      case ErrorType.FILE_TOO_LARGE:
        message = errorConfig.getMessage(errorDetails?.sizeMB, errorDetails?.maxSizeMB);
        break;
      default:
        message = errorConfig.getMessage(errorDetails?.details);
    }

    return {
      message: `${errorConfig.title}: ${message}`,
      suggestion: errorConfig.suggestion
    };
  };
  
  // Convert file to buffer with proper error handling
  const fileToBuffer = async (file: File): Promise<Uint8Array> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Check asset availability on mount
  useEffect(() => {
    const checkAssets = async () => {
      if (window.electron && window.electron.checkAssetsAvailable) {
        try {
          const available = await window.electron.checkAssetsAvailable();
          setAssetsAvailable(available);
          if (!available) {
            setStatus('error');
            setError('OCR assets are missing. PDF upload functionality is disabled. Please reinstall the application.');
          }
        } catch (error) {
          console.error('Failed to check asset availability:', error);
          setAssetsAvailable(false);
        } finally {
          setCheckingAssets(false);
        }
      } else {
        setCheckingAssets(false);
      }
    };
    
    checkAssets();
  }, [setStatus, setError]);
  
  // Set up progress and error event listeners
  useEffect(() => {
    let progressCleanup: (() => void) | undefined;
    let errorCleanup: (() => void) | undefined;
    let completeCleanup: (() => void) | undefined;
    
    if (window.electron) {
      // Listen for progress updates from main process
      progressCleanup = window.electron.onProcessingProgress((data) => {
        setProgress(data.progress);
        setProcessingMessage(data.message);
      });
      
      // Listen for processing errors
      errorCleanup = window.electron.onProcessingError((error) => {
        setStatus('error');
        setError(error.message);
        message.error(error.message);
      });
      
      // Listen for processing completion
      completeCleanup = window.electron.onProcessingComplete((data) => {
        if (data.success) {
          setStatus('complete');
          setProgress(100);
          message.success('PDF processed successfully!');
        } else {
          setStatus('error');
          setError(data.error || 'Processing failed');
          message.error(data.error || 'Processing failed');
        }
      });
    }
    
    // Cleanup listeners on unmount
    return () => {
      progressCleanup?.();
      errorCleanup?.();
      completeCleanup?.();
    };
  }, [setProgress, setProcessingMessage, setStatus, setError]);
  
  const handleUpload = useCallback(async (file: File) => {
    try {
      // Reset state
      setError(null);
      setProgress(0);
      setProcessingMessage('');
      setOCRStatus(false, 0);
      setExtractionMethod(null);
      
      // Check if window.electron is available
      if (!window.electron) {
        throw new Error('Electron API not available. Please restart the application.');
      }
      
      // Check if assets are available
      if (!assetsAvailable) {
        throw new Error('OCR assets are missing. PDF processing is disabled. Please reinstall the application.');
      }
      
      // Validate file
      const validation = validateFile(file);
      
      if (!validation.isValid && validation.errorType) {
        const errorInfo = getErrorMessage(validation.errorType, validation.errorDetails);
        setStatus('error');
        setError(`${errorInfo.message}\n\n${errorInfo.suggestion}`);
        message.error(errorInfo.message);
        return false;
      }
      
      setStatus('uploading');
      setProgress(10);
      setProcessingMessage('Reading file...');
      
      // Convert file to buffer
      const buffer = await fileToBuffer(file);
      setProgress(20);
      setProcessingMessage('File loaded, starting processing...');
      
      setStatus('processing');
      
      // Send to main process for extraction
      const result = await window.electron.processPDF(buffer);
      
      if (result && result.success && result.extractedData) {
        // Capture OCR-specific metadata
        if (result.extractionMethod) {
          setExtractionMethod(result.extractionMethod);
        }
        if (result.ocrConfidence !== undefined) {
          setOCRStatus(result.extractionMethod === 'ocr' || result.extractionMethod === 'hybrid', result.ocrConfidence);
        }
        
        setAppraisal(result.extractedData);
        setStatus('complete');
        setProgress(100);
        setProcessingMessage('Processing complete!');
        
        // Show method-specific success message
        const methodText = result.extractionMethod === 'ocr' ? ' (OCR)' : 
                          result.extractionMethod === 'hybrid' ? ' (Hybrid)' : '';
        message.success(`PDF processed successfully${methodText}! Extracted data for ${result.extractedData.year} ${result.extractedData.make} ${result.extractedData.model}`);
      } else {
        setStatus('error');
        const errorMsg = result?.errors?.[0] || 'Processing failed - unknown error';
        setError(errorMsg);
        message.error(errorMsg);
      }
    } catch (error) {
      setStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF';
      setError(errorMessage);
      message.error(errorMessage);
    }
    
    return false; // Prevent default upload
  }, [setStatus, setError, setProgress, setProcessingMessage, setAppraisal, assetsAvailable]);
  
  const isProcessing = processingStatus === 'uploading' || processingStatus === 'processing';
  const hasError = processingStatus === 'error';
  const isComplete = processingStatus === 'complete';
  const isDisabled = isProcessing || !assetsAvailable || checkingAssets;
  
  // Get appropriate icon based on status
  const getStatusIcon = () => {
    if (isComplete) return <CheckCircleOutlined className="text-4xl text-green-600" />;
    if (hasError) return <ExclamationCircleOutlined className="text-4xl text-red-600" />;
    if (isProcessing) return <FileTextOutlined className="text-4xl text-blue-600 animate-pulse" />;
    return <InboxOutlined className="text-4xl text-blue-600" />;
  };
  
  // Get appropriate text based on status
  const getStatusText = () => {
    if (checkingAssets) return 'Checking system requirements...';
    if (!assetsAvailable) return 'PDF upload disabled - OCR assets missing';
    if (isComplete) return 'PDF processed successfully!';
    if (hasError) return 'Upload failed - try again';
    if (isProcessing) return processingMessage || 'Processing...';
    return 'Click or drag PDF file to this area';
  };
  
  return (
    <div className="space-y-4">
      {/* Asset unavailability warning */}
      {!checkingAssets && !assetsAvailable && (
        <Alert
          message={
            <div className="flex items-center gap-2">
              <ExclamationCircleOutlined className="text-red-500" />
              <span className="font-semibold">OCR Assets Missing</span>
            </div>
          }
          description={
            <div className="space-y-2">
              <p className="text-gray-700">
                The application cannot process PDFs because required OCR (Optical Character Recognition) assets are missing.
              </p>
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-md border-l-4 border-red-400">
                <InfoCircleOutlined className="text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <strong>Solution:</strong> Please reinstall the application to restore the missing OCR components. 
                  If the problem persists after reinstalling, contact support.
                </div>
              </div>
            </div>
          }
          type="error"
          showIcon={false}
          closable={false}
        />
      )}
      
      <Dragger
        accept=".pdf"
        showUploadList={false}
        beforeUpload={handleUpload}
        disabled={isDisabled}
        className={`h-64 transition-all duration-300 ${
          !assetsAvailable ? 'border-red-300 bg-red-50 border-2 cursor-not-allowed' :
          checkingAssets ? 'border-gray-300 bg-gray-50 border-2' :
          hasError ? 'border-red-300 bg-red-50 border-2' : 
          isComplete ? 'border-green-300 bg-green-50 border-2' : 
          isProcessing ? 'border-blue-400 bg-blue-50 border-2' :
          'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <p className="ant-upload-drag-icon">
          {getStatusIcon()}
        </p>
        <p className={`ant-upload-text font-medium ${
          hasError ? 'text-red-700' : 
          isComplete ? 'text-green-700' : 
          'text-gray-900'
        }`}>
          {getStatusText()}
        </p>
        <div className="ant-upload-hint text-gray-500 space-y-1">
          <p>Support for CCC One and Mitchell valuation reports</p>
          <div className="text-xs text-gray-400 flex items-center justify-center gap-4">
            <span>• PDF files only</span>
            <span>• Max 50MB</span>
            <span>• Min 1KB</span>
          </div>
        </div>
      </Dragger>
      
      {/* Enhanced progress indicator with OCR status */}
      {isProcessing && (
        <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
          <div className="space-y-3">
            {/* Progress header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-800">
                  {processingStatus === 'uploading' ? 'Uploading File' : 'Processing PDF'}
                </span>
                {ocrProcessingActive && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    OCR Active
                  </span>
                )}
              </div>
              <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {processingProgress}%
              </span>
            </div>
            
            {/* Progress bar */}
            <Progress 
              percent={processingProgress} 
              showInfo={false}
              strokeColor={{
                '0%': '#3b82f6',
                '50%': '#1d4ed8',
                '100%': '#059669'
              }}
              trailColor="#e5e7eb"
              size={8}
            />
            
            {/* Current status message */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileTextOutlined className="text-blue-500" />
              <span>{processingMessage || 'Processing your PDF file...'}</span>
            </div>
            
            {/* OCR-specific information */}
            {ocrProcessingActive && (
              <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <InfoCircleOutlined className="text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-purple-700 space-y-1">
                    <p className="font-semibold">OCR Processing Active</p>
                    <p>Using Optical Character Recognition to extract text from images. This may take longer but works with scanned documents.</p>
                    {ocrConfidence > 0 && (
                      <p className="mt-2">
                        <span className="font-medium">OCR Confidence: </span>
                        <span className={`font-semibold ${
                          ocrConfidence >= settings.confidenceThresholds.warning ? 'text-green-600' : 
                          ocrConfidence >= settings.confidenceThresholds.error ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {ocrConfidence}%
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Progress stages indicator */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <div className={`flex items-center gap-1 ${processingProgress >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${processingProgress >= 20 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Upload</span>
              </div>
              <div className={`flex items-center gap-1 ${processingProgress >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${processingProgress >= 50 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Analysis</span>
              </div>
              <div className={`flex items-center gap-1 ${processingProgress >= 80 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${processingProgress >= 80 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Extraction</span>
              </div>
              <div className={`flex items-center gap-1 ${processingProgress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${processingProgress >= 100 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Complete</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced error display */}
      {hasError && errorMessage && (
        <Alert
          message={
            <div className="flex items-center gap-2">
              <ExclamationCircleOutlined className="text-red-500" />
              <span className="font-semibold">Upload Failed</span>
            </div>
          }
          description={
            <div className="space-y-2">
              <div className="text-gray-700">
                {errorMessage.split('\n\n')[0]}
              </div>
              {errorMessage.split('\n\n')[1] && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
                  <InfoCircleOutlined className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <strong>Suggestion:</strong> {errorMessage.split('\n\n')[1]}
                  </div>
                </div>
              )}
            </div>
          }
          type="error"
          showIcon={false}
          closable
          onClose={() => {
            setError(null);
            setStatus('idle');
          }}
          action={
            <div className="flex gap-2">
              <Tooltip title="Clear error and try uploading another file">
                <button
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium border border-red-300 rounded hover:bg-red-50 transition-colors"
                  onClick={() => {
                    setError(null);
                    setStatus('idle');
                    setProgress(0);
                    setProcessingMessage('');
                  }}
                >
                  Try Again
                </button>
              </Tooltip>
            </div>
          }
        />
      )}
      
      {/* Enhanced success display with OCR information */}
      {isComplete && (
        <Alert
          message={
            <div className="flex items-center gap-2">
              <CheckCircleOutlined className="text-green-500" />
              <span className="font-semibold">Processing Complete!</span>
              {extractionMethod && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {extractionMethod === 'ocr' ? 'OCR' : extractionMethod === 'hybrid' ? 'Hybrid' : 'Standard'}
                </span>
              )}
            </div>
          }
          description={
            <div className="space-y-3">
              <p className="text-gray-700">
                Your PDF has been successfully processed and the vehicle data has been extracted.
              </p>
              
              {/* OCR warning if applicable */}
              {(extractionMethod === 'ocr' || extractionMethod === 'hybrid') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <ExclamationCircleOutlined className="text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800 space-y-1">
                      <p className="font-semibold">OCR Processing Used</p>
                      <p>
                        This document was processed using Optical Character Recognition. 
                        Please verify the extracted data for accuracy.
                      </p>
                      {ocrConfidence > 0 && (
                        <p className="mt-2">
                          <span className="font-medium">OCR Confidence: </span>
                          <span className={`font-semibold ${
                            ocrConfidence >= settings.confidenceThresholds.warning ? 'text-green-600' : 
                            ocrConfidence >= settings.confidenceThresholds.error ? 'text-yellow-600' : 
                            'text-red-600'
                          }`}>
                            {ocrConfidence}%
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Processing summary */}
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <div className="text-sm text-green-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>✓ File uploaded and validated</span>
                    <span className="text-xs text-green-600">100%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>✓ PDF structure analyzed</span>
                    <span className="text-xs text-green-600">100%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>✓ Vehicle data extracted {extractionMethod === 'ocr' ? '(OCR)' : extractionMethod === 'hybrid' ? '(Hybrid)' : ''}</span>
                    <span className="text-xs text-green-600">100%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>✓ Data saved successfully</span>
                    <span className="text-xs text-green-600">100%</span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                You can now view the extracted data or upload another PDF file.
              </p>
            </div>
          }
          type="success"
          showIcon={false}
          closable
          onClose={() => {
            setStatus('idle');
            setOCRStatus(false, 0);
            setExtractionMethod(null);
          }}
          action={
            <div className="flex gap-2">
              <Tooltip title="Upload another PDF file">
                <button
                  className="px-3 py-1 text-sm text-green-600 hover:text-green-800 font-medium border border-green-300 rounded hover:bg-green-50 transition-colors"
                  onClick={() => {
                    setStatus('idle');
                    setProgress(0);
                    setProcessingMessage('');
                    setOCRStatus(false, 0);
                    setExtractionMethod(null);
                  }}
                >
                  Upload Another
                </button>
              </Tooltip>
            </div>
          }
        />
      )}

      {/* File requirements info (shown when idle) */}
      {processingStatus === 'idle' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <InfoCircleOutlined className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-blue-900">File Requirements</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  <span>PDF format only (.pdf extension)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  <span>File size between 1KB and 50MB</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  <span>CCC One or Mitchell valuation reports work best</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}