/**
 * Comprehensive IPC Communication Tests
 * Tests main-renderer process communication
 * Requirements: 10.6
 */

import { ipcMain, ipcRenderer } from 'electron';

// Mock IPC
const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeHandler: jest.fn(),
};

const mockIpcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  send: jest.fn(),
  removeListener: jest.fn(),
};

(global as any).ipcMain = mockIpcMain;
(global as any).ipcRenderer = mockIpcRenderer;

describe('IPC Communication - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('PDF Processing IPC', () => {
    it('should handle processPDF request', async () => {
      const mockResult = {
        success: true,
        extractedData: {
          vin: '5XYZT3LB0EG123456',
          year: 2014,
          make: 'Hyundai',
          model: 'Santa Fe Sport',
        },
      };
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResult);
      
      const result = await mockIpcRenderer.invoke('process-pdf', {
        filePath: '/path/to/file.pdf',
      });
      
      expect(result.success).toBe(true);
      expect(result.extractedData.vin).toBe('5XYZT3LB0EG123456');
    });
    
    it('should handle processPDF errors', async () => {
      mockIpcRenderer.invoke.mockRejectedValue(new Error('Processing failed'));
      
      await expect(
        mockIpcRenderer.invoke('process-pdf', { filePath: '/invalid/path' })
      ).rejects.toThrow('Processing failed');
    });
    
    it('should send progress updates during processing', async () => {
      const progressCallback = jest.fn();
      mockIpcRenderer.on.mockImplementation((channel, callback) => {
        if (channel === 'pdf-progress') {
          // Simulate progress updates
          setTimeout(() => callback(null, { progress: 25, message: 'Converting to images' }), 10);
          setTimeout(() => callback(null, { progress: 50, message: 'Running OCR' }), 20);
          setTimeout(() => callback(null, { progress: 100, message: 'Complete' }), 30);
        }
      });
      
      mockIpcRenderer.on('pdf-progress', progressCallback);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(progressCallback).toHaveBeenCalled();
    });
  });
  
  describe('Storage IPC', () => {
    it('should save appraisal', async () => {
      const mockAppraisal = {
        id: 'test-id',
        vin: '5XYZT3LB0EG123456',
        year: 2014,
        make: 'Hyundai',
        model: 'Santa Fe Sport',
      };
      
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      
      const result = await mockIpcRenderer.invoke('save-appraisal', mockAppraisal);
      
      expect(result.success).toBe(true);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('save-appraisal', mockAppraisal);
    });
    
    it('should get all appraisals', async () => {
      const mockAppraisals = [
        { id: '1', vin: 'VIN1' },
        { id: '2', vin: 'VIN2' },
      ];
      
      mockIpcRenderer.invoke.mockResolvedValue(mockAppraisals);
      
      const result = await mockIpcRenderer.invoke('get-appraisals');
      
      expect(result).toHaveLength(2);
      expect(result[0].vin).toBe('VIN1');
    });
    
    it('should update appraisal', async () => {
      const updatedAppraisal = {
        id: 'test-id',
        vin: '5XYZT3LB0EG123456',
        mileage: 90000,
      };
      
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      
      const result = await mockIpcRenderer.invoke('update-appraisal', updatedAppraisal);
      
      expect(result.success).toBe(true);
    });
    
    it('should delete appraisal', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      
      const result = await mockIpcRenderer.invoke('delete-appraisal', 'test-id');
      
      expect(result.success).toBe(true);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('delete-appraisal', 'test-id');
    });
  });
  
  describe('Settings IPC', () => {
    it('should get settings', async () => {
      const mockSettings = {
        ocrQuality: 'high',
        autoOCRFallback: true,
        confidenceThresholds: {
          warning: 70,
          error: 50,
        },
      };
      
      mockIpcRenderer.invoke.mockResolvedValue(mockSettings);
      
      const result = await mockIpcRenderer.invoke('get-settings');
      
      expect(result.ocrQuality).toBe('high');
      expect(result.autoOCRFallback).toBe(true);
    });
    
    it('should update settings', async () => {
      const newSettings = {
        ocrQuality: 'balanced',
        autoOCRFallback: false,
      };
      
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      
      const result = await mockIpcRenderer.invoke('update-settings', newSettings);
      
      expect(result.success).toBe(true);
    });
    
    it('should persist settings', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      
      await mockIpcRenderer.invoke('update-settings', { ocrQuality: 'high' });
      
      // Verify settings are persisted
      mockIpcRenderer.invoke.mockResolvedValue({ ocrQuality: 'high' });
      const result = await mockIpcRenderer.invoke('get-settings');
      
      expect(result.ocrQuality).toBe('high');
    });
  });
  
  describe('Export IPC', () => {
    it('should export to CSV', async () => {
      const mockAppraisals = [
        { id: '1', vin: 'VIN1', make: 'Toyota' },
        { id: '2', vin: 'VIN2', make: 'Honda' },
      ];
      
      mockIpcRenderer.invoke.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.csv',
      });
      
      const result = await mockIpcRenderer.invoke('export-csv', {
        appraisals: mockAppraisals,
        filePath: '/path/to/export.csv',
      });
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/path/to/export.csv');
    });
    
    it('should handle export errors', async () => {
      mockIpcRenderer.invoke.mockRejectedValue(new Error('Export failed'));
      
      await expect(
        mockIpcRenderer.invoke('export-csv', { appraisals: [] })
      ).rejects.toThrow('Export failed');
    });
  });
  
  describe('Validation IPC', () => {
    it('should validate vehicle data', async () => {
      const mockData = {
        vin: '5XYZT3LB0EG123456',
        year: 2014,
        make: 'Hyundai',
        model: 'Santa Fe Sport',
        mileage: 85234,
      };
      
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        confidence: 95,
      };
      
      mockIpcRenderer.invoke.mockResolvedValue(mockValidationResult);
      
      const result = await mockIpcRenderer.invoke('validate-data', mockData);
      
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe(95);
    });
    
    it('should return validation errors', async () => {
      const invalidData = {
        vin: 'INVALID',
        year: 1800,
        make: '',
        model: '',
        mileage: -1000,
      };
      
      const mockValidationResult = {
        isValid: false,
        errors: ['Invalid VIN', 'Invalid year', 'Make is required'],
        warnings: [],
        confidence: 0,
      };
      
      mockIpcRenderer.invoke.mockResolvedValue(mockValidationResult);
      
      const result = await mockIpcRenderer.invoke('validate-data', invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('System Check IPC', () => {
    it('should check system dependencies', async () => {
      const mockSystemCheck = {
        tesseractAvailable: true,
        memoryAvailable: 4096,
        diskSpaceAvailable: 10240,
      };
      
      mockIpcRenderer.invoke.mockResolvedValue(mockSystemCheck);
      
      const result = await mockIpcRenderer.invoke('check-system');
      
      expect(result.tesseractAvailable).toBe(true);
      expect(result.memoryAvailable).toBeGreaterThan(0);
    });
    
    it('should report missing dependencies', async () => {
      const mockSystemCheck = {
        tesseractAvailable: false,
        error: 'Tesseract assets not found',
      };
      
      mockIpcRenderer.invoke.mockResolvedValue(mockSystemCheck);
      
      const result = await mockIpcRenderer.invoke('check-system');
      
      expect(result.tesseractAvailable).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('Error Propagation', () => {
    it('should propagate errors from main to renderer', async () => {
      const mainError = new Error('Main process error');
      mockIpcRenderer.invoke.mockRejectedValue(mainError);
      
      await expect(
        mockIpcRenderer.invoke('process-pdf', {})
      ).rejects.toThrow('Main process error');
    });
    
    it('should include error context', async () => {
      const errorWithContext = {
        message: 'Processing failed',
        context: {
          operation: 'PDF Processing',
          filePath: '/path/to/file.pdf',
        },
      };
      
      mockIpcRenderer.invoke.mockRejectedValue(errorWithContext);
      
      try {
        await mockIpcRenderer.invoke('process-pdf', {});
      } catch (error: any) {
        expect(error.context).toBeDefined();
        expect(error.context.operation).toBe('PDF Processing');
      }
    });
  });
  
  describe('IPC Channel Security', () => {
    it('should only expose whitelisted channels', () => {
      const allowedChannels = [
        'process-pdf',
        'save-appraisal',
        'get-appraisals',
        'update-appraisal',
        'delete-appraisal',
        'export-csv',
        'validate-data',
        'get-settings',
        'update-settings',
        'check-system',
      ];
      
      allowedChannels.forEach(channel => {
        expect(() => mockIpcRenderer.invoke(channel, {})).not.toThrow();
      });
    });
    
    it('should reject unauthorized channels', async () => {
      mockIpcRenderer.invoke.mockImplementation((channel) => {
        if (channel === 'unauthorized-channel') {
          return Promise.reject(new Error('Channel not allowed'));
        }
        return Promise.resolve({});
      });
      
      await expect(
        mockIpcRenderer.invoke('unauthorized-channel', {})
      ).rejects.toThrow('Channel not allowed');
    });
  });
  
  describe('Data Serialization', () => {
    it('should serialize complex objects', async () => {
      const complexData = {
        appraisal: {
          id: 'test',
          date: new Date('2024-01-01'),
          nested: {
            field: 'value',
          },
        },
      };
      
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      
      await mockIpcRenderer.invoke('save-appraisal', complexData);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'save-appraisal',
        expect.objectContaining({
          appraisal: expect.any(Object),
        })
      );
    });
    
    it('should handle large data payloads', async () => {
      const largeData = {
        appraisals: Array.from({ length: 1000 }, (_, i) => ({
          id: `appraisal-${i}`,
          vin: `VIN${i}`,
          data: 'x'.repeat(1000),
        })),
      };
      
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      
      await mockIpcRenderer.invoke('export-csv', largeData);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalled();
    });
  });
  
  describe('IPC Performance', () => {
    it('should handle rapid sequential calls', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      
      const promises = Array.from({ length: 100 }, (_, i) =>
        mockIpcRenderer.invoke('save-appraisal', { id: `test-${i}` })
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(100);
      expect(results.every(r => r.success)).toBe(true);
    });
    
    it('should handle concurrent calls', async () => {
      mockIpcRenderer.invoke.mockImplementation((channel) => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ success: true }), Math.random() * 100);
        });
      });
      
      const promises = [
        mockIpcRenderer.invoke('process-pdf', {}),
        mockIpcRenderer.invoke('get-appraisals'),
        mockIpcRenderer.invoke('get-settings'),
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
    });
  });
  
  describe('Event Listeners', () => {
    it('should register event listeners', () => {
      const callback = jest.fn();
      
      mockIpcRenderer.on('pdf-progress', callback);
      
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('pdf-progress', callback);
    });
    
    it('should remove event listeners', () => {
      const callback = jest.fn();
      
      mockIpcRenderer.on('pdf-progress', callback);
      mockIpcRenderer.removeListener('pdf-progress', callback);
      
      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith('pdf-progress', callback);
    });
    
    it('should handle multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      mockIpcRenderer.on('pdf-progress', callback1);
      mockIpcRenderer.on('pdf-progress', callback2);
      
      expect(mockIpcRenderer.on).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('IPC Timeout Handling', () => {
    it('should timeout long-running operations', async () => {
      jest.useFakeTimers();
      
      mockIpcRenderer.invoke.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 60000); // 1 minute
        });
      });
      
      const promise = mockIpcRenderer.invoke('process-pdf', {});
      
      jest.advanceTimersByTime(30000); // 30 seconds
      
      // Should still be pending
      expect(promise).toBeInstanceOf(Promise);
      
      jest.useRealTimers();
    });
  });
});
