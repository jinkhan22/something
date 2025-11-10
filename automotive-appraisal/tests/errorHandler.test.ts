/**
 * Tests for Error Handler Service
 */

import {
  ErrorHandler,
  ErrorCategory,
  ErrorSeverity,
  PDFProcessingError,
  OCRProcessingError,
  DataValidationError,
  ResourceConstraintError,
  ErrorContext
} from '../src/main/services/errorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    ErrorHandler.clearErrorLog();
  });

  describe('classifyError', () => {
    const context: ErrorContext = {
      operation: 'test',
      timestamp: new Date(),
      userAction: 'testing'
    };

    it('should classify file access errors', () => {
      const error1 = new Error('ENOENT: file not found');
      expect(ErrorHandler.classifyError(error1, context)).toBe(ErrorCategory.FILE_ACCESS);

      const error2 = new Error('EACCES: permission denied');
      expect(ErrorHandler.classifyError(error2, context)).toBe(ErrorCategory.FILE_ACCESS);

      const error3 = new Error('EPERM: operation not permitted');
      expect(ErrorHandler.classifyError(error3, context)).toBe(ErrorCategory.FILE_ACCESS);
    });

    it('should classify PDF processing errors', () => {
      const error1 = new Error('Invalid PDF structure');
      expect(ErrorHandler.classifyError(error1, context)).toBe(ErrorCategory.PDF_PROCESSING);

      const error2 = new Error('PDF is corrupted');
      expect(ErrorHandler.classifyError(error2, context)).toBe(ErrorCategory.PDF_PROCESSING);

      const error3 = new PDFProcessingError('Failed to parse PDF');
      expect(ErrorHandler.classifyError(error3, context)).toBe(ErrorCategory.PDF_PROCESSING);
    });

    it('should classify OCR processing errors', () => {
      const error1 = new Error('Tesseract worker failed');
      expect(ErrorHandler.classifyError(error1, context)).toBe(ErrorCategory.OCR_PROCESSING);

      const error2 = new Error('OCR confidence too low');
      expect(ErrorHandler.classifyError(error2, context)).toBe(ErrorCategory.OCR_PROCESSING);

      const error3 = new OCRProcessingError('Image conversion failed');
      expect(ErrorHandler.classifyError(error3, context)).toBe(ErrorCategory.OCR_PROCESSING);
    });

    it('should classify resource constraint errors', () => {
      const error1 = new Error('ENOMEM: out of memory');
      expect(ErrorHandler.classifyError(error1, context)).toBe(ErrorCategory.RESOURCE_CONSTRAINT);

      const error2 = new Error('Heap out of memory');
      expect(ErrorHandler.classifyError(error2, context)).toBe(ErrorCategory.RESOURCE_CONSTRAINT);

      const error3 = new ResourceConstraintError('EMFILE: Too many open files');
      expect(ErrorHandler.classifyError(error3, context)).toBe(ErrorCategory.RESOURCE_CONSTRAINT);
    });

    it('should classify data validation errors', () => {
      const error1 = new Error('Validation failed for VIN');
      expect(ErrorHandler.classifyError(error1, context)).toBe(ErrorCategory.DATA_VALIDATION);

      const error2 = new DataValidationError('Invalid format');
      expect(ErrorHandler.classifyError(error2, context)).toBe(ErrorCategory.DATA_VALIDATION);
    });

    it('should classify network errors', () => {
      const error1 = new Error('ECONNREFUSED: connection refused');
      expect(ErrorHandler.classifyError(error1, context)).toBe(ErrorCategory.NETWORK);

      const error2 = new Error('Network timeout');
      expect(ErrorHandler.classifyError(error2, context)).toBe(ErrorCategory.NETWORK);
    });

    it('should classify system dependency errors', () => {
      const error1 = new Error('Dependency not installed');
      expect(ErrorHandler.classifyError(error1, context)).toBe(ErrorCategory.SYSTEM_DEPENDENCY);

      const error2 = new Error('Missing required component');
      expect(ErrorHandler.classifyError(error2, context)).toBe(ErrorCategory.SYSTEM_DEPENDENCY);
    });

    it('should classify unknown errors', () => {
      const error = new Error('Something went wrong');
      expect(ErrorHandler.classifyError(error, context)).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('determineSeverity', () => {
    it('should determine correct severity for each category', () => {
      const error = new Error('test error');

      expect(ErrorHandler.determineSeverity(ErrorCategory.FILE_ACCESS, new Error('ENOENT')))
        .toBe(ErrorSeverity.ERROR);
      
      expect(ErrorHandler.determineSeverity(ErrorCategory.FILE_ACCESS, new Error('EACCES')))
        .toBe(ErrorSeverity.CRITICAL);

      expect(ErrorHandler.determineSeverity(ErrorCategory.PDF_PROCESSING, error))
        .toBe(ErrorSeverity.ERROR);

      expect(ErrorHandler.determineSeverity(ErrorCategory.OCR_PROCESSING, error))
        .toBe(ErrorSeverity.WARNING);

      expect(ErrorHandler.determineSeverity(ErrorCategory.DATA_VALIDATION, error))
        .toBe(ErrorSeverity.WARNING);

      expect(ErrorHandler.determineSeverity(ErrorCategory.RESOURCE_CONSTRAINT, error))
        .toBe(ErrorSeverity.CRITICAL);

      expect(ErrorHandler.determineSeverity(ErrorCategory.NETWORK, error))
        .toBe(ErrorSeverity.WARNING);

      expect(ErrorHandler.determineSeverity(ErrorCategory.SYSTEM_DEPENDENCY, error))
        .toBe(ErrorSeverity.CRITICAL);

      expect(ErrorHandler.determineSeverity(ErrorCategory.UNKNOWN, error))
        .toBe(ErrorSeverity.ERROR);
    });
  });

  describe('toUserFriendlyError', () => {
    const context: ErrorContext = {
      operation: 'PDF processing',
      timestamp: new Date(),
      userAction: 'Upload PDF'
    };

    it('should create user-friendly error for file not found', () => {
      const error = new Error('ENOENT: file not found');
      const userError = ErrorHandler.toUserFriendlyError(error, context);

      expect(userError.title).toBe('File Access Error');
      expect(userError.message).toContain('could not be found');
      expect(userError.actionableGuidance.length).toBeGreaterThan(0);
      expect(userError.canRetry).toBe(false);
      expect(userError.category).toBe(ErrorCategory.FILE_ACCESS);
    });

    it('should create user-friendly error for permission denied', () => {
      const error = new Error('EACCES: permission denied');
      const userError = ErrorHandler.toUserFriendlyError(error, context);

      expect(userError.title).toBe('File Access Error');
      expect(userError.message).toContain('Permission denied');
      expect(userError.canRetry).toBe(true);
      expect(userError.actionableGuidance.join(' ')).toContain('permissions');
    });

    it('should create user-friendly error for PDF processing', () => {
      const error = new PDFProcessingError('Invalid PDF structure');
      const userError = ErrorHandler.toUserFriendlyError(error, context);

      expect(userError.title).toBe('PDF Processing Error');
      expect(userError.canRetry).toBe(true);
      expect(userError.suggestedRetryParams).toEqual({ useOCR: true });
      expect(userError.actionableGuidance.join(' ')).toContain('valid PDF');
    });

    it('should create user-friendly error for OCR processing', () => {
      const error = new OCRProcessingError('OCR Low confidence');
      const userError = ErrorHandler.toUserFriendlyError(error, context);

      expect(userError.title).toBe('OCR Processing Issue');
      expect(userError.canRetry).toBe(true);
      expect(userError.suggestedRetryParams).toHaveProperty('ocrQuality');
      expect(userError.actionableGuidance.join(' ')).toContain('image quality');
    });

    it('should create user-friendly error for resource constraints', () => {
      const error = new ResourceConstraintError('ENOMEM: Out of memory');
      const userError = ErrorHandler.toUserFriendlyError(error, context);

      expect(userError.title).toBe('System Resource Issue');
      expect(userError.canRetry).toBe(true);
      expect(userError.suggestedRetryParams).toHaveProperty('batchSize');
      expect(userError.actionableGuidance.join(' ')).toContain('memory');
    });

    it('should include technical details', () => {
      const error = new Error('Test error message');
      const userError = ErrorHandler.toUserFriendlyError(error, context);

      expect(userError.technicalDetails).toContain('Test error message');
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      const result = await ErrorHandler.retryWithBackoff(operation, context);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue('success');

      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      const result = await ErrorHandler.retryWithBackoff(operation, context, {
        maxAttempts: 3,
        delayMs: 10
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(
        new Error('Missing dependency')
      );

      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      await expect(
        ErrorHandler.retryWithBackoff(operation, context, {
          maxAttempts: 3,
          delayMs: 10
        })
      ).rejects.toThrow('Missing dependency');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network error'));

      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      await expect(
        ErrorHandler.retryWithBackoff(operation, context, {
          maxAttempts: 2,
          delayMs: 10
        })
      ).rejects.toThrow('Network error');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      const startTime = Date.now();
      await ErrorHandler.retryWithBackoff(operation, context, {
        maxAttempts: 3,
        delayMs: 100,
        backoffMultiplier: 2
      });
      const endTime = Date.now();

      // Should wait 100ms + 200ms = 300ms minimum
      expect(endTime - startTime).toBeGreaterThanOrEqual(300);
    });
  });

  describe('handleResourceConstraint', () => {
    it('should execute primary operation if successful', async () => {
      const primaryOp = jest.fn().mockResolvedValue('primary success');
      const fallbackOp = jest.fn().mockResolvedValue('fallback success');
      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      const result = await ErrorHandler.handleResourceConstraint(
        primaryOp,
        fallbackOp,
        context
      );

      expect(result).toBe('primary success');
      expect(primaryOp).toHaveBeenCalledTimes(1);
      expect(fallbackOp).not.toHaveBeenCalled();
    });

    it('should execute fallback on resource constraint', async () => {
      const primaryOp = jest.fn().mockRejectedValue(
        new ResourceConstraintError('Out of memory')
      );
      const fallbackOp = jest.fn().mockResolvedValue('fallback success');
      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      const result = await ErrorHandler.handleResourceConstraint(
        primaryOp,
        fallbackOp,
        context
      );

      expect(result).toBe('fallback success');
      expect(primaryOp).toHaveBeenCalledTimes(1);
      expect(fallbackOp).toHaveBeenCalledTimes(1);
    });

    it('should throw original error if fallback also fails', async () => {
      const originalError = new ResourceConstraintError('Out of memory');
      const primaryOp = jest.fn().mockRejectedValue(originalError);
      const fallbackOp = jest.fn().mockRejectedValue(new Error('Fallback failed'));
      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      await expect(
        ErrorHandler.handleResourceConstraint(primaryOp, fallbackOp, context)
      ).rejects.toThrow('Out of memory');
    });

    it('should not execute fallback for non-resource errors', async () => {
      const primaryOp = jest.fn().mockRejectedValue(new Error('Other error'));
      const fallbackOp = jest.fn().mockResolvedValue('fallback success');
      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      await expect(
        ErrorHandler.handleResourceConstraint(primaryOp, fallbackOp, context)
      ).rejects.toThrow('Other error');

      expect(fallbackOp).not.toHaveBeenCalled();
    });
  });

  describe('logError', () => {
    it('should log errors with context', () => {
      const error = new Error('Test error');
      const context: ErrorContext = {
        operation: 'test operation',
        timestamp: new Date(),
        userAction: 'test action'
      };

      ErrorHandler.logError(error, context);

      const log = ErrorHandler.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].error).toBe(error);
      expect(log[0].context).toEqual(context);
    });

    it('should maintain log size limit', () => {
      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      // Log more than MAX_LOG_SIZE errors
      for (let i = 0; i < 150; i++) {
        ErrorHandler.logError(new Error(`Error ${i}`), context);
      }

      const log = ErrorHandler.getErrorLog();
      expect(log.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getErrorLog and clearErrorLog', () => {
    it('should retrieve error log', () => {
      const error = new Error('Test error');
      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      ErrorHandler.logError(error, context);
      const log = ErrorHandler.getErrorLog();

      expect(log).toHaveLength(1);
      expect(log[0].error.message).toBe('Test error');
    });

    it('should clear error log', () => {
      const error = new Error('Test error');
      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      ErrorHandler.logError(error, context);
      expect(ErrorHandler.getErrorLog()).toHaveLength(1);

      ErrorHandler.clearErrorLog();
      expect(ErrorHandler.getErrorLog()).toHaveLength(0);
    });
  });

  describe('exportErrorLog', () => {
    it('should export error log as JSON', () => {
      const error1 = new Error('Error 1');
      const error2 = new PDFProcessingError('Error 2');
      const context: ErrorContext = {
        operation: 'test',
        timestamp: new Date(),
        userAction: 'testing'
      };

      ErrorHandler.logError(error1, context);
      ErrorHandler.logError(error2, context);

      const exported = ErrorHandler.exportErrorLog();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toHaveProperty('timestamp');
      expect(parsed[0]).toHaveProperty('operation');
      expect(parsed[0]).toHaveProperty('errorMessage');
      expect(parsed[0]).toHaveProperty('category');
      expect(parsed[0]).toHaveProperty('severity');
    });
  });

  describe('Specialized Error Classes', () => {
    it('should create PDFProcessingError with file path', () => {
      const error = new PDFProcessingError('Test error', '/path/to/file.pdf');
      expect(error.name).toBe('PDFProcessingError');
      expect(error.message).toBe('Test error');
      expect(error.filePath).toBe('/path/to/file.pdf');
    });

    it('should create OCRProcessingError with confidence', () => {
      const error = new OCRProcessingError('Low confidence', 0.45);
      expect(error.name).toBe('OCRProcessingError');
      expect(error.confidence).toBe(0.45);
    });

    it('should create DataValidationError with field and value', () => {
      const error = new DataValidationError('Invalid VIN', 'vin', '12345');
      expect(error.name).toBe('DataValidationError');
      expect(error.field).toBe('vin');
      expect(error.value).toBe('12345');
    });

    it('should create ResourceConstraintError with resource type', () => {
      const error = new ResourceConstraintError('Out of memory', 'RAM');
      expect(error.name).toBe('ResourceConstraintError');
      expect(error.resourceType).toBe('RAM');
    });
  });
});
