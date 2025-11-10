import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppStore } from '../src/renderer/store';
import { ComparableVehicle, MarketAnalysis, ErrorType } from '../src/types';

// Mock window.electron
const mockElectron = {
  getComparables: jest.fn(),
  saveComparable: jest.fn(),
  updateComparable: jest.fn(),
  deleteComparable: jest.fn(),
  calculateMarketValue: jest.fn(),
};

(global as any).window = {
  electron: mockElectron,
};

describe('Store - Comparable Vehicles Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('loadComparables', () => {
    it('should load comparables successfully', async () => {
      const mockComparables: ComparableVehicle[] = [
        {
          id: 'comp-1',
          appraisalId: 'appraisal-1',
          source: 'AutoTrader',
          dateAdded: new Date(),
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
          mileage: 30000,
          location: 'Los Angeles, CA',
          distanceFromLoss: 50,
          listPrice: 25000,
          condition: 'Good',
          equipment: ['Navigation', 'Sunroof'],
          qualityScore: 85,
          qualityScoreBreakdown: {
            baseScore: 100,
            distancePenalty: -5,
            agePenalty: 0,
            ageBonus: 0,
            mileagePenalty: 0,
            mileageBonus: 10,
            equipmentPenalty: 0,
            equipmentBonus: 0,
            finalScore: 85,
            explanations: {
              distance: 'Within 100 miles',
              age: 'Exact match',
              mileage: 'Within 20%',
              equipment: 'All features match',
            },
          },
          adjustments: {
            mileageAdjustment: {
              mileageDifference: 0,
              depreciationRate: 0.25,
              adjustmentAmount: 0,
              explanation: 'No adjustment needed',
            },
            equipmentAdjustments: [],
            conditionAdjustment: {
              comparableCondition: 'Good',
              lossVehicleCondition: 'Good',
              multiplier: 1.0,
              adjustmentAmount: 0,
              explanation: 'Same condition',
            },
            totalAdjustment: 0,
            adjustedPrice: 25000,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockElectron.getComparables.mockResolvedValue(mockComparables);
      mockElectron.calculateMarketValue.mockResolvedValue({
        appraisalId: 'appraisal-1',
        calculatedMarketValue: 25000,
      });

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.loadComparables('appraisal-1');
      });

      await waitFor(() => {
        expect(result.current.comparablesLoading).toBe(false);
      }, { timeout: 3000 });

      expect(result.current.comparableVehicles).toEqual(mockComparables);
      expect(result.current.comparablesError).toBeNull();
      expect(mockElectron.getComparables).toHaveBeenCalledWith('appraisal-1');
      expect(mockElectron.calculateMarketValue).toHaveBeenCalledWith('appraisal-1');
    });

    it('should handle load comparables error', async () => {
      const errorMessage = 'Failed to load comparables';
      mockElectron.getComparables.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.loadComparables('appraisal-1');
      });

      await waitFor(() => {
        expect(result.current.comparablesError).toBe(errorMessage);
        expect(result.current.comparablesLoading).toBe(false);
        expect(result.current.error?.type).toBe(ErrorType.STORAGE_ERROR);
      });
    });

    it('should not calculate market value if no comparables exist', async () => {
      mockElectron.getComparables.mockResolvedValue([]);

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.loadComparables('appraisal-1');
      });

      await waitFor(() => {
        expect(result.current.comparableVehicles).toEqual([]);
      });

      expect(mockElectron.calculateMarketValue).not.toHaveBeenCalled();
    });
  });

  describe('addComparable', () => {
    it('should add comparable successfully', async () => {
      const newComparable: ComparableVehicle = {
        id: 'comp-2',
        appraisalId: 'appraisal-1',
        source: 'Cars.com',
        dateAdded: new Date(),
        year: 2019,
        make: 'Honda',
        model: 'Accord',
        mileage: 35000,
        location: 'San Diego, CA',
        distanceFromLoss: 120,
        listPrice: 23000,
        condition: 'Good',
        equipment: ['Leather'],
        qualityScore: 75,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: -2,
          agePenalty: -2,
          ageBonus: 0,
          mileagePenalty: -5,
          mileageBonus: 0,
          equipmentPenalty: -10,
          equipmentBonus: 0,
          finalScore: 75,
          explanations: {
            distance: '120 miles away',
            age: '1 year difference',
            mileage: 'More than 20% difference',
            equipment: 'Missing some features',
          },
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 5000,
            depreciationRate: 0.25,
            adjustmentAmount: -1250,
            explanation: 'Higher mileage adjustment',
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Good',
            lossVehicleCondition: 'Good',
            multiplier: 1.0,
            adjustmentAmount: 0,
            explanation: 'Same condition',
          },
          totalAdjustment: -1250,
          adjustedPrice: 21750,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockElectron.saveComparable.mockResolvedValue(true);
      mockElectron.calculateMarketValue.mockResolvedValue({
        appraisalId: 'appraisal-1',
        calculatedMarketValue: 24000,
      });

      const { result } = renderHook(() => useAppStore());

      // Set current appraisal for recalculation
      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
          settlementValue: 24000,
        });
        // Add to history so recalculation can find the ID
        result.current.addToHistory({
          id: 'appraisal-1',
          createdAt: new Date(),
          status: 'complete',
          data: result.current.currentAppraisal!,
        });
      });

      await act(async () => {
        await result.current.addComparable(newComparable);
      });

      await waitFor(() => {
        expect(result.current.comparableVehicles).toContainEqual(newComparable);
        expect(result.current.comparablesLoading).toBe(false);
      });

      expect(mockElectron.saveComparable).toHaveBeenCalledWith(newComparable);
    });

    it('should handle add comparable error', async () => {
      const newComparable = { id: 'comp-2' } as ComparableVehicle;
      mockElectron.saveComparable.mockResolvedValue(false);

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.addComparable(newComparable);
      });

      await waitFor(() => {
        expect(result.current.comparablesError).toBeTruthy();
        expect(result.current.error?.type).toBe(ErrorType.STORAGE_ERROR);
      });
    });
  });

  describe('updateComparable', () => {
    it('should update comparable successfully', async () => {
      const existingComparable: ComparableVehicle = {
        id: 'comp-1',
        appraisalId: 'appraisal-1',
        source: 'AutoTrader',
        dateAdded: new Date(),
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        mileage: 30000,
        location: 'Los Angeles, CA',
        distanceFromLoss: 50,
        listPrice: 25000,
        condition: 'Good',
        equipment: ['Navigation'],
        qualityScore: 85,
        qualityScoreBreakdown: {} as any,
        adjustments: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockElectron.updateComparable.mockResolvedValue(true);
      mockElectron.calculateMarketValue.mockResolvedValue({
        appraisalId: 'appraisal-1',
        calculatedMarketValue: 25500,
      });

      const { result } = renderHook(() => useAppStore());

      // Set initial state
      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
        });
        result.current.addToHistory({
          id: 'appraisal-1',
          createdAt: new Date(),
          status: 'complete',
          data: result.current.currentAppraisal!,
        });
        (result.current as any).comparableVehicles = [existingComparable];
      });

      const updates = { listPrice: 26000, equipment: ['Navigation', 'Sunroof'] };

      await act(async () => {
        await result.current.updateComparable('comp-1', updates);
      });

      await waitFor(() => {
        const updated = result.current.comparableVehicles.find(c => c.id === 'comp-1');
        expect(updated?.listPrice).toBe(26000);
        expect(updated?.equipment).toEqual(['Navigation', 'Sunroof']);
        expect(result.current.comparablesLoading).toBe(false);
      });

      expect(mockElectron.updateComparable).toHaveBeenCalledWith('comp-1', updates);
    });

    it('should handle update comparable error', async () => {
      mockElectron.updateComparable.mockResolvedValue(false);

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.updateComparable('comp-1', { listPrice: 26000 });
      });

      await waitFor(() => {
        expect(result.current.comparablesError).toBeTruthy();
        expect(result.current.error?.type).toBe(ErrorType.STORAGE_ERROR);
      });
    });
  });

  describe('deleteComparable', () => {
    it('should delete comparable successfully', async () => {
      const comparables: ComparableVehicle[] = [
        { id: 'comp-1', appraisalId: 'appraisal-1' } as ComparableVehicle,
        { id: 'comp-2', appraisalId: 'appraisal-1' } as ComparableVehicle,
      ];

      mockElectron.deleteComparable.mockResolvedValue(true);
      mockElectron.calculateMarketValue.mockResolvedValue({
        appraisalId: 'appraisal-1',
        calculatedMarketValue: 24000,
      });

      const { result } = renderHook(() => useAppStore());

      // Set initial state
      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
        });
        result.current.addToHistory({
          id: 'appraisal-1',
          createdAt: new Date(),
          status: 'complete',
          data: result.current.currentAppraisal!,
        });
        (result.current as any).comparableVehicles = comparables;
      });

      await act(async () => {
        await result.current.deleteComparable('comp-1');
      });

      await waitFor(() => {
        expect(result.current.comparableVehicles).toHaveLength(1);
        expect(result.current.comparableVehicles[0].id).toBe('comp-2');
        expect(result.current.comparablesLoading).toBe(false);
      });

      expect(mockElectron.deleteComparable).toHaveBeenCalledWith('comp-1');
    });

    it('should handle delete comparable error', async () => {
      mockElectron.deleteComparable.mockResolvedValue(false);

      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.deleteComparable('comp-1');
      });

      await waitFor(() => {
        expect(result.current.comparablesError).toBeTruthy();
        expect(result.current.error?.type).toBe(ErrorType.STORAGE_ERROR);
      });
    });
  });

  describe('setCurrentComparable', () => {
    it('should set current comparable', () => {
      const comparable = { id: 'comp-1' } as ComparableVehicle;
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setCurrentComparable(comparable);
      });

      expect(result.current.currentComparable).toEqual(comparable);
    });

    it('should clear current comparable', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setCurrentComparable({ id: 'comp-1' } as ComparableVehicle);
        result.current.setCurrentComparable(null);
      });

      expect(result.current.currentComparable).toBeNull();
    });
  });

  describe('clearComparables', () => {
    it('should clear all comparables state', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        (result.current as any).comparableVehicles = [{ id: 'comp-1' }];
        (result.current as any).currentComparable = { id: 'comp-1' };
        (result.current as any).comparablesError = 'Some error';
        result.current.clearComparables();
      });

      expect(result.current.comparableVehicles).toEqual([]);
      expect(result.current.currentComparable).toBeNull();
      expect(result.current.comparablesError).toBeNull();
    });
  });
});

