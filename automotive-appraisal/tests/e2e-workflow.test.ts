/**
 * End-to-End Workflow Tests
 * Tests complete PDF processing workflow from upload to storage
 * including state management and error handling
 */

import { setupIPCHandlers } from '../src/main/ipc-handlers';
import { storage } from '../src/main/services/storage';
import { extractVehicleData } from '../src/main/services/pdfExtractor';

// Mock electron module
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  app: {
    getPath: jest.fn(() => '/mock/path'),
  },
}));

// Mock the services
jest.mock('../src/main/services/storage');
jest.mock('../src/main/services/pdfExtractor');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockExtractVehicleData = extractVehicleData as jest.MockedFunction<typeof extractVehicleData>;

describe('End-to-End PDF Processing Workflow', () => {
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

  describe('Complete Successful Workflow', () => {
    test('should process PDF from upload to storage with all state transitions', async () => {
      // Mock extracted data
      const mockExtractedData = {
        vin: 'WBADT43452G123456',
        year: 2020,
        make: 'BMW',
        model: 'M3',
        mileage: 45000,
        location: 'Los Angeles, CA',
        marketValue: 45000,
        settlementValue: 43500,
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.92,
        extractionErrors: [],
      };

      mockExtractVehicleData.mockResolvedValue(mockExtractedData);
      mockStorage.saveAppraisal.mockReturnValue('appraisal-001');

      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'process-pdf')?.[1];

      // Simulate file upload
      const testBuffer = Buffer.from('mock pdf content');
      
      // Process the PDF
      const result = await handleProcessPDF(mockEvent, testBuffer);

      // Verify successful result
      expect(result.success).toBe(true);
      expect(result.appraisalId).toBe('appraisal-001');
      expect(result.extractedData).toMatchObject({
        vin: 'WBADT43452G123456',
        make: 'BMW',
        model: 'M3',
      });

      // Verify progress events show complete workflow
      expect(progressEvents.length).toBeGreaterThanOrEqual(3);
      expect(progressEvents[0].message).toContain('Starting');
      expect(progressEvents[progressEvents.length - 1].progress).toBe(100);

      // Verify completion event
      expect(completeEvents).toHaveLength(1);
      expect(completeEvents[0].success).toBe(true);

      // Verify no errors occurred
      expect(errorEvents).toHaveLength(0);

      // Verify extraction was called with buffer (and progress callback)
      expect(mockExtractVehicleData).toHaveBeenCalled();
      const extractionCall = mockExtractVehicleData.mock.calls[0];
      expect(extractionCall[0]).toEqual(testBuffer);

      // Verify data was saved to storage
      expect(mockStorage.saveAppraisal).toHaveBeenCalledWith(mockExtractedData);
    });

    test('should handle multiple sequential PDF uploads correctly', async () => {
      const mockData1 = {
        vin: 'VIN123',
        year: 2019,
        make: 'Toyota',
        model: 'Camry',
        mileage: 30000,
        location: 'Test',
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.9,
        extractionErrors: [],
      };

      const mockData2 = {
        vin: 'VIN456',
        year: 2021,
        make: 'Honda',
        model: 'Accord',
        mileage: 15000,
        location: 'Test',
        reportType: 'MITCHELL' as const,
        extractionConfidence: 0.88,
        extractionErrors: [],
      };

      mockExtractVehicleData
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);
      
      mockStorage.saveAppraisal
        .mockReturnValueOnce('id-001')
        .mockReturnValueOnce('id-002');

      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'process-pdf')?.[1];

      // Process first PDF
      const result1 = await handleProcessPDF(mockEvent, Buffer.from('pdf1'));
      expect(result1.success).toBe(true);
      expect(result1.appraisalId).toBe('id-001');

      // Clear events
      progressEvents = [];
      completeEvents = [];

      // Process second PDF
      const result2 = await handleProcessPDF(mockEvent, Buffer.from('pdf2'));
      expect(result2.success).toBe(true);
      expect(result2.appraisalId).toBe('id-002');

      // Verify both were saved
      expect(mockStorage.saveAppraisal).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling Throughout Workflow', () => {
    test('should handle extraction errors gracefully', async () => {
      const extractionError = new Error('Failed to extract VIN from PDF');
      mockExtractVehicleData.mockRejectedValue(extractionError);

      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'process-pdf')?.[1];

      const result = await handleProcessPDF(mockEvent, Buffer.from('bad pdf'));

      // Verify error result
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to extract VIN from PDF');

      // Verify error event was sent
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(errorEvents[0].message).toContain('Failed to extract VIN');

      // Verify storage was not called
      expect(mockStorage.saveAppraisal).not.toHaveBeenCalled();
    });

    test('should handle storage errors after successful extraction', async () => {
      const mockExtractedData = {
        vin: 'TEST123',
        year: 2020,
        make: 'Test',
        model: 'Car',
        mileage: 10000,
        location: 'Test',
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.9,
        extractionErrors: [],
      };

      mockExtractVehicleData.mockResolvedValue(mockExtractedData);
      mockStorage.saveAppraisal.mockImplementation(() => {
        throw new Error('Storage system unavailable');
      });

      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'process-pdf')?.[1];

      const result = await handleProcessPDF(mockEvent, Buffer.from('pdf'));

      // Verify error result
      expect(result.success).toBe(false);
      expect(result.errors.some((e: string) => e.includes('Storage'))).toBe(true);

      // Verify extraction succeeded but storage failed
      expect(mockExtractVehicleData).toHaveBeenCalled();
      expect(mockStorage.saveAppraisal).toHaveBeenCalled();
    });

    test('should handle invalid buffer input', async () => {
      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'process-pdf')?.[1];

      // Test with null - should return error result
      const nullResult = await handleProcessPDF(mockEvent, null);
      expect(nullResult.success).toBe(false);
      expect(nullResult.errors.length).toBeGreaterThan(0);

      // Test with empty buffer
      const result = await handleProcessPDF(mockEvent, Buffer.from(''));
      expect(result.success).toBe(false);
    });
  });

  describe('Data Extraction and Storage Integration', () => {
    test('should correctly extract and store CCC One report data', async () => {
      const cccData = {
        vin: '1HGBH41JXMN109186',
        year: 2015,
        make: 'Volvo',
        model: 'XC60',
        mileage: 85000,
        location: 'Chicago, IL',
        marketValue: 12500,
        settlementValue: 12000,
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.94,
        extractionErrors: [],
      };

      mockExtractVehicleData.mockResolvedValue(cccData);
      mockStorage.saveAppraisal.mockReturnValue('ccc-001');

      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'process-pdf')?.[1];

      const result = await handleProcessPDF(mockEvent, Buffer.from('ccc pdf'));

      expect(result.success).toBe(true);
      expect(result.extractedData.reportType).toBe('CCC_ONE');
      expect(result.extractedData.marketValue).toBe(12500);
      expect(mockStorage.saveAppraisal).toHaveBeenCalledWith(
        expect.objectContaining({
          reportType: 'CCC_ONE',
          marketValue: 12500,
        })
      );
    });

    test('should correctly extract and store Mitchell report data', async () => {
      const mitchellData = {
        vin: '5XYKT3A69CG123456',
        year: 2014,
        make: 'Hyundai',
        model: 'Santa Fe',
        mileage: 120000,
        location: 'Dallas, TX',
        marketValue: 8500,
        settlementValue: 8200,
        reportType: 'MITCHELL' as const,
        extractionConfidence: 0.89,
        extractionErrors: [],
      };

      mockExtractVehicleData.mockResolvedValue(mitchellData);
      mockStorage.saveAppraisal.mockReturnValue('mitchell-001');

      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'process-pdf')?.[1];

      const result = await handleProcessPDF(mockEvent, Buffer.from('mitchell pdf'));

      expect(result.success).toBe(true);
      expect(result.extractedData.reportType).toBe('MITCHELL');
      expect(mockStorage.saveAppraisal).toHaveBeenCalledWith(
        expect.objectContaining({
          reportType: 'MITCHELL',
        })
      );
    });
  });

  describe('State Management During Processing', () => {
    test('should maintain consistent state through progress updates', async () => {
      const mockData = {
        vin: 'STATE123',
        year: 2020,
        make: 'Test',
        model: 'Vehicle',
        mileage: 50000,
        location: 'Test',
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.9,
        extractionErrors: [],
      };

      mockExtractVehicleData.mockResolvedValue(mockData);
      mockStorage.saveAppraisal.mockReturnValue('state-001');

      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'process-pdf')?.[1];

      await handleProcessPDF(mockEvent, Buffer.from('pdf'));

      // Verify progress events are in correct order
      const progressValues = progressEvents.map((e: any) => e.progress);
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }

      // Verify progress reaches 100%
      expect(progressValues[progressValues.length - 1]).toBe(100);

      // Verify completion event comes after all progress
      expect(completeEvents).toHaveLength(1);
    });

    test('should clear state properly after error', async () => {
      mockExtractVehicleData.mockRejectedValue(new Error('Test error'));

      const { ipcMain } = require('electron');
      const handleProcessPDF = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'process-pdf')?.[1];

      const result = await handleProcessPDF(mockEvent, Buffer.from('pdf'));

      expect(result.success).toBe(false);
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(completeEvents).toHaveLength(0);

      // Verify can process another file after error
      mockExtractVehicleData.mockResolvedValue({
        vin: 'RECOVERY',
        year: 2020,
        make: 'Test',
        model: 'Car',
        mileage: 10000,
        location: 'Test',
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.9,
        extractionErrors: [],
      });
      mockStorage.saveAppraisal.mockReturnValue('recovery-001');

      progressEvents = [];
      errorEvents = [];
      completeEvents = [];

      const result2 = await handleProcessPDF(mockEvent, Buffer.from('pdf2'));
      expect(result2.success).toBe(true);
    });
  });

  describe('Storage Retrieval Workflow', () => {
    test('should retrieve saved appraisals correctly', async () => {
      const mockAppraisals = [
        {
          id: 'test-1',
          createdAt: new Date('2025-01-01'),
          status: 'draft' as const,
          data: {
            vin: 'VIN1',
            make: 'Toyota',
            model: 'Camry',
          } as any,
        },
        {
          id: 'test-2',
          createdAt: new Date('2025-01-02'),
          status: 'complete' as const,
          data: {
            vin: 'VIN2',
            make: 'Honda',
            model: 'Accord',
          } as any,
        },
      ];

      mockStorage.getAppraisals.mockReturnValue(mockAppraisals);

      const { ipcMain } = require('electron');
      const handleGetAppraisals = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'get-appraisals')?.[1];

      const result = await handleGetAppraisals(mockEvent);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('test-1');
      expect(result[1].id).toBe('test-2');
    });

    test('should update appraisal status correctly', async () => {
      mockStorage.updateAppraisalStatus.mockReturnValue(true);

      const { ipcMain } = require('electron');
      const handleUpdateStatus = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'update-appraisal-status')?.[1];

      const result = await handleUpdateStatus(mockEvent, 'test-1', 'complete');

      expect(result).toBe(true);
      expect(mockStorage.updateAppraisalStatus).toHaveBeenCalledWith('test-1', 'complete');
    });

    test('should delete appraisal correctly', async () => {
      mockStorage.deleteAppraisal.mockReturnValue(true);

      const { ipcMain } = require('electron');
      const handleDeleteAppraisal = (ipcMain.handle as jest.Mock).mock.calls
        .find((call: any) => call[0] === 'delete-appraisal')?.[1];

      const result = await handleDeleteAppraisal(mockEvent, 'test-1');

      expect(result).toBe(true);
      expect(mockStorage.deleteAppraisal).toHaveBeenCalledWith('test-1');
    });
  });
});
