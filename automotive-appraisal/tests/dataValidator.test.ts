/**
 * Tests for Data Validator Service
 */

import { DataValidator } from '../src/main/services/dataValidator';

describe('DataValidator', () => {
  describe('validateVIN', () => {
    it('should validate correct VIN', () => {
      const result = DataValidator.validateVIN('1HGBH41JXMN109186');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should reject VIN with wrong length', () => {
      const result = DataValidator.validateVIN('1HGBH41JX');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('VIN must be exactly 17 characters');
      expect(result.confidence).toBe(0);
    });

    it('should warn about invalid characters (I, O, Q)', () => {
      const result = DataValidator.validateVIN('1HGBH41JXMN10918O');
      
      expect(result.warnings).toContain('VIN contains invalid characters (I, O, or Q) - may be OCR error');
      expect(result.confidence).toBeLessThan(100);
    });

    it('should reject VIN with special characters', () => {
      const result = DataValidator.validateVIN('1HGBH41JX-N109186');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('VIN contains invalid characters');
    });

    it('should warn about check digit validation failure', () => {
      // VIN with incorrect check digit
      const result = DataValidator.validateVIN('1HGBH41JXMN109187');
      
      expect(result.warnings.some(w => w.includes('check digit'))).toBe(true);
      expect(result.confidence).toBeLessThan(100);
    });

    it('should handle empty VIN', () => {
      const result = DataValidator.validateVIN('');
      
      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('validateYear', () => {
    it('should validate current year', () => {
      const currentYear = new Date().getFullYear();
      const result = DataValidator.validateYear(currentYear);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBe(100);
    });

    it('should validate reasonable past year', () => {
      const result = DataValidator.validateYear(2015);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBe(100);
    });

    it('should warn about very old vehicles', () => {
      const result = DataValidator.validateYear(1975);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Vehicle is very old - verify year is correct');
      expect(result.confidence).toBeLessThan(100);
    });

    it('should warn about future model years', () => {
      const nextYear = new Date().getFullYear() + 1;
      const result = DataValidator.validateYear(nextYear);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Future model year detected');
      expect(result.confidence).toBeLessThan(100);
    });

    it('should reject year before 1900', () => {
      const result = DataValidator.validateYear(1899);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('must be between'))).toBe(true);
    });

    it('should reject year too far in future', () => {
      const futureYear = new Date().getFullYear() + 5;
      const result = DataValidator.validateYear(futureYear);
      
      expect(result.isValid).toBe(false);
    });

    it('should reject invalid year', () => {
      const result = DataValidator.validateYear(NaN);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Year is required and must be a number');
    });
  });

  describe('validateMileage', () => {
    it('should validate reasonable mileage', () => {
      const result = DataValidator.validateMileage(50000, 2020);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative mileage', () => {
      const result = DataValidator.validateMileage(-1000, 2020);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mileage cannot be negative');
    });

    it('should warn about unusually low mileage', () => {
      const result = DataValidator.validateMileage(1000, 2010);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Mileage is unusually low for vehicle age');
      expect(result.confidence).toBeLessThan(100);
    });

    it('should warn about unusually high mileage', () => {
      const result = DataValidator.validateMileage(200000, 2020);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Mileage is unusually high for vehicle age');
      expect(result.confidence).toBeLessThan(100);
    });

    it('should warn about very high mileage', () => {
      const result = DataValidator.validateMileage(350000, 2010);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Very high mileage - verify accuracy');
    });

    it('should reject extremely high mileage', () => {
      const result = DataValidator.validateMileage(1000000, 2020);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mileage seems unreasonably high');
    });

    it('should reject invalid mileage', () => {
      const result = DataValidator.validateMileage(NaN, 2020);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mileage is required and must be a number');
    });
  });

  describe('validateMakeModel', () => {
    it('should validate known make and model', () => {
      const result = DataValidator.validateMakeModel('Honda', 'Accord');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBe(100);
    });

    it('should validate known make with different casing', () => {
      const result = DataValidator.validateMakeModel('honda', 'accord');
      
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe(100);
    });

    it('should warn about unknown make', () => {
      const result = DataValidator.validateMakeModel('UnknownMake', 'Model');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Make not in known manufacturers list - verify spelling');
      expect(result.confidence).toBeLessThan(100);
    });

    it('should warn about numbers in make', () => {
      const result = DataValidator.validateMakeModel('Honda123', 'Accord');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Make contains numbers - may be OCR error');
      expect(result.confidence).toBeLessThan(100);
    });

    it('should warn about short make', () => {
      const result = DataValidator.validateMakeModel('H', 'Accord');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Make seems too short - verify accuracy');
      expect(result.confidence).toBeLessThan(100);
    });

    it('should warn about short model', () => {
      const result = DataValidator.validateMakeModel('Honda', 'A');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Model seems too short - verify accuracy');
      expect(result.confidence).toBeLessThan(100);
    });

    it('should reject empty make', () => {
      const result = DataValidator.validateMakeModel('', 'Accord');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Make is required');
    });

    it('should reject empty model', () => {
      const result = DataValidator.validateMakeModel('Honda', '');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Model is required');
    });

    it('should validate multi-word makes', () => {
      const result = DataValidator.validateMakeModel('Mercedes-Benz', 'S-Class');
      
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe(100);
    });
  });

  describe('validateAll', () => {
    it('should validate all fields', () => {
      const data = {
        vin: '1HGBH41JXMN109186',
        year: 2020,
        make: 'Honda',
        model: 'Accord',
        mileage: 50000
      };
      
      const results = DataValidator.validateAll(data);
      
      expect(results.vin).toBeDefined();
      expect(results.year).toBeDefined();
      expect(results.mileage).toBeDefined();
      expect(results.makeModel).toBeDefined();
      
      expect(results.vin.isValid).toBe(true);
      expect(results.year.isValid).toBe(true);
      expect(results.mileage.isValid).toBe(true);
      expect(results.makeModel.isValid).toBe(true);
    });

    it('should handle partial data', () => {
      const data = {
        vin: '1HGBH41JXMN109186',
        year: 2020
      };
      
      const results = DataValidator.validateAll(data);
      
      expect(results.vin).toBeDefined();
      expect(results.year).toBeDefined();
      expect(results.mileage).toBeUndefined();
      expect(results.makeModel).toBeUndefined();
    });

    it('should handle empty data', () => {
      const results = DataValidator.validateAll({});
      
      expect(Object.keys(results)).toHaveLength(0);
    });
  });
});
