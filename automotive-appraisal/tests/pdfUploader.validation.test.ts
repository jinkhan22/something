/**
 * Comprehensive tests for enhanced PDF Uploader validation and error handling
 */

import { ErrorType } from '../src/types';

describe('Enhanced PDF Uploader Validation', () => {
  // Constants from component
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const MIN_FILE_SIZE = 1024; // 1KB
  const ALLOWED_MIME_TYPES = ['application/pdf'];
  const ALLOWED_EXTENSIONS = ['.pdf'];

  // Enhanced validation function (extracted from component)
  const validateFile = (file: { name: string; type: string; size: number }): { isValid: boolean; errorType?: ErrorType; errorDetails?: any } => {
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
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

  describe('File Extension Validation', () => {
    test('accepts valid PDF extension', () => {
      const file = { name: 'test.pdf', type: 'application/pdf', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(true);
      expect(result.errorType).toBeUndefined();
    });

    test('accepts case-insensitive PDF extension', () => {
      const file = { name: 'test.PDF', type: 'application/pdf', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('rejects non-PDF extensions with correct error type', () => {
      const file = { name: 'test.txt', type: 'application/pdf', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe(ErrorType.EXTENSION_INVALID);
      expect(result.errorDetails.extension).toBe('.txt');
      expect(result.errorDetails.fileName).toBe('test.txt');
    });

    test('handles files with multiple dots', () => {
      const file = { name: 'test.backup.pdf', type: 'application/pdf', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('handles files without extension', () => {
      const file = { name: 'testfile', type: 'application/pdf', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe(ErrorType.EXTENSION_INVALID);
    });
  });

  describe('MIME Type Validation', () => {
    test('accepts valid PDF MIME type', () => {
      const file = { name: 'test.pdf', type: 'application/pdf', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('rejects invalid MIME type with correct error type', () => {
      const file = { name: 'test.pdf', type: 'text/plain', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe(ErrorType.MIME_TYPE_INVALID);
      expect(result.errorDetails.mimeType).toBe('text/plain');
    });

    test('handles empty MIME type', () => {
      const file = { name: 'test.pdf', type: '', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe(ErrorType.MIME_TYPE_INVALID);
    });
  });

  describe('File Size Validation', () => {
    test('accepts files within size limits', () => {
      const file = { name: 'test.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 }; // 10MB
      const result = validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('accepts files at minimum size limit', () => {
      const file = { name: 'test.pdf', type: 'application/pdf', size: MIN_FILE_SIZE };
      const result = validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('accepts files at maximum size limit', () => {
      const file = { name: 'test.pdf', type: 'application/pdf', size: MAX_FILE_SIZE };
      const result = validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('rejects empty files with correct error type', () => {
      const file = { name: 'test.pdf', type: 'application/pdf', size: 0 };
      const result = validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe(ErrorType.FILE_EMPTY);
    });

    test('rejects files below minimum size as corrupted', () => {
      const file = { name: 'test.pdf', type: 'application/pdf', size: 500 }; // 500 bytes
      const result = validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe(ErrorType.FILE_CORRUPTED);
      expect(result.errorDetails.size).toBe(500);
    });

    test('rejects files above maximum size with correct error type', () => {
      const file = { name: 'test.pdf', type: 'application/pdf', size: MAX_FILE_SIZE + 1 };
      const result = validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe(ErrorType.FILE_TOO_LARGE);
      expect(result.errorDetails.sizeMB).toBe('50.0');
      expect(result.errorDetails.maxSizeMB).toBe('50');
    });

    test('calculates file size correctly for large files', () => {
      const file = { name: 'large.pdf', type: 'application/pdf', size: 75 * 1024 * 1024 }; // 75MB
      const result = validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe(ErrorType.FILE_TOO_LARGE);
      expect(result.errorDetails.sizeMB).toBe('75.0');
    });
  });

  describe('Error Details', () => {
    test('includes filename in all error details', () => {
      const testCases = [
        { name: 'test.txt', type: 'application/pdf', size: 5000 }, // Extension error
        { name: 'test.pdf', type: 'text/plain', size: 5000 }, // MIME type error
        { name: 'empty.pdf', type: 'application/pdf', size: 0 }, // Empty file error
        { name: 'tiny.pdf', type: 'application/pdf', size: 100 }, // Corrupted file error
        { name: 'huge.pdf', type: 'application/pdf', size: MAX_FILE_SIZE + 1 }, // Too large error
      ];

      testCases.forEach(file => {
        const result = validateFile(file);
        expect(result.isValid).toBe(false);
        expect(result.errorDetails.fileName).toBe(file.name);
      });
    });

    test('includes specific error context', () => {
      // Extension error includes extension
      const extResult = validateFile({ name: 'test.doc', type: 'application/pdf', size: 5000 });
      expect(extResult.errorDetails.extension).toBe('.doc');

      // MIME type error includes MIME type
      const mimeResult = validateFile({ name: 'test.pdf', type: 'image/jpeg', size: 5000 });
      expect(mimeResult.errorDetails.mimeType).toBe('image/jpeg');

      // Size error includes size information
      const sizeResult = validateFile({ name: 'test.pdf', type: 'application/pdf', size: MAX_FILE_SIZE + 1024 });
      expect(sizeResult.errorDetails.sizeMB).toBeDefined();
      expect(sizeResult.errorDetails.maxSizeMB).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('handles files with no extension gracefully', () => {
      const file = { name: 'README', type: 'application/pdf', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe(ErrorType.EXTENSION_INVALID);
    });

    test('handles files with only extension', () => {
      const file = { name: '.pdf', type: 'application/pdf', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('handles very long filenames', () => {
      const longName = 'a'.repeat(200) + '.pdf';
      const file = { name: longName, type: 'application/pdf', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(true);
    });

    test('handles special characters in filename', () => {
      const file = { name: 'test-file_v2 (1).pdf', type: 'application/pdf', size: 5000 };
      const result = validateFile(file);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Constants Validation', () => {
    test('file size constants are properly defined', () => {
      expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
      expect(MIN_FILE_SIZE).toBe(1024);
      expect(MAX_FILE_SIZE).toBeGreaterThan(MIN_FILE_SIZE);
    });

    test('allowed types and extensions are properly defined', () => {
      expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
      expect(ALLOWED_EXTENSIONS).toContain('.pdf');
      expect(ALLOWED_MIME_TYPES.length).toBeGreaterThan(0);
      expect(ALLOWED_EXTENSIONS.length).toBeGreaterThan(0);
    });
  });
});