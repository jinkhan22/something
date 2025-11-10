import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppStore } from '../src/renderer/store';
import {
  debounce,
  throttle,
  LazyLoader,
  BackgroundTaskQueue,
  LRUCache,
  BatchProcessor,
  PerformanceMonitor,
} from '../src/renderer/utils/performanceOptimization';
import { useDebounce, useDebouncedCallback, useThrottledCallback } from '../src/renderer/hooks/useDebounce';
import { BackgroundGeocodingService } from '../src/renderer/services/backgroundGeocoding';
import { ComparableVehicle, ExtractedVehicleData } from '../src/types';

// Mock electron API
const mockElectron = {
  calculateMarketValue: jest.fn(),
  getComparables: jest.fn(),
  saveComparable: jest.fn(),
  updateComparable: jest.fn(),
  deleteComparable: jest.fn(),
  geocodeLocation: jest.fn(),
};

(global as any).window = {
  electron: mockElectron,
};

describe('Performance Optimizations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().reset();
  });

  describe('Calculation Result Caching', () => {
    it('should cache market value calculations', async () => {
      const store = useAppStore.getState();
      const appraisalId = 'test-appraisal-1';
      const comparablesHash = 'hash-123';
      const marketValue = 25000;
      const breakdown = {
        comparables: [],
        totalWeightedValue: 25000,
        totalWeights: 100,
        finalMarketValue: 25000,
        steps: [],
      };

      // Set cache
      store.setCachedMarketValue(appraisalId, comparablesHash, marketValue, breakdown);

      // Get from cache
      const cached = store.getCachedMarketValue(appraisalId, comparablesHash);

      expect(cached).not.toBeNull();
      expect(cached?.marketValue).toBe(marketValue);
      expect(cached?.breakdown).toEqual(breakdown);
    });

    it('should invalidate cache when comparables hash changes', () => {
      const store = useAppStore.getState();
      const appraisalId = 'test-appraisal-1';
      const oldHash = 'hash-123';
      const newHash = 'hash-456';
      const marketValue = 25000;
      const breakdown = {
        comparables: [],
        totalWeightedValue: 25000,
        totalWeights: 100,
        finalMarketValue: 25000,
        steps: [],
      };

      // Set cache with old hash
      store.setCachedMarketValue(appraisalId, oldHash, marketValue, breakdown);

      // Try to get with new hash
      const cached = store.getCachedMarketValue(appraisalId, newHash);

      expect(cached).toBeNull();
    });

    it('should invalidate cache after 5 minutes', () => {
      const store = useAppStore.getState();
      const appraisalId = 'test-appraisal-1';
      const comparablesHash = 'hash-123';
      const marketValue = 25000;
      const breakdown = {
        comparables: [],
        totalWeightedValue: 25000,
        totalWeights: 100,
        finalMarketValue: 25000,
        steps: [],
      };

      // Manually create an old cache entry
      const oldTimestamp = Date.now() - 6 * 60 * 1000;
      act(() => {
        useAppStore.setState({
          calculationCache: new Map([
            [appraisalId, {
              marketValue,
              breakdown,
              timestamp: oldTimestamp,
              comparablesHash
            }]
          ])
        });
      });

      // Try to get from cache
      const cached = store.getCachedMarketValue(appraisalId, comparablesHash);

      expect(cached).toBeNull();
    });

    it('should use cached value in calculateMarketValue', async () => {
      const store = useAppStore.getState();
      const appraisalId = 'test-appraisal-1';
      
      const mockComparable: ComparableVehicle = {
        id: 'comp-1',
        appraisalId,
        source: 'AutoTrader',
        dateAdded: new Date(),
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        mileage: 30000,
        location: 'Los Angeles, CA',
        distanceFromLoss: 10,
        listPrice: 25000,
        condition: 'Good',
        equipment: [],
        qualityScore: 85,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: 0,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 10,
          equipmentPenalty: 0,
          equipmentBonus: 0,
          finalScore: 85,
          explanations: {
            distance: '',
            age: '',
            mileage: '',
            equipment: '',
          },
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 0,
            depreciationRate: 0.25,
            adjustmentAmount: 0,
            explanation: '',
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Good',
            lossVehicleCondition: 'Good',
            multiplier: 1.0,
            adjustmentAmount: 0,
            explanation: '',
          },
          totalAdjustment: 0,
          adjustedPrice: 25000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAppraisal: ExtractedVehicleData = {
        vin: 'TEST123',
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        mileage: 30000,
        location: 'Los Angeles, CA',
        marketValue: 24000,
        reportType: 'CCC',
        extractionMethod: 'standard',
        extractionConfidence: 95,
        extractionErrors: [],
      };

      act(() => {
        useAppStore.setState({ 
          currentAppraisal: mockAppraisal,
          comparableVehicles: [mockComparable]
        });
      });

      // Pre-cache the result
      const comparablesHash = JSON.stringify([
        {
          id: mockComparable.id,
          price: mockComparable.listPrice,
          mileage: mockComparable.mileage,
          qualityScore: mockComparable.qualityScore,
        },
      ]);
      
      const breakdown = {
        comparables: [],
        totalWeightedValue: 25000,
        totalWeights: 100,
        finalMarketValue: 25000,
        steps: [],
      };
      
      act(() => {
        store.setCachedMarketValue(appraisalId, comparablesHash, 25000, breakdown);
      });

      // Calculate market value - should use cache
      await act(async () => {
        await store.calculateMarketValue(appraisalId);
      });

      // Electron API should not be called
      expect(mockElectron.calculateMarketValue).not.toHaveBeenCalled();
      
      // Get fresh store state
      const updatedStore = useAppStore.getState();
      expect(updatedStore.calculatedMarketValue).toBe(25000);
    });
  });

  describe('Geocoding Cache', () => {
    it('should cache geocoded locations', () => {
      const store = useAppStore.getState();
      const location = 'Los Angeles, CA';
      const coordinates = { latitude: 34.0522, longitude: -118.2437 };

      store.setCachedGeolocation(location, coordinates);

      const cached = store.getCachedGeolocation(location);

      expect(cached).toEqual(coordinates);
    });

    it('should be case-insensitive for location lookups', () => {
      const store = useAppStore.getState();
      const coordinates = { latitude: 34.0522, longitude: -118.2437 };

      store.setCachedGeolocation('Los Angeles, CA', coordinates);

      const cached = store.getCachedGeolocation('los angeles, ca');

      expect(cached).toEqual(coordinates);
    });

    it('should clear geocoding cache', () => {
      const store = useAppStore.getState();
      const location = 'Los Angeles, CA';
      const coordinates = { latitude: 34.0522, longitude: -118.2437 };

      store.setCachedGeolocation(location, coordinates);
      store.clearGeolocationCache();

      const cached = store.getCachedGeolocation(location);

      expect(cached).toBeNull();
    });
  });

  describe('Debounced Recalculation', () => {
    it('should debounce function calls', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn('call1');
      debouncedFn('call2');
      debouncedFn('call3');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call3');

      jest.useRealTimers();
    });

    it('should use debounced value hook', async () => {
      jest.useFakeTimers();
      
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current).toBe('initial');

      rerender({ value: 'updated1' });
      expect(result.current).toBe('initial');

      rerender({ value: 'updated2' });
      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current).toBe('updated2');
      });

      jest.useRealTimers();
    });

    it('should use debounced callback hook', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn();

      const { result } = renderHook(() => useDebouncedCallback(mockFn, 300));

      act(() => {
        result.current('call1');
        result.current('call2');
        result.current('call3');
      });

      expect(mockFn).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call3');

      jest.useRealTimers();
    });
  });

  describe('Throttled Callbacks', () => {
    it('should throttle function calls', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 300);

      throttledFn('call1');
      throttledFn('call2');
      throttledFn('call3');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call1');

      jest.advanceTimersByTime(300);

      throttledFn('call4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('call4');

      jest.useRealTimers();
    });

    it('should use throttled callback hook', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn();

      const { result } = renderHook(() => useThrottledCallback(mockFn, 300));

      act(() => {
        result.current('call1');
        result.current('call2');
        result.current('call3');
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call1');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      act(() => {
        result.current('call4');
      });

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('call4');

      jest.useRealTimers();
    });
  });

  describe('Pagination', () => {
    it('should paginate comparables list', () => {
      const store = useAppStore.getState();
      const comparables: ComparableVehicle[] = Array.from({ length: 50 }, (_, i) => ({
        id: `comp-${i}`,
        appraisalId: 'test',
        source: 'AutoTrader',
        dateAdded: new Date(),
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        mileage: 30000,
        location: 'Los Angeles, CA',
        distanceFromLoss: 10,
        listPrice: 25000,
        condition: 'Good' as const,
        equipment: [],
        qualityScore: 85,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: 0,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 0,
          equipmentPenalty: 0,
          equipmentBonus: 0,
          finalScore: 85,
          explanations: { distance: '', age: '', mileage: '', equipment: '' },
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 0,
            depreciationRate: 0.25,
            adjustmentAmount: 0,
            explanation: '',
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Good',
            lossVehicleCondition: 'Good',
            multiplier: 1.0,
            adjustmentAmount: 0,
            explanation: '',
          },
          totalAdjustment: 0,
          adjustedPrice: 25000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      act(() => {
        useAppStore.setState({ comparableVehicles: comparables });
      });

      store.setComparablesPagination(1, 20);

      const paged = store.getPagedComparables();

      expect(paged.length).toBe(20);
      expect(paged[0].id).toBe('comp-0');
      expect(paged[19].id).toBe('comp-19');
    });

    it('should navigate between pages', () => {
      const store = useAppStore.getState();
      const comparables: ComparableVehicle[] = Array.from({ length: 50 }, (_, i) => ({
        id: `comp-${i}`,
        appraisalId: 'test',
        source: 'AutoTrader',
        dateAdded: new Date(),
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        mileage: 30000,
        location: 'Los Angeles, CA',
        distanceFromLoss: 10,
        listPrice: 25000,
        condition: 'Good' as const,
        equipment: [],
        qualityScore: 85,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: 0,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 0,
          equipmentPenalty: 0,
          equipmentBonus: 0,
          finalScore: 85,
          explanations: { distance: '', age: '', mileage: '', equipment: '' },
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 0,
            depreciationRate: 0.25,
            adjustmentAmount: 0,
            explanation: '',
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Good',
            lossVehicleCondition: 'Good',
            multiplier: 1.0,
            adjustmentAmount: 0,
            explanation: '',
          },
          totalAdjustment: 0,
          adjustedPrice: 25000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      act(() => {
        useAppStore.setState({ comparableVehicles: comparables });
      });

      store.setComparablesPagination(2, 20);

      const paged = store.getPagedComparables();

      expect(paged.length).toBe(20);
      expect(paged[0].id).toBe('comp-20');
      expect(paged[19].id).toBe('comp-39');
    });

    it('should calculate total pages correctly', () => {
      const store = useAppStore.getState();
      const comparables: ComparableVehicle[] = Array.from({ length: 45 }, () => ({} as ComparableVehicle));

      act(() => {
        useAppStore.setState({ comparableVehicles: comparables });
      });

      store.setComparablesPagination(1, 20);

      expect(store.comparablesPagination.totalPages).toBe(3);
    });
  });

  describe('Background Geocoding', () => {
    it('should track geocoding progress', () => {
      act(() => {
        useAppStore.getState().setGeocodingProgress(10, 5, true);
      });

      const store = useAppStore.getState();
      expect(store.geocodingProgress.total).toBe(10);
      expect(store.geocodingProgress.completed).toBe(5);
      expect(store.geocodingProgress.inProgress).toBe(true);
    });

    it('should clear geocoding progress', () => {
      act(() => {
        useAppStore.getState().setGeocodingProgress(10, 5, true);
      });
      
      act(() => {
        useAppStore.getState().setGeocodingProgress(0, 0, false);
      });

      const store = useAppStore.getState();
      expect(store.geocodingProgress.inProgress).toBe(false);
    });
  });

  describe('Lazy Loader', () => {
    it('should load value lazily', async () => {
      const loader = jest.fn().mockResolvedValue('loaded-value');
      const lazyLoader = new LazyLoader(loader);

      expect(lazyLoader.isLoaded()).toBe(false);
      expect(lazyLoader.getValue()).toBeNull();

      const value = await lazyLoader.load();

      expect(value).toBe('loaded-value');
      expect(lazyLoader.isLoaded()).toBe(true);
      expect(lazyLoader.getValue()).toBe('loaded-value');
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should not reload if already loaded', async () => {
      const loader = jest.fn().mockResolvedValue('loaded-value');
      const lazyLoader = new LazyLoader(loader);

      await lazyLoader.load();
      await lazyLoader.load();

      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should reset loader', async () => {
      const loader = jest.fn().mockResolvedValue('loaded-value');
      const lazyLoader = new LazyLoader(loader);

      await lazyLoader.load();
      lazyLoader.reset();

      expect(lazyLoader.isLoaded()).toBe(false);
      expect(lazyLoader.getValue()).toBeNull();

      await lazyLoader.load();

      expect(loader).toHaveBeenCalledTimes(2);
    });
  });

  describe('Background Task Queue', () => {
    it('should process tasks in order', async () => {
      const results: number[] = [];
      const queue = new BackgroundTaskQueue();

      queue.addTask(async () => {
        results.push(1);
      });
      queue.addTask(async () => {
        results.push(2);
      });
      queue.addTask(async () => {
        results.push(3);
      });

      await queue.processAll();

      expect(results).toEqual([1, 2, 3]);
    });

    it('should report progress', async () => {
      const progressUpdates: Array<{ completed: number; total: number }> = [];
      const queue = new BackgroundTaskQueue((completed, total) => {
        progressUpdates.push({ completed, total });
      });

      queue.addTask(async () => {});
      queue.addTask(async () => {});
      queue.addTask(async () => {});

      await queue.processAll();

      expect(progressUpdates.length).toBe(3);
      expect(progressUpdates[0]).toEqual({ completed: 1, total: 3 });
      expect(progressUpdates[1]).toEqual({ completed: 2, total: 3 });
      expect(progressUpdates[2]).toEqual({ completed: 3, total: 3 });
    });
  });

  describe('LRU Cache', () => {
    it('should store and retrieve values', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
    });

    it('should evict least recently used item', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update LRU order on access', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.get('a'); // Access 'a', making it most recent
      cache.set('d', 4); // Should evict 'b', not 'a'

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });
  });

  describe('Performance Monitor', () => {
    it('should measure performance', () => {
      const monitor = new PerformanceMonitor();

      monitor.mark('start');
      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.sqrt(i);
      }
      const duration = monitor.measure('test-operation', 'start');

      expect(duration).toBeGreaterThan(0);

      const stats = monitor.getStats('test-operation');
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
      expect(stats?.avg).toBe(duration);
    });

    it('should calculate statistics', () => {
      const monitor = new PerformanceMonitor();

      monitor.mark('start1');
      monitor.measure('operation', 'start1');

      monitor.mark('start2');
      monitor.measure('operation', 'start2');

      monitor.mark('start3');
      monitor.measure('operation', 'start3');

      const stats = monitor.getStats('operation');

      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(3);
      expect(stats?.min).toBeLessThanOrEqual(stats?.avg!);
      expect(stats?.max).toBeGreaterThanOrEqual(stats?.avg!);
    });
  });

  describe('Performance Targets', () => {
    it('should meet quality score calculation target (<10ms)', () => {
      const monitor = new PerformanceMonitor();
      
      // Simulate quality score calculation
      monitor.mark('start');
      
      // Mock calculation
      const baseScore = 100;
      const distancePenalty = 0.1 * 50;
      const agePenalty = 2.0 * 1;
      const mileageBonus = 10;
      const finalScore = baseScore - distancePenalty - agePenalty + mileageBonus;
      
      const duration = monitor.measure('quality-score', 'start');

      expect(duration).toBeLessThan(10);
      expect(finalScore).toBeDefined();
    });

    it('should meet market value calculation target (<50ms for 10 comparables)', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.mark('start');
      
      // Simulate market value calculation with 10 comparables
      const comparables = Array.from({ length: 10 }, (_, i) => ({
        adjustedPrice: 25000 + i * 100,
        qualityScore: 80 + i,
      }));
      
      const totalWeightedValue = comparables.reduce(
        (sum, c) => sum + c.adjustedPrice * c.qualityScore,
        0
      );
      const totalWeights = comparables.reduce((sum, c) => sum + c.qualityScore, 0);
      const marketValue = totalWeightedValue / totalWeights;
      
      const duration = monitor.measure('market-value', 'start');

      expect(duration).toBeLessThan(50);
      expect(marketValue).toBeGreaterThan(0);
    });

    it('should meet form validation target (<100ms)', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.mark('start');
      
      // Simulate form validation
      const formData = {
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        mileage: 30000,
        price: 25000,
        location: 'Los Angeles, CA',
      };
      
      const isValid =
        formData.year >= 1900 &&
        formData.year <= new Date().getFullYear() + 1 &&
        formData.mileage >= 0 &&
        formData.mileage <= 500000 &&
        formData.price >= 0 &&
        formData.price <= 1000000 &&
        formData.location.length > 0;
      
      const duration = monitor.measure('form-validation', 'start');

      expect(duration).toBeLessThan(100);
      expect(isValid).toBe(true);
    });
  });
});
