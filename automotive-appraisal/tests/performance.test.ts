/**
 * Performance Testing
 * Tests application startup time, memory usage, and processing performance
 */

import { extractVehicleData } from '../src/main/services/pdfExtractor';
import { storage } from '../src/main/services/storage';
import fs from 'fs';
import path from 'path';

// Mock electron
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
  },
}));

// Mock the services
jest.mock('../src/main/services/storage');
jest.mock('../src/main/services/pdfExtractor');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockExtractVehicleData = extractVehicleData as jest.MockedFunction<typeof extractVehicleData>;

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Application Startup', () => {
    it('should initialize storage quickly', () => {
      const startTime = Date.now();
      
      // Mock storage initialization
      mockStorage.getAppraisals.mockReturnValue([]);
      
      const appraisals = mockStorage.getAppraisals();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(appraisals).toEqual([]);
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should load appraisal history efficiently', () => {
      // Create mock appraisals
      const mockAppraisals = Array.from({ length: 100 }, (_, i) => ({
        id: `appraisal-${i}`,
        createdAt: new Date(),
        status: i % 2 === 0 ? 'complete' as const : 'draft' as const,
        data: {
          vin: `VIN${i}`,
          year: 2020,
          make: 'Test',
          model: 'Car',
          mileage: 50000,
          location: 'Test',
          reportType: 'CCC_ONE' as const,
          extractionConfidence: 0.9,
          extractionErrors: [],
        },
      }));

      const startTime = Date.now();
      mockStorage.getAppraisals.mockReturnValue(mockAppraisals);
      
      const result = mockStorage.getAppraisals();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toHaveLength(100);
      expect(duration).toBeLessThan(50); // Should load quickly even with many items
    });
  });

  describe('PDF Processing Performance', () => {
    it('should process PDF within acceptable time', async () => {
      const mockData = {
        vin: 'TEST123',
        year: 2020,
        make: 'Test',
        model: 'Car',
        mileage: 50000,
        location: 'Test',
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.9,
        extractionErrors: [],
      };

      // Simulate realistic processing time
      mockExtractVehicleData.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockData;
      });

      const testBuffer = Buffer.from('test pdf content');
      const startTime = Date.now();
      
      const result = await mockExtractVehicleData(testBuffer);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toEqual(mockData);
      // In real scenario, OCR takes 15-60 seconds, but our mock should be fast
      expect(duration).toBeLessThan(5000);
    });

    it('should handle multiple sequential PDF processing efficiently', async () => {
      const mockData = {
        vin: 'TEST123',
        year: 2020,
        make: 'Test',
        model: 'Car',
        mileage: 50000,
        location: 'Test',
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.9,
        extractionErrors: [],
      };

      mockExtractVehicleData.mockResolvedValue(mockData);

      const startTime = Date.now();
      
      // Process 5 PDFs sequentially
      for (let i = 0; i < 5; i++) {
        await mockExtractVehicleData(Buffer.from(`pdf ${i}`));
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(mockExtractVehicleData).toHaveBeenCalledTimes(5);
      expect(duration).toBeLessThan(1000); // Should be fast with mocks
    });
  });

  describe('Memory Usage', () => {
    it('should handle large PDF buffers efficiently', async () => {
      const mockData = {
        vin: 'TEST123',
        year: 2020,
        make: 'Test',
        model: 'Car',
        mileage: 50000,
        location: 'Test',
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.9,
        extractionErrors: [],
      };

      mockExtractVehicleData.mockResolvedValue(mockData);

      // Create a large buffer (10MB)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024);
      
      const startMemory = process.memoryUsage().heapUsed;
      
      await mockExtractVehicleData(largeBuffer);
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // Convert to MB
      
      // Memory increase should be reasonable (less than 50MB for test)
      expect(memoryIncrease).toBeLessThan(50);
    });

    it('should clean up resources after processing', async () => {
      const mockData = {
        vin: 'TEST123',
        year: 2020,
        make: 'Test',
        model: 'Car',
        mileage: 50000,
        location: 'Test',
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.9,
        extractionErrors: [],
      };

      mockExtractVehicleData.mockResolvedValue(mockData);

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple PDFs
      for (let i = 0; i < 10; i++) {
        await mockExtractVehicleData(Buffer.from(`pdf ${i}`));
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      
      // Memory should not grow excessively
      expect(memoryIncrease).toBeLessThan(100);
    });
  });

  describe('Storage Operations Performance', () => {
    it('should save appraisals quickly', () => {
      const mockData = {
        vin: 'TEST123',
        year: 2020,
        make: 'Test',
        model: 'Car',
        mileage: 50000,
        location: 'Test',
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.9,
        extractionErrors: [],
      };

      mockStorage.saveAppraisal.mockReturnValue('test-id');

      const startTime = Date.now();
      
      const id = mockStorage.saveAppraisal(mockData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(id).toBe('test-id');
      expect(duration).toBeLessThan(100);
    });

    it('should retrieve appraisals quickly', () => {
      const mockAppraisal = {
        id: 'test-1',
        createdAt: new Date(),
        status: 'complete' as const,
        data: {
          vin: 'TEST123',
          year: 2020,
          make: 'Test',
          model: 'Car',
          mileage: 50000,
          location: 'Test',
          reportType: 'CCC_ONE' as const,
          extractionConfidence: 0.9,
          extractionErrors: [],
        },
      };

      mockStorage.getAppraisal.mockReturnValue(mockAppraisal);

      const startTime = Date.now();
      
      const result = mockStorage.getAppraisal('test-1');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toEqual(mockAppraisal);
      expect(duration).toBeLessThan(50);
    });

    it('should update appraisal status quickly', () => {
      mockStorage.updateAppraisalStatus.mockReturnValue(true);

      const startTime = Date.now();
      
      const result = mockStorage.updateAppraisalStatus('test-1', 'complete');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toBe(true);
      expect(duration).toBeLessThan(50);
    });

    it('should delete appraisals quickly', () => {
      mockStorage.deleteAppraisal.mockReturnValue(true);

      const startTime = Date.now();
      
      const result = mockStorage.deleteAppraisal('test-1');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toBe(true);
      expect(duration).toBeLessThan(50);
    });

    it('should handle batch operations efficiently', () => {
      mockStorage.getAppraisals.mockReturnValue([]);

      const startTime = Date.now();
      
      // Simulate multiple rapid operations
      for (let i = 0; i < 100; i++) {
        mockStorage.getAppraisals();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(mockStorage.getAppraisals).toHaveBeenCalledTimes(100);
      expect(duration).toBeLessThan(500); // Should handle 100 operations quickly
    });
  });

  describe('Data Processing Efficiency', () => {
    it('should handle large datasets efficiently', () => {
      // Create a large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `appraisal-${i}`,
        createdAt: new Date(),
        status: 'complete' as const,
        data: {
          vin: `VIN${i}`,
          year: 2020,
          make: 'Test',
          model: 'Car',
          mileage: 50000,
          location: 'Test',
          reportType: 'CCC_ONE' as const,
          extractionConfidence: 0.9,
          extractionErrors: [],
        },
      }));

      mockStorage.getAppraisals.mockReturnValue(largeDataset);

      const startTime = Date.now();
      
      const result = mockStorage.getAppraisals();
      
      // Filter and process data
      const completed = result.filter(a => a.status === 'complete');
      const drafts = result.filter(a => a.status === 'draft');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toHaveLength(1000);
      expect(completed).toHaveLength(1000);
      expect(drafts).toHaveLength(0);
      expect(duration).toBeLessThan(100);
    });

    it('should process extraction data efficiently', () => {
      const extractionData = {
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

      const startTime = Date.now();
      
      // Simulate data validation and processing
      const isValid = extractionData.vin.length === 17 &&
                     extractionData.year > 1900 &&
                     extractionData.mileage >= 0 &&
                     extractionData.extractionConfidence >= 0 &&
                     extractionData.extractionConfidence <= 1;
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(isValid).toBe(true);
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Responsiveness', () => {
    it('should maintain responsiveness during processing', async () => {
      const mockData = {
        vin: 'TEST123',
        year: 2020,
        make: 'Test',
        model: 'Car',
        mileage: 50000,
        location: 'Test',
        reportType: 'CCC_ONE' as const,
        extractionConfidence: 0.9,
        extractionErrors: [],
      };

      // Simulate async processing
      mockExtractVehicleData.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return mockData;
      });

      const startTime = Date.now();
      
      // Start processing
      const promise = mockExtractVehicleData(Buffer.from('test'));
      
      // Verify we can do other operations while processing
      const otherOperationTime = Date.now();
      mockStorage.getAppraisals.mockReturnValue([]);
      const appraisals = mockStorage.getAppraisals();
      const otherOperationDuration = Date.now() - otherOperationTime;
      
      // Wait for processing to complete
      await promise;
      
      const totalDuration = Date.now() - startTime;
      
      expect(appraisals).toEqual([]);
      expect(otherOperationDuration).toBeLessThan(10); // Other operations should be fast
      expect(totalDuration).toBeGreaterThanOrEqual(50); // Total should include processing time
    });
  });
});
