/**
 * Data Validation Service
 * Validates extracted vehicle data using industry standards
 */

import { ValidationResult } from '../../types';

/**
 * VIN validation using check digit algorithm
 */
function validateVINCheckDigit(vin: string): boolean {
  if (vin.length !== 17) return false;
  
  // VIN weight factors
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  
  // Character to value mapping
  const charValues: Record<string, number> = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
    'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9
  };
  
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = vin[i].toUpperCase();
    const value = charValues[char];
    
    if (value === undefined) return false;
    sum += value * weights[i];
  }
  
  const checkDigit = sum % 11;
  const expectedChar = checkDigit === 10 ? 'X' : checkDigit.toString();
  
  return vin[8].toUpperCase() === expectedChar;
}

/**
 * Data Validator Class
 */
export class DataValidator {
  /**
   * Validate VIN format and check digit
   */
  static validateVIN(vin: string): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let confidence = 100;
    
    // Check length
    if (!vin || vin.length !== 17) {
      errors.push('VIN must be exactly 17 characters');
      return {
        field: 'vin',
        isValid: false,
        warnings,
        errors,
        confidence: 0
      };
    }
    
    // Check for invalid characters (I, O, Q not allowed in VINs)
    if (/[IOQ]/i.test(vin)) {
      warnings.push('VIN contains invalid characters (I, O, or Q) - may be OCR error');
      confidence -= 30;
    }
    
    // Check format (alphanumeric only)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) {
      errors.push('VIN contains invalid characters');
      return {
        field: 'vin',
        isValid: false,
        warnings,
        errors,
        confidence: 0
      };
    }
    
    // Validate check digit
    if (!validateVINCheckDigit(vin)) {
      warnings.push('VIN check digit validation failed - may indicate OCR error');
      confidence -= 40;
    }
    
    return {
      field: 'vin',
      isValid: errors.length === 0,
      warnings,
      errors,
      confidence
    };
  }
  
  /**
   * Validate year is within reasonable range
   */
  static validateYear(year: number): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let confidence = 100;
    
    const currentYear = new Date().getFullYear();
    const minYear = 1900;
    const maxYear = currentYear + 2; // Allow next model year
    
    if (!year || isNaN(year)) {
      errors.push('Year is required and must be a number');
      return {
        field: 'year',
        isValid: false,
        warnings,
        errors,
        confidence: 0
      };
    }
    
    if (year < minYear || year > maxYear) {
      errors.push(`Year must be between ${minYear} and ${maxYear}`);
      return {
        field: 'year',
        isValid: false,
        warnings,
        errors,
        confidence: 0
      };
    }
    
    // Warn about very old vehicles
    if (year < 1980) {
      warnings.push('Vehicle is very old - verify year is correct');
      confidence -= 20;
    }
    
    // Warn about future model years
    if (year > currentYear) {
      warnings.push('Future model year detected');
      confidence -= 10;
    }
    
    return {
      field: 'year',
      isValid: true,
      warnings,
      errors,
      confidence
    };
  }
  
  /**
   * Validate mileage is reasonable for vehicle age
   */
  static validateMileage(mileage: number, year: number): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let confidence = 100;
    
    if (!mileage || isNaN(mileage)) {
      errors.push('Mileage is required and must be a number');
      return {
        field: 'mileage',
        isValid: false,
        warnings,
        errors,
        confidence: 0
      };
    }
    
    if (mileage < 0) {
      errors.push('Mileage cannot be negative');
      return {
        field: 'mileage',
        isValid: false,
        warnings,
        errors,
        confidence: 0
      };
    }
    
    if (mileage > 999999) {
      errors.push('Mileage seems unreasonably high');
      confidence -= 50;
    }
    
    // Check mileage vs age
    if (year) {
      const currentYear = new Date().getFullYear();
      const vehicleAge = currentYear - year;
      const averageMilesPerYear = 12000;
      const expectedMileage = vehicleAge * averageMilesPerYear;
      
      // Very low mileage for age
      if (mileage < expectedMileage * 0.1 && vehicleAge > 2) {
        warnings.push('Mileage is unusually low for vehicle age');
        confidence -= 20;
      }
      
      // Very high mileage for age
      if (mileage > expectedMileage * 3 && vehicleAge > 0) {
        warnings.push('Mileage is unusually high for vehicle age');
        confidence -= 20;
      }
      
      // Extremely high mileage
      if (mileage > 300000) {
        warnings.push('Very high mileage - verify accuracy');
        confidence -= 10;
      }
    }
    
    return {
      field: 'mileage',
      isValid: errors.length === 0,
      warnings,
      errors,
      confidence
    };
  }
  
  /**
   * Validate make/model combination
   */
  static validateMakeModel(make: string, model: string): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let confidence = 100;
    
    if (!make || make.trim().length === 0) {
      errors.push('Make is required');
      return {
        field: 'makeModel',
        isValid: false,
        warnings,
        errors,
        confidence: 0
      };
    }
    
    if (!model || model.trim().length === 0) {
      errors.push('Model is required');
      return {
        field: 'makeModel',
        isValid: false,
        warnings,
        errors,
        confidence: 0
      };
    }
    
    // Check for suspiciously short values
    if (make.length < 2) {
      warnings.push('Make seems too short - verify accuracy');
      confidence -= 30;
    }
    
    if (model.length < 2) {
      warnings.push('Model seems too short - verify accuracy');
      confidence -= 30;
    }
    
    // Check for common OCR errors (numbers in make)
    if (/\d/.test(make)) {
      warnings.push('Make contains numbers - may be OCR error');
      confidence -= 20;
    }
    
    // Known manufacturer validation
    const knownMakes = [
      'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler',
      'Dodge', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar',
      'Jeep', 'Kia', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mercedes',
      'Mitsubishi', 'Nissan', 'Porsche', 'Ram', 'Subaru', 'Tesla', 'Toyota',
      'Volkswagen', 'Volvo', 'Aston Martin', 'Bentley', 'Ferrari', 'Lamborghini',
      'Land Rover', 'Maserati', 'McLaren', 'Rolls-Royce', 'Alfa Romeo'
    ];
    
    const makeMatch = knownMakes.find(
      known => known.toLowerCase() === make.toLowerCase()
    );
    
    if (!makeMatch) {
      warnings.push('Make not in known manufacturers list - verify spelling');
      confidence -= 15;
    }
    
    return {
      field: 'makeModel',
      isValid: errors.length === 0,
      warnings,
      errors,
      confidence
    };
  }
  
  /**
   * Validate all fields in extracted data
   */
  static validateAll(data: {
    vin?: string;
    year?: number;
    make?: string;
    model?: string;
    mileage?: number;
  }): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};
    
    if (data.vin) {
      results.vin = this.validateVIN(data.vin);
    }
    
    if (data.year) {
      results.year = this.validateYear(data.year);
    }
    
    if (data.mileage && data.year) {
      results.mileage = this.validateMileage(data.mileage, data.year);
    }
    
    if (data.make && data.model) {
      results.makeModel = this.validateMakeModel(data.make, data.model);
    }
    
    return results;
  }
}
