import { ipcMain, BrowserWindow } from 'electron';
import { storage } from '../src/main/services/storage';
import { extractVehicleData } from '../src/main/services/pdfExtractor';
import { ErrorType } from '../src/types';

// Mock the services
jest.mock('../src/main/services/storage');
jest.mock('../src/main/services/pdfExtractor');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockExtractVehicleData = extractVehicleData as jest.MockedFunction<typeof extractVehicleData>;

describe('IPC Communication Tests', () => {
  let mockEvent: any;
  let mockSender: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSender = {
      send: jest.fn(),
    };
    
    mockEvent = {
      sender: mockSender,
    };
  });

  describe('PDF Processing IPC', () => {
    test('should process PDF successfully with progress reporting', async () => {
      // Mock successful extraction
      const mockExtractedData = {
        vin: 'TEST123456789',
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        mileage: 50000,
        location: 'Test Location',
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.95,
      };

      mockExtractVehicleData.mockResolvedValue(mockExtractedData);
      mockStorage.saveAppraisal.mockReturnValue('test-id-123');

      // Import and setup IPC handlers (this would normally be done in main.ts)
      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      // Get the handler that was registered
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'process-pdf')?.[1];

      expect(handleProcessPDF).toBeDefined();

      // Test the handler
      const testBuffer = Buffer.from('test pdf content');
      const result = await handleProcessPDF(mockEvent, testBuffer);

      // Verify progress reporting
      expect(mockSender.send).toHaveBeenCalledWith('processing-progress', {
        progress: 10,
        message: 'Starting PDF processing...'
      });
      expect(mockSender.send).toHaveBeenCalledWith('processing-progress', {
        progress: 100,
        message: 'Processing complete'
      });

      // Verify completion event
      expect(mockSender.send).toHaveBeenCalledWith('processing-complete', expect.objectContaining({
        success: true,
        appraisalId: 'test-id-123'
      }));

      // Verify result
      expect(result).toEqual({
        success: true,
        extractedData: mockExtractedData,
        appraisalId: 'test-id-123',
        processingTime: expect.any(Number),
        errors: [],
        warnings: []
      });

      // Verify services were called
      expect(mockExtractVehicleData).toHaveBeenCalledWith(testBuffer);
      expect(mockStorage.saveAppraisal).toHaveBeenCalledWith(mockExtractedData);
    });

    test('should handle PDF processing errors properly', async () => {
      const testError = new Error('PDF extraction failed');
      mockExtractVehicleData.mockRejectedValue(testError);

      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'process-pdf')?.[1];

      const testBuffer = Buffer.from('invalid pdf content');
      const result = await handleProcessPDF(mockEvent, testBuffer);

      // Verify error event was sent
      expect(mockSender.send).toHaveBeenCalledWith('processing-error', {
        message: 'PDF extraction failed',
        stack: expect.any(String),
        type: ErrorType.PROCESSING_FAILED
      });

      // Verify error result
      expect(result).toEqual({
        success: false,
        errors: ['PDF extraction failed'],
        warnings: [],
        processingTime: expect.any(Number)
      });
    });

    test('should validate PDF buffer input', async () => {
      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'process-pdf')?.[1];

      // Test with empty buffer
      const result = await handleProcessPDF(mockEvent, Buffer.alloc(0));

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid PDF buffer provided');
    });

    test('should handle large file size validation', async () => {
      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'process-pdf')?.[1];

      // Create buffer larger than 50MB
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024);
      const result = await handleProcessPDF(mockEvent, largeBuffer);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('PDF file too large (maximum 50MB)');
      
      // Verify error event with correct type
      expect(mockSender.send).toHaveBeenCalledWith('processing-error', {
        message: 'PDF file too large (maximum 50MB)',
        stack: expect.any(String),
        type: ErrorType.FILE_TOO_LARGE
      });
    });
  });

  describe('Storage Operations IPC', () => {
    test('should get all appraisals successfully', async () => {
      const mockAppraisals = [
        {
          id: 'test-1',
          createdAt: new Date(),
          status: 'draft' as const,
          data: {} as any
        }
      ];

      mockStorage.getAppraisals.mockReturnValue(mockAppraisals);

      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleGetAppraisals = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'get-appraisals')?.[1];

      const result = await handleGetAppraisals(mockEvent);

      expect(result).toEqual(mockAppraisals);
      expect(mockStorage.getAppraisals).toHaveBeenCalled();
    });

    test('should handle storage errors in get appraisals', async () => {
      const testError = new Error('Storage read failed');
      mockStorage.getAppraisals.mockImplementation(() => {
        throw testError;
      });

      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleGetAppraisals = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'get-appraisals')?.[1];

      await expect(handleGetAppraisals(mockEvent)).rejects.toThrow('Storage read failed');

      // Verify error event was sent
      expect(mockSender.send).toHaveBeenCalledWith('storage-error', {
        message: 'Storage read failed',
        stack: expect.any(String),
        type: ErrorType.STORAGE_ERROR
      });
    });

    test('should get single appraisal by ID', async () => {
      const mockAppraisal = {
        id: 'test-1',
        createdAt: new Date(),
        status: 'draft' as const,
        data: {} as any
      };

      mockStorage.getAppraisal.mockReturnValue(mockAppraisal);

      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleGetAppraisal = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'get-appraisal')?.[1];

      const result = await handleGetAppraisal(mockEvent, 'test-1');

      expect(result).toEqual(mockAppraisal);
      expect(mockStorage.getAppraisal).toHaveBeenCalledWith('test-1');
    });

    test('should validate appraisal ID input', async () => {
      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleGetAppraisal = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'get-appraisal')?.[1];

      await expect(handleGetAppraisal(mockEvent, '')).rejects.toThrow('Invalid appraisal ID provided');
      await expect(handleGetAppraisal(mockEvent, null)).rejects.toThrow('Invalid appraisal ID provided');
    });

    test('should update appraisal status successfully', async () => {
      mockStorage.updateAppraisalStatus.mockReturnValue(true);

      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleUpdateStatus = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'update-appraisal-status')?.[1];

      const result = await handleUpdateStatus(mockEvent, 'test-1', 'complete');

      expect(result).toBe(true);
      expect(mockStorage.updateAppraisalStatus).toHaveBeenCalledWith('test-1', 'complete');
    });

    test('should validate status input', async () => {
      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleUpdateStatus = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'update-appraisal-status')?.[1];

      await expect(handleUpdateStatus(mockEvent, 'test-1', 'invalid')).rejects.toThrow('Invalid status provided');
    });

    test('should handle appraisal not found in update', async () => {
      mockStorage.updateAppraisalStatus.mockReturnValue(false);

      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleUpdateStatus = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'update-appraisal-status')?.[1];

      await expect(handleUpdateStatus(mockEvent, 'nonexistent', 'complete'))
        .rejects.toThrow('Appraisal with ID nonexistent not found');
    });

    test('should delete appraisal successfully', async () => {
      mockStorage.deleteAppraisal.mockReturnValue(true);

      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleDeleteAppraisal = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'delete-appraisal')?.[1];

      const result = await handleDeleteAppraisal(mockEvent, 'test-1');

      expect(result).toBe(true);
      expect(mockStorage.deleteAppraisal).toHaveBeenCalledWith('test-1');
    });
  });

  describe('System Operations IPC', () => {
    test('should show error dialog', async () => {
      const mockDialog = require('electron').dialog;
      mockDialog.showMessageBox.mockResolvedValue({ response: 0 });

      const mockWindow = { webContents: mockEvent.sender };
      (BrowserWindow.fromWebContents as jest.Mock).mockReturnValue(mockWindow);

      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleShowErrorDialog = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'show-error-dialog')?.[1];

      const result = await handleShowErrorDialog(mockEvent, 'Error Title', 'Error Message');

      expect(mockDialog.showMessageBox).toHaveBeenCalledWith(mockWindow, {
        type: 'error',
        title: 'Error Title',
        message: 'Error Message',
        buttons: ['OK']
      });
    });

    test('should get app version', async () => {
      const mockApp = require('electron').app;
      mockApp.getVersion.mockReturnValue('1.2.3');

      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleGetVersion = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'get-app-version')?.[1];

      const result = await handleGetVersion(mockEvent);

      expect(result).toBe('1.2.3');
      expect(mockApp.getVersion).toHaveBeenCalled();
    });

    test('should get system info', async () => {
      const mockOs = require('os');
      mockOs.platform.mockReturnValue('darwin');
      mockOs.arch.mockReturnValue('x64');
      mockOs.release.mockReturnValue('20.6.0');

      // Mock process.versions
      const originalVersions = process.versions;
      process.versions = {
        ...originalVersions,
        electron: '13.1.0',
        node: '14.17.0'
      };

      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleGetSystemInfo = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'get-system-info')?.[1];

      const result = await handleGetSystemInfo(mockEvent);

      expect(result).toEqual({
        platform: 'darwin',
        arch: 'x64',
        version: '20.6.0',
        electronVersion: '13.1.0',
        nodeVersion: '14.17.0'
      });

      // Restore original versions
      process.versions = originalVersions;
    });
  });

  describe('Data Serialization Tests', () => {
    test('should properly serialize complex objects', async () => {
      const complexData = {
        vin: 'TEST123',
        date: new Date(),
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        }
      };

      mockExtractVehicleData.mockResolvedValue(complexData as any);
      mockStorage.saveAppraisal.mockReturnValue('test-id');

      const { setupIPCHandlers } = require('../src/main/ipc-handlers');
      setupIPCHandlers();

      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'process-pdf')?.[1];

      const result = await handleProcessPDF(mockEvent, Buffer.from('test'));

      // Verify data is serializable (no functions, dates converted to strings, etc.)
      expect(() => JSON.stringify(result.extractedData)).not.toThrow();
      expect(result.extractedData).toEqual(JSON.parse(JSON.stringify(complexData)));
    });
  });
});