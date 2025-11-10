/**
 * Comprehensive Error Handling Tests
 * Tests error classification, recovery, and user-friendly messaging
 * Requirements: 10.3
 */

import { ErrorHandler, ErrorCategory, UserFriendlyError } from '../src/main/services/errorHandler';

describe('Error Handling - Comprehensive Tests', () => {
  describe('Error Classification', () => {
    it('should classify PDF file access errors', () => {
      const error = new Error('ENOENT: no such file or directory');
      const category = ErrorHandler.classifyError(error);
      
      expect(category).toBe(ErrorCategory.FILE_ACCESS);
    });
    
    it('should classify PDF parsing errors', () => {
      const error = new Error('Invalid PDF structure');
      const category = ErrorHandler.classifyError(error);
      
      expect(category).toBe(ErrorCategory.PDF_PARSING);
    });
    
    it('should classify OCR processing errors', () => {
      const error = new Error('Tesseract worker failed');
      const category = ErrorHandler.classifyError(error);
      
      expect(category).toBe(ErrorCategory.OCR_PROCESSING);
    });
    
    it('should classify validation errors', () => {
      const error = new Error('Invalid VIN format');
      const category = ErrorHandler.classifyError(error);
      
      expect(category).toBe(ErrorCategory.VALIDATION);
    });
    
    it('should classify memory errors', () => {
      const error = new Error('JavaScript heap out of memory');
      const category = ErrorHandler.classifyError(error);
      
      expect(category).toBe(ErrorCategory.RESOURCE_EXHAUSTION);
    });
    
    it('should classify network errors', () => {
      const error = new Error('ECONNREFUSED');
      const category = ErrorHandler.classifyError(error);
      
      expect(category).toBe(ErrorCategory.NETWORK);
    });
    
    it('should classify unknown errors', () => {
      const error = new Error('Something unexpected happened');
      const category = ErrorHandler.classifyError(error);
      
      expect(category).toBe(ErrorCategory.UNKNOWN);
    });
  });
  
  describe('User-Friendly Error Messages', () => {
    it('should provide actionable message for file not found', () => {
      const error = new Error('ENOENT: no such file or directory');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'PDF Upload',
        filePath: '/path/to/file.pdf'
      });
      
      expect(userError.title).toContain('File Not Found');
      expect(userError.message).toContain('could not be found');
      expect(userError.suggestions).toContain('Check that the file exists');
      expect(userError.suggestions).toContain('Try uploading the file again');
    });
    
    it('should provide actionable message for permission denied', () => {
      const error = new Error('EACCES: permission denied');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'PDF Upload'
      });
      
      expect(userError.title).toContain('Permission Denied');
      expect(userError.message).toContain('permission');
      expect(userError.suggestions).toContain('Check file permissions');
    });
    
    it('should provide actionable message for corrupted PDF', () => {
      const error = new Error('Invalid PDF structure');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'PDF Processing'
      });
      
      expect(userError.title).toContain('Invalid PDF');
      expect(userError.message).toContain('corrupted');
      expect(userError.suggestions).toContain('Try opening the PDF');
      expect(userError.suggestions).toContain('Re-download');
    });
    
    it('should provide actionable message for OCR failure', () => {
      const error = new Error('OCR processing failed');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'OCR Processing'
      });
      
      expect(userError.title).toContain('OCR Failed');
      expect(userError.message).toContain('extract text');
      expect(userError.suggestions.length).toBeGreaterThan(0);
    });
    
    it('should provide actionable message for memory exhaustion', () => {
      const error = new Error('JavaScript heap out of memory');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'PDF Processing'
      });
      
      expect(userError.title).toContain('Memory');
      expect(userError.message).toContain('memory');
      expect(userError.suggestions).toContain('Close other applications');
      expect(userError.suggestions).toContain('Try processing a smaller file');
    });
    
    it('should provide actionable message for missing dependencies', () => {
      const error = new Error('Tesseract assets not found');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'OCR Initialization'
      });
      
      expect(userError.title).toContain('Missing');
      expect(userError.message).toContain('required');
      expect(userError.suggestions).toContain('Reinstall the application');
    });
  });
  
  describe('Error Recovery Strategies', () => {
    it('should suggest retry for transient errors', () => {
      const error = new Error('ETIMEDOUT');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'Network Request'
      });
      
      expect(userError.recoverable).toBe(true);
      expect(userError.suggestions).toContain('Try again');
    });
    
    it('should not suggest retry for permanent errors', () => {
      const error = new Error('Invalid VIN format');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'Validation'
      });
      
      expect(userError.recoverable).toBe(false);
      expect(userError.suggestions).not.toContain('Try again');
    });
    
    it('should provide alternative approaches for OCR failures', () => {
      const error = new Error('OCR quality too low');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'OCR Processing'
      });
      
      expect(userError.suggestions).toContain('Try a higher quality scan');
      expect(userError.suggestions.some(s => s.includes('manual'))).toBe(true);
    });
    
    it('should suggest resource management for memory errors', () => {
      const error = new Error('Out of memory');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'PDF Processing'
      });
      
      expect(userError.suggestions).toContain('Close other applications');
      expect(userError.suggestions).toContain('Try processing a smaller file');
    });
  });
  
  describe('Error Context and Logging', () => {
    it('should capture error context', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'PDF Upload',
        filePath: '/path/to/file.pdf',
        fileSize: 1024000,
        timestamp: new Date()
      };
      
      const userError = ErrorHandler.toUserFriendlyError(error, context);
      
      expect(userError.context).toBeDefined();
      expect(userError.context.operation).toBe('PDF Upload');
    });
    
    it('should include stack trace for debugging', () => {
      const error = new Error('Test error');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'Test'
      });
      
      expect(userError.technicalDetails).toBeDefined();
      expect(userError.technicalDetails).toContain('Test error');
    });
    
    it('should sanitize sensitive information', () => {
      const error = new Error('Failed to process /Users/john/Documents/secret.pdf');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'PDF Processing'
      });
      
      // Should not expose full file paths in user message
      expect(userError.message).not.toContain('/Users/john');
    });
  });
  
  describe('Automatic Error Recovery', () => {
    it('should attempt retry with different parameters for OCR', async () => {
      let attemptCount = 0;
      const mockOCRFunction = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('OCR failed');
        }
        return 'Success';
      });
      
      const result = await ErrorHandler.withRetry(
        mockOCRFunction,
        {
          maxAttempts: 3,
          backoff: 'exponential',
          retryableErrors: ['OCR failed']
        }
      );
      
      expect(result).toBe('Success');
      expect(attemptCount).toBe(3);
    });
    
    it('should not retry non-retryable errors', async () => {
      let attemptCount = 0;
      const mockFunction = jest.fn().mockImplementation(() => {
        attemptCount++;
        throw new Error('Invalid VIN');
      });
      
      await expect(
        ErrorHandler.withRetry(mockFunction, {
          maxAttempts: 3,
          retryableErrors: ['OCR failed']
        })
      ).rejects.toThrow('Invalid VIN');
      
      expect(attemptCount).toBe(1); // Should not retry
    });
    
    it('should apply exponential backoff between retries', async () => {
      const timestamps: number[] = [];
      const mockFunction = jest.fn().mockImplementation(() => {
        timestamps.push(Date.now());
        if (timestamps.length < 3) {
          throw new Error('Temporary failure');
        }
        return 'Success';
      });
      
      await ErrorHandler.withRetry(mockFunction, {
        maxAttempts: 3,
        backoff: 'exponential',
        initialDelay: 100,
        retryableErrors: ['Temporary failure']
      });
      
      // Check that delays increase exponentially
      expect(timestamps.length).toBe(3);
      const delay1 = timestamps[1] - timestamps[0];
      const delay2 = timestamps[2] - timestamps[1];
      expect(delay2).toBeGreaterThan(delay1);
    });
  });
  
  describe('Graceful Degradation', () => {
    it('should fall back to standard extraction when OCR fails', async () => {
      const mockStandardExtraction = jest.fn().mockResolvedValue({
        vin: '5XYZT3LB0EG123456',
        year: 2014,
        make: 'Hyundai',
        model: 'Santa Fe'
      });
      
      const mockOCRExtraction = jest.fn().mockRejectedValue(
        new Error('OCR failed')
      );
      
      const result = await ErrorHandler.withFallback(
        mockOCRExtraction,
        mockStandardExtraction
      );
      
      expect(result).toBeDefined();
      expect(result.vin).toBe('5XYZT3LB0EG123456');
      expect(mockStandardExtraction).toHaveBeenCalled();
    });
    
    it('should reduce processing quality when resources are constrained', async () => {
      const error = new Error('Out of memory');
      const adjustedParams = ErrorHandler.adjustProcessingParameters(error, {
        ocrQuality: 'high',
        batchSize: 10,
        parallelProcessing: true
      });
      
      expect(adjustedParams.ocrQuality).toBe('low');
      expect(adjustedParams.batchSize).toBeLessThan(10);
      expect(adjustedParams.parallelProcessing).toBe(false);
    });
  });
  
  describe('Error Aggregation', () => {
    it('should aggregate multiple validation errors', () => {
      const errors = [
        new Error('Invalid VIN'),
        new Error('Invalid year'),
        new Error('Invalid mileage')
      ];
      
      const aggregated = ErrorHandler.aggregateErrors(errors, {
        operation: 'Validation'
      });
      
      expect(aggregated.title).toContain('Multiple Validation Errors');
      expect(aggregated.message).toContain('3 errors');
      expect(aggregated.details).toHaveLength(3);
    });
    
    it('should prioritize critical errors', () => {
      const errors = [
        new Error('Warning: Low confidence'),
        new Error('ENOENT: File not found'),
        new Error('Info: Processing complete')
      ];
      
      const aggregated = ErrorHandler.aggregateErrors(errors, {
        operation: 'Processing'
      });
      
      // Critical error should be highlighted
      expect(aggregated.message).toContain('File not found');
    });
  });
  
  describe('Error Reporting', () => {
    it('should format error for display', () => {
      const error = new Error('Test error');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'Test Operation'
      });
      
      const formatted = ErrorHandler.formatForDisplay(userError);
      
      expect(formatted).toContain(userError.title);
      expect(formatted).toContain(userError.message);
      expect(formatted).toContain('Suggestions:');
    });
    
    it('should format error for logging', () => {
      const error = new Error('Test error');
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'Test Operation',
        additionalInfo: { key: 'value' }
      });
      
      const formatted = ErrorHandler.formatForLogging(userError);
      
      expect(formatted).toContain('Test error');
      expect(formatted).toContain('Test Operation');
      expect(formatted).toContain('key');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle null or undefined errors', () => {
      const userError = ErrorHandler.toUserFriendlyError(null as any, {
        operation: 'Unknown'
      });
      
      expect(userError.title).toBe('Unknown Error');
      expect(userError.message).toContain('unexpected');
    });
    
    it('should handle errors without messages', () => {
      const error = new Error();
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'Test'
      });
      
      expect(userError.title).toBeDefined();
      expect(userError.message).toBeDefined();
    });
    
    it('should handle circular reference in error context', () => {
      const context: any = { operation: 'Test' };
      context.self = context; // Circular reference
      
      const error = new Error('Test');
      const userError = ErrorHandler.toUserFriendlyError(error, context);
      
      expect(userError).toBeDefined();
      expect(userError.context).toBeDefined();
    });
    
    it('should handle very long error messages', () => {
      const longMessage = 'Error: ' + 'x'.repeat(10000);
      const error = new Error(longMessage);
      const userError = ErrorHandler.toUserFriendlyError(error, {
        operation: 'Test'
      });
      
      // Should truncate or handle gracefully
      expect(userError.message.length).toBeLessThan(1000);
    });
  });
  
  describe('Error Prevention', () => {
    it('should validate inputs before processing', () => {
      const isValid = ErrorHandler.validateInput({
        filePath: '/path/to/file.pdf',
        fileSize: 1024000
      });
      
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid inputs', () => {
      const isValid = ErrorHandler.validateInput({
        filePath: '',
        fileSize: -1
      });
      
      expect(isValid).toBe(false);
    });
    
    it('should check system resources before processing', async () => {
      const hasResources = await ErrorHandler.checkSystemResources({
        requiredMemory: 100 * 1024 * 1024, // 100MB
        requiredDiskSpace: 50 * 1024 * 1024 // 50MB
      });
      
      expect(typeof hasResources).toBe('boolean');
    });
  });
});
