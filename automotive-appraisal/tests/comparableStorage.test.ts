import { ComparableStorageService } from '../src/main/services/comparableStorage';
import { ComparableVehicle } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('ComparableStorageService', () => {
  let service: ComparableStorageService;
  const testAppraisalId = 'test_appraisal_123';
  
  // Helper to create a valid comparable
  const createTestComparable = (overrides: Partial<ComparableVehicle> = {}): ComparableVehicle => ({
    id: `comp_${Date.now()}_${Math.random()}`,
    appraisalId: testAppraisalId,
    source: 'AutoTrader',
    sourceUrl: 'https://example.com',
    dateAdded: new Date(),
    year: 2020,
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    mileage: 30000,
    location: 'Los Angeles, CA',
    coordinates: { latitude: 34.0522, longitude: -118.2437 },
    distanceFromLoss: 50,
    listPrice: 25000,
    adjustedPrice: 24500,
    condition: 'Good',
    equipment: ['Navigation', 'Sunroof'],
    qualityScore: 85,
    qualityScoreBreakdown: {
      baseScore: 100,
      distancePenalty: 0,
      agePenalty: 0,
      ageBonus: 0,
      mileagePenalty: 0,
      mileageBonus: 10,
      equipmentPenalty: 0,
      equipmentBonus: 5,
      finalScore: 85,
      explanations: {
        distance: 'Within 100 miles',
        age: 'Exact match',
        mileage: 'Within 20%',
        equipment: 'All features match'
      }
    },
    adjustments: {
      mileageAdjustment: {
        mileageDifference: 0,
        depreciationRate: 0.15,
        adjustmentAmount: 0,
        explanation: 'No adjustment needed'
      },
      equipmentAdjustments: [],
      conditionAdjustment: {
        comparableCondition: 'Good',
        lossVehicleCondition: 'Good',
        multiplier: 1.0,
        adjustmentAmount: 0,
        explanation: 'Same condition'
      },
      totalAdjustment: -500,
      adjustedPrice: 24500
    },
    notes: 'Test comparable',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  beforeEach(() => {
    service = new ComparableStorageService();
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await service.deleteComparablesForAppraisal(testAppraisalId);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('saveComparable', () => {
    it('should save a valid comparable', async () => {
      const comparable = createTestComparable();
      
      const result = await service.saveComparable(comparable);
      
      expect(result).toBe(true);
      
      const saved = await service.getComparables(testAppraisalId);
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe(comparable.id);
    });

    it('should save multiple comparables', async () => {
      const comparable1 = createTestComparable();
      const comparable2 = createTestComparable({ id: 'comp_2' });
      
      await service.saveComparable(comparable1);
      await service.saveComparable(comparable2);
      
      const saved = await service.getComparables(testAppraisalId);
      expect(saved).toHaveLength(2);
    });

    it('should throw error for duplicate ID', async () => {
      const comparable = createTestComparable();
      
      await service.saveComparable(comparable);
      
      await expect(service.saveComparable(comparable)).rejects.toThrow('already exists');
    });

    it('should throw error for missing required fields', async () => {
      const invalidComparable = createTestComparable({ make: '' });
      
      await expect(service.saveComparable(invalidComparable)).rejects.toThrow('Make is required');
    });

    it('should throw error for invalid year', async () => {
      const invalidComparable = createTestComparable({ year: 1800 });
      
      await expect(service.saveComparable(invalidComparable)).rejects.toThrow('Valid year is required');
    });

    it('should throw error for negative mileage', async () => {
      const invalidComparable = createTestComparable({ mileage: -1000 });
      
      await expect(service.saveComparable(invalidComparable)).rejects.toThrow('cannot be negative');
    });

    it('should throw error for invalid price', async () => {
      const invalidComparable = createTestComparable({ listPrice: 0 });
      
      await expect(service.saveComparable(invalidComparable)).rejects.toThrow('must be positive');
    });

    it('should throw error for invalid condition', async () => {
      const invalidComparable = createTestComparable({ condition: 'Invalid' as any });
      
      await expect(service.saveComparable(invalidComparable)).rejects.toThrow('Valid condition is required');
    });
  });

  describe('getComparables', () => {
    it('should return empty array for appraisal with no comparables', async () => {
      const comparables = await service.getComparables('nonexistent_appraisal');
      
      expect(comparables).toEqual([]);
    });

    it('should return all comparables for an appraisal', async () => {
      const comparable1 = createTestComparable();
      const comparable2 = createTestComparable({ id: 'comp_2' });
      
      await service.saveComparable(comparable1);
      await service.saveComparable(comparable2);
      
      const comparables = await service.getComparables(testAppraisalId);
      
      expect(comparables).toHaveLength(2);
      expect(comparables.map(c => c.id)).toContain(comparable1.id);
      expect(comparables.map(c => c.id)).toContain(comparable2.id);
    });

    it('should convert date strings to Date objects', async () => {
      const comparable = createTestComparable();
      await service.saveComparable(comparable);
      
      const comparables = await service.getComparables(testAppraisalId);
      
      expect(comparables[0].createdAt).toBeInstanceOf(Date);
      expect(comparables[0].updatedAt).toBeInstanceOf(Date);
      expect(comparables[0].dateAdded).toBeInstanceOf(Date);
    });

    it('should throw error for empty appraisal ID', async () => {
      await expect(service.getComparables('')).rejects.toThrow('Appraisal ID is required');
    });
  });

  describe('getComparable', () => {
    it('should return a specific comparable by ID', async () => {
      const comparable = createTestComparable();
      await service.saveComparable(comparable);
      
      const found = await service.getComparable(comparable.id, testAppraisalId);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(comparable.id);
      expect(found?.make).toBe(comparable.make);
    });

    it('should return undefined for non-existent comparable', async () => {
      const found = await service.getComparable('nonexistent_id', testAppraisalId);
      
      expect(found).toBeUndefined();
    });

    it('should throw error for empty ID', async () => {
      await expect(service.getComparable('', testAppraisalId)).rejects.toThrow('Comparable ID is required');
    });
  });

  describe('updateComparable', () => {
    it('should update an existing comparable', async () => {
      const comparable = createTestComparable();
      await service.saveComparable(comparable);
      
      const updates = {
        appraisalId: testAppraisalId,
        mileage: 35000,
        listPrice: 24000
      };
      
      const result = await service.updateComparable(comparable.id, updates);
      
      expect(result).toBe(true);
      
      const updated = await service.getComparable(comparable.id, testAppraisalId);
      expect(updated?.mileage).toBe(35000);
      expect(updated?.listPrice).toBe(24000);
      expect(updated?.make).toBe(comparable.make); // Unchanged fields preserved
    });

    it('should update the updatedAt timestamp', async () => {
      const comparable = createTestComparable();
      await service.saveComparable(comparable);
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await service.updateComparable(comparable.id, {
        appraisalId: testAppraisalId,
        mileage: 35000
      });
      
      const updated = await service.getComparable(comparable.id, testAppraisalId);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(comparable.updatedAt.getTime());
    });

    it('should return false for non-existent comparable', async () => {
      const result = await service.updateComparable('nonexistent_id', {
        appraisalId: testAppraisalId,
        mileage: 35000
      });
      
      expect(result).toBe(false);
    });

    it('should validate updated data', async () => {
      const comparable = createTestComparable();
      await service.saveComparable(comparable);
      
      await expect(
        service.updateComparable(comparable.id, {
          appraisalId: testAppraisalId,
          mileage: -1000
        })
      ).rejects.toThrow('cannot be negative');
    });

    it('should throw error for missing appraisal ID', async () => {
      await expect(
        service.updateComparable('some_id', { mileage: 35000 })
      ).rejects.toThrow('Appraisal ID is required');
    });
  });

  describe('deleteComparable', () => {
    it('should delete an existing comparable', async () => {
      const comparable = createTestComparable();
      await service.saveComparable(comparable);
      
      const result = await service.deleteComparable(comparable.id, testAppraisalId);
      
      expect(result).toBe(true);
      
      const comparables = await service.getComparables(testAppraisalId);
      expect(comparables).toHaveLength(0);
    });

    it('should return false for non-existent comparable', async () => {
      const result = await service.deleteComparable('nonexistent_id', testAppraisalId);
      
      expect(result).toBe(false);
    });

    it('should only delete the specified comparable', async () => {
      const comparable1 = createTestComparable();
      const comparable2 = createTestComparable({ id: 'comp_2' });
      
      await service.saveComparable(comparable1);
      await service.saveComparable(comparable2);
      
      await service.deleteComparable(comparable1.id, testAppraisalId);
      
      const comparables = await service.getComparables(testAppraisalId);
      expect(comparables).toHaveLength(1);
      expect(comparables[0].id).toBe(comparable2.id);
    });

    it('should throw error for empty ID', async () => {
      await expect(
        service.deleteComparable('', testAppraisalId)
      ).rejects.toThrow('Comparable ID is required');
    });
  });

  describe('deleteComparablesForAppraisal', () => {
    it('should delete all comparables for an appraisal', async () => {
      const comparable1 = createTestComparable();
      const comparable2 = createTestComparable({ id: 'comp_2' });
      
      await service.saveComparable(comparable1);
      await service.saveComparable(comparable2);
      
      const result = await service.deleteComparablesForAppraisal(testAppraisalId);
      
      expect(result).toBe(true);
      
      const comparables = await service.getComparables(testAppraisalId);
      expect(comparables).toHaveLength(0);
    });

    it('should return false if no comparables file exists', async () => {
      const result = await service.deleteComparablesForAppraisal('nonexistent_appraisal');
      
      expect(result).toBe(false);
    });

    it('should throw error for empty appraisal ID', async () => {
      await expect(
        service.deleteComparablesForAppraisal('')
      ).rejects.toThrow('Appraisal ID is required');
    });
  });

  describe('getComparablesCount', () => {
    it('should return 0 for appraisal with no comparables', async () => {
      const count = await service.getComparablesCount('nonexistent_appraisal');
      
      expect(count).toBe(0);
    });

    it('should return correct count', async () => {
      const comparable1 = createTestComparable();
      const comparable2 = createTestComparable({ id: 'comp_2' });
      const comparable3 = createTestComparable({ id: 'comp_3' });
      
      await service.saveComparable(comparable1);
      await service.saveComparable(comparable2);
      await service.saveComparable(comparable3);
      
      const count = await service.getComparablesCount(testAppraisalId);
      
      expect(count).toBe(3);
    });
  });

  describe('hasComparables', () => {
    it('should return false for appraisal with no comparables', async () => {
      const hasComparables = await service.hasComparables('nonexistent_appraisal');
      
      expect(hasComparables).toBe(false);
    });

    it('should return true for appraisal with comparables', async () => {
      const comparable = createTestComparable();
      await service.saveComparable(comparable);
      
      const hasComparables = await service.hasComparables(testAppraisalId);
      
      expect(hasComparables).toBe(true);
    });
  });

  describe('data persistence', () => {
    it('should persist data across service instances', async () => {
      const comparable = createTestComparable();
      await service.saveComparable(comparable);
      
      // Create new service instance
      const newService = new ComparableStorageService();
      const comparables = await newService.getComparables(testAppraisalId);
      
      expect(comparables).toHaveLength(1);
      expect(comparables[0].id).toBe(comparable.id);
    });

    it('should handle concurrent writes safely', async () => {
      const comparables = Array.from({ length: 5 }, (_, i) =>
        createTestComparable({ id: `comp_${i}` })
      );
      
      // Save all comparables concurrently
      await Promise.all(comparables.map(c => service.saveComparable(c)));
      
      const saved = await service.getComparables(testAppraisalId);
      expect(saved).toHaveLength(5);
    });
  });

  describe('edge cases', () => {
    it('should handle comparables with minimal data', async () => {
      const minimal = createTestComparable({
        trim: undefined,
        sourceUrl: undefined,
        coordinates: undefined,
        notes: undefined
      });
      
      const result = await service.saveComparable(minimal);
      
      expect(result).toBe(true);
      
      const saved = await service.getComparable(minimal.id, testAppraisalId);
      expect(saved).toBeDefined();
      expect(saved?.trim).toBeUndefined();
    });

    it('should handle special characters in data', async () => {
      const comparable = createTestComparable({
        make: "O'Reilly's",
        model: 'Test & Model',
        notes: 'Special chars: <>&"'
      });
      
      await service.saveComparable(comparable);
      
      const saved = await service.getComparable(comparable.id, testAppraisalId);
      expect(saved?.make).toBe("O'Reilly's");
      expect(saved?.model).toBe('Test & Model');
    });

    it('should handle large equipment arrays', async () => {
      const comparable = createTestComparable({
        equipment: Array.from({ length: 20 }, (_, i) => `Feature ${i}`)
      });
      
      await service.saveComparable(comparable);
      
      const saved = await service.getComparable(comparable.id, testAppraisalId);
      expect(saved?.equipment).toHaveLength(20);
    });
  });
});
