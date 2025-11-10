import { ComparableValidationService } from '../src/renderer/services/comparableValidation';
import type { ComparableVehicle, ExtractedVehicleData } from '../src/types';
import { ComparableValidationError } from '../src/types';

describe('ComparableValidationService', () => {
  let service: ComparableValidationService;
  let lossVehicle: ExtractedVehicleData;
  let validComparable: ComparableVehicle;

  beforeEach(() => {
    service = new ComparableValidationService();
    
    lossVehicle = {
      vin: '1HGBH41JXMN109186',
      year: 2015,
      make: 'Toyota',
      model: 'Camry',
      mileage: 50000,
      location: 'Los Angeles, CA',
      reportType: 'CCC_ONE',
      extractionConfidence: 0.95,
      extractionErrors: [],
      condition: 'Good',
      equipment: ['Navigation', 'Sunroof', 'Leather Seats']
    };

    validComparable = {
      id: 'comp-1',
      appraisalId: 'appraisal-1',
      source: 'AutoTrader',
      dateAdded: new Date(),
      year: 2015,
      make: 'Toyota',
      model: 'Camry',
      mileage: 50000,
      location: 'San Diego, CA',
      distanceFromLoss: 120,
      listPrice: 18000,
      condition: 'Good',
      equipment: ['Navigation', 'Sunroof', 'Leather Seats'],
      qualityScore: 95,
      qualityScoreBreakdown: {
        baseScore: 100,
        distancePenalty: 2,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 10,
        equipmentPenalty: 0,
        equipmentBonus: 15,
        finalScore: 95,
        explanations: {
          distance: '',
          age: '',
          mileage: '',
          equipment: ''
        }
      },
      adjustments: {
        mileageAdjustment: {
          mileageDifference: 0,
          depreciationRate: 0,
          adjustmentAmount: 0,
          explanation: ''
        },
        equipmentAdjustments: [],
        conditionAdjustment: {
          comparableCondition: 'Good',
          lossVehicleCondition: 'Good',
          multiplier: 1,
          adjustmentAmount: 0,
          explanation: ''
        },
        totalAdjustment: 0,
        adjustedPrice: 18000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('validate - Required Fields', () => {
    it('should pass validation for complete comparable', () => {
      const result = service.validate(validComparable);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when source is missing', () => {
      const incomplete = { ...validComparable, source: undefined as any };

      const result = service.validate(incomplete);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'source')).toBe(true);
      expect(result.errors.some(e => e.error === ComparableValidationError.MISSING_REQUIRED_FIELD)).toBe(true);
    });

    it('should fail validation when year is missing', () => {
      const incomplete = { ...validComparable, year: undefined as any };

      const result = service.validate(incomplete);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'year')).toBe(true);
    });

    it('should fail validation when make is missing', () => {
      const incomplete = { ...validComparable, make: undefined as any };

      const result = service.validate(incomplete);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'make')).toBe(true);
    });

    it('should fail validation when model is missing', () => {
      const incomplete = { ...validComparable, model: undefined as any };

      const result = service.validate(incomplete);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'model')).toBe(true);
    });

    it('should fail validation when mileage is missing', () => {
      const incomplete = { ...validComparable, mileage: undefined as any };

      const result = service.validate(incomplete);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'mileage')).toBe(true);
    });

    it('should fail validation when price is missing', () => {
      const incomplete = { ...validComparable, listPrice: undefined as any };

      const result = service.validate(incomplete);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'listPrice')).toBe(true);
    });

    it('should fail validation when location is missing', () => {
      const incomplete = { ...validComparable, location: undefined as any };

      const result = service.validate(incomplete);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'location')).toBe(true);
    });

    it('should fail validation when condition is missing', () => {
      const incomplete = { ...validComparable, condition: undefined as any };

      const result = service.validate(incomplete);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'condition')).toBe(true);
    });

    it('should provide suggested actions for missing fields', () => {
      const incomplete = { ...validComparable, year: undefined as any };

      const result = service.validate(incomplete);

      const yearError = result.errors.find(e => e.field === 'year');
      expect(yearError?.suggestedAction).toBeTruthy();
      expect(yearError?.suggestedAction).toContain('model year');
    });
  });

  describe('validate - Year', () => {
    it('should reject year before 1990', () => {
      const invalid = { ...validComparable, year: 1985 };

      const result = service.validate(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.error === ComparableValidationError.INVALID_YEAR)).toBe(true);
    });

    it('should reject year more than 2 years in future', () => {
      const futureYear = new Date().getFullYear() + 3;
      const invalid = { ...validComparable, year: futureYear };

      const result = service.validate(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.error === ComparableValidationError.INVALID_YEAR)).toBe(true);
    });

    it('should accept current year', () => {
      const currentYear = new Date().getFullYear();
      const valid = { ...validComparable, year: currentYear };

      const result = service.validate(valid);

      expect(result.isValid).toBe(true);
    });

    it('should accept next model year', () => {
      const nextYear = new Date().getFullYear() + 1;
      const valid = { ...validComparable, year: nextYear };

      const result = service.validate(valid);

      expect(result.isValid).toBe(true);
    });

    it('should warn about very old vehicles (before 2000)', () => {
      const old = { ...validComparable, year: 1995 };

      const result = service.validate(old);

      expect(result.warnings.some(w => w.field === 'year')).toBe(true);
      expect(result.warnings.some(w => w.message.includes('years old'))).toBe(true);
    });
  });

  describe('validate - Make', () => {
    it('should accept known makes', () => {
      const knownMakes = ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes-Benz'];

      knownMakes.forEach(make => {
        const comp = { ...validComparable, make };
        const result = service.validate(comp);
        expect(result.isValid).toBe(true);
      });
    });

    it('should warn about unknown makes', () => {
      const unknown = { ...validComparable, make: 'UnknownBrand' };

      const result = service.validate(unknown);

      expect(result.warnings.some(w => w.field === 'make')).toBe(true);
      expect(result.warnings.some(w => w.message.includes('not in the known manufacturers'))).toBe(true);
    });

    it('should be case-insensitive for known makes', () => {
      const lowercase = { ...validComparable, make: 'toyota' };

      const result = service.validate(lowercase);

      // Should not warn about unknown make
      expect(result.warnings.filter(w => w.field === 'make' && w.message.includes('not in the known')).length).toBe(0);
    });

    it('should warn about makes with numbers', () => {
      const withNumbers = { ...validComparable, make: 'Toyota123' };

      const result = service.validate(withNumbers);

      expect(result.warnings.some(w => w.field === 'make' && w.message.includes('contains numbers'))).toBe(true);
    });

    it('should warn about very short makes', () => {
      const short = { ...validComparable, make: 'T' };

      const result = service.validate(short);

      expect(result.warnings.some(w => w.field === 'make' && w.message.includes('too short'))).toBe(true);
    });
  });

  describe('validate - Model', () => {
    it('should warn when make and model are the same', () => {
      const duplicate = { ...validComparable, make: 'Camry', model: 'Camry' };

      const result = service.validate(duplicate);

      expect(result.warnings.some(w => w.field === 'model' && w.message.includes('appear to be the same'))).toBe(true);
    });

    it('should warn about very short model names', () => {
      const short = { ...validComparable, model: 'C' };

      const result = service.validate(short);

      expect(result.warnings.some(w => w.field === 'model' && w.message.includes('too short'))).toBe(true);
    });
  });

  describe('validate - Mileage', () => {
    it('should reject negative mileage', () => {
      const invalid = { ...validComparable, mileage: -1000 };

      const result = service.validate(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.error === ComparableValidationError.INVALID_MILEAGE)).toBe(true);
    });

    it('should reject mileage over 500,000', () => {
      const invalid = { ...validComparable, mileage: 600000 };

      const result = service.validate(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.error === ComparableValidationError.INVALID_MILEAGE)).toBe(true);
    });

    it('should accept zero mileage', () => {
      const valid = { ...validComparable, mileage: 0 };

      const result = service.validate(valid);

      expect(result.isValid).toBe(true);
    });

    it('should warn about high mileage (>200,000)', () => {
      const highMileage = { ...validComparable, mileage: 250000 };

      const result = service.validate(highMileage);

      expect(result.warnings.some(w => w.field === 'mileage' && w.message.includes('High mileage'))).toBe(true);
    });

    it('should warn about unrealistic mileage for vehicle age', () => {
      const currentYear = new Date().getFullYear();
      const unrealistic = {
        ...validComparable,
        year: currentYear - 2, // 2 years old
        mileage: 100000 // 50,000 miles/year
      };

      const result = service.validate(unrealistic);

      expect(result.warnings.some(w => w.field === 'mileage' && w.message.includes('seems high'))).toBe(true);
    });

    it('should warn about suspiciously low mileage on old vehicles', () => {
      const currentYear = new Date().getFullYear();
      const suspicious = {
        ...validComparable,
        year: currentYear - 10, // 10 years old
        mileage: 500 // Very low
      };

      const result = service.validate(suspicious);

      expect(result.warnings.some(w => w.field === 'mileage' && w.message.includes('Very low mileage'))).toBe(true);
    });

    it('should not warn about low mileage on new vehicles', () => {
      const currentYear = new Date().getFullYear();
      const newCar = {
        ...validComparable,
        year: currentYear,
        mileage: 100
      };

      const result = service.validate(newCar);

      expect(result.warnings.filter(w => w.field === 'mileage' && w.message.includes('low mileage')).length).toBe(0);
    });

    it('should warn about high mileage on new vehicles', () => {
      const currentYear = new Date().getFullYear();
      const newWithHighMiles = {
        ...validComparable,
        year: currentYear,
        mileage: 10000
      };

      const result = service.validate(newWithHighMiles);

      expect(result.warnings.some(w => w.field === 'mileage' && w.message.includes('High mileage'))).toBe(true);
    });
  });

  describe('validate - Price', () => {
    it('should reject price below $500', () => {
      const invalid = { ...validComparable, listPrice: 400 };

      const result = service.validate(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.error === ComparableValidationError.INVALID_PRICE)).toBe(true);
    });

    it('should reject price above $500,000', () => {
      const invalid = { ...validComparable, listPrice: 600000 };

      const result = service.validate(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.error === ComparableValidationError.INVALID_PRICE)).toBe(true);
    });

    it('should accept minimum valid price', () => {
      const valid = { ...validComparable, listPrice: 500 };

      const result = service.validate(valid);

      expect(result.isValid).toBe(true);
    });

    it('should warn about very low prices (<$2,000)', () => {
      const lowPrice = { ...validComparable, listPrice: 1500 };

      const result = service.validate(lowPrice);

      expect(result.warnings.some(w => w.field === 'listPrice' && w.message.includes('Very low price'))).toBe(true);
    });

    it('should warn about very high prices (>$100,000)', () => {
      const highPrice = { ...validComparable, listPrice: 150000 };

      const result = service.validate(highPrice);

      expect(result.warnings.some(w => w.field === 'listPrice' && w.message.includes('High-value vehicle'))).toBe(true);
    });
  });

  describe('validate - Location', () => {
    it('should accept valid "City, ST" format', () => {
      const validLocations = [
        'Los Angeles, CA',
        'New York, NY',
        'Chicago, IL',
        'Houston, TX'
      ];

      validLocations.forEach(location => {
        const comp = { ...validComparable, location };
        const result = service.validate(comp);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject location without comma', () => {
      const invalid = { ...validComparable, location: 'Los Angeles CA' };

      const result = service.validate(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.error === ComparableValidationError.INVALID_LOCATION)).toBe(true);
    });

    it('should reject location that is too short', () => {
      const invalid = { ...validComparable, location: 'LA' };

      const result = service.validate(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.error === ComparableValidationError.INVALID_LOCATION)).toBe(true);
    });

    it('should reject invalid state abbreviation', () => {
      const invalid = { ...validComparable, location: 'Los Angeles, California' };

      const result = service.validate(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.error === ComparableValidationError.INVALID_LOCATION)).toBe(true);
    });

    it('should accept lowercase state abbreviations', () => {
      const valid = { ...validComparable, location: 'Los Angeles, ca' };

      const result = service.validate(valid);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validate - Equipment', () => {
    it('should warn about duplicate equipment', () => {
      const duplicate = {
        ...validComparable,
        equipment: ['Navigation', 'Sunroof', 'Navigation']
      };

      const result = service.validate(duplicate);

      expect(result.warnings.some(w => w.field === 'equipment' && w.message.includes('Duplicate'))).toBe(true);
    });

    it('should warn about empty equipment list', () => {
      const empty = { ...validComparable, equipment: [] };

      const result = service.validate(empty);

      expect(result.warnings.some(w => w.field === 'equipment' && w.message.includes('No equipment'))).toBe(true);
    });

    it('should accept valid equipment list', () => {
      const valid = {
        ...validComparable,
        equipment: ['Navigation', 'Sunroof', 'Leather Seats', 'Heated Seats']
      };

      const result = service.validate(valid);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validate - Distance', () => {
    it('should warn about very far distances (>300 miles)', () => {
      const farAway = { ...validComparable, distanceFromLoss: 350 };

      const result = service.validate(farAway);

      expect(result.warnings.some(w => w.field === 'distanceFromLoss' && w.message.includes('very far'))).toBe(true);
    });

    it('should warn about moderately far distances (>150 miles)', () => {
      const moderatelyFar = { ...validComparable, distanceFromLoss: 180 };

      const result = service.validate(moderatelyFar);

      expect(result.warnings.some(w => w.field === 'distanceFromLoss' && w.message.includes('somewhat far'))).toBe(true);
    });

    it('should not warn about close distances', () => {
      const close = { ...validComparable, distanceFromLoss: 50 };

      const result = service.validate(close);

      expect(result.warnings.filter(w => w.field === 'distanceFromLoss').length).toBe(0);
    });
  });

  describe('validate - Against Loss Vehicle', () => {
    it('should warn when year differs by more than 3 years', () => {
      const differentYear = { ...validComparable, year: 2010 }; // 5 years difference

      const result = service.validate(differentYear, undefined, lossVehicle);

      expect(result.warnings.some(w => w.field === 'year' && w.message.includes('differs by'))).toBe(true);
    });

    it('should not warn when year is within 3 years', () => {
      const similarYear = { ...validComparable, year: 2017 }; // 2 years difference

      const result = service.validate(similarYear, undefined, lossVehicle);

      expect(result.warnings.filter(w => w.field === 'year' && w.message.includes('differs by')).length).toBe(0);
    });

    it('should warn when make differs', () => {
      const differentMake = { ...validComparable, make: 'Honda' };

      const result = service.validate(differentMake, undefined, lossVehicle);

      expect(result.warnings.some(w => w.field === 'make' && w.message.includes('differs from loss vehicle'))).toBe(true);
    });

    it('should warn when model differs', () => {
      const differentModel = { ...validComparable, model: 'Accord' };

      const result = service.validate(differentModel, undefined, lossVehicle);

      expect(result.warnings.some(w => w.field === 'model' && w.message.includes('differs from loss vehicle'))).toBe(true);
    });

    it('should warn when mileage differs significantly (>50%)', () => {
      const highMileage = { ...validComparable, mileage: 100000 }; // 100% difference

      const result = service.validate(highMileage, undefined, lossVehicle);

      expect(result.warnings.some(w => w.field === 'mileage' && w.message.includes('differs significantly'))).toBe(true);
    });

    it('should not warn when mileage is similar', () => {
      const similarMileage = { ...validComparable, mileage: 52000 }; // 4% difference

      const result = service.validate(similarMileage, undefined, lossVehicle);

      expect(result.warnings.filter(w => w.field === 'mileage' && w.message.includes('differs significantly')).length).toBe(0);
    });
  });

  describe('validate - Outlier Detection', () => {
    it('should warn about price outliers', () => {
      const allComparables = [
        { ...validComparable, id: 'comp-1', listPrice: 18000 },
        { ...validComparable, id: 'comp-2', listPrice: 19000 },
        { ...validComparable, id: 'comp-3', listPrice: 18500 }
      ];
      const outlier = { ...validComparable, listPrice: 30000 }; // Significantly higher

      const result = service.validate(outlier, allComparables);

      expect(result.warnings.some(w => w.field === 'listPrice' && w.message.includes('significantly'))).toBe(true);
    });

    it('should not warn when price is within normal range', () => {
      const allComparables = [
        { ...validComparable, id: 'comp-1', listPrice: 18000 },
        { ...validComparable, id: 'comp-2', listPrice: 19000 },
        { ...validComparable, id: 'comp-3', listPrice: 18500 }
      ];
      const normal = { ...validComparable, listPrice: 18700 };

      const result = service.validate(normal, allComparables);

      expect(result.warnings.filter(w => w.field === 'listPrice' && w.message.includes('significantly')).length).toBe(0);
    });

    it('should not perform outlier detection with fewer than 3 comparables', () => {
      const allComparables = [
        { ...validComparable, id: 'comp-1', listPrice: 18000 }
      ];
      const outlier = { ...validComparable, listPrice: 30000 };

      const result = service.validate(outlier, allComparables);

      // Should not warn about outlier with insufficient data
      expect(result.warnings.filter(w => w.field === 'listPrice' && w.message.includes('significantly')).length).toBe(0);
    });

    it('should not warn when all prices are identical', () => {
      const allComparables = [
        { ...validComparable, id: 'comp-1', listPrice: 18000 },
        { ...validComparable, id: 'comp-2', listPrice: 18000 },
        { ...validComparable, id: 'comp-3', listPrice: 18000 }
      ];
      const same = { ...validComparable, listPrice: 18000 };

      const result = service.validate(same, allComparables);

      expect(result.warnings.filter(w => w.field === 'listPrice' && w.message.includes('significantly')).length).toBe(0);
    });
  });

  describe('validateMultiple', () => {
    it('should validate multiple comparables', () => {
      const comparables = [
        validComparable,
        { ...validComparable, id: 'comp-2', listPrice: 19000 },
        { ...validComparable, id: 'comp-3', listPrice: 18500 }
      ];

      const results = service.validateMultiple(comparables, lossVehicle);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.isValid)).toBe(true);
    });

    it('should identify invalid comparables in batch', () => {
      const comparables = [
        validComparable,
        { ...validComparable, id: 'comp-2', year: undefined as any }, // Invalid
        { ...validComparable, id: 'comp-3', listPrice: 19000 }
      ];

      const results = service.validateMultiple(comparables, lossVehicle);

      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[2].isValid).toBe(true);
    });
  });

  describe('getValidationSummary', () => {
    it('should provide summary for all valid comparables', () => {
      const comparables = [
        validComparable,
        { ...validComparable, id: 'comp-2', listPrice: 19000 },
        { ...validComparable, id: 'comp-3', listPrice: 18500 }
      ];

      const summary = service.getValidationSummary(comparables, lossVehicle);

      expect(summary.totalComparables).toBe(3);
      expect(summary.validComparables).toBe(3);
      expect(summary.totalErrors).toBe(0);
      expect(summary.criticalIssues).toHaveLength(0);
    });

    it('should count errors and warnings correctly', () => {
      const comparables = [
        validComparable,
        { ...validComparable, id: 'comp-2', year: undefined as any }, // Error
        { ...validComparable, id: 'comp-3', make: 'UnknownMake' } // Warning
      ];

      const summary = service.getValidationSummary(comparables, lossVehicle);

      expect(summary.totalComparables).toBe(3);
      expect(summary.validComparables).toBe(2);
      expect(summary.totalErrors).toBeGreaterThan(0);
      expect(summary.totalWarnings).toBeGreaterThan(0);
    });

    it('should list critical issues', () => {
      const comparables = [
        validComparable,
        { ...validComparable, id: 'comp-2', year: undefined as any, make: undefined as any }
      ];

      const summary = service.getValidationSummary(comparables, lossVehicle);

      expect(summary.criticalIssues.length).toBeGreaterThan(0);
      expect(summary.criticalIssues[0]).toContain('Comparable 2');
    });

    it('should handle empty comparable list', () => {
      const summary = service.getValidationSummary([], lossVehicle);

      expect(summary.totalComparables).toBe(0);
      expect(summary.validComparables).toBe(0);
      expect(summary.totalErrors).toBe(0);
      expect(summary.totalWarnings).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial comparable for form validation', () => {
      const partial: Partial<ComparableVehicle> = {
        year: 2015,
        make: 'Toyota'
      };

      const result = service.validate(partial);

      // Should have errors for missing required fields
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle comparable with all optional fields missing', () => {
      const minimal: Partial<ComparableVehicle> = {
        source: 'AutoTrader',
        year: 2015,
        make: 'Toyota',
        model: 'Camry',
        mileage: 50000,
        listPrice: 18000,
        location: 'Los Angeles, CA',
        condition: 'Good'
      };

      const result = service.validate(minimal);

      expect(result.isValid).toBe(true);
    });

    it('should handle validation without loss vehicle', () => {
      const result = service.validate(validComparable);

      expect(result.isValid).toBe(true);
      // Should not have warnings about differences from loss vehicle
      expect(result.warnings.filter(w => w.message.includes('loss vehicle')).length).toBe(0);
    });

    it('should handle validation without other comparables', () => {
      const result = service.validate(validComparable, undefined, lossVehicle);

      expect(result.isValid).toBe(true);
      // Should not have outlier warnings
      expect(result.warnings.filter(w => w.message.includes('significantly')).length).toBe(0);
    });
  });
});