describe('Store - Market Analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('calculateMarketValue', () => {
    it('should calculate market value successfully', async () => {
      const mockAnalysis: MarketAnalysis = {
        appraisalId: 'appraisal-1',
        lossVehicle: {} as any,
        comparablesCount: 3,
        comparables: [],
        calculatedMarketValue: 25000,
        calculationMethod: 'quality-weighted-average',
        confidenceLevel: 85,
        confidenceFactors: {
          comparableCount: 3,
          qualityScoreVariance: 5,
          priceVariance: 1000,
        },
        insuranceValue: 24000,
        valueDifference: 1000,
        valueDifferencePercentage: 4.17,
        isUndervalued: false,
        calculationBreakdown: {
          comparables: [],
          totalWeightedValue: 75000,
          totalWeights: 3,
          finalMarketValue: 25000,
          steps: [],
        },
        calculatedAt: new Date(),
        lastUpdated: new Date(),
      };

      mockElectron.calculateMarketValue.mockResolvedValue(mockAnalysis);

      const { result } = renderHook(() => useAppStore());

      // Set up state
      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
          settlementValue: 24000,
        });
        result.current.addToHistory({
          id: 'appraisal-1',
          createdAt: new Date(),
          status: 'complete',
          data: result.current.currentAppraisal!,
        });
        (result.current as any).comparableVehicles = [
          { id: 'comp-1' },
          { id: 'comp-2' },
          { id: 'comp-3' },
        ];
      });

      await act(async () => {
        await result.current.calculateMarketValue('appraisal-1');
      });

      await waitFor(() => {
        expect(result.current.marketAnalysis).toEqual(mockAnalysis);
        expect(result.current.calculatedMarketValue).toBe(25000);
        expect(result.current.calculationBreakdown).toEqual(mockAnalysis.calculationBreakdown);
        expect(result.current.marketAnalysisLoading).toBe(false);
      });

      expect(mockElectron.calculateMarketValue).toHaveBeenCalledWith('appraisal-1');
    });

    it('should not calculate if no comparables exist', async () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
        });
      });

      await act(async () => {
        await result.current.calculateMarketValue('appraisal-1');
      });

      expect(result.current.marketAnalysis).toBeNull();
      expect(result.current.calculatedMarketValue).toBeNull();
      expect(mockElectron.calculateMarketValue).not.toHaveBeenCalled();
    });

    it('should handle error if no current appraisal', async () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        (result.current as any).comparableVehicles = [{ id: 'comp-1' }];
      });

      await act(async () => {
        await result.current.calculateMarketValue('appraisal-1');
      });

      expect(result.current.error?.type).toBe(ErrorType.PROCESSING_FAILED);
      expect(mockElectron.calculateMarketValue).not.toHaveBeenCalled();
    });

    it('should handle calculation error', async () => {
      const errorMessage = 'Calculation failed';
      mockElectron.calculateMarketValue.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
        });
        result.current.addToHistory({
          id: 'appraisal-1',
          createdAt: new Date(),
          status: 'complete',
          data: result.current.currentAppraisal!,
        });
        (result.current as any).comparableVehicles = [{ id: 'comp-1' }];
      });

      await act(async () => {
        await result.current.calculateMarketValue('appraisal-1');
      });

      await waitFor(() => {
        expect(result.current.marketAnalysisError).toBe(errorMessage);
        expect(result.current.marketAnalysisLoading).toBe(false);
        expect(result.current.error?.type).toBe(ErrorType.PROCESSING_FAILED);
      });
    });
  });

  describe('recalculateMarketValue', () => {
    it('should recalculate market value for current appraisal', async () => {
      mockElectron.calculateMarketValue.mockResolvedValue({
        appraisalId: 'appraisal-1',
        calculatedMarketValue: 26000,
      } as MarketAnalysis);

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
        });
        result.current.addToHistory({
          id: 'appraisal-1',
          createdAt: new Date(),
          status: 'complete',
          data: result.current.currentAppraisal!,
        });
        (result.current as any).comparableVehicles = [{ id: 'comp-1' }];
      });

      await act(async () => {
        await result.current.recalculateMarketValue();
      });

      await waitFor(() => {
        expect(result.current.calculatedMarketValue).toBe(26000);
      });

      expect(mockElectron.calculateMarketValue).toHaveBeenCalledWith('appraisal-1');
    });

    it('should not recalculate if no current appraisal', async () => {
      const { result } = renderHook(() => useAppStore());

      await act(async () => {
        await result.current.recalculateMarketValue();
      });

      expect(mockElectron.calculateMarketValue).not.toHaveBeenCalled();
    });
  });

  describe('setMarketAnalysis', () => {
    it('should set market analysis and update related state', () => {
      const analysis: MarketAnalysis = {
        appraisalId: 'appraisal-1',
        calculatedMarketValue: 25000,
        calculationBreakdown: {
          finalMarketValue: 25000,
        } as any,
      } as MarketAnalysis;

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
          settlementValue: 24000,
        });
        result.current.setMarketAnalysis(analysis);
      });

      expect(result.current.marketAnalysis).toEqual(analysis);
      expect(result.current.calculatedMarketValue).toBe(25000);
      expect(result.current.calculationBreakdown).toEqual(analysis.calculationBreakdown);
    });

    it('should clear market analysis when set to null', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setMarketAnalysis({
          calculatedMarketValue: 25000,
        } as MarketAnalysis);
        result.current.setMarketAnalysis(null);
      });

      expect(result.current.marketAnalysis).toBeNull();
    });
  });

  describe('clearMarketAnalysis', () => {
    it('should clear all market analysis state', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        (result.current as any).marketAnalysis = { calculatedMarketValue: 25000 };
        (result.current as any).calculationBreakdown = { finalMarketValue: 25000 };
        (result.current as any).calculatedMarketValue = 25000;
        (result.current as any).valueDifference = 1000;
        (result.current as any).valueDifferencePercentage = 4.17;
        (result.current as any).isUndervalued = false;
        result.current.clearMarketAnalysis();
      });

      expect(result.current.marketAnalysis).toBeNull();
      expect(result.current.calculationBreakdown).toBeNull();
      expect(result.current.calculatedMarketValue).toBeNull();
      expect(result.current.valueDifference).toBeNull();
      expect(result.current.valueDifferencePercentage).toBeNull();
      expect(result.current.isUndervalued).toBe(false);
    });
  });
});

