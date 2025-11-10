/**
 * Form Validation Utilities
 * Provides comprehensive validation with clear error messages and recovery suggestions
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface FieldValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => ValidationResult;
}

/**
 * VIN validation with detailed error messages
 */
export function validateVIN(value: string): ValidationResult {
  if (!value || !value.trim()) {
    return {
      valid: false,
      error: 'VIN is required',
      suggestion: 'Enter the 17-character Vehicle Identification Number',
      severity: 'error'
    };
  }

  const trimmedValue = value.trim().toUpperCase();

  if (trimmedValue.length !== 17) {
    return {
      valid: false,
      error: `VIN must be exactly 17 characters (currently ${trimmedValue.length})`,
      suggestion: 'Check the VIN on the vehicle registration or insurance document',
      severity: 'error'
    };
  }

  // VINs don't contain I, O, or Q to avoid confusion with 1 and 0
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(trimmedValue)) {
    const invalidChars = trimmedValue.split('').filter(c => !/[A-HJ-NPR-Z0-9]/i.test(c));
    return {
      valid: false,
      error: `VIN contains invalid characters: ${invalidChars.join(', ')}`,
      suggestion: 'VINs cannot contain the letters I, O, or Q',
      severity: 'error'
    };
  }

  return { valid: true };
}

/**
 * Year validation with contextual error messages
 */
export function validateYear(value: string | number, context?: { vehicleType?: string }): ValidationResult {
  if (!value) {
    return {
      valid: false,
      error: 'Year is required',
      suggestion: 'Enter the model year of the vehicle',
      severity: 'error'
    };
  }

  const year = typeof value === 'string' ? parseInt(value) : value;
  const currentYear = new Date().getFullYear();

  if (isNaN(year)) {
    return {
      valid: false,
      error: 'Year must be a valid number',
      suggestion: 'Enter a 4-digit year (e.g., 2020)',
      severity: 'error'
    };
  }

  if (year < 1900) {
    return {
      valid: false,
      error: 'Year is too old',
      suggestion: 'Vehicles before 1900 are not supported',
      severity: 'error'
    };
  }

  if (year > currentYear + 1) {
    return {
      valid: false,
      error: `Year cannot be later than ${currentYear + 1}`,
      suggestion: 'Check the model year on the vehicle documentation',
      severity: 'error'
    };
  }

  // Warning for very old vehicles
  if (year < 1980) {
    return {
      valid: true,
      error: 'This is a classic vehicle',
      suggestion: 'Market values for classic vehicles may require special consideration',
      severity: 'warning'
    };
  }

  return { valid: true };
}

/**
 * Mileage validation with intelligent checks
 */
export function validateMileage(
  value: string | number,
  context?: { year?: number; averageMilesPerYear?: number }
): ValidationResult {
  if (!value && value !== 0) {
    return {
      valid: false,
      error: 'Mileage is required',
      suggestion: 'Enter the current odometer reading',
      severity: 'error'
    };
  }

  const mileage = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;

  if (isNaN(mileage)) {
    return {
      valid: false,
      error: 'Mileage must be a valid number',
      suggestion: 'Enter the odometer reading without letters or symbols',
      severity: 'error'
    };
  }

  if (mileage < 0) {
    return {
      valid: false,
      error: 'Mileage cannot be negative',
      suggestion: 'Enter a positive number',
      severity: 'error'
    };
  }

  if (mileage > 1000000) {
    return {
      valid: false,
      error: 'Mileage exceeds maximum (1,000,000)',
      suggestion: 'Verify the odometer reading',
      severity: 'error'
    };
  }

  // Contextual validation based on vehicle age
  if (context?.year) {
    const currentYear = new Date().getFullYear();
    const vehicleAge = Math.max(currentYear - context.year, 1);
    const avgMilesPerYear = mileage / vehicleAge;

    if (avgMilesPerYear > 50000) {
      return {
        valid: false,
        error: `Extremely high mileage for age (${Math.round(avgMilesPerYear).toLocaleString()} miles/year)`,
        suggestion: 'Verify the odometer reading and model year',
        severity: 'error'
      };
    }

    if (avgMilesPerYear > 25000) {
      return {
        valid: true,
        error: `High mileage for age (${Math.round(avgMilesPerYear).toLocaleString()} miles/year)`,
        suggestion: 'This is above average but may be accurate for commercial or fleet vehicles',
        severity: 'warning'
      };
    }

    if (mileage < 100 && vehicleAge > 1) {
      return {
        valid: true,
        error: 'Unusually low mileage',
        suggestion: 'Verify this is the correct odometer reading',
        severity: 'warning'
      };
    }
  }

  return { valid: true };
}

