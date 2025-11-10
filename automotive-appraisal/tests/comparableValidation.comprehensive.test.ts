/**
 * Comprehensive tests for ComparableValidationService
 * 
 * Tests all validation scenarios including:
 * - Required field validation
 * - Range validation
 * - Cross-field validation
 * - Outlier detection
 * - Error recovery suggestions
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import { ComparableValidationService } from '../src/renderer/services/comparableValidation';
import { ComparableVehicle, ExtractedVehicleData, ComparableValidationError } from '../src/types';

describe('ComparableValidationService', () => {
  let validationService: ComparableValidationService;

  beforeEach(() => {
    validationService = new ComparableValidationService();
  });

  // Helper to create a valid comparable
  const createValidComparable = (overrides?: Partial<ComparableVehicle>): Partial<ComparableVehicle> => ({
    source: 'AutoTrader',
    year: 2020,
    make: 'Toyota',
    model: 'Camry',
    mileage: 50000,
    listPrice: 25000,
    location: 'Los Angeles, CA',
    condition: 'Good',
    equipment: ['Navigation', 'Sunroof'],
    ...overrides
  });

  // Helper to create a valid loss vehicle
  const createLossVehicle = (overrides?: Partial<ExtractedVehicleData>): ExtractedVehicleData => ({
    vin: '1HGBH41JXMN109186',
    year: 2020,
    make: 'Toyota',
    model: 'Camry',
    mileage: 48000,
    location: 'Los Angeles, CA',
    reportType: 'CCC_ONE',
    extractionConfidence: 95,
    extractionErrors: [],
    condition: 'Good',
    equipment: ['Navigation'],
    ...overrides
  });

  describe('Required Field Validation (Requirement 9.7)', () => {
    it('should pass validation when all required fields are present', () => {
      const comparable = createValidComparable();
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when source is missing', () => {
      const comparable = createValidComparable({ source: undefined as any });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'source',
          error: ComparableValidationError.MISSING_REQUIRED_FIELD
        })
      );
    });

    it('should fail when year is missing', () => {
      const comparable = createValidComparable({ year: undefined as any });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'year',
          error: ComparableValidationError.MISSING_REQUIRED_FIELD,
          suggestedAction: expect.stringContaining('model year')
        })
      );
    });

    it('should fail when make is missing', () => {
      const comparable = createValidComparable({ make: undefined as any });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'make')).toBe(true);
    });

    it('should fail when model is missing', () => {
      const comparable = createValidComparable({ model: undefined as any });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'model')).toBe(true);
    });

    it('should fail when mileage is missing', () => {
      const comparable = createValidComparable({ mileage: undefined as any });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'mileage')).toBe(true);
    });

    it('should fail when price is missing', () => {
      const comparable = createValidComparable({ listPrice: undefined as any });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'listPrice')).toBe(true);
    });

    it('should fail when location is missing', () => {
      const comparable = createValidComparable({ location: undefined as any });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'location')).toBe(true);
    });

    it('should fail when condition is missing', () => {
      const comparable = createValidComparable({ condition: undefined as any });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'condition')).toBe(true);
    });

    it('should provide helpful suggestions for missing fields', () => {
      const comparable = createValidComparable({ location: undefined as any });
      const result = validationService.validate(comparable);

      const locationError = result.errors.find(e => e.field === 'location');
      expect(locationError?.suggestedAction).toContain('City, ST');
    });
  });

  describe('Year Validation (Requirement 9.3)', () => {
    it('should accept valid years', () => {
      const currentYear = new Date().getFullYear();
      const comparable = createValidComparable({ year: currentYear });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(true);
    });

    it('should reject years before 1990', () => {
      const comparable = createValidComparable({ year: 1989 });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'year',
          error: ComparableValidationError.INVALID_YEAR
        })
      );
    });

    it('should reject future years beyond next model year', () => {
      const futureYear = new Date().getFullYear() + 3;
      const comparable = createValidComparable({ year: futureYear });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'year')).toBe(true);
    });

    it('should warn about very old vehicles', () => {
      const comparable = createValidComparable({ year: 1995 });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'year',
          message: expect.stringContaining('years old')
        })
      );
    });

    it('should provide suggestions for invalid years', () => {
      const comparable = createValidComparable({ year: 1980 });
      const result = validationService.validate(comparable);

      const yearError = result.errors.find(e => e.field === 'year');
      expect(yearError?.suggestedAction).toBeDefined();
    });
  });

  describe('Mileage Validation (Requirement 9.2)', () => {
    it('should accept valid mileage', () => {
      const comparable = createValidComparable({ mileage: 50000 });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(true);
    });

    it('should reject negative mileage', () => {
      const comparable = createValidComparable({ mileage: -1000 });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'mileage',
          error: ComparableValidationError.INVALID_MILEAGE
        })
      );
    });

    it('should reject unrealistically high mileage', () => {
      const comparable = createValidComparable({ mileage: 600000 });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'mileage')).toBe(true);
    });

    it('should warn about high mileage vehicles', () => {
      const comparable = createValidComparable({ mileage: 250000 });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'mileage',
          message: expect.stringContaining('High mileage')
        })
      );
    });

    it('should warn about unrealistic mileage for vehicle age', () => {
      const currentYear = new Date().getFullYear();
      const comparable = createValidComparable({
        year: currentYear - 2,
        mileage: 150000 // ~75k miles/year
      });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'mileage',
          message: expect.stringContaining('seems high')
        })
      );
    });

    it('should warn about suspiciously low mileage on old vehicles', () => {
      const currentYear = new Date().getFullYear();
      const comparable = createValidComparable({
        year: currentYear - 10,
        mileage: 500
      });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'mileage',
          message: expect.stringContaining('Very low mileage')
        })
      );
    });

    it('should provide helpful suggestions for mileage issues', () => {
      const comparable = createValidComparable({ mileage: -100 });
      const result = validationService.validate(comparable);

      const mileageError = result.errors.find(e => e.field === 'mileage');
      expect(mileageError?.suggestedAction).toContain('positive');
    });
  });

  describe('Price Validation (Requirement 9.1)', () => {
    it('should accept valid prices', () => {
      const comparable = createValidComparable({ listPrice: 25000 });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(true);
    });

    it('should reject prices below minimum', () => {
      const comparable = createValidComparable({ listPrice: 400 });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'listPrice',
          error: ComparableValidationError.INVALID_PRICE
        })
      );
    });

    it('should reject prices above maximum', () => {
      const comparable = createValidComparable({ listPrice: 600000 });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'listPrice')).toBe(true);
    });

    it('should warn about very low prices', () => {
      const comparable = createValidComparable({ listPrice: 1500 });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'listPrice',
          message: expect.stringContaining('Very low price')
        })
      );
    });

    it('should warn about very high prices', () => {
      const comparable = createValidComparable({ listPrice: 150000 });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'listPrice',
          message: expect.stringContaining('High-value vehicle')
        })
      );
    });
  });

  describe('Location Validation (Requirement 9.4)', () => {
    it('should accept valid location format', () => {
      const comparable = createValidComparable({ location: 'Los Angeles, CA' });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(true);
    });

    it('should reject location without comma', () => {
      const comparable = createValidComparable({ location: 'Los Angeles CA' });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'location',
          error: ComparableValidationError.INVALID_LOCATION
        })
      );
    });

    it('should reject incomplete location', () => {
      const comparable = createValidComparable({ location: 'LA' });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'location')).toBe(true);
    });

    it('should reject invalid state abbreviation', () => {
      const comparable = createValidComparable({ location: 'Los Angeles, California' });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'location')).toBe(true);
    });

    it('should provide helpful location format suggestions', () => {
      const comparable = createValidComparable({ location: 'Los Angeles' });
      const result = validationService.validate(comparable);

      const locationError = result.errors.find(e => e.field === 'location');
      expect(locationError?.suggestedAction).toContain('City, ST');
    });
  });

  describe('Make and Model Validation', () => {
    it('should accept known makes', () => {
      const comparable = createValidComparable({ make: 'Toyota' });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(true);
    });

    it('should warn about unknown makes', () => {
      const comparable = createValidComparable({ make: 'UnknownBrand' });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'make',
          message: expect.stringContaining('not in the known manufacturers list')
        })
      );
    });

    it('should warn about makes with numbers', () => {
      const comparable = createValidComparable({ make: 'Toyota123' });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'make',
          message: expect.stringContaining('contains numbers')
        })
      );
    });

    it('should warn about very short make names', () => {
      const comparable = createValidComparable({ make: 'T' });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'make',
          message: expect.stringContaining('too short')
        })
      );
    });

    it('should warn when make and model are the same', () => {
      const comparable = createValidComparable({ make: 'Toyota', model: 'Toyota' });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'model',
          message: expect.stringContaining('appear to be the same')
        })
      );
    });

    it('should warn about very short model names', () => {
      const comparable = createValidComparable({ model: 'C' });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'model',
          message: expect.stringContaining('too short')
        })
      );
    });
  });

  describe('Equipment Validation', () => {
    it('should accept valid equipment lists', () => {
      const comparable = createValidComparable({ equipment: ['Navigation', 'Sunroof'] });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(true);
    });

    it('should warn about duplicate equipment', () => {
      const comparable = createValidComparable({ equipment: ['Navigation', 'Navigation'] });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'equipment',
          message: expect.stringContaining('Duplicate')
        })
      );
    });

    it('should warn about empty equipment list', () => {
      const comparable = createValidComparable({ equipment: [] });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'equipment',
          message: expect.stringContaining('No equipment features')
        })
      );
    });
  });

  describe('Distance Validation', () => {
    it('should accept reasonable distances', () => {
      const comparable = createValidComparable({ distanceFromLoss: 50 });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(true);
    });

    it('should warn about far distances', () => {
      const comparable = createValidComparable({ distanceFromLoss: 200 });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'distanceFromLoss',
          message: expect.stringContaining('far from loss vehicle')
        })
      );
    });

    it('should warn about very far distances', () => {
      const comparable = createValidComparable({ distanceFromLoss: 350 });
      const result = validationService.validate(comparable);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'distanceFromLoss',
          message: expect.stringContaining('very far')
        })
      );
    });
  });

  describe('Outlier Detection (Requirement 9.1)', () => {
    it('should detect price outliers', () => {
      const comparables: ComparableVehicle[] = [
        { ...createValidComparable({ listPrice: 25000 }), id: '1', appraisalId: 'test' } as ComparableVehicle,
        { ...createValidComparable({ listPrice: 26000 }), id: '2', appraisalId: 'test' } as ComparableVehicle,
        { ...createValidComparable({ listPrice: 24000 }), id: '3', appraisalId: 'test' } as ComparableVehicle,
      ];

      const outlier = createValidComparable({ listPrice: 50000 });
      const result = validationService.validate(outlier, comparables);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'listPrice',
          message: expect.stringContaining('significantly')
        })
      );
    });

    it('should not flag outliers with insufficient data', () => {
      const comparables: ComparableVehicle[] = [
        { ...createValidComparable({ listPrice: 25000 }), id: '1', appraisalId: 'test' } as ComparableVehicle,
      ];

      const outlier = createValidComparable({ listPrice: 50000 });
      const result = validationService.validate(outlier, comparables);

      const outlierWarning = result.warnings.find(w => w.message.includes('significantly'));
      expect(outlierWarning).toBeUndefined();
    });

    it('should calculate percentage difference in outlier warnings', () => {
      const comparables: ComparableVehicle[] = [
        { ...createValidComparable({ listPrice: 20000 }), id: '1', appraisalId: 'test' } as ComparableVehicle,
        { ...createValidComparable({ listPrice: 22000 }), id: '2', appraisalId: 'test' } as ComparableVehicle,
        { ...createValidComparable({ listPrice: 21000 }), id: '3', appraisalId: 'test' } as ComparableVehicle,
      ];

      const outlier = createValidComparable({ listPrice: 40000 });
      const result = validationService.validate(outlier, comparables);

      const outlierWarning = result.warnings.find(w => w.field === 'listPrice');
      expect(outlierWarning?.message).toContain('%');
    });
  });

  describe('Cross-Validation with Loss Vehicle', () => {
    it('should warn about year differences', () => {
      const lossVehicle = createLossVehicle({ year: 2020 });
      const comparable = createValidComparable({ year: 2015 });
      const result = validationService.validate(comparable, undefined, lossVehicle);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'year',
          message: expect.stringContaining('differs by')
        })
      );
    });

    it('should warn about make differences', () => {
      const lossVehicle = createLossVehicle({ make: 'Toyota' });
      const comparable = createValidComparable({ make: 'Honda' });
      const result = validationService.validate(comparable, undefined, lossVehicle);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'make',
          message: expect.stringContaining('differs from loss vehicle')
        })
      );
    });

    it('should warn about model differences', () => {
      const lossVehicle = createLossVehicle({ model: 'Camry' });
      const comparable = createValidComparable({ model: 'Accord' });
      const result = validationService.validate(comparable, undefined, lossVehicle);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'model',
          message: expect.stringContaining('differs from loss vehicle')
        })
      );
    });

    it('should warn about significant mileage differences', () => {
      const lossVehicle = createLossVehicle({ mileage: 50000 });
      const comparable = createValidComparable({ mileage: 100000 });
      const result = validationService.validate(comparable, undefined, lossVehicle);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'mileage',
          message: expect.stringContaining('differs significantly')
        })
      );
    });

    it('should not warn about minor differences', () => {
      const lossVehicle = createLossVehicle({ year: 2020, make: 'Toyota', model: 'Camry', mileage: 50000 });
      const comparable = createValidComparable({ year: 2020, make: 'Toyota', model: 'Camry', mileage: 52000 });
      const result = validationService.validate(comparable, undefined, lossVehicle);

      // Should have no warnings about differences
      const differenceWarnings = result.warnings.filter(w => 
        w.message.includes('differs') || w.message.includes('difference')
      );
      expect(differenceWarnings).toHaveLength(0);
    });
  });

  describe('Multiple Comparable Validation', () => {
    it('should validate multiple comparables', () => {
      const comparables: ComparableVehicle[] = [
        { ...createValidComparable(), id: '1', appraisalId: 'test' } as ComparableVehicle,
        { ...createValidComparable({ mileage: -1000 }), id: '2', appraisalId: 'test' } as ComparableVehicle,
        { ...createValidComparable(), id: '3', appraisalId: 'test' } as ComparableVehicle,
      ];

      const results = validationService.validateMultiple(comparables);

      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[2].isValid).toBe(true);
    });

    it('should provide validation summary', () => {
      const comparables: ComparableVehicle[] = [
        { ...createValidComparable(), id: '1', appraisalId: 'test' } as ComparableVehicle,
        { ...createValidComparable({ mileage: -1000 }), id: '2', appraisalId: 'test' } as ComparableVehicle,
        { ...createValidComparable({ listPrice: 200 }), id: '3', appraisalId: 'test' } as ComparableVehicle,
      ];

      const summary = validationService.getValidationSummary(comparables);

      expect(summary.totalComparables).toBe(3);
      expect(summary.validComparables).toBe(1);
      expect(summary.totalErrors).toBeGreaterThan(0);
      expect(summary.criticalIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Suggested Actions', () => {
    it('should provide suggested actions for all errors', () => {
      const comparable = createValidComparable({ 
        year: 1980,
        mileage: -100,
        listPrice: 100,
        location: 'Invalid'
      });
      const result = validationService.validate(comparable);

      result.errors.forEach(error => {
        expect(error.suggestedAction).toBeDefined();
        expect(error.suggestedAction).not.toBe('');
      });
    });

    it('should provide suggested actions for warnings', () => {
      const comparable = createValidComparable({ 
        make: 'UnknownMake',
        mileage: 250000
      });
      const result = validationService.validate(comparable);

      result.warnings.forEach(warning => {
        if (warning.suggestedAction) {
          expect(warning.suggestedAction).not.toBe('');
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty comparable object', () => {
      const result = validationService.validate({});

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle null values', () => {
      const comparable = {
        source: null,
        year: null,
        make: null,
        model: null,
        mileage: null,
        listPrice: null,
        location: null,
        condition: null
      };
      const result = validationService.validate(comparable as any);

      expect(result.isValid).toBe(false);
    });

    it('should handle boundary values', () => {
      const currentYear = new Date().getFullYear();
      const comparable = createValidComparable({
        year: currentYear + 1, // Next model year
        mileage: 0,
        listPrice: 500 // Minimum price
      });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(true);
    });

    it('should handle very large numbers', () => {
      const comparable = createValidComparable({
        mileage: Number.MAX_SAFE_INTEGER
      });
      const result = validationService.validate(comparable);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should validate quickly for single comparable', () => {
      const comparable = createValidComparable();
      const start = Date.now();
      
      validationService.validate(comparable);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should validate multiple comparables efficiently', () => {
      const comparables: ComparableVehicle[] = Array.from({ length: 20 }, (_, i) => ({
        ...createValidComparable(),
        id: `${i}`,
        appraisalId: 'test'
      } as ComparableVehicle));

      const start = Date.now();
      
      validationService.validateMultiple(comparables);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Should complete in < 500ms for 20 comparables
    });
  });
});