describe('Store - Insurance Comparison', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('updateInsuranceComparison', () => {
    it('should calculate insurance comparison correctly', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
          settlementValue: 24000,
        });
      });

      act(() => {
        // Use set to properly update the state
        useAppStore.setState({ calculatedMarketValue: 25000 });
        result.current.updateInsuranceComparison();
      });

      expect(result.current.insuranceValue).toBe(24000);
      expect(result.current.valueDifference).toBe(1000);
      expect(result.current.valueDifferencePercentage).toBeCloseTo(4.17, 1);
      expect(result.current.isUndervalued).toBe(false);
    });

    it('should detect undervaluation when difference > 5%', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
          settlementValue: 20000,
        });
      });

      act(() => {
        useAppStore.setState({ calculatedMarketValue: 25000 });
        result.current.updateInsuranceComparison();
      });

      expect(result.current.valueDifference).toBe(5000);
      expect(result.current.valueDifferencePercentage).toBe(25);
      expect(result.current.isUndervalued).toBe(true);
    });

    it('should use marketValue if settlementValue is not available', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
          marketValue: 23000,
        });
      });

      act(() => {
        useAppStore.setState({ calculatedMarketValue: 25000 });
        result.current.updateInsuranceComparison();
      });

      expect(result.current.insuranceValue).toBe(23000);
      expect(result.current.valueDifference).toBe(2000);
    });

    it('should clear comparison if no insurance value available', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
        });
      });

      act(() => {
        useAppStore.setState({ calculatedMarketValue: 25000 });
        result.current.updateInsuranceComparison();
      });

      expect(result.current.insuranceValue).toBeNull();
      expect(result.current.valueDifference).toBeNull();
      expect(result.current.valueDifferencePercentage).toBeNull();
      expect(result.current.isUndervalued).toBe(false);
    });

    it('should clear comparison if no calculated market value', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
          settlementValue: 24000,
        });
        result.current.updateInsuranceComparison();
      });

      expect(result.current.insuranceValue).toBeNull();
      expect(result.current.valueDifference).toBeNull();
    });
  });

  describe('setInsuranceValue', () => {
    it('should set insurance value and update comparison', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        useAppStore.setState({ calculatedMarketValue: 25000 });
      });

      act(() => {
        result.current.setInsuranceValue(24000);
      });

      expect(result.current.insuranceValue).toBe(24000);
      expect(result.current.valueDifference).toBe(1000);
    });

    it('should clear insurance value', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setInsuranceValue(24000);
        result.current.setInsuranceValue(null);
      });

      expect(result.current.insuranceValue).toBeNull();
    });
  });
});

