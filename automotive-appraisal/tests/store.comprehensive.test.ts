/**
 * Comprehensive Zustand Store Tests
 * Tests state management, actions, and computed state
 * Requirements: 10.5
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../src/renderer/store';

describe('Zustand Store - Comprehensive Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.reset();
    });
  });
  
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useStore());
      
      expect(result.current.currentAppraisal).toBeNull();
      expect(result.current.appraisalHistory).toEqual([]);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBeNull();
    });
    
    it('should have default settings', () => {
      const { result } = renderHook(() => useStore());
      
      expect(result.current.settings).toBeDefined();
      expect(result.current.settings.autoOCRFallback).toBe(true);
      expect(result.current.settings.ocrQuality).toBe('balanced');
    });
  });
  
  describe('Appraisal Management', () => {
    const mockAppraisal = {
      id: 'test-id',
      vin: '5XYZT3LB0EG123456',
      year: 2014,
      make: 'Hyundai',
      model: 'Santa Fe Sport',
      mileage: 85234,
      location: 'CA 90210',
      reportType: 'MITCHELL' as const,
      extractionConfidence: 95,
      extractionErrors: [],
      settlementValue: 10741.06,
      marketValue: 10062.32,
      date: new Date().toISOString(),
    };
    
    it('should set current appraisal', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setCurrentAppraisal(mockAppraisal);
      });
      
      expect(result.current.currentAppraisal).toEqual(mockAppraisal);
    });
    
    it('should add appraisal to history', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.addToHistory(mockAppraisal);
      });
      
      expect(result.current.appraisalHistory).toHaveLength(1);
      expect(result.current.appraisalHistory[0]).toEqual(mockAppraisal);
    });
    
    it('should update existing appraisal', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.addToHistory(mockAppraisal);
      });
      
      const updatedAppraisal = {
        ...mockAppraisal,
        mileage: 90000,
      };
      
      act(() => {
        result.current.updateAppraisal(mockAppraisal.id, updatedAppraisal);
      });
      
      expect(result.current.appraisalHistory[0].mileage).toBe(90000);
    });
    
    it('should delete appraisal from history', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.addToHistory(mockAppraisal);
      });
      
      expect(result.current.appraisalHistory).toHaveLength(1);
      
      act(() => {
        result.current.deleteAppraisal(mockAppraisal.id);
      });
      
      expect(result.current.appraisalHistory).toHaveLength(0);
    });
    
    it('should clear current appraisal', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setCurrentAppraisal(mockAppraisal);
      });
      
      expect(result.current.currentAppraisal).not.toBeNull();
      
      act(() => {
        result.current.clearCurrentAppraisal();
      });
      
      expect(result.current.currentAppraisal).toBeNull();
    });
  });
  
  describe('Processing State', () => {
    it('should set processing state', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setProcessing(true);
      });
      
      expect(result.current.isProcessing).toBe(true);
      
      act(() => {
        result.current.setProcessing(false);
      });
      
      expect(result.current.isProcessing).toBe(false);
    });
    
    it('should set progress', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setProgress(50, 'Processing page 1');
      });
      
      expect(result.current.progress).toBe(50);
      expect(result.current.progressMessage).toBe('Processing page 1');
    });
    
    it('should reset progress when processing completes', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setProgress(100, 'Complete');
        result.current.setProcessing(false);
      });
      
      expect(result.current.progress).toBe(0);
      expect(result.current.progressMessage).toBe('');
    });
  });
  
  describe('OCR State', () => {
    it('should set OCR status', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setOCRStatus(true, 85);
      });
      
      expect(result.current.ocrProcessingActive).toBe(true);
      expect(result.current.ocrConfidence).toBe(85);
    });
    
    it('should set extraction method', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setExtractionMethod('ocr');
      });
      
      expect(result.current.extractionMethod).toBe('ocr');
    });
  });
  
  describe('Validation State', () => {
    const mockValidationResults = [
      {
        field: 'vin',
        isValid: true,
        errors: [],
        warnings: [],
        confidence: 100,
      },
      {
        field: 'year',
        isValid: true,
        errors: [],
        warnings: ['Vehicle is very old'],
        confidence: 90,
      },
    ];
    
    it('should set validation results', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setValidationResults(mockValidationResults);
      });
      
      expect(result.current.validationResults).toEqual(mockValidationResults);
    });
    
    it('should detect validation errors', () => {
      const { result } = renderHook(() => useStore());
      
      const resultsWithErrors = [
        {
          field: 'vin',
          isValid: false,
          errors: ['Invalid VIN format'],
          warnings: [],
          confidence: 0,
        },
      ];
      
      act(() => {
        result.current.setValidationResults(resultsWithErrors);
      });
      
      expect(result.current.hasValidationErrors).toBe(true);
    });
  });
  
  describe('Settings Management', () => {
    it('should update settings', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.updateSettings({
          ocrQuality: 'high',
          autoOCRFallback: false,
        });
      });
      
      expect(result.current.settings.ocrQuality).toBe('high');
      expect(result.current.settings.autoOCRFallback).toBe(false);
    });
    
    it('should persist settings', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.updateSettings({
          defaultExportFormat: 'json',
        });
      });
      
      // Settings should be persisted to localStorage
      const stored = localStorage.getItem('app-settings');
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.defaultExportFormat).toBe('json');
    });
  });
  
  describe('Search and Filtering', () => {
    const mockAppraisals = [
      {
        id: '1',
        vin: 'VIN1',
        year: 2014,
        make: 'Toyota',
        model: 'Camry',
        mileage: 50000,
        date: '2024-01-01',
      },
      {
        id: '2',
        vin: 'VIN2',
        year: 2018,
        make: 'Honda',
        model: 'Civic',
        mileage: 30000,
        date: '2024-01-15',
      },
      {
        id: '3',
        vin: 'VIN3',
        year: 2020,
        make: 'Toyota',
        model: 'Corolla',
        mileage: 20000,
        date: '2024-02-01',
      },
    ];
    
    beforeEach(() => {
      const { result } = renderHook(() => useStore());
      act(() => {
        mockAppraisals.forEach(a => result.current.addToHistory(a));
      });
    });
    
    it('should filter by make', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setSearchFilters({ make: 'Toyota' });
      });
      
      const filtered = result.current.filteredAppraisals;
      expect(filtered).toHaveLength(2);
      expect(filtered.every(a => a.make === 'Toyota')).toBe(true);
    });
    
    it('should filter by VIN', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setSearchFilters({ vin: 'VIN2' });
      });
      
      const filtered = result.current.filteredAppraisals;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].vin).toBe('VIN2');
    });
    
    it('should filter by date range', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setSearchFilters({
          dateRange: {
            start: new Date('2024-01-10'),
            end: new Date('2024-01-20'),
          },
        });
      });
      
      const filtered = result.current.filteredAppraisals;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });
    
    it('should combine multiple filters', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setSearchFilters({
          make: 'Toyota',
          year: 2020,
        });
      });
      
      const filtered = result.current.filteredAppraisals;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].model).toBe('Corolla');
    });
    
    it('should clear filters', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setSearchFilters({ make: 'Toyota' });
      });
      
      expect(result.current.filteredAppraisals).toHaveLength(2);
      
      act(() => {
        result.current.clearSearchFilters();
      });
      
      expect(result.current.filteredAppraisals).toHaveLength(3);
    });
  });
  
  describe('Error Handling', () => {
    it('should set error', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setError('Test error message');
      });
      
      expect(result.current.error).toBe('Test error message');
    });
    
    it('should clear error', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setError('Test error');
      });
      
      expect(result.current.error).not.toBeNull();
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
    
    it('should auto-clear error after timeout', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setError('Test error', 3000);
      });
      
      expect(result.current.error).toBe('Test error');
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      expect(result.current.error).toBeNull();
      
      jest.useRealTimers();
    });
  });
  
  describe('Computed State', () => {
    it('should compute total appraisals count', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.addToHistory({ id: '1', vin: 'VIN1' } as any);
        result.current.addToHistory({ id: '2', vin: 'VIN2' } as any);
      });
      
      expect(result.current.totalAppraisals).toBe(2);
    });
    
    it('should compute average confidence', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.addToHistory({
          id: '1',
          extractionConfidence: 90,
        } as any);
        result.current.addToHistory({
          id: '2',
          extractionConfidence: 80,
        } as any);
      });
      
      expect(result.current.averageConfidence).toBe(85);
    });
    
    it('should compute OCR usage percentage', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.addToHistory({
          id: '1',
          extractionMethod: 'ocr',
        } as any);
        result.current.addToHistory({
          id: '2',
          extractionMethod: 'standard',
        } as any);
        result.current.addToHistory({
          id: '3',
          extractionMethod: 'ocr',
        } as any);
      });
      
      expect(result.current.ocrUsagePercentage).toBeCloseTo(66.67, 1);
    });
  });
  
  describe('State Persistence', () => {
    it('should persist state to localStorage', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.addToHistory({ id: '1', vin: 'VIN1' } as any);
      });
      
      const stored = localStorage.getItem('app-state');
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.appraisalHistory).toHaveLength(1);
    });
    
    it('should hydrate state from localStorage', () => {
      const mockState = {
        appraisalHistory: [{ id: '1', vin: 'VIN1' }],
        settings: { ocrQuality: 'high' },
      };
      
      localStorage.setItem('app-state', JSON.stringify(mockState));
      
      const { result } = renderHook(() => useStore());
      
      expect(result.current.appraisalHistory).toHaveLength(1);
      expect(result.current.settings.ocrQuality).toBe('high');
    });
  });
  
  describe('State Reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.addToHistory({ id: '1', vin: 'VIN1' } as any);
        result.current.setError('Test error');
        result.current.setProcessing(true);
      });
      
      expect(result.current.appraisalHistory).toHaveLength(1);
      expect(result.current.error).not.toBeNull();
      expect(result.current.isProcessing).toBe(true);
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.appraisalHistory).toHaveLength(0);
      expect(result.current.error).toBeNull();
      expect(result.current.isProcessing).toBe(false);
    });
  });
  
  describe('Concurrent Updates', () => {
    it('should handle multiple simultaneous updates', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.setProcessing(true);
        result.current.setProgress(50, 'Processing');
        result.current.setOCRStatus(true, 85);
      });
      
      expect(result.current.isProcessing).toBe(true);
      expect(result.current.progress).toBe(50);
      expect(result.current.ocrProcessingActive).toBe(true);
    });
    
    it('should maintain consistency during rapid updates', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.setProgress(i, `Step ${i}`);
        }
      });
      
      expect(result.current.progress).toBe(99);
      expect(result.current.progressMessage).toBe('Step 99');
    });
  });
});
