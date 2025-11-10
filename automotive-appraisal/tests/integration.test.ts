import { setupIPCHandlers } from '../src/main/ipc-handlers';
import { storage } from '../src/main/services/storage';
import { extractVehicleData } from '../src/main/services/pdfExtractor';

// Mock the services
jest.mock('../src/main/services/storage');
jest.mock('../src/main/services/pdfExtractor');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockExtractVehicleData = extractVehicleData as jest.MockedFunction<typeof extractVehicleData>;

describe('IPC Integration Tests', () => {
  let mockEvent: any;
  let mockSender: any;
  let progressEvents: any[];
  let errorEvents: any[];
  let completeEvents: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    
    progressEvents = [];
    errorEvents = [];
    completeEvents = [];
    
    mockSender = {
      send: jest.fn((channel: string, data: any) => {
        if (channel === 'processing-progress') {
          progressEvents.push(data);
        } else if (channel === 'processing-error') {
          errorEvents.push(data);
        } else if (channel === 'processing-complete') {
          completeEvents.push(data);
        }
      }),
    };
    
    mockEvent = {
      sender: mockSender,
    };

    // Setup IPC handlers
    setupIPCHandlers();
  });

  describe('Complete PDF Processing Workflow', () => {
    test('should handle complete successful workflow with progress reporting', async () => {
      // Setup mocks for successful processing
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
      mockStorage.saveAppraisal.mockReturnValue('test-appraisal-123');

      // Get the PDF processing handler
      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'process-pdf')?.[1];

      // Process PDF
      const testBuffer = Buffer.from('test pdf content');
      const result = await handleProcessPDF(mockEvent, testBuffer);

      // Verify the complete workflow
      expect(result.success).toBe(true);
      expect(result.appraisalId).toBe('test-appraisal-123');
      expect(result.extractedData).toEqual(mockExtractedData);

      // Verify progress reporting sequence
      expect(progressEvents).toHaveLength(4);
      expect(progressEvents[0]).toEqual({ progress: 10, message: 'Starting PDF processing...' });
      expect(progressEvents[1]).toEqual({ progress: 30, message: 'Analyzing PDF structure...' });
      expect(progressEvents[2]).toEqual({ progress: 70, message: 'Validating extracted data...' });
      expect(progressEvents[3]).toEqual({ progress: 100, message: 'Processing complete' });

      // Verify completion event
      expect(completeEvents).toHaveLength(1);
      expect(completeEvents[0]).toMatchObject({
        success: true,
        appraisalId: 'test-appraisal-123'
      });

      // Verify no errors
      expect(errorEvents).toHaveLength(0);

      // Verify services were called correctly
      expect(mockExtractVehicleData).toHaveBeenCalledWith(testBuffer);
      expect(mockStorage.saveAppraisal).toHaveBeenCalledWith(mockExtractedData);
    });

    test('should handle error workflow with proper error propagation', async () => {
      // Setup mocks for failed processing
      const testError = new Error('PDF extraction failed');
      mockExtractVehicleData.mockRejectedValue(testError);

      // Get the PDF processing handler
      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'process-pdf')?.[1];

      // Process PDF
      const testBuffer = Buffer.from('invalid pdf content');
      const result = await handleProcessPDF(mockEvent, testBuffer);

      // Verify error result
      expect(result.success).toBe(false);
      expect(result.errors).toContain('PDF extraction failed');

      // Verify error event was sent
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toMatchObject({
        message: 'PDF extraction failed',
        type: 'processing_failed'
      });

      // Verify progress was attempted
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toEqual({ progress: 10, message: 'Starting PDF processing...' });

      // Verify no completion event
      expect(completeEvents).toHaveLength(0);
    });
  });

  describe('Storage Operations Integration', () => {
    test('should handle complete storage workflow', async () => {
      const mockAppraisals = [
        {
          id: 'test-1',
          createdAt: new Date(),
          status: 'draft' as const,
          data: {} as any
        },
        {
          id: 'test-2',
          createdAt: new Date(),
          status: 'complete' as const,
          data: {} as any
        }
      ];

      mockStorage.getAppraisals.mockReturnValue(mockAppraisals);
      mockStorage.getAppraisal.mockReturnValue(mockAppraisals[0]);
      mockStorage.updateAppraisalStatus.mockReturnValue(true);
      mockStorage.deleteAppraisal.mockReturnValue(true);

      const { ipcMain } = require('electron');
      
      // Get all handlers
      const handleGetAppraisals = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'get-appraisals')?.[1];
      const handleGetAppraisal = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'get-appraisal')?.[1];
      const handleUpdateStatus = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'update-appraisal-status')?.[1];
      const handleDeleteAppraisal = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'delete-appraisal')?.[1];

      // Test complete workflow
      const allAppraisals = await handleGetAppraisals(mockEvent);
      expect(allAppraisals).toEqual(mockAppraisals);

      const singleAppraisal = await handleGetAppraisal(mockEvent, 'test-1');
      expect(singleAppraisal).toEqual(mockAppraisals[0]);

      const updateResult = await handleUpdateStatus(mockEvent, 'test-1', 'complete');
      expect(updateResult).toBe(true);

      const deleteResult = await handleDeleteAppraisal(mockEvent, 'test-1');
      expect(deleteResult).toBe(true);

      // Verify all storage methods were called
      expect(mockStorage.getAppraisals).toHaveBeenCalled();
      expect(mockStorage.getAppraisal).toHaveBeenCalledWith('test-1');
      expect(mockStorage.updateAppraisalStatus).toHaveBeenCalledWith('test-1', 'complete');
      expect(mockStorage.deleteAppraisal).toHaveBeenCalledWith('test-1');
    });
  });

  describe('Error Handling Integration', () => {
    test('should properly handle and propagate storage errors', async () => {
      const storageError = new Error('Storage system unavailable');
      mockStorage.getAppraisals.mockImplementation(() => {
        throw storageError;
      });

      const { ipcMain } = require('electron');
      const handleGetAppraisals = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'get-appraisals')?.[1];

      // Should throw the error
      await expect(handleGetAppraisals(mockEvent)).rejects.toThrow('Storage system unavailable');

      // Should send error event
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toMatchObject({
        message: 'Storage system unavailable',
        type: 'storage_error'
      });
    });

    test('should handle validation errors properly', async () => {
      const { ipcMain } = require('electron');
      const handleGetAppraisal = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'get-appraisal')?.[1];

      // Test with invalid ID
      await expect(handleGetAppraisal(mockEvent, '')).rejects.toThrow('Invalid appraisal ID provided');
      await expect(handleGetAppraisal(mockEvent, null)).rejects.toThrow('Invalid appraisal ID provided');

      // Verify error events were sent
      expect(errorEvents.length).toBeGreaterThanOrEqual(2);
      expect(errorEvents.every(e => e.type === 'storage_error')).toBe(true);
    });
  });

  describe('Data Serialization Integration', () => {
    test('should handle complex data serialization correctly', async () => {
      const complexData = {
        vin: 'COMPLEX123',
        year: 2021,
        make: 'Honda',
        model: 'Civic',
        mileage: 25000,
        location: 'Complex Location',
        reportType: 'MITCHELL' as const,
        extractionConfidence: 0.88,
        // Add complex nested data
        metadata: {
          processingDate: new Date(),
          tags: ['test', 'complex'],
          nested: {
            deep: {
              value: 'test'
            }
          }
        }
      };

      mockExtractVehicleData.mockResolvedValue(complexData as any);
      mockStorage.saveAppraisal.mockReturnValue('complex-id');

      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find(call => call[0] === 'process-pdf')?.[1];

      const result = await handleProcessPDF(mockEvent, Buffer.from('test'));

      // Verify data is properly serialized
      expect(result.success).toBe(true);
      expect(() => JSON.stringify(result.extractedData)).not.toThrow();
      
      // Verify the serialized data maintains structure
      const serialized = JSON.parse(JSON.stringify(result.extractedData));
      expect(serialized.vin).toBe('COMPLEX123');
      expect(serialized.metadata.tags).toEqual(['test', 'complex']);
      expect(serialized.metadata.nested.deep.value).toBe('test');
    });
  });
});