describe('Store - Reset Actions with Comparables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reset', () => {
    it('should reset all state including comparables', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        // Set various state
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
        });
        (result.current as any).comparableVehicles = [{ id: 'comp-1' }];
        (result.current as any).marketAnalysis = { calculatedMarketValue: 25000 };
        (result.current as any).calculatedMarketValue = 25000;
        result.current.reset();
      });

      expect(result.current.currentAppraisal).toBeNull();
      expect(result.current.comparableVehicles).toEqual([]);
      expect(result.current.currentComparable).toBeNull();
      expect(result.current.marketAnalysis).toBeNull();
      expect(result.current.calculatedMarketValue).toBeNull();
      expect(result.current.insuranceValue).toBeNull();
      expect(result.current.valueDifference).toBeNull();
      expect(result.current.isUndervalued).toBe(false);
    });
  });

  describe('resetProcessing', () => {
    it('should reset processing state including comparables', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAppraisal({
          vin: 'TEST123',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          mileage: 30000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
        });
        (result.current as any).comparableVehicles = [{ id: 'comp-1' }];
        (result.current as any).marketAnalysis = { calculatedMarketValue: 25000 };
        result.current.resetProcessing();
      });

      expect(result.current.currentAppraisal).toBeNull();
      expect(result.current.comparableVehicles).toEqual([]);
      expect(result.current.marketAnalysis).toBeNull();
      expect(result.current.calculatedMarketValue).toBeNull();
    });
  });
});

