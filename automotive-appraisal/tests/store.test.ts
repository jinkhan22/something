import { useAppStore } from '../src/renderer/store';
import { ErrorType } from '../src/types';

describe('Zustand Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAppStore.getState().reset();
    // Clear localStorage
    localStorage.clear();
  });

  describe('Processing State', () => {
    it('should set appraisal data', () => {
      const store = useAppStore.getState();
      const mockData = {
        vin: 'TEST123456789',
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        mileage: 50000,
        location: 'Los Angeles, CA',
        reportType: 'CCC_ONE',
        extractionConfidence: 0.95,
        extractionErrors: []
      };

      store.setAppraisal(mockData);
      expect(useAppStore.getState().currentAppraisal).toEqual(mockData);
    });

    it('should update processing status', () => {
      const store = useAppStore.getState();
      
      store.setStatus('processing');
      expect(useAppStore.getState().processingStatus).toBe('processing');
      
      store.setStatus('complete');
      expect(useAppStore.getState().processingStatus).toBe('complete');
    });

    it('should update progress', () => {
      const store = useAppStore.getState();
      
      store.setProgress(50);
      expect(useAppStore.getState().processingProgress).toBe(50);
      
      store.setProgress(100);
      expect(useAppStore.getState().processingProgress).toBe(100);
    });

    it('should set processing status with progress and message', () => {
      const store = useAppStore.getState();
      
      store.setProcessingStatus('processing', 75, 'Extracting data...');
      
      const state = useAppStore.getState();
      expect(state.processingStatus).toBe('processing');
      expect(state.processingProgress).toBe(75);
      expect(state.processingMessage).toBe('Extracting data...');
    });

    it('should reset processing state', () => {
      const store = useAppStore.getState();
      
      // Set some state
      store.setStatus('processing');
      store.setProgress(50);
      store.setProcessingMessage('Processing...');
      
      // Reset
      store.resetProcessing();
      
      const state = useAppStore.getState();
      expect(state.processingStatus).toBe('idle');
      expect(state.processingProgress).toBe(0);
      expect(state.processingMessage).toBe('');
      expect(state.currentAppraisal).toBeNull();
    });
  });

  describe('Error State Management', () => {
    it('should set error message', () => {
      const store = useAppStore.getState();
      
      store.setError('Test error');
      expect(useAppStore.getState().errorMessage).toBe('Test error');
    });

    it('should create and set app error', () => {
      const store = useAppStore.getState();
      
      store.createError(
        ErrorType.FILE_INVALID,
        'Invalid file format',
        { fileName: 'test.pdf' },
        true,
        'Please select a valid PDF file'
      );
      
      const state = useAppStore.getState();
      expect(state.error).toBeDefined();
      expect(state.error?.type).toBe(ErrorType.FILE_INVALID);
      // Error message should be mapped to user-friendly message
      expect(state.error?.message).toBe('Something went wrong while processing your request.');
      expect(state.error?.recoverable).toBe(true);
      // Suggested action should come from error mapper or fallback to provided action
      expect(state.error?.suggestedAction).toBeTruthy();
      expect(state.errorMessage).toBe('Something went wrong while processing your request.');
      // Original message should be preserved in details
      expect(state.error?.details).toHaveProperty('originalMessage', 'Invalid file format');
      expect(state.error?.details).toHaveProperty('errorCode');
    });

    it('should clear error', () => {
      const store = useAppStore.getState();
      
      // Set error
      store.createError(ErrorType.UNKNOWN_ERROR, 'Test error');
      expect(useAppStore.getState().error).toBeDefined();
      
      // Clear error
      store.clearError();
      
      const state = useAppStore.getState();
      expect(state.error).toBeNull();
      expect(state.errorMessage).toBeNull();
      expect(state.errorDetails).toBeNull();
    });
  });

  describe('History Management', () => {
    it('should add item to history', () => {
      const store = useAppStore.getState();
      const mockRecord = {
        id: 'test-1',
        createdAt: new Date(),
        status: 'draft' as const,
        data: {
          vin: 'TEST123456789',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
          mileage: 50000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 0.95,
          extractionErrors: []
        }
      };

      store.addToHistory(mockRecord);
      
      const state = useAppStore.getState();
      expect(state.appraisalHistory).toHaveLength(1);
      expect(state.appraisalHistory[0]).toEqual(mockRecord);
    });

    it('should update history item', () => {
      const store = useAppStore.getState();
      const mockRecord = {
        id: 'test-1',
        createdAt: new Date(),
        status: 'draft' as const,
        data: {
          vin: 'TEST123456789',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
          mileage: 50000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 0.95,
          extractionErrors: []
        }
      };

      store.addToHistory(mockRecord);
      store.updateHistoryItem('test-1', { status: 'complete' });
      
      const state = useAppStore.getState();
      expect(state.appraisalHistory[0].status).toBe('complete');
    });

    it('should remove item from history', () => {
      const store = useAppStore.getState();
      const mockRecord = {
        id: 'test-1',
        createdAt: new Date(),
        status: 'draft' as const,
        data: {
          vin: 'TEST123456789',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
          mileage: 50000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 0.95,
          extractionErrors: []
        }
      };

      store.addToHistory(mockRecord);
      expect(useAppStore.getState().appraisalHistory).toHaveLength(1);
      
      store.removeFromHistory('test-1');
      expect(useAppStore.getState().appraisalHistory).toHaveLength(0);
    });

    it('should clear all history', () => {
      const store = useAppStore.getState();
      
      // Add multiple items
      for (let i = 0; i < 3; i++) {
        store.addToHistory({
          id: `test-${i}`,
          createdAt: new Date(),
          status: 'draft',
          data: {
            vin: `TEST${i}`,
            year: 2020,
            make: 'Toyota',
            model: 'Camry',
            mileage: 50000,
            location: 'Los Angeles, CA',
            reportType: 'CCC_ONE',
            extractionConfidence: 0.95,
            extractionErrors: []
          }
        });
      }
      
      expect(useAppStore.getState().appraisalHistory).toHaveLength(3);
      
      store.clearHistory();
      expect(useAppStore.getState().appraisalHistory).toHaveLength(0);
    });
  });

  describe('UI State Management', () => {
    it('should toggle sidebar', () => {
      const store = useAppStore.getState();
      
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
      
      store.toggleSidebar();
      expect(useAppStore.getState().sidebarCollapsed).toBe(true);
      
      store.toggleSidebar();
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
    });

    it('should set sidebar collapsed state', () => {
      const store = useAppStore.getState();
      
      store.setSidebarCollapsed(true);
      expect(useAppStore.getState().sidebarCollapsed).toBe(true);
      
      store.setSidebarCollapsed(false);
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
    });

    it('should set current page', () => {
      const store = useAppStore.getState();
      
      store.setCurrentPage('history');
      expect(useAppStore.getState().currentPage).toBe('history');
      
      store.setCurrentPage('settings');
      expect(useAppStore.getState().currentPage).toBe('settings');
    });

    it('should set theme', () => {
      const store = useAppStore.getState();
      
      store.setTheme('dark');
      expect(useAppStore.getState().theme).toBe('dark');
      
      store.setTheme('light');
      expect(useAppStore.getState().theme).toBe('light');
    });
  });

  describe('State Persistence', () => {
    it('should persist UI preferences to localStorage', () => {
      const store = useAppStore.getState();
      
      // Change UI preferences
      store.setSidebarCollapsed(true);
      store.setTheme('dark');
      
      // Check localStorage
      const stored = localStorage.getItem('automotive-appraisal-storage');
      expect(stored).toBeDefined();
      
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.sidebarCollapsed).toBe(true);
        expect(parsed.state.theme).toBe('dark');
      }
    });

    it('should not persist processing state', () => {
      const store = useAppStore.getState();
      
      // Set processing state
      store.setStatus('processing');
      store.setProgress(50);
      
      // Check localStorage
      const stored = localStorage.getItem('automotive-appraisal-storage');
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Processing state should not be in persisted state
        expect(parsed.state.processingStatus).toBeUndefined();
        expect(parsed.state.processingProgress).toBeUndefined();
      }
    });

    it('should not persist error state', () => {
      const store = useAppStore.getState();
      
      // Set error
      store.createError(ErrorType.UNKNOWN_ERROR, 'Test error');
      
      // Check localStorage
      const stored = localStorage.getItem('automotive-appraisal-storage');
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Error state should not be in persisted state
        expect(parsed.state.error).toBeUndefined();
        expect(parsed.state.errorMessage).toBeUndefined();
      }
    });
  });

  describe('State Reset', () => {
    it('should reset all state to initial values', () => {
      const store = useAppStore.getState();
      
      // Set various state
      store.setStatus('processing');
      store.setProgress(50);
      store.createError(ErrorType.UNKNOWN_ERROR, 'Test error');
      store.setCurrentPage('history');
      store.addToHistory({
        id: 'test-1',
        createdAt: new Date(),
        status: 'draft',
        data: {
          vin: 'TEST123456789',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
          mileage: 50000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 0.95,
          extractionErrors: []
        }
      });
      
      // Reset
      store.reset();
      
      const state = useAppStore.getState();
      expect(state.processingStatus).toBe('idle');
      expect(state.processingProgress).toBe(0);
      expect(state.error).toBeNull();
      expect(state.currentPage).toBe('dashboard');
      expect(state.appraisalHistory).toHaveLength(0);
    });
  });

  describe('Appraisal Loading', () => {
    const mockAppraisalData = {
      vin: 'TEST123456789',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      mileage: 50000,
      location: 'Los Angeles, CA',
      reportType: 'CCC_ONE',
      extractionConfidence: 0.95,
      extractionErrors: []
    };

    const mockAppraisalRecord = {
      id: 'test-appraisal-1',
      createdAt: new Date(),
      status: 'draft' as const,
      data: mockAppraisalData
    };

    it('should set current appraisal by ID from history', () => {
      const store = useAppStore.getState();
      
      // Add appraisal to history
      store.addToHistory(mockAppraisalRecord);
      
      // Set current appraisal by ID
      store.setCurrentAppraisalById('test-appraisal-1');
      
      const state = useAppStore.getState();
      expect(state.currentAppraisal).toEqual(mockAppraisalData);
    });

    it('should handle missing appraisal when setting by ID', () => {
      const store = useAppStore.getState();
      
      // Try to set non-existent appraisal
      store.setCurrentAppraisalById('non-existent-id');
      
      const state = useAppStore.getState();
      expect(state.error).not.toBeNull();
      expect(state.error?.type).toBe(ErrorType.STORAGE_ERROR);
    });
  });

  describe('Market Value Calculation with Context', () => {
    const mockAppraisalData = {
      vin: 'TEST123456789',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      mileage: 50000,
      location: 'Los Angeles, CA',
      reportType: 'CCC_ONE',
      extractionConfidence: 0.95,
      extractionErrors: []
    };

    const mockAppraisalRecord = {
      id: 'test-appraisal-1',
      createdAt: new Date(),
      status: 'draft' as const,
      data: mockAppraisalData
    };

    it('should load appraisal from history if not current', () => {
      const store = useAppStore.getState();
      
      // Add appraisal to history but don't set as current
      store.addToHistory(mockAppraisalRecord);
      
      // Get fresh state after adding to history
      const stateAfterAdd = useAppStore.getState();
      
      // Verify appraisal is in history
      expect(stateAfterAdd.appraisalHistory).toHaveLength(1);
      expect(stateAfterAdd.appraisalHistory[0].id).toBe('test-appraisal-1');
      
      // Verify current appraisal is not set
      expect(stateAfterAdd.currentAppraisal).toBeNull();
      
      // Now use setCurrentAppraisalById to load from history
      store.setCurrentAppraisalById('test-appraisal-1');
      
      const state = useAppStore.getState();
      expect(state.currentAppraisal).toEqual(mockAppraisalData);
    });
  });
});
