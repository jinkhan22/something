import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppStore } from '../src/renderer/store';
import { ExtractedVehicleData, AppraisalRecord } from '../src/types';

// Mock electron API
const mockElectron = {
  getAppraisals: jest.fn(),
  getAppraisal: jest.fn(),
  updateAppraisalStatus: jest.fn(),
  deleteAppraisal: jest.fn(),
  processPDF: jest.fn(),
  onProcessingProgress: jest.fn(() => () => {}),
  onProcessingError: jest.fn(() => () => {}),
  onProcessingComplete: jest.fn(() => () => {}),
  onStorageError: jest.fn(() => () => {}),
  showErrorDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  showOpenDialog: jest.fn(),
  removeAllListeners: jest.fn(),
  getAppVersion: jest.fn(),
  getSystemInfo: jest.fn(),
  openDevTools: jest.fn()
};

// Set up window.electron before importing store
Object.defineProperty(window, 'electron', {
  writable: true,
  value: mockElectron
});

// Mock data
const mockVehicleData: ExtractedVehicleData = {
  vin: '1HGBH41JXMN109186',
  year: 2021,
  make: 'Honda',
  model: 'Accord',
  mileage: 45000,
  location: 'Los Angeles, CA',
  reportType: 'CCC_ONE',
  extractionConfidence: 0.95,
  extractionErrors: [],
  settlementValue: 25000,
  marketValue: 26500
};

const mockAppraisalRecord: AppraisalRecord = {
  id: 'apr_1234567890',
  createdAt: new Date(),
  status: 'draft',
  data: mockVehicleData
};

describe('Storage UI Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset store state
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('History Loading', () => {
    test('should load appraisals from storage', async () => {
      mockElectron.getAppraisals.mockResolvedValue([mockAppraisalRecord]);

      const { result } = renderHook(() => useAppStore());

      expect(result.current.historyLoading).toBe(false);
      expect(result.current.appraisalHistory).toEqual([]);

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(mockElectron.getAppraisals).toHaveBeenCalled();
      expect(result.current.appraisalHistory).toHaveLength(1);
      expect(result.current.appraisalHistory[0]).toEqual(mockAppraisalRecord);
      expect(result.current.historyLoading).toBe(false);
      expect(result.current.historyError).toBeNull();
    });

    test('should handle loading errors gracefully', async () => {
      const errorMessage = 'Failed to load appraisals';
      mockElectron.getAppraisals.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(result.current.historyLoading).toBe(false);
      expect(result.current.historyError).toBe(errorMessage);
      expect(result.current.appraisalHistory).toEqual([]);
    });

    test('should set loading state during fetch', async () => {
      let resolvePromise: (value: AppraisalRecord[]) => void;
      const promise = new Promise<AppraisalRecord[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockElectron.getAppraisals.mockReturnValue(promise);

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.loadHistory();
      });

      // Should be loading
      expect(result.current.historyLoading).toBe(true);

      await act(async () => {
        resolvePromise!([mockAppraisalRecord]);
        await promise;
      });

      // Should be done loading
      expect(result.current.historyLoading).toBe(false);
    });
  });

  describe('History Management', () => {
    test('should add appraisal to history', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addToHistory(mockAppraisalRecord);
      });

      expect(result.current.appraisalHistory).toHaveLength(1);
      expect(result.current.appraisalHistory[0]).toEqual(mockAppraisalRecord);
    });

    test('should add new appraisals to the beginning of the list', () => {
      const { result } = renderHook(() => useAppStore());

      const appraisal1 = { ...mockAppraisalRecord, id: 'apr_1' };
      const appraisal2 = { ...mockAppraisalRecord, id: 'apr_2' };

      act(() => {
        result.current.addToHistory(appraisal1);
        result.current.addToHistory(appraisal2);
      });

      expect(result.current.appraisalHistory).toHaveLength(2);
      expect(result.current.appraisalHistory[0].id).toBe('apr_2');
      expect(result.current.appraisalHistory[1].id).toBe('apr_1');
    });

    test('should update appraisal in history', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addToHistory(mockAppraisalRecord);
      });

      act(() => {
        result.current.updateHistoryItem(mockAppraisalRecord.id, { status: 'complete' });
      });

      expect(result.current.appraisalHistory[0].status).toBe('complete');
    });

    test('should remove appraisal from history', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addToHistory(mockAppraisalRecord);
      });

      expect(result.current.appraisalHistory).toHaveLength(1);

      act(() => {
        result.current.removeFromHistory(mockAppraisalRecord.id);
      });

      expect(result.current.appraisalHistory).toHaveLength(0);
    });

    test('should clear all history', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addToHistory(mockAppraisalRecord);
        result.current.addToHistory({ ...mockAppraisalRecord, id: 'apr_2' });
      });

      expect(result.current.appraisalHistory).toHaveLength(2);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.appraisalHistory).toHaveLength(0);
    });
  });

  describe('Optimistic Updates', () => {
    test('should update UI immediately when updating status', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addToHistory(mockAppraisalRecord);
      });

      expect(result.current.appraisalHistory[0].status).toBe('draft');

      act(() => {
        result.current.updateHistoryItem(mockAppraisalRecord.id, { status: 'complete' });
      });

      // UI should update immediately
      expect(result.current.appraisalHistory[0].status).toBe('complete');
    });

    test('should remove from UI immediately when deleting', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addToHistory(mockAppraisalRecord);
      });

      expect(result.current.appraisalHistory).toHaveLength(1);

      act(() => {
        result.current.removeFromHistory(mockAppraisalRecord.id);
      });

      // UI should update immediately
      expect(result.current.appraisalHistory).toHaveLength(0);
    });
  });

  describe('Processing State Management', () => {
    test('should set current appraisal after processing', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal(mockVehicleData);
      });

      expect(result.current.currentAppraisal).toEqual(mockVehicleData);
    });

    test('should update processing status', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setProcessingStatus('processing', 50, 'Extracting data...');
      });

      expect(result.current.processingStatus).toBe('processing');
      expect(result.current.processingProgress).toBe(50);
      expect(result.current.processingMessage).toBe('Extracting data...');
    });

    test('should reset processing state', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal(mockVehicleData);
        result.current.setProcessingStatus('complete', 100, 'Done');
      });

      expect(result.current.currentAppraisal).not.toBeNull();
      expect(result.current.processingStatus).toBe('complete');

      act(() => {
        result.current.resetProcessing();
      });

      expect(result.current.currentAppraisal).toBeNull();
      expect(result.current.processingStatus).toBe('idle');
      expect(result.current.processingProgress).toBe(0);
      expect(result.current.processingMessage).toBe('');
    });
  });

  describe('Error State Management', () => {
    test('should create and store error', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.createError(
          'STORAGE_ERROR' as any,
          'Failed to save',
          { code: 'EACCES' },
          true,
          'Check permissions'
        );
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe('Failed to save');
      expect(result.current.error?.type).toBe('STORAGE_ERROR');
      expect(result.current.error?.recoverable).toBe(true);
      expect(result.current.error?.suggestedAction).toBe('Check permissions');
    });

    test('should clear error', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.createError('STORAGE_ERROR' as any, 'Failed to save');
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.errorDetails).toBeNull();
    });
  });
});