describe('Store - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should handle complete workflow: load comparables -> add -> update -> delete', async () => {
    const initialComparables: ComparableVehicle[] = [
      { id: 'comp-1', appraisalId: 'appraisal-1', listPrice: 25000 } as ComparableVehicle,
    ];

    const newComparable: ComparableVehicle = {
      id: 'comp-2',
      appraisalId: 'appraisal-1',
      listPrice: 26000,
    } as ComparableVehicle;

    mockElectron.getComparables.mockResolvedValue(initialComparables);
    mockElectron.saveComparable.mockResolvedValue(true);
    mockElectron.updateComparable.mockResolvedValue(true);
    mockElectron.deleteComparable.mockResolvedValue(true);
    mockElectron.calculateMarketValue.mockResolvedValue({
      appraisalId: 'appraisal-1',
      calculatedMarketValue: 25500,
    } as MarketAnalysis);

    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setAppraisal({
        vin: 'TEST123',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        mileage: 30000,
        location: 'Los Angeles, CA',
        reportType: 'CCC_ONE',
        extractionConfidence: 95,
        extractionErrors: [],
      });
      result.current.addToHistory({
        id: 'appraisal-1',
        createdAt: new Date(),
        status: 'complete',
        data: result.current.currentAppraisal!,
      });
    });

    // Load comparables
    await act(async () => {
      await result.current.loadComparables('appraisal-1');
    });

    await waitFor(() => {
      expect(result.current.comparableVehicles).toHaveLength(1);
    });

    // Add comparable
    await act(async () => {
      await result.current.addComparable(newComparable);
    });

    await waitFor(() => {
      expect(result.current.comparableVehicles).toHaveLength(2);
    });

    // Update comparable
    await act(async () => {
      await result.current.updateComparable('comp-1', { listPrice: 27000 });
    });

    await waitFor(() => {
      const updated = result.current.comparableVehicles.find(c => c.id === 'comp-1');
      expect(updated?.listPrice).toBe(27000);
    });

    // Delete comparable
    await act(async () => {
      await result.current.deleteComparable('comp-2');
    });

    await waitFor(() => {
      expect(result.current.comparableVehicles).toHaveLength(1);
      expect(result.current.comparableVehicles[0].id).toBe('comp-1');
    });

    // Verify market value was recalculated after each operation
    expect(mockElectron.calculateMarketValue).toHaveBeenCalledTimes(4); // load, add, update, delete
  });

  it('should update insurance comparison when market value changes', async () => {
    mockElectron.calculateMarketValue.mockResolvedValue({
      appraisalId: 'appraisal-1',
      calculatedMarketValue: 26000,
    } as MarketAnalysis);

    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setAppraisal({
        vin: 'TEST123',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        mileage: 30000,
        location: 'Los Angeles, CA',
        reportType: 'CCC_ONE',
        extractionConfidence: 95,
        extractionErrors: [],
        settlementValue: 24000,
      });
      result.current.addToHistory({
        id: 'appraisal-1',
        createdAt: new Date(),
        status: 'complete',
        data: result.current.currentAppraisal!,
      });
      (result.current as any).comparableVehicles = [{ id: 'comp-1' }];
    });

    await act(async () => {
      await result.current.calculateMarketValue('appraisal-1');
    });

    await waitFor(() => {
      expect(result.current.calculatedMarketValue).toBe(26000);
      expect(result.current.insuranceValue).toBe(24000);
      expect(result.current.valueDifference).toBe(2000);
      expect(result.current.valueDifferencePercentage).toBeCloseTo(8.33, 1);
      expect(result.current.isUndervalued).toBe(true);
    });
  });
});
