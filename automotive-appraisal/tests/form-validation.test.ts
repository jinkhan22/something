import { describe, it, expect } from '@jest/globals';
import {
  validateVIN,
  validateYear,
  validateMileage,
  validatePrice,
  validateLocation,
  validateMakeModel,
  validateURL,
  validateField,
  validateFields,
  hasValidationErrors,
  getFirstError
} from '../src/renderer/utils/formValidation';

describe('Form Validation Utilities', () => {
  describe('validateVIN', () => {
    it('should validate correct VIN', () => {
      const result = validateVIN('1HGBH41JXMN109186');
      expect(result.valid).toBe(true);
    });

    it('should reject empty VIN', () => {
      const result = validateVIN('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
      expect(result.suggestion).toBeDefined();
    });

    it('should reject VIN with wrong length', () => {
      const result = validateVIN('1HGBH41JX');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('17 characters');
    });

    it('should reject VIN with invalid characters (I, O, Q)', () => {
      const result = validateVIN('1HGBH41JXMN10918I');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid characters');
      expect(result.suggestion).toContain('I, O, or Q');
    });
  });

  describe('validateYear', () => {
    const currentYear = new Date().getFullYear();

    it('should validate current year', () => {
      const result = validateYear(currentYear);
      expect(result.valid).toBe(true);
    });

    it('should validate year as string', () => {
      const result = validateYear('2020');
      expect(result.valid).toBe(true);
    });

    it('should reject empty year', () => {
      const result = validateYear('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject year before 1900', () => {
      const result = validateYear(1899);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too old');
    });

    it('should reject future year', () => {
      const result = validateYear(currentYear + 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be later');
    });

    it('should warn about classic vehicles', () => {
      const result = validateYear(1975);
      expect(result.valid).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.error).toContain('classic');
    });

    it('should reject non-numeric year', () => {
      const result = validateYear('abc');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid number');
    });
  });

  describe('validateMileage', () => {
    it('should validate normal mileage', () => {
      const result = validateMileage(50000);
      expect(result.valid).toBe(true);
    });

    it('should validate mileage as string', () => {
      const result = validateMileage('50,000');
      expect(result.valid).toBe(true);
    });

    it('should reject empty mileage', () => {
      const result = validateMileage('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject negative mileage', () => {
      const result = validateMileage(-100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be negative');
    });

    it('should reject extremely high mileage', () => {
      const result = validateMileage(1500000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should validate mileage with context', () => {
      const result = validateMileage(100000, { year: 2020 });
      expect(result.valid).toBe(true);
    });

    it('should warn about high mileage for age', () => {
      const result = validateMileage(150000, { year: 2020 });
      expect(result.valid).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.error).toContain('High mileage');
    });

    it('should reject extremely high mileage for age', () => {
      const result = validateMileage(300000, { year: 2020 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Extremely high');
    });

    it('should warn about unusually low mileage', () => {
      const result = validateMileage(50, { year: 2015 });
      expect(result.valid).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.error).toContain('low mileage');
    });
  });

  describe('validatePrice', () => {
    it('should validate normal price', () => {
      const result = validatePrice(25000);
      expect(result.valid).toBe(true);
    });

    it('should validate price as string with formatting', () => {
      const result = validatePrice('$25,000.00');
      expect(result.valid).toBe(true);
    });

    it('should reject empty price', () => {
      const result = validatePrice('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject negative price', () => {
      const result = validatePrice(-1000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be negative');
    });

    it('should reject price below minimum', () => {
      const result = validatePrice(50, { min: 100 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too low');
    });

    it('should reject price above maximum', () => {
      const result = validatePrice(15000000, { max: 10000000 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should warn about unusually low price', () => {
      const result = validatePrice(300);
      expect(result.valid).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.error).toContain('unusually low');
    });

    it('should warn about very high price', () => {
      const result = validatePrice(750000);
      expect(result.valid).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.error).toContain('very high');
    });

    it('should use custom field name in error', () => {
      const result = validatePrice('', { fieldName: 'Market Value' });
      expect(result.error).toContain('Market Value');
    });
  });

  describe('validateLocation', () => {
    it('should validate correct location format', () => {
      const result = validateLocation('Los Angeles, CA');
      expect(result.valid).toBe(true);
    });

    it('should validate location with periods in city name', () => {
      const result = validateLocation('St. Louis, MO');
      expect(result.valid).toBe(true);
    });

    it('should reject empty location', () => {
      const result = validateLocation('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject location without comma', () => {
      const result = validateLocation('Los Angeles CA');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format is incorrect');
      expect(result.suggestion).toContain('City, ST');
    });

    it('should reject location with invalid state code', () => {
      const result = validateLocation('Los Angeles, California');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('2-letter');
    });

    it('should reject location with too many parts', () => {
      const result = validateLocation('Los Angeles, CA, USA');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too many parts');
    });
  });

  describe('validateMakeModel', () => {
    it('should validate correct make', () => {
      const result = validateMakeModel('Toyota', 'Make');
      expect(result.valid).toBe(true);
    });

    it('should validate correct model', () => {
      const result = validateMakeModel('Camry', 'Model');
      expect(result.valid).toBe(true);
    });

    it('should reject empty make', () => {
      const result = validateMakeModel('', 'Make');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Make is required');
    });

    it('should reject too short make', () => {
      const result = validateMakeModel('T', 'Make');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should reject too long make', () => {
      const result = validateMakeModel('A'.repeat(51), 'Make');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should warn about numbers in make', () => {
      const result = validateMakeModel('BMW3', 'Make');
      expect(result.valid).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.error).toContain('contains numbers');
    });
  });

  describe('validateURL', () => {
    it('should validate correct URL', () => {
      const result = validateURL('https://example.com');
      expect(result.valid).toBe(true);
    });

    it('should validate URL with path', () => {
      const result = validateURL('https://example.com/path/to/page');
      expect(result.valid).toBe(true);
    });

    it('should allow empty URL when not required', () => {
      const result = validateURL('', false);
      expect(result.valid).toBe(true);
    });

    it('should reject empty URL when required', () => {
      const result = validateURL('', true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject invalid URL format', () => {
      const result = validateURL('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid');
    });
  });

  describe('validateField', () => {
    it('should validate required field', () => {
      const result = validateField('test', { required: true }, 'Test Field');
      expect(result.valid).toBe(true);
    });

    it('should reject empty required field', () => {
      const result = validateField('', { required: true }, 'Test Field');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should validate minLength', () => {
      const result = validateField('test', { minLength: 3 }, 'Test Field');
      expect(result.valid).toBe(true);
    });

    it('should reject value below minLength', () => {
      const result = validateField('ab', { minLength: 3 }, 'Test Field');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should validate maxLength', () => {
      const result = validateField('test', { maxLength: 10 }, 'Test Field');
      expect(result.valid).toBe(true);
    });

    it('should reject value above maxLength', () => {
      const result = validateField('test'.repeat(10), { maxLength: 10 }, 'Test Field');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should validate numeric min', () => {
      const result = validateField(10, { min: 5 }, 'Test Field');
      expect(result.valid).toBe(true);
    });

    it('should reject value below min', () => {
      const result = validateField(3, { min: 5 }, 'Test Field');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should validate numeric max', () => {
      const result = validateField(10, { max: 20 }, 'Test Field');
      expect(result.valid).toBe(true);
    });

    it('should reject value above max', () => {
      const result = validateField(25, { max: 20 }, 'Test Field');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most');
    });

    it('should validate pattern', () => {
      const result = validateField('test@example.com', { pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/ }, 'Email');
      expect(result.valid).toBe(true);
    });

    it('should reject value not matching pattern', () => {
      const result = validateField('invalid-email', { pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/ }, 'Email');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format is invalid');
    });

    it('should use custom validation', () => {
      const customValidator = (value: any) => {
        if (value === 'forbidden') {
          return { valid: false, error: 'This value is forbidden', severity: 'error' as const };
        }
        return { valid: true };
      };

      const result = validateField('forbidden', { custom: customValidator }, 'Test Field');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('forbidden');
    });
  });

  describe('validateFields', () => {
    it('should validate multiple fields', () => {
      const data = {
        name: 'John',
        age: 25,
        email: 'john@example.com'
      };

      const rules = {
        name: { required: true, minLength: 2 },
        age: { required: true, min: 18 },
        email: { required: true, pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/ }
      };

      const results = validateFields(data, rules);
      expect(results.name.valid).toBe(true);
      expect(results.age.valid).toBe(true);
      expect(results.email.valid).toBe(true);
    });

    it('should return errors for invalid fields', () => {
      const data = {
        name: 'J',
        age: 15,
        email: 'invalid'
      };

      const rules = {
        name: { required: true, minLength: 2 },
        age: { required: true, min: 18 },
        email: { required: true, pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/ }
      };

      const results = validateFields(data, rules);
      expect(results.name.valid).toBe(false);
      expect(results.age.valid).toBe(false);
      expect(results.email.valid).toBe(false);
    });
  });

  describe('hasValidationErrors', () => {
    it('should return false when no errors', () => {
      const results = {
        field1: { valid: true },
        field2: { valid: true }
      };
      expect(hasValidationErrors(results)).toBe(false);
    });

    it('should return true when errors exist', () => {
      const results = {
        field1: { valid: true },
        field2: { valid: false, error: 'Error' }
      };
      expect(hasValidationErrors(results)).toBe(true);
    });
  });

  describe('getFirstError', () => {
    it('should return null when no errors', () => {
      const results = {
        field1: { valid: true },
        field2: { valid: true }
      };
      expect(getFirstError(results)).toBeNull();
    });

    it('should return first error', () => {
      const results = {
        field1: { valid: true },
        field2: { valid: false, error: 'Error 2' },
        field3: { valid: false, error: 'Error 3' }
      };
      const firstError = getFirstError(results);
      expect(firstError).not.toBeNull();
      expect(firstError?.field).toBe('field2');
      expect(firstError?.result.error).toBe('Error 2');
    });
  });
});
