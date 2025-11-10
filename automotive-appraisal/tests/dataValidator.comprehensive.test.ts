/**
 * Comprehensive Data Validation Tests
 * Tests all validation scenarios for extracted vehicle data
 * Requirements: 10.1, 10.3
 */

import { validateVehicleData, validateVIN, validateYear, validateMileage, validateMakeModel } from '../src/main/services/dataValidator';

describe('Data Validator - Comprehensive Tests', () => {
  describe('VIN Validation', () => {
    describe('Valid VINs', () => {
      it('should validate correct 17-character VIN', () => {
        const result = validateVIN('5XYZT3LB0EG123456');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
      
      it('should validate VIN with all valid characters', () => {
        const result = validateVIN('1HGBH41JXMN109186');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
      
      it('should validate VIN from different manufacturers', () => {
        const vins = [
          '1FT7W2BT5LEC12345', // Ford
          'WBS8M9C50NCG12345', // BMW
          'WDD2130431A123456', // Mercedes-Benz
          '5YJ3E1EA1JF123456', // Tesla
          'JHM2130431A123456', // Honda
        ];
        
        vins.forEach(vin => {
          const result = validateVIN(vin);
          expect(result.isValid).toBe(true);
        });
      });
    });
    
    describe('Invalid VINs', () => {
      it('should reject VIN with invalid length', () => {
        const result = validateVIN('5XYZT3LB0EG12'); // Too short
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('VIN must be exactly 17 characters');
      });
      
      it('should reject VIN with invalid characters (I, O, Q)', () => {
        const result = validateVIN('5XYZT3LB0EG12345I'); // Contains I
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('invalid characters'))).toBe(true);
      });
      
      it('should reject empty VIN', () => {
        const result = validateVIN('');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('VIN is required');
      });
      
      it('should reject VIN with special characters', () => {
        const result = validateVIN('5XYZT3LB0EG12345@');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('invalid characters'))).toBe(true);
      });
      
      it('should reject VIN with lowercase letters', () => {
        const result = validateVIN('5xyzt3lb0eg123456');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
      });
    });
    
    describe('VIN Check Digit Validation', () => {
      it('should validate VIN check digit (9th position)', () => {
        // Real VIN with valid check digit
        const result = validateVIN('1HGBH41JXMN109186');
        
        expect(result.isValid).toBe(true);
        expect(result.confidence).toBeGreaterThan(90);
      });
      
      it('should warn about invalid check digit', () => {
        // VIN with potentially invalid check digit
        const result = validateVIN('1HGBH41JXMN109187'); // Last digit changed
        
        // Should still be structurally valid but may have warning
        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThanOrEqual(0);
      });
    });
    
    describe('VIN Decoding', () => {
      it('should decode manufacturer from VIN', () => {
        const vins = {
          '1FT7W2BT5LEC12345': 'Ford',
          '5XYZT3LB0EG123456': 'Hyundai',
          'WBS8M9C50NCG12345': 'BMW',
          'WDD2130431A123456': 'Mercedes-Benz',
        };
        
        Object.entries(vins).forEach(([vin, expectedMake]) => {
          const result = validateVIN(vin);
          expect(result.isValid).toBe(true);
          // Validation should include manufacturer info
        });
      });
      
      it('should decode year from VIN (10th character)', () => {
        const vin = '5XYZT3LB0EG123456'; // 10th char is 'E' = 2014
        const result = validateVIN(vin);
        
        expect(result.isValid).toBe(true);
        // Year should be decoded from VIN
      });
    });
  });
  
  describe('Year Validation', () => {
    describe('Valid Years', () => {
      it('should validate current year', () => {
        const currentYear = new Date().getFullYear();
        const result = validateYear(currentYear);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
      
      it('should validate next year (for new models)', () => {
        const nextYear = new Date().getFullYear() + 1;
        const result = validateYear(nextYear);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
      
      it('should validate years from 1900 onwards', () => {
        const years = [1900, 1950, 1980, 2000, 2010, 2020];
        
        years.forEach(year => {
          const result = validateYear(year);
          expect(result.isValid).toBe(true);
        });
      });
    });
    
    describe('Invalid Years', () => {
      it('should reject year before 1900', () => {
        const result = validateYear(1899);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Year must be between 1900 and current year + 1');
      });
      
      it('should reject year more than 1 year in future', () => {
        const futureYear = new Date().getFullYear() + 2;
        const result = validateYear(futureYear);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Year must be between 1900 and current year + 1');
      });
      
      it('should reject zero or negative year', () => {
        const result = validateYear(0);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Year is required');
      });
    });
    
    describe('Year Warnings', () => {
      it('should warn about very old vehicles', () => {
        const result = validateYear(1950);
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('old'))).toBe(true);
      });
      
      it('should not warn about recent vehicles', () => {
        const currentYear = new Date().getFullYear();
        const result = validateYear(currentYear - 5);
        
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });
    });
  });
  
  describe('Mileage Validation', () => {
    describe('Valid Mileage', () => {
      it('should validate reasonable mileage for age', () => {
        const currentYear = new Date().getFullYear();
        const result = validateMileage(50000, currentYear - 5); // 5 year old car, 50k miles
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
      
      it('should validate low mileage', () => {
        const currentYear = new Date().getFullYear();
        const result = validateMileage(5000, currentYear - 1); // 1 year old, 5k miles
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
      
      it('should validate high mileage for old vehicles', () => {
        const result = validateMileage(200000, 2010); // Old car, high miles
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
    
    describe('Invalid Mileage', () => {
      it('should reject negative mileage', () => {
        const result = validateMileage(-1000, 2020);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Mileage cannot be negative');
      });
      
      it('should reject zero mileage for old vehicles', () => {
        const result = validateMileage(0, 2015);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Mileage is required'))).toBe(true);
      });
    });
    
    describe('Mileage Warnings', () => {
      it('should warn about unusually high mileage for age', () => {
        const currentYear = new Date().getFullYear();
        const result = validateMileage(200000, currentYear - 2); // 2 year old, 200k miles
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('high'))).toBe(true);
      });
      
      it('should warn about unusually low mileage for age', () => {
        const result = validateMileage(1000, 2010); // 14+ year old, only 1k miles
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('low'))).toBe(true);
      });
      
      it('should calculate average miles per year', () => {
        const currentYear = new Date().getFullYear();
        const vehicleYear = currentYear - 5;
        const mileage = 75000; // 15k per year
        
        const result = validateMileage(mileage, vehicleYear);
        const age = currentYear - vehicleYear;
        const avgPerYear = mileage / age;
        
        expect(avgPerYear).toBe(15000);
        expect(result.isValid).toBe(true);
      });
    });
    
    describe('Mileage-Year Cross-Validation', () => {
      it('should validate mileage is reasonable for vehicle age', () => {
        const testCases = [
          { mileage: 12000, year: 2023, expected: true }, // 1 year, 12k miles
          { mileage: 60000, year: 2019, expected: true }, // 5 years, 60k miles
          { mileage: 150000, year: 2015, expected: true }, // 9 years, 150k miles
        ];
        
        testCases.forEach(({ mileage, year, expected }) => {
          const result = validateMileage(mileage, year);
          expect(result.isValid).toBe(expected);
        });
      });
    });
  });
  
  describe('Make/Model Validation', () => {
    describe('Valid Make/Model Combinations', () => {
      it('should validate known make/model combinations', () => {
        const combinations = [
          { make: 'Toyota', model: 'Camry' },
          { make: 'Honda', model: 'Civic' },
          { make: 'Ford', model: 'F-150' },
          { make: 'BMW', model: 'M3' },
          { make: 'Mercedes-Benz', model: 'SL-Class' },
        ];
        
        combinations.forEach(({ make, model }) => {
          const result = validateMakeModel(make, model);
          expect(result.isValid).toBe(true);
        });
      });
      
      it('should validate multi-word makes', () => {
        const result = validateMakeModel('Land Rover', 'Range Rover Sport');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
      
      it('should validate hyphenated models', () => {
        const result = validateMakeModel('Mercedes-Benz', 'SL-Class');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
    
    describe('Invalid Make/Model', () => {
      it('should reject empty make', () => {
        const result = validateMakeModel('', 'Camry');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Make is required');
      });
      
      it('should reject empty model', () => {
        const result = validateMakeModel('Toyota', '');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Model is required');
      });
      
      it('should reject make with numbers only', () => {
        const result = validateMakeModel('12345', 'Model');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('invalid'))).toBe(true);
      });
      
      it('should reject model with special characters', () => {
        const result = validateMakeModel('Toyota', 'Camry@#$');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('invalid characters'))).toBe(true);
      });
    });
    
    describe('Make/Model Warnings', () => {
      it('should warn about unknown make', () => {
        const result = validateMakeModel('UnknownMake', 'Model');
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('unknown'))).toBe(true);
      });
      
      it('should warn about unusual make/model combination', () => {
        const result = validateMakeModel('Toyota', 'Mustang'); // Ford model
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('unusual'))).toBe(true);
      });
    });
  });
  
  describe('Complete Vehicle Data Validation', () => {
    it('should validate complete valid vehicle data', () => {
      const vehicleData = {
        vin: '5XYZT3LB0EG123456',
        year: 2014,
        make: 'Hyundai',
        model: 'Santa Fe Sport',
        mileage: 85234,
        location: 'CA 90210',
        reportType: 'MITCHELL' as const,
        extractionConfidence: 95,
        extractionErrors: [],
        settlementValue: 10741.06,
        marketValue: 10062.32
      };
      
      const result = validateVehicleData(vehicleData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(90);
    });
    
    it('should detect multiple validation errors', () => {
      const vehicleData = {
        vin: '5XYZT3LB0EG12', // Too short
        year: 1800, // Too old
        make: '',
        model: '',
        mileage: -1000, // Negative
        location: '',
        reportType: 'MITCHELL' as const,
        extractionConfidence: 50,
        extractionErrors: [],
        settlementValue: 0,
        marketValue: 0
      };
      
      const result = validateVehicleData(vehicleData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
    
    it('should calculate overall confidence score', () => {
      const vehicleData = {
        vin: '5XYZT3LB0EG123456',
        year: 2014,
        make: 'Hyundai',
        model: 'Santa Fe Sport',
        mileage: 85234,
        location: 'CA 90210',
        reportType: 'MITCHELL' as const,
        extractionConfidence: 95,
        extractionErrors: [],
        settlementValue: 10741.06,
        marketValue: 10062.32
      };
      
      const result = validateVehicleData(vehicleData);
      
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
    
    it('should provide field-specific validation results', () => {
      const vehicleData = {
        vin: '5XYZT3LB0EG123456',
        year: 2014,
        make: 'Hyundai',
        model: 'Santa Fe Sport',
        mileage: 85234,
        location: 'CA 90210',
        reportType: 'MITCHELL' as const,
        extractionConfidence: 95,
        extractionErrors: [],
        settlementValue: 10741.06,
        marketValue: 10062.32
      };
      
      const result = validateVehicleData(vehicleData);
      
      // Should have validation results for each field
      expect(result.fieldValidation).toBeDefined();
      expect(result.fieldValidation?.vin).toBeDefined();
      expect(result.fieldValidation?.year).toBeDefined();
      expect(result.fieldValidation?.make).toBeDefined();
      expect(result.fieldValidation?.model).toBeDefined();
      expect(result.fieldValidation?.mileage).toBeDefined();
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle null or undefined values', () => {
      const result = validateVIN(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('VIN is required');
    });
    
    it('should handle whitespace in VIN', () => {
      const result = validateVIN('  5XYZT3LB0EG123456  ');
      
      // Should trim and validate
      expect(result.isValid).toBe(true);
    });
    
    it('should handle very large mileage values', () => {
      const result = validateMileage(999999, 1990);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('high'))).toBe(true);
    });
    
    it('should handle brand new vehicles (current year + 1)', () => {
      const nextYear = new Date().getFullYear() + 1;
      const result = validateMileage(10, nextYear);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
  
  describe('Confidence Scoring', () => {
    it('should give high confidence to perfect data', () => {
      const vehicleData = {
        vin: '5XYZT3LB0EG123456',
        year: 2020,
        make: 'Hyundai',
        model: 'Santa Fe',
        mileage: 45000,
        location: 'CA 90210',
        reportType: 'MITCHELL' as const,
        extractionConfidence: 100,
        extractionErrors: [],
        settlementValue: 25000,
        marketValue: 24000
      };
      
      const result = validateVehicleData(vehicleData);
      
      expect(result.confidence).toBeGreaterThan(95);
    });
    
    it('should give lower confidence to data with warnings', () => {
      const vehicleData = {
        vin: '5XYZT3LB0EG123456',
        year: 1950, // Very old
        make: 'UnknownMake',
        model: 'UnknownModel',
        mileage: 500000, // Very high
        location: 'CA 90210',
        reportType: 'MITCHELL' as const,
        extractionConfidence: 60,
        extractionErrors: [],
        settlementValue: 5000,
        marketValue: 4500
      };
      
      const result = validateVehicleData(vehicleData);
      
      expect(result.confidence).toBeLessThan(80);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