/**
 * Price validation with range checks
 */
export function validatePrice(
  value: string | number,
  context?: { fieldName?: string; min?: number; max?: number }
): ValidationResult {
  const fieldName = context?.fieldName || 'Price';

  if (!value && value !== 0) {
    return {
      valid: false,
      error: `${fieldName} is required`,
      suggestion: 'Enter the dollar amount',
      severity: 'error'
    };
  }

  const price = typeof value === 'string' ? parseFloat(value.replace(/[$,]/g, '')) : value;

  if (isNaN(price)) {
    return {
      valid: false,
      error: `${fieldName} must be a valid number`,
      suggestion: 'Enter a dollar amount (e.g., 25000)',
      severity: 'error'
    };
  }

  if (price < 0) {
    return {
      valid: false,
      error: `${fieldName} cannot be negative`,
      suggestion: 'Enter a positive dollar amount',
      severity: 'error'
    };
  }

  const min = context?.min ?? 100;
  const max = context?.max ?? 10000000;

  if (price < min) {
    return {
      valid: false,
      error: `${fieldName} is too low (minimum $${min.toLocaleString()})`,
      suggestion: 'Verify the price is entered correctly',
      severity: 'error'
    };
  }

  if (price > max) {
    return {
      valid: false,
      error: `${fieldName} exceeds maximum ($${max.toLocaleString()})`,
      suggestion: 'Verify the price is entered correctly',
      severity: 'error'
    };
  }

  // Warnings for unusual prices
  if (price < 500) {
    return {
      valid: true,
      error: 'Price seems unusually low',
      suggestion: 'Verify this is the correct market value',
      severity: 'warning'
    };
  }

  if (price > 500000) {
    return {
      valid: true,
      error: 'Price is very high',
      suggestion: 'Luxury and exotic vehicles may require special valuation',
      severity: 'warning'
    };
  }

  return { valid: true };
}

/**
 * Location validation with format checking
 */
export function validateLocation(value: string): ValidationResult {
  if (!value || !value.trim()) {
    return {
      valid: false,
      error: 'Location is required',
      suggestion: 'Enter the city and state (e.g., Los Angeles, CA)',
      severity: 'error'
    };
  }

  const trimmedValue = value.trim();

  // Check for basic format: City, ST
  if (!/^[A-Za-z\s.'-]+,\s*[A-Z]{2}$/i.test(trimmedValue)) {
    // Try to provide helpful suggestions based on common mistakes
    if (!trimmedValue.includes(',')) {
      return {
        valid: false,
        error: 'Location format is incorrect',
        suggestion: 'Use format: City, ST (e.g., Los Angeles, CA)',
        severity: 'error'
      };
    }

    const parts = trimmedValue.split(',');
    if (parts.length > 2) {
      return {
        valid: false,
        error: 'Location has too many parts',
        suggestion: 'Use format: City, ST (e.g., Los Angeles, CA)',
        severity: 'error'
      };
    }

    const state = parts[1]?.trim();
    if (!state || state.length !== 2) {
      return {
        valid: false,
        error: 'State must be a 2-letter code',
        suggestion: 'Use the 2-letter state abbreviation (e.g., CA, NY, TX)',
        severity: 'error'
      };
    }

    return {
      valid: false,
      error: 'Location format is incorrect',
      suggestion: 'Use format: City, ST (e.g., Los Angeles, CA)',
      severity: 'error'
    };
  }

  return { valid: true };
}

/**
 * Make/Model validation
 */
export function validateMakeModel(value: string, fieldName: 'Make' | 'Model'): ValidationResult {
  if (!value || !value.trim()) {
    return {
      valid: false,
      error: `${fieldName} is required`,
      suggestion: `Enter the vehicle ${fieldName.toLowerCase()}`,
      severity: 'error'
    };
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length < 2) {
    return {
      valid: false,
      error: `${fieldName} is too short`,
      suggestion: `Enter the full ${fieldName.toLowerCase()} name`,
      severity: 'error'
    };
  }

  if (trimmedValue.length > 50) {
    return {
      valid: false,
      error: `${fieldName} is too long (maximum 50 characters)`,
      suggestion: 'Use standard abbreviations if needed',
      severity: 'error'
    };
  }

  // Check for invalid characters (numbers in make, special chars)
  if (fieldName === 'Make' && /\d/.test(trimmedValue)) {
    return {
      valid: true,
      error: 'Make contains numbers',
      suggestion: 'Most vehicle makes don\'t contain numbers (except BMW, etc.)',
      severity: 'warning'
    };
  }

  return { valid: true };
}

/**
 * URL validation
 */
export function validateURL(value: string, required: boolean = false): ValidationResult {
  if (!value || !value.trim()) {
    if (required) {
      return {
        valid: false,
        error: 'URL is required',
        suggestion: 'Enter a valid web address',
        severity: 'error'
      };
    }
    return { valid: true };
  }

  const trimmedValue = value.trim();

  try {
    new URL(trimmedValue);
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'URL format is invalid',
      suggestion: 'Enter a complete URL starting with http:// or https://',
      severity: 'error'
    };
  }
}

