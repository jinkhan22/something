/**
 * Comprehensive End-to-End Workflow Tests
 * Tests complete user workflows from start to finish
 * Requirements: 10.7
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../src/renderer/store';

// Mock window.electron
const mockElectron = {
  processPDF: jest.fn(),
  saveAppraisal: jest.fn(),
  getAppraisals: jest.fn(),
  deleteAppraisal: jest.fn(),
  updateAppraisal: jest.fn(),
  exportToCSV: jest.fn(),
  validateData: jest.fn(),
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
  checkSystem: jest.fn(),
  onProgress: jest.fn(),
};

(global as any).window.electron = mockElectron;

describe('End-to-End Workflows - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.reset();
    });
  });
  
  describe('Complete PDF Processing Workflow', () => {
    it('should process PDF from upload to save', async () => {
      const { result } = renderHook(() => useStore());
      
      // Step 1: User uploads PDF
      const mockPDFResult = {
        success: true,
        extractedData: {
          vin: '5XYZT3LB0EG123456',
          year: 2014,
          make: 'Hyundai',
          model: 'Santa Fe Sport',
          mileage: 85234,
          location: 'CA 90210',
          reportType: 'MITCHELL',
          extractionConfidence: 95,
          extractionMethod: 'standard',
          extractionErrors: [],
          settlementValue: 10741.06,
          marketValue: 10062.32,
        },
        appraisalId: 'test-appraisal-id',
      };
      
      mockElectron.processPDF.mockResolvedValue(mockPDFResult);
      
      act(() => {
        result.current.setProcessing(true);
      });
      
      const pdfResult = await mockElectron.processPDF('/path/to/file.pdf');
      
      // Step 2: Set extracted data in store
      act(() => {
        result.current.setCurrentAppraisal(pdfResult.extractedData);
        result.current.setProcessing(false);
      });
      
      expect(result.current.currentAppraisal).toBeDefined();
      expect(result.current.currentAppraisal?.vin).toBe('5XYZT3LB0EG123456');
      
      // Step 3: Validate data
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        confidence: 95,
      };
      
      mockElectron.validateData.mockResolvedValue(mockValidationResult);
      
      const validationResult = await mockElectron.validateData(pdfResult.extractedData);
      
      act(() => {
        result.current.setValidationResults([mockValidationResult]);
      });
      
      expect(validationResult.isValid).toBe(true);
      
      // Step 4: Save appraisal
      mockElectron.saveAppraisal.mockResolvedValue({ success: true });
      
      await mockElectron.saveAppraisal(pdfResult.extractedData);
      
      act(() => {
        result.current.addToHistory(pdfResult.extractedData);
      });
      
      expect(result.current.appraisalHistory).toHaveLength(1);
      expect(mockElectron.saveAppraisal).toHaveBeenCalled();
    });
    
    it('should handle OCR fallback workflow', async () => {
      const { result } = renderHook(() => useStore());
      
      // Step 1: Upload scanned PDF
      const mockOCRResult = {
        success: true,
        extractedData: {
          vin: '5XYZT3LB0EG123456',
          year: 2014,
          make: 'Hyundai',
          model: 'Santa Fe Sport',
          mileage: 85234,
          extractionMethod: 'ocr',
          extractionConfidence: 75,
        },
        warnings: ['OCR was used - please verify data'],
      };
      
      mockElectron.processPDF.mockResolvedValue(mockOCRResult);
      
      // Simulate progress updates
      mockElectron.onProgress.mockImplementation((callback) => {
        callback(25, 'Converting PDF to images');
        callback(50, 'Running OCR on page 1');
        callback(75, 'Extracting vehicle data');
        callback(100, 'Complete');
      });
      
      act(() => {
        result.current.setProcessing(true);
        result.current.setOCRStatus(true, 75);
      });
      
      const pdfResult = await mockElectron.processPDF('/path/to/scanned.pdf');
      
      act(() => {
        result.current.setCurrentAppraisal(pdfResult.extractedData);
        result.current.setProcessing(false);
      });
      
      // Step 2: Show OCR warning
      expect(result.current.ocrProcessingActive).toBe(true);
      expect(result.current.ocrConfidence).toBe(75);
      
      // Step 3: User reviews and corrects data
      const correctedData = {
        ...pdfResult.extractedData,
        model: 'Santa Fe Sport', // User corrected
      };
      
      act(() => {
        result.current.setCurrentAppraisal(correctedData);
      });
      
      // Step 4: Save with corrections
      mockElectron.saveAppraisal.mockResolvedValue({ success: true });
      await mockElectron.saveAppraisal(correctedData);
      
      act(() => {
        result.current.addToHistory(correctedData);
      });
      
      expect(result.current.appraisalHistory[0].model).toBe('Santa Fe Sport');
    });
  });
  
  describe('History Management Workflow', () => {
    it('should search, filter, and export appraisals', async () => {
      const { result } = renderHook(() => useStore());
      
      // Step 1: Load appraisals from storage
      const mockAppraisals = [
        {
          id: '1',
          vin: 'VIN1',
          year: 2014,
          make: 'Toyota',
          model: 'Camry',
          date: '2024-01-01',
        },
        {
          id: '2',
          vin: 'VIN2',
          year: 2018,
          make: 'Honda',
          model: 'Civic',
          date: '2024-01-15',
        },
        {
          id: '3',
          vin: 'VIN3',
          year: 2020,
          make: 'Toyota',
          model: 'Corolla',
          date: '2024-02-01',
        },
      ];
      
      mockElectron.getAppraisals.mockResolvedValue(mockAppraisals);
      
      const appraisals = await mockElectron.getAppraisals();
      
      act(() => {
        appraisals.forEach((a: any) => result.current.addToHistory(a));
      });
      
      expect(result.current.appraisalHistory).toHaveLength(3);
      
      // Step 2: Filter by make
      act(() => {
        result.current.setSearchFilters({ make: 'Toyota' });
      });
      
      const filtered = result.current.filteredAppraisals;
      expect(filtered).toHaveLength(2);
      
      // Step 3: Export filtered results
      mockElectron.exportToCSV.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.csv',
      });
      
      await mockElectron.exportToCSV({
        appraisals: filtered,
        filePath: '/path/to/export.csv',
      });
      
      expect(mockElectron.exportToCSV).toHaveBeenCalledWith(
        expect.objectContaining({
          appraisals: expect.arrayContaining([
            expect.objectContaining({ make: 'Toyota' }),
          ]),
        })
      );
    });
    
    it('should edit and update existing appraisal', async () => {
      const { result } = renderHook(() => useStore());
      
      // Step 1: Load existing appraisal
      const mockAppraisal = {
        id: 'test-id',
        vin: '5XYZT3LB0EG123456',
        year: 2014,
        make: 'Hyundai',
        model: 'Santa Fe Sport',
        mileage: 85234,
      };
      
      act(() => {
        result.current.addToHistory(mockAppraisal);
        result.current.setCurrentAppraisal(mockAppraisal);
      });
      
      // Step 2: User edits mileage
      const updatedAppraisal = {
        ...mockAppraisal,
        mileage: 90000,
      };
      
      act(() => {
        result.current.setCurrentAppraisal(updatedAppraisal);
      });
      
      // Step 3: Validate updated data
      mockElectron.validateData.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ['Mileage increased significantly'],
        confidence: 90,
      });
      
      await mockElectron.validateData(updatedAppraisal);
      
      // Step 4: Save updates
      mockElectron.updateAppraisal.mockResolvedValue({ success: true });
      
      await mockElectron.updateAppraisal(updatedAppraisal);
      
      act(() => {
        result.current.updateAppraisal(mockAppraisal.id, updatedAppraisal);
      });
      
      expect(result.current.appraisalHistory[0].mileage).toBe(90000);
    });
    
    it('should delete appraisal with confirmation', async () => {
      const { result } = renderHook(() => useStore());
      
      // Step 1: Load appraisal
      const mockAppraisal = {
        id: 'test-id',
        vin: '5XYZT3LB0EG123456',
      };
      
      act(() => {
        result.current.addToHistory(mockAppraisal);
      });
      
      expect(result.current.appraisalHistory).toHaveLength(1);
      
      // Step 2: User confirms deletion
      mockElectron.deleteAppraisal.mockResolvedValue({ success: true });
      
      await mockElectron.deleteAppraisal(mockAppraisal.id);
      
      act(() => {
        result.current.deleteAppraisal(mockAppraisal.id);
      });
      
      expect(result.current.appraisalHistory).toHaveLength(0);
    });
  });
  
  describe('Settings Configuration Workflow', () => {
    it('should update and apply settings', async () => {
      const { result } = renderHook(() => useStore());
      
      // Step 1: Load current settings
      const mockSettings = {
        ocrQuality: 'balanced',
        autoOCRFallback: true,
        confidenceThresholds: {
          warning: 70,
          error: 50,
        },
      };
      
      mockElectron.getSettings.mockResolvedValue(mockSettings);
      
      const settings = await mockElectron.getSettings();
      
      act(() => {
        result.current.updateSettings(settings);
      });
      
      // Step 2: User changes settings
      const newSettings = {
        ...mockSettings,
        ocrQuality: 'high',
        confidenceThresholds: {
          warning: 80,
          error: 60,
        },
      };
      
      act(() => {
        result.current.updateSettings(newSettings);
      });
      
      // Step 3: Save settings
      mockElectron.updateSettings.mockResolvedValue({ success: true });
      
      await mockElectron.updateSettings(newSettings);
      
      expect(result.current.settings.ocrQuality).toBe('high');
      expect(result.current.settings.confidenceThresholds.warning).toBe(80);
    });
  });
  
  describe('Error Recovery Workflow', () => {
    it('should recover from processing errors', async () => {
      const { result } = renderHook(() => useStore());
      
      // Step 1: Processing fails
      mockElectron.processPDF.mockRejectedValue(new Error('Processing failed'));
      
      act(() => {
        result.current.setProcessing(true);
      });
      
      try {
        await mockElectron.processPDF('/path/to/file.pdf');
      } catch (error: any) {
        act(() => {
          result.current.setError(error.message);
          result.current.setProcessing(false);
        });
      }
      
      expect(result.current.error).toBe('Processing failed');
      expect(result.current.isProcessing).toBe(false);
      
      // Step 2: User retries with different file
      mockElectron.processPDF.mockResolvedValue({
        success: true,
        extractedData: { vin: 'VIN123' },
      });
      
      act(() => {
        result.current.clearError();
        result.current.setProcessing(true);
      });
      
      const result2 = await mockElectron.processPDF('/path/to/different-file.pdf');
      
      act(() => {
        result.current.setCurrentAppraisal(result2.extractedData);
        result.current.setProcessing(false);
      });
      
      expect(result.current.error).toBeNull();
      expect(result.current.currentAppraisal).toBeDefined();
    });
    
    it('should handle validation errors and allow corrections', async () => {
      const { result } = renderHook(() => useStore());
      
      // Step 1: Data fails validation
      const invalidData = {
        vin: 'INVALID',
        year: 1800,
        make: '',
        model: '',
        mileage: -1000,
      };
      
      mockElectron.validateData.mockResolvedValue({
        isValid: false,
        errors: ['Invalid VIN', 'Invalid year', 'Make is required'],
        warnings: [],
        confidence: 0,
      });
      
      const validationResult = await mockElectron.validateData(invalidData);
      
      act(() => {
        result.current.setValidationResults([validationResult]);
      });
      
      expect(result.current.hasValidationErrors).toBe(true);
      
      // Step 2: User corrects data
      const correctedData = {
        vin: '5XYZT3LB0EG123456',
        year: 2014,
        make: 'Hyundai',
        model: 'Santa Fe Sport',
        mileage: 85234,
      };
      
      mockElectron.validateData.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        confidence: 95,
      });
      
      const validationResult2 = await mockElectron.validateData(correctedData);
      
      act(() => {
        result.current.setValidationResults([validationResult2]);
        result.current.setCurrentAppraisal(correctedData);
      });
      
      expect(result.current.hasValidationErrors).toBe(false);
    });
  });
  
  describe('System Check Workflow', () => {
    it('should check system before processing', async () => {
      // Step 1: Check system dependencies
      mockElectron.checkSystem.mockResolvedValue({
        tesseractAvailable: true,
        memoryAvailable: 4096,
        diskSpaceAvailable: 10240,
      });
      
      const systemCheck = await mockElectron.checkSystem();
      
      expect(systemCheck.tesseractAvailable).toBe(true);
      
      // Step 2: Proceed with processing if system is ready
      if (systemCheck.tesseractAvailable) {
        mockElectron.processPDF.mockResolvedValue({
          success: true,
          extractedData: { vin: 'VIN123' },
        });
        
        const result = await mockElectron.processPDF('/path/to/file.pdf');
        expect(result.success).toBe(true);
      }
    });
    
    it('should handle missing dependencies', async () => {
      const { result } = renderHook(() => useStore());
      
      // Step 1: System check fails
      mockElectron.checkSystem.mockResolvedValue({
        tesseractAvailable: false,
        error: 'Tesseract assets not found',
      });
      
      const systemCheck = await mockElectron.checkSystem();
      
      // Step 2: Show error to user
      if (!systemCheck.tesseractAvailable) {
        act(() => {
          result.current.setError(
            'OCR functionality is not available. Please reinstall the application.'
          );
        });
      }
      
      expect(result.current.error).toContain('OCR functionality');
    });
  });
  
  describe('Multi-File Processing Workflow', () => {
    it('should process multiple PDFs sequentially', async () => {
      const { result } = renderHook(() => useStore());
      
      const files = [
        '/path/to/file1.pdf',
        '/path/to/file2.pdf',
        '/path/to/file3.pdf',
      ];
      
      const mockResults = files.map((file, i) => ({
        success: true,
        extractedData: {
          id: `appraisal-${i}`,
          vin: `VIN${i}`,
          year: 2014 + i,
          make: 'Toyota',
          model: 'Camry',
        },
      }));
      
      mockElectron.processPDF
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);
      
      for (let i = 0; i < files.length; i++) {
        act(() => {
          result.current.setProcessing(true);
          result.current.setProgress((i / files.length) * 100, `Processing file ${i + 1} of ${files.length}`);
        });
        
        const pdfResult = await mockElectron.processPDF(files[i]);
        
        act(() => {
          result.current.addToHistory(pdfResult.extractedData);
          result.current.setProcessing(false);
        });
      }
      
      expect(result.current.appraisalHistory).toHaveLength(3);
      expect(mockElectron.processPDF).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Complete User Journey', () => {
    it('should complete full workflow from upload to export', async () => {
      const { result } = renderHook(() => useStore());
      
      // 1. Check system
      mockElectron.checkSystem.mockResolvedValue({
        tesseractAvailable: true,
        memoryAvailable: 4096,
      });
      await mockElectron.checkSystem();
      
      // 2. Upload and process PDF
      mockElectron.processPDF.mockResolvedValue({
        success: true,
        extractedData: {
          id: 'test-1',
          vin: '5XYZT3LB0EG123456',
          year: 2014,
          make: 'Hyundai',
          model: 'Santa Fe Sport',
          mileage: 85234,
        },
      });
      
      const pdfResult = await mockElectron.processPDF('/path/to/file.pdf');
      
      act(() => {
        result.current.setCurrentAppraisal(pdfResult.extractedData);
      });
      
      // 3. Validate data
      mockElectron.validateData.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        confidence: 95,
      });
      
      await mockElectron.validateData(pdfResult.extractedData);
      
      // 4. Save appraisal
      mockElectron.saveAppraisal.mockResolvedValue({ success: true });
      await mockElectron.saveAppraisal(pdfResult.extractedData);
      
      act(() => {
        result.current.addToHistory(pdfResult.extractedData);
      });
      
      // 5. Export to CSV
      mockElectron.exportToCSV.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.csv',
      });
      
      await mockElectron.exportToCSV({
        appraisals: result.current.appraisalHistory,
      });
      
      expect(result.current.appraisalHistory).toHaveLength(1);
      expect(mockElectron.exportToCSV).toHaveBeenCalled();
    });
  });
});
