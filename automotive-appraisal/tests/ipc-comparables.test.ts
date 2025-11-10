/**
 * Integration tests for Comparable Vehicles IPC handlers
 * 
 * Tests the IPC communication layer for comparable operations including:
 * - Getting comparables for an appraisal
 * - Saving new comparables
 * - Updating existing comparables
 * - Deleting comparables
 * - Calculating market value
 * - Exporting market analysis reports
 */

import { ipcMain } from 'electron';
import { ComparableStorageService } from '../src/main/services/comparableStorage';
import { storage } from '../src/main/services/storage';
import { ComparableVehicle, ExtractedVehicleData, AppraisalRecord } from '../src/types';

// Mock electron modules
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn()
  },
  app: {
    getPath: jest.fn(() => '/mock/path')
  }
}));

// Mock storage service
jest.mock('../src/main/services/storage', () => ({
  storage: {
    getAppraisal: jest.fn(),
    saveAppraisal: jest.fn(),
    getAppraisals: jest.fn()
  }
}));

// Mock comparable storage service
jest.mock('../src/main/services/comparableStorage');

// Mock calculation services
jest.mock('../src/renderer/services/marketValueCalculator');

// Mock report generation service
jest.mock('../src/main/services/reportGeneration');

describe('Comparable Vehicles IPC Handlers', () => {
  let handlers: Map<string, Function>;
  
  // Sample test data
  const mockAppraisalId = 'test-appraisal-123';
  const mockComparableId = `${mockAppraisalId}-1234567890`;
  
  const mockLossVehicle: ExtractedVehicleData = {
    vin: '1HGBH41JXMN109186',
    year: 2015,
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    mileage: 50000,
    location: 'Los Angeles, CA',
    reportType: 'CCC_ONE',
    extractionConfidence: 0.95,
    extractionErrors: [],
    marketValue: 18000,
    condition: 'Good',
    equipment: ['Navigation', 'Sunroof']
  };
  
  const mockAppraisal: AppraisalRecord = {
    id: mockAppraisalId,
    createdAt: new Date(),
    status: 'draft',
    data: mockLossVehicle
  };
  
  const mockComparable: ComparableVehicle = {
    id: mockComparableId,
    appraisalId: mockAppraisalId,
    source: 'AutoTrader',
    sourceUrl: 'https://autotrader.com/example',
    dateAdded: new Date(),
    year: 2015,
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    mileage: 48000,
    location: 'Los Angeles, CA',
    coordinates: {
      latitude: 34.0522,
      longitude: -118.2437
    },
    distanceFromLoss: 5,
    listPrice: 17500,
    adjustedPrice: 17800,
    condition: 'Good',
    equipment: ['Navigation', 'Sunroof'],
    qualityScore: 95,
    qualityScoreBreakdown: {
      baseScore: 100,
      distancePenalty: 0,
      agePenalty: 0,
      ageBonus: 0,
      mileagePenalty: 0,
      mileageBonus: 10,
      equipmentPenalty: 0,
      equipmentBonus: 15,
      finalScore: 95,
      explanations: {
        distance: 'Within 100 miles',
        age: 'Exact match',
        mileage: 'Within 20% of loss vehicle',
        equipment: 'All equipment matches'
      }
    },
    adjustments: {
      mileageAdjustment: {
        mileageDifference: 2000,
        depreciationRate: 0.25,
        adjustmentAmount: 500,
        explanation: 'Comparable has 2,000 fewer miles'
      },
      equipmentAdjustments: [],
      conditionAdjustment: {
        comparableCondition: 'Good',
        lossVehicleCondition: 'Good',
        multiplier: 1.0,
        adjustmentAmount: 0,
        explanation: 'Same condition'
      },
      totalAdjustment: 500,
      adjustedPrice: 17800
    },
    notes: 'Test comparable',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Capture IPC handlers
    handlers = new Map();
    (ipcMain.handle as jest.Mock).mockImplementation((channel: string, handler: Function) => {
      handlers.set(channel, handler);
    });
    
    // Import and setup handlers
    require('../src/main/ipc-handlers');
  });

  describe('get-comparables', () => {
    it('should get all comparables for an appraisal', async () => {
      const mockComparables = [mockComparable];
      const mockStorageService = {
        getComparables: jest.fn().mockResolvedValue(mockComparables)
      };
      
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const handler = handlers.get('get-comparables');
      expect(handler).toBeDefined();
      
      const mockEvent = { sender: { send: jest.fn() } };
      const result = await handler!(mockEvent, mockAppraisalId);
      
      expect(mockStorageService.getComparables).toHaveBeenCalledWith(mockAppraisalId);
      expect(result).toEqual(mockComparables);
    });

    it('should throw error for invalid appraisal ID', async () => {
      const handler = handlers.get('get-comparables');
      const mockEvent = { sender: { send: jest.fn() } };
      
      await expect(handler!(mockEvent, '')).rejects.toThrow('Invalid appraisal ID provided');
      await expect(handler!(mockEvent, null)).rejects.toThrow('Invalid appraisal ID provided');
      await expect(handler!(mockEvent, 123)).rejects.toThrow('Invalid appraisal ID provided');
    });

    it('should handle storage errors gracefully', async () => {
      const mockStorageService = {
        getComparables: jest.fn().mockRejectedValue(new Error('Storage error'))
      };
      
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const handler = handlers.get('get-comparables');
      const mockEvent = { sender: { send: jest.fn() } };
      
      await expect(handler!(mockEvent, mockAppraisalId)).rejects.toThrow('Storage error');
    });
  });

  describe('save-comparable', () => {
    it('should save a new comparable', async () => {
      const mockStorageService = {
        saveComparable: jest.fn().mockResolvedValue(true)
      };
      
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const handler = handlers.get('save-comparable');
      expect(handler).toBeDefined();
      
      const mockEvent = { sender: { send: jest.fn() } };
      const result = await handler!(mockEvent, mockComparable);
      
      expect(mockStorageService.saveComparable).toHaveBeenCalledWith(mockComparable);
      expect(result).toBe(true);
    });

    it('should validate comparable data before saving', async () => {
      const handler = handlers.get('save-comparable');
      const mockEvent = { sender: { send: jest.fn() } };
      
      // Missing comparable data
      await expect(handler!(mockEvent, null)).rejects.toThrow('Comparable data is required');
      
      // Missing appraisal ID
      await expect(handler!(mockEvent, { id: '123' })).rejects.toThrow('Valid appraisal ID is required');
      
      // Missing comparable ID
      await expect(handler!(mockEvent, { appraisalId: mockAppraisalId })).rejects.toThrow('Valid comparable ID is required');
    });

    it('should handle duplicate ID errors', async () => {
      const mockStorageService = {
        saveComparable: jest.fn().mockRejectedValue(new Error('Comparable with ID already exists'))
      };
      
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const handler = handlers.get('save-comparable');
      const mockEvent = { sender: { send: jest.fn() } };
      
      await expect(handler!(mockEvent, mockComparable)).rejects.toThrow('Comparable with ID already exists');
    });
  });

  describe('update-comparable', () => {
    it('should update an existing comparable', async () => {
      const updates = {
        appraisalId: mockAppraisalId,
        mileage: 49000,
        listPrice: 17600
      };
      
      const mockStorageService = {
        updateComparable: jest.fn().mockResolvedValue(true)
      };
      
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const handler = handlers.get('update-comparable');
      expect(handler).toBeDefined();
      
      const mockEvent = { sender: { send: jest.fn() } };
      const result = await handler!(mockEvent, mockComparableId, updates);
      
      expect(mockStorageService.updateComparable).toHaveBeenCalledWith(mockComparableId, updates);
      expect(result).toBe(true);
    });

    it('should validate update data', async () => {
      const handler = handlers.get('update-comparable');
      const mockEvent = { sender: { send: jest.fn() } };
      
      // Invalid ID
      await expect(handler!(mockEvent, '', { appraisalId: mockAppraisalId }))
        .rejects.toThrow('Invalid comparable ID provided');
      
      // Missing update data
      await expect(handler!(mockEvent, mockComparableId, null))
        .rejects.toThrow('Update data is required');
      
      // Missing appraisal ID in updates
      await expect(handler!(mockEvent, mockComparableId, { mileage: 50000 }))
        .rejects.toThrow('Valid appraisal ID is required in updates');
    });

    it('should throw error when comparable not found', async () => {
      const mockStorageService = {
        updateComparable: jest.fn().mockResolvedValue(false)
      };
      
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const handler = handlers.get('update-comparable');
      const mockEvent = { sender: { send: jest.fn() } };
      
      await expect(handler!(mockEvent, 'non-existent-id', { appraisalId: mockAppraisalId }))
        .rejects.toThrow('Comparable with ID non-existent-id not found');
    });
  });

  describe('delete-comparable', () => {
    it('should delete a comparable', async () => {
      const mockStorageService = {
        deleteComparable: jest.fn().mockResolvedValue(true)
      };
      
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const handler = handlers.get('delete-comparable');
      expect(handler).toBeDefined();
      
      const mockEvent = { sender: { send: jest.fn() } };
      const result = await handler!(mockEvent, mockComparableId);
      
      expect(mockStorageService.deleteComparable).toHaveBeenCalledWith(mockComparableId, mockAppraisalId);
      expect(result).toBe(true);
    });

    it('should validate comparable ID format', async () => {
      const handler = handlers.get('delete-comparable');
      const mockEvent = { sender: { send: jest.fn() } };
      
      // Invalid ID format
      await expect(handler!(mockEvent, 'invalid-id'))
        .rejects.toThrow('Invalid comparable ID format');
      
      // Empty ID
      await expect(handler!(mockEvent, ''))
        .rejects.toThrow('Invalid comparable ID provided');
    });

    it('should throw error when comparable not found', async () => {
      const mockStorageService = {
        deleteComparable: jest.fn().mockResolvedValue(false)
      };
      
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const handler = handlers.get('delete-comparable');
      const mockEvent = { sender: { send: jest.fn() } };
      
      await expect(handler!(mockEvent, mockComparableId))
        .rejects.toThrow(`Comparable with ID ${mockComparableId} not found`);
    });
  });

  describe('calculate-market-value', () => {
    it('should calculate market value from comparables', async () => {
      const mockComparables = [mockComparable];
      const mockCalculation = {
        comparables: [{
          id: mockComparableId,
          listPrice: 17500,
          adjustedPrice: 17800,
          qualityScore: 95,
          weightedValue: 1691000
        }],
        totalWeightedValue: 1691000,
        totalWeights: 95,
        finalMarketValue: 17800,
        steps: []
      };
      
      const mockConfidence = {
        level: 85,
        factors: {
          comparableCount: 1,
          qualityScoreVariance: 0,
          priceVariance: 0
        }
      };
      
      (storage.getAppraisal as jest.Mock).mockReturnValue(mockAppraisal);
      
      const mockStorageService = {
        getComparables: jest.fn().mockResolvedValue(mockComparables)
      };
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const { MarketValueCalculator } = require('../src/renderer/services/marketValueCalculator');
      MarketValueCalculator.mockImplementation(() => ({
        calculateMarketValue: jest.fn().mockReturnValue(mockCalculation),
        calculateConfidenceLevel: jest.fn().mockReturnValue(mockConfidence)
      }));
      
      const handler = handlers.get('calculate-market-value');
      expect(handler).toBeDefined();
      
      const mockEvent = { sender: { send: jest.fn() } };
      const result = await handler!(mockEvent, mockAppraisalId);
      
      expect(result).toBeDefined();
      expect(result.appraisalId).toBe(mockAppraisalId);
      expect(result.calculatedMarketValue).toBe(17800);
      expect(result.confidenceLevel).toBe(85);
      expect(result.comparablesCount).toBe(1);
    });

    it('should throw error for invalid appraisal ID', async () => {
      const handler = handlers.get('calculate-market-value');
      const mockEvent = { sender: { send: jest.fn() } };
      
      await expect(handler!(mockEvent, '')).rejects.toThrow('Invalid appraisal ID provided');
    });

    it('should throw error when appraisal not found', async () => {
      (storage.getAppraisal as jest.Mock).mockReturnValue(null);
      
      const handler = handlers.get('calculate-market-value');
      const mockEvent = { sender: { send: jest.fn() } };
      
      await expect(handler!(mockEvent, mockAppraisalId))
        .rejects.toThrow(`Appraisal with ID ${mockAppraisalId} not found`);
    });

    it('should throw error when no comparables exist', async () => {
      (storage.getAppraisal as jest.Mock).mockReturnValue(mockAppraisal);
      
      const mockStorageService = {
        getComparables: jest.fn().mockResolvedValue([])
      };
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const handler = handlers.get('calculate-market-value');
      const mockEvent = { sender: { send: jest.fn() } };
      
      await expect(handler!(mockEvent, mockAppraisalId))
        .rejects.toThrow('No comparables found for this appraisal');
    });

    it('should calculate insurance comparison correctly', async () => {
      const mockComparables = [mockComparable];
      const mockCalculation = {
        comparables: [{
          id: mockComparableId,
          listPrice: 17500,
          adjustedPrice: 17800,
          qualityScore: 95,
          weightedValue: 1691000
        }],
        totalWeightedValue: 1691000,
        totalWeights: 95,
        finalMarketValue: 20000, // Higher than insurance value
        steps: []
      };
      
      const mockConfidence = {
        level: 85,
        factors: {
          comparableCount: 1,
          qualityScoreVariance: 0,
          priceVariance: 0
        }
      };
      
      (storage.getAppraisal as jest.Mock).mockReturnValue(mockAppraisal);
      
      const mockStorageService = {
        getComparables: jest.fn().mockResolvedValue(mockComparables)
      };
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const { MarketValueCalculator } = require('../src/renderer/services/marketValueCalculator');
      MarketValueCalculator.mockImplementation(() => ({
        calculateMarketValue: jest.fn().mockReturnValue(mockCalculation),
        calculateConfidenceLevel: jest.fn().mockReturnValue(mockConfidence)
      }));
      
      const handler = handlers.get('calculate-market-value');
      const mockEvent = { sender: { send: jest.fn() } };
      const result = await handler!(mockEvent, mockAppraisalId);
      
      expect(result.insuranceValue).toBe(18000);
      expect(result.valueDifference).toBe(2000);
      expect(result.valueDifferencePercentage).toBeCloseTo(11.11, 1);
      expect(result.isUndervalued).toBe(true);
    });
  });

  describe('export-market-analysis', () => {
    it('should export market analysis report', async () => {
      const mockComparables = [mockComparable];
      const mockCalculation = {
        comparables: [{
          id: mockComparableId,
          listPrice: 17500,
          adjustedPrice: 17800,
          qualityScore: 95,
          weightedValue: 1691000
        }],
        totalWeightedValue: 1691000,
        totalWeights: 95,
        finalMarketValue: 17800,
        steps: []
      };
      
      const mockConfidence = {
        level: 85,
        factors: {
          comparableCount: 1,
          qualityScoreVariance: 0,
          priceVariance: 0
        }
      };
      
      (storage.getAppraisal as jest.Mock).mockReturnValue(mockAppraisal);
      
      const mockStorageService = {
        getComparables: jest.fn().mockResolvedValue(mockComparables)
      };
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const { MarketValueCalculator } = require('../src/renderer/services/marketValueCalculator');
      MarketValueCalculator.mockImplementation(() => ({
        calculateMarketValue: jest.fn().mockReturnValue(mockCalculation),
        calculateConfidenceLevel: jest.fn().mockReturnValue(mockConfidence)
      }));
      
      const { ReportGenerationService } = require('../src/main/services/reportGeneration');
      ReportGenerationService.mockImplementation(() => ({
        generateMarketAnalysisReport: jest.fn().mockResolvedValue({
          success: true,
          filePath: '/mock/path/report.pdf'
        })
      }));
      
      const handler = handlers.get('export-market-analysis');
      expect(handler).toBeDefined();
      
      const mockEvent = { sender: { send: jest.fn() } };
      const result = await handler!(mockEvent, mockAppraisalId);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/mock/path/report.pdf');
    });

    it('should use custom report options', async () => {
      const mockComparables = [mockComparable];
      const mockCalculation = {
        comparables: [],
        totalWeightedValue: 0,
        totalWeights: 0,
        finalMarketValue: 17800,
        steps: []
      };
      
      const mockConfidence = {
        level: 85,
        factors: {
          comparableCount: 1,
          qualityScoreVariance: 0,
          priceVariance: 0
        }
      };
      
      (storage.getAppraisal as jest.Mock).mockReturnValue(mockAppraisal);
      
      const mockStorageService = {
        getComparables: jest.fn().mockResolvedValue(mockComparables)
      };
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const { MarketValueCalculator } = require('../src/renderer/services/marketValueCalculator');
      MarketValueCalculator.mockImplementation(() => ({
        calculateMarketValue: jest.fn().mockReturnValue(mockCalculation),
        calculateConfidenceLevel: jest.fn().mockReturnValue(mockConfidence)
      }));
      
      const mockReportService = {
        generateMarketAnalysisReport: jest.fn().mockResolvedValue({
          success: true,
          filePath: '/mock/path/report.html'
        })
      };
      
      const { ReportGenerationService } = require('../src/main/services/reportGeneration');
      ReportGenerationService.mockImplementation(() => mockReportService);
      
      const handler = handlers.get('export-market-analysis');
      const mockEvent = { sender: { send: jest.fn() } };
      
      const customOptions = {
        format: 'html',
        includeSummary: false,
        includeDetailedCalculations: true
      };
      
      await handler!(mockEvent, mockAppraisalId, customOptions);
      
      expect(mockReportService.generateMarketAnalysisReport).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          format: 'html',
          includeSummary: false,
          includeDetailedCalculations: true,
          includeComparablesList: true,
          includeMethodology: true
        })
      );
    });

    it('should throw error when no comparables exist', async () => {
      (storage.getAppraisal as jest.Mock).mockReturnValue(mockAppraisal);
      
      const mockStorageService = {
        getComparables: jest.fn().mockResolvedValue([])
      };
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const handler = handlers.get('export-market-analysis');
      const mockEvent = { sender: { send: jest.fn() } };
      
      const result = await handler!(mockEvent, mockAppraisalId);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No comparables found');
    });

    it('should handle report generation errors', async () => {
      const mockComparables = [mockComparable];
      const mockCalculation = {
        comparables: [],
        totalWeightedValue: 0,
        totalWeights: 0,
        finalMarketValue: 17800,
        steps: []
      };
      
      const mockConfidence = {
        level: 85,
        factors: {
          comparableCount: 1,
          qualityScoreVariance: 0,
          priceVariance: 0
        }
      };
      
      (storage.getAppraisal as jest.Mock).mockReturnValue(mockAppraisal);
      
      const mockStorageService = {
        getComparables: jest.fn().mockResolvedValue(mockComparables)
      };
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const { MarketValueCalculator } = require('../src/renderer/services/marketValueCalculator');
      MarketValueCalculator.mockImplementation(() => ({
        calculateMarketValue: jest.fn().mockReturnValue(mockCalculation),
        calculateConfidenceLevel: jest.fn().mockReturnValue(mockConfidence)
      }));
      
      const { ReportGenerationService } = require('../src/main/services/reportGeneration');
      ReportGenerationService.mockImplementation(() => ({
        generateMarketAnalysisReport: jest.fn().mockResolvedValue({
          success: false,
          error: 'Failed to generate report'
        })
      }));
      
      const handler = handlers.get('export-market-analysis');
      const mockEvent = { sender: { send: jest.fn() } };
      const result = await handler!(mockEvent, mockAppraisalId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate report');
    });
  });

  describe('Error Handling', () => {
    it('should send error events on failures', async () => {
      const mockStorageService = {
        getComparables: jest.fn().mockRejectedValue(new Error('Storage failure'))
      };
      
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      const handler = handlers.get('get-comparables');
      const mockEvent = { sender: { send: jest.fn() } };
      
      await expect(handler!(mockEvent, mockAppraisalId)).rejects.toThrow('Storage failure');
      
      // Verify error event was sent
      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'processing-error',
        expect.objectContaining({
          message: 'Storage failure',
          type: 'storage_error'
        })
      );
    });

    it('should handle validation errors appropriately', async () => {
      const handler = handlers.get('save-comparable');
      const mockEvent = { sender: { send: jest.fn() } };
      
      const invalidComparable = {
        id: mockComparableId,
        appraisalId: mockAppraisalId,
        // Missing required fields
      };
      
      const mockStorageService = {
        saveComparable: jest.fn().mockRejectedValue(new Error('Validation failed'))
      };
      
      (ComparableStorageService as jest.Mock).mockImplementation(() => mockStorageService);
      
      await expect(handler!(mockEvent, invalidComparable)).rejects.toThrow();
    });
  });
});