/**
 * Generic field validator that applies multiple rules
 */
export function validateField(
  value: any,
  rules: FieldValidationRule,
  fieldName: string
): ValidationResult {
  // Required check
  if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return {
      valid: false,
      error: `${fieldName} is required`,
      suggestion: `Please enter a value for ${fieldName}`,
      severity: 'error'
    };
  }

  // Skip other validations if not required and empty
  if (!rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return { valid: true };
  }

  const stringValue = typeof value === 'string' ? value.trim() : String(value);

  // Length validations
  if (rules.minLength && stringValue.length < rules.minLength) {
    return {
      valid: false,
      error: `${fieldName} is too short (minimum ${rules.minLength} characters)`,
      suggestion: `Enter at least ${rules.minLength} characters`,
      severity: 'error'
    };
  }

  if (rules.maxLength && stringValue.length > rules.maxLength) {
    return {
      valid: false,
      error: `${fieldName} is too long (maximum ${rules.maxLength} characters)`,
      suggestion: `Reduce to ${rules.maxLength} characters or less`,
      severity: 'error'
    };
  }

  // Numeric validations
  if (typeof rules.min === 'number' || typeof rules.max === 'number') {
    const numValue = typeof value === 'number' ? value : parseFloat(stringValue);
    
    if (isNaN(numValue)) {
      return {
        valid: false,
        error: `${fieldName} must be a number`,
        suggestion: 'Enter a numeric value',
        severity: 'error'
      };
    }

    if (typeof rules.min === 'number' && numValue < rules.min) {
      return {
        valid: false,
        error: `${fieldName} must be at least ${rules.min}`,
        suggestion: `Enter a value of ${rules.min} or greater`,
        severity: 'error'
      };
    }

    if (typeof rules.max === 'number' && numValue > rules.max) {
      return {
        valid: false,
        error: `${fieldName} must be at most ${rules.max}`,
        suggestion: `Enter a value of ${rules.max} or less`,
        severity: 'error'
      };
    }
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return {
      valid: false,
      error: `${fieldName} format is invalid`,
      suggestion: 'Check the format and try again',
      severity: 'error'
    };
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return { valid: true };
}

/**
 * Batch validate multiple fields
 */
export function validateFields(
  data: Record<string, any>,
  rules: Record<string, FieldValidationRule>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const value = data[fieldName];
    results[fieldName] = validateField(value, fieldRules, fieldName);
  }

  return results;
}

/**
 * Check if validation results contain any errors
 */
export function hasValidationErrors(results: Record<string, ValidationResult>): boolean {
  return Object.values(results).some(result => !result.valid);
}

/**
 * Get first error from validation results
 */
export function getFirstError(results: Record<string, ValidationResult>): {
  field: string;
  result: ValidationResult;
} | null {
  for (const [field, result] of Object.entries(results)) {
    if (!result.valid) {
      return { field, result };
    }
  }
  return null;
}
