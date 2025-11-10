import type {
  ComparableVehicle,
  ComparableValidationResult,
  ExtractedVehicleData
} from '../../types';
import { ComparableValidationError } from '../../types';

/**
 * ComparableValidationService
 * 
 * Validates comparable vehicle data for:
 * - Required fields
 * - Reasonable value ranges
 * - Outlier detection
 * - Data consistency
 * - Cross-field validation
 * - Industry standards compliance
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */
export class ComparableValidationService {
  // Validation constants
  private static readonly MIN_YEAR = 1990;
  private static readonly MAX_YEAR = new Date().getFullYear() + 2; // Allow next model year
  private static readonly MIN_MILEAGE = 0;
  private static readonly MAX_MILEAGE = 500000;
  private static readonly MIN_PRICE = 500;
  private static readonly MAX_PRICE = 500000;
  private static readonly MAX_MILEAGE_PER_YEAR = 25000;
  private static readonly OUTLIER_THRESHOLD = 2.0; // Standard deviations
  private static readonly SUSPICIOUS_LOW_MILEAGE_THRESHOLD = 1000; // For vehicles > 5 years old
  private static readonly HIGH_MILEAGE_WARNING_THRESHOLD = 200000;
  private static readonly LOW_PRICE_WARNING_THRESHOLD = 2000;
  private static readonly HIGH_PRICE_WARNING_THRESHOLD = 100000;
  private static readonly MAX_REASONABLE_DISTANCE = 300; // miles
  private static readonly WARN_DISTANCE_THRESHOLD = 150; // miles
  
  // Known manufacturers for validation
  private static readonly KNOWN_MAKES = [
    'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler',
    'Dodge', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar',
    'Jeep', 'Kia', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mercedes',
    'Mitsubishi', 'Nissan', 'Porsche', 'Ram', 'Subaru', 'Tesla', 'Toyota',
    'Volkswagen', 'Volvo', 'Aston Martin', 'Bentley', 'Ferrari', 'Lamborghini',
    'Land Rover', 'Maserati', 'McLaren', 'Rolls-Royce', 'Alfa Romeo', 'Genesis',
    'Mini', 'Fiat', 'Scion'
  ];

  /**
   * Validate a comparable vehicle with comprehensive checks
   * 
   * @param comparable - The comparable to validate (can be partial for form validation)
   * @param allComparables - All comparables for outlier detection (optional)
   * @param lossVehicle - Loss vehicle for comparison validation (optional)
   * @returns Validation result with errors, warnings, and suggested actions
   */
  validate(
    comparable: Partial<ComparableVehicle>,
    allComparables?: ComparableVehicle[],
    lossVehicle?: ExtractedVehicleData
  ): ComparableValidationResult {
    const errors: Array<{
      field: string;
      error: ComparableValidationError;
      message: string;
      suggestedAction?: string;
    }> = [];

    const warnings: Array<{
      field: string;
      message: string;
      suggestedAction?: string;
    }> = [];

    // Validate required fields
    this.validateRequiredFields(comparable, errors);

    // Validate source
    if (comparable.source) {
      this.validateSource(comparable.source, warnings);
    }

    // Validate year
    if (typeof comparable.year === 'number') {
      this.validateYear(comparable.year, errors, warnings);
    }

    // Validate make and model
    if (comparable.make) {
      this.validateMake(comparable.make, warnings);
    }
    
    if (comparable.make && comparable.model) {
      this.validateMakeModel(comparable.make, comparable.model, warnings);
    }

    // Validate mileage
    if (typeof comparable.mileage === 'number') {
      this.validateMileage(comparable.mileage, errors, warnings);
      
      // Validate mileage vs age if both are present
      if (typeof comparable.year === 'number') {
        this.validateMileageForAge(comparable.year, comparable.mileage, warnings);
      }
    }

    // Validate price
    if (typeof comparable.listPrice === 'number') {
      this.validatePrice(comparable.listPrice, errors, warnings);
    }

    // Validate location
    if (comparable.location) {
      this.validateLocation(comparable.location, errors);
    }

    // Validate equipment
    if (comparable.equipment && Array.isArray(comparable.equipment)) {
      this.validateEquipment(comparable.equipment, warnings);
    }

    // Cross-field validation with loss vehicle
    if (lossVehicle) {
      this.validateAgainstLossVehicle(comparable, lossVehicle, warnings);
    }

    // Outlier detection (only if we have other comparables)
    if (allComparables && allComparables.length > 0 && typeof comparable.listPrice === 'number') {
      this.detectPriceOutlier(comparable.listPrice, allComparables, warnings);
    }

    // Validate distance if available
    if (typeof comparable.distanceFromLoss === 'number') {
      this.validateDistance(comparable.distanceFromLoss, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate required fields are present
   * Requirement 9.7: Require all mandatory fields
   */
  private validateRequiredFields(
    comparable: Partial<ComparableVehicle>,
    errors: Array<{ field: string; error: ComparableValidationError; message: string; suggestedAction?: string }>
  ): void {
    const requiredFields: Array<{ field: keyof ComparableVehicle; label: string; suggestion: string }> = [
      { field: 'source', label: 'Source', suggestion: 'Select where you found this comparable (e.g., AutoTrader, Cars.com)' },
      { field: 'year', label: 'Year', suggestion: 'Enter the model year (e.g., 2020)' },
      { field: 'make', label: 'Make', suggestion: 'Enter the manufacturer (e.g., Toyota, Honda)' },
      { field: 'model', label: 'Model', suggestion: 'Enter the model name (e.g., Camry, Accord)' },
      { field: 'mileage', label: 'Mileage', suggestion: 'Enter the odometer reading in miles' },
      { field: 'listPrice', label: 'Price', suggestion: 'Enter the asking price in dollars' },
      { field: 'location', label: 'Location', suggestion: 'Enter location as "City, ST" (e.g., Los Angeles, CA)' },
      { field: 'condition', label: 'Condition', suggestion: 'Select vehicle condition (Excellent, Good, Fair, or Poor)' }
    ];

    for (const { field, label, suggestion } of requiredFields) {
      const value = comparable[field];
      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          error: ComparableValidationError.MISSING_REQUIRED_FIELD,
          message: `${label} is required`,
          suggestedAction: suggestion
        });
      }
    }
  }

  /**
   * Validate source field
   */
  private validateSource(
    source: string,
    warnings: Array<{ field: string; message: string; suggestedAction?: string }>
  ): void {
    const validSources = ['AutoTrader', 'Cars.com', 'CarMax', 'Carvana', 'CarGurus', 'Manual Entry', 'Other'];
    
    if (!validSources.includes(source) && source !== 'Other') {
      warnings.push({
        field: 'source',
        message: `Source "${source}" is not in the standard list`,
        suggestedAction: 'Consider using a standard source or select "Other"'
      });
    }
  }

  /**
   * Validate year is within reasonable range
   * Requirement 9.3: Validate year matches make/model availability
   */
  private validateYear(
    year: number,
    errors: Array<{ field: string; error: ComparableValidationError; message: string; suggestedAction?: string }>,
    warnings: Array<{ field: string; message: string; suggestedAction?: string }>
  ): void {
    if (year < ComparableValidationService.MIN_YEAR) {
      errors.push({
        field: 'year',
        error: ComparableValidationError.INVALID_YEAR,
        message: `Year must be ${ComparableValidationService.MIN_YEAR} or later`,
        suggestedAction: `Enter a year between ${ComparableValidationService.MIN_YEAR} and ${ComparableValidationService.MAX_YEAR}`
      });
    } else if (year > ComparableValidationService.MAX_YEAR) {
      errors.push({
        field: 'year',
        error: ComparableValidationError.INVALID_YEAR,
        message: `Year cannot be later than ${ComparableValidationService.MAX_YEAR}`,
        suggestedAction: 'Verify the model year is correct'
      });
    } else if (year < 2000) {
      const age = new Date().getFullYear() - year;
      warnings.push({
        field: 'year',
        message: `Vehicle is ${age} years old. Consider if this is truly comparable.`,
        suggestedAction: 'Older vehicles may not be good comparables due to market differences'
      });
    }
  }

  /**
   * Validate make against known manufacturers
   */
  private validateMake(
    make: string,
    warnings: Array<{ field: string; message: string; suggestedAction?: string }>
  ): void {
    const normalizedMake = make.trim();
    
    if (normalizedMake.length < 2) {
      warnings.push({
        field: 'make',
        message: 'Make seems too short',
        suggestedAction: 'Verify the manufacturer name is complete'
      });
      return;
    }

    // Check against known makes (case-insensitive)
    const isKnownMake = ComparableValidationService.KNOWN_MAKES.some(
      known => known.toLowerCase() === normalizedMake.toLowerCase()
    );

    if (!isKnownMake) {
      warnings.push({
        field: 'make',
        message: `"${make}" is not in the known manufacturers list`,
        suggestedAction: 'Verify spelling or check if this is a valid manufacturer'
      });
    }

    // Check for numbers in make (common OCR error)
    if (/\d/.test(make)) {
      warnings.push({
        field: 'make',
        message: 'Make contains numbers, which is unusual',
        suggestedAction: 'Verify this is correct - manufacturer names typically don\'t contain numbers'
      });
    }
  }

  /**
   * Validate make/model combination
   */
  private validateMakeModel(
    make: string,
    model: string,
    warnings: Array<{ field: string; message: string; suggestedAction?: string }>
  ): void {
    if (model.trim().length < 2) {
      warnings.push({
        field: 'model',
        message: 'Model name seems too short',
        suggestedAction: 'Verify the model name is complete'
      });
    }

    // Check for common data entry errors
    if (make.toLowerCase() === model.toLowerCase()) {
      warnings.push({
        field: 'model',
        message: 'Make and model appear to be the same',
        suggestedAction: 'Verify you entered the model name, not the make'
      });
    }
  }

  /**
   * Validate mileage is within reasonable range
   * Requirement 9.2: Warn if mileage seems unrealistic for vehicle age
   */
  private validateMileage(
    mileage: number,
    errors: Array<{ field: string; error: ComparableValidationError; message: string; suggestedAction?: string }>,
    warnings: Array<{ field: string; message: string; suggestedAction?: string }>
  ): void {
    if (mileage < ComparableValidationService.MIN_MILEAGE) {
      errors.push({
        field: 'mileage',
        error: ComparableValidationError.INVALID_MILEAGE,
        message: 'Mileage cannot be negative',
        suggestedAction: 'Enter a positive mileage value'
      });
    } else if (mileage > ComparableValidationService.MAX_MILEAGE) {
      errors.push({
        field: 'mileage',
        error: ComparableValidationError.INVALID_MILEAGE,
        message: `Mileage cannot exceed ${ComparableValidationService.MAX_MILEAGE.toLocaleString()} miles`,
        suggestedAction: 'Verify the mileage is correct - this seems unrealistically high'
      });
    } else if (mileage > ComparableValidationService.HIGH_MILEAGE_WARNING_THRESHOLD) {
      warnings.push({
        field: 'mileage',
        message: `High mileage (${mileage.toLocaleString()} miles). Ensure this is truly comparable to the loss vehicle.`,
        suggestedAction: 'High-mileage vehicles may not be good comparables unless the loss vehicle also has high mileage'
      });
    }
  }

  /**
   * Validate mileage is realistic for vehicle age
   * Requirement 9.2: Warn if mileage seems unrealistic for vehicle age
   */
  private validateMileageForAge(
    year: number,
    mileage: number,
    warnings: Array<{ field: string; message: string; suggestedAction?: string }>
  ): void {
    const currentYear = new Date().getFullYear();
    const vehicleAge = currentYear - year;
    
    if (vehicleAge <= 0) {
      // Brand new or future model year
      if (mileage > 5000) {
        warnings.push({
          field: 'mileage',
          message: `High mileage (${mileage.toLocaleString()}) for a ${year} vehicle. Verify this is correct.`,
          suggestedAction: 'New or current model year vehicles typically have very low mileage'
        });
      }
      return;
    }

    const expectedMaxMileage = vehicleAge * ComparableValidationService.MAX_MILEAGE_PER_YEAR;
    const avgMilesPerYear = mileage / vehicleAge;
    
    if (mileage > expectedMaxMileage) {
      warnings.push({
        field: 'mileage',
        message: `Mileage (${mileage.toLocaleString()}) seems high for a ${vehicleAge}-year-old vehicle (${Math.round(avgMilesPerYear).toLocaleString()} miles/year). ` +
          `Expected max: ~${expectedMaxMileage.toLocaleString()} miles.`,
        suggestedAction: 'Verify the mileage is correct. High-mileage vehicles may significantly affect market value.'
      });
    }

    // Check for suspiciously low mileage on older vehicles
    if (vehicleAge > 5 && mileage < ComparableValidationService.SUSPICIOUS_LOW_MILEAGE_THRESHOLD) {
      warnings.push({
        field: 'mileage',
        message: `Very low mileage (${mileage.toLocaleString()}) for a ${vehicleAge}-year-old vehicle (${Math.round(avgMilesPerYear).toLocaleString()} miles/year).`,
        suggestedAction: 'Verify this is correct. Unusually low mileage may indicate data entry error or special circumstances.'
      });
    }
  }

  /**
   * Validate price is within reasonable range
   * Requirement 9.1: Flag prices that are outliers
   */
  private validatePrice(
    price: number,
    errors: Array<{ field: string; error: ComparableValidationError; message: string; suggestedAction?: string }>,
    warnings: Array<{ field: string; message: string; suggestedAction?: string }>
  ): void {
    if (price < ComparableValidationService.MIN_PRICE) {
      errors.push({
        field: 'listPrice',
        error: ComparableValidationError.INVALID_PRICE,
        message: `Price must be at least $${ComparableValidationService.MIN_PRICE}`,
        suggestedAction: 'Enter a realistic market price for the vehicle'
      });
    } else if (price > ComparableValidationService.MAX_PRICE) {
      errors.push({
        field: 'listPrice',
        error: ComparableValidationError.INVALID_PRICE,
        message: `Price cannot exceed $${ComparableValidationService.MAX_PRICE.toLocaleString()}`,
        suggestedAction: 'Verify the price is correct - this seems unrealistically high'
      });
    } else if (price < ComparableValidationService.LOW_PRICE_WARNING_THRESHOLD) {
      warnings.push({
        field: 'listPrice',
        message: `Very low price ($${price.toLocaleString()}). Ensure this is a legitimate comparable and not salvage/parts.`,
        suggestedAction: 'Verify this is a clean title vehicle with accurate pricing'
      });
    } else if (price > ComparableValidationService.HIGH_PRICE_WARNING_THRESHOLD) {
      warnings.push({
        field: 'listPrice',
        message: `High-value vehicle ($${price.toLocaleString()}). Ensure this is truly comparable to the loss vehicle.`,
        suggestedAction: 'High-value vehicles may not be good comparables unless the loss vehicle is also high-value'
      });
    }
  }

  /**
   * Validate location format
   * Requirement 9.4: Validate that location can be geocoded successfully
   */
  private validateLocation(
    location: string,
    errors: Array<{ field: string; error: ComparableValidationError; message: string; suggestedAction?: string }>
  ): void {
    // Basic validation: should have at least a comma (City, State format)
    if (!location.includes(',')) {
      errors.push({
        field: 'location',
        error: ComparableValidationError.INVALID_LOCATION,
        message: 'Location should be in "City, State" format',
        suggestedAction: 'Enter location as "City, ST" (e.g., Los Angeles, CA)'
      });
    } else if (location.trim().length < 5) {
      errors.push({
        field: 'location',
        error: ComparableValidationError.INVALID_LOCATION,
        message: 'Location appears incomplete',
        suggestedAction: 'Provide both city and state abbreviation'
      });
    } else {
      // Validate state abbreviation format
      const parts = location.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const stateAbbr = parts[parts.length - 1];
        if (stateAbbr.length !== 2 || !/^[A-Z]{2}$/i.test(stateAbbr)) {
          errors.push({
            field: 'location',
            error: ComparableValidationError.INVALID_LOCATION,
            message: 'State should be a 2-letter abbreviation',
            suggestedAction: 'Use standard state abbreviations (e.g., CA, NY, TX)'
          });
        }
      }
    }
  }

  /**
   * Validate equipment list
   */
  private validateEquipment(
    equipment: string[],
    warnings: Array<{ field: string; message: string; suggestedAction?: string }>
  ): void {
    // Check for duplicate equipment
    const uniqueEquipment = new Set(equipment);
    if (uniqueEquipment.size < equipment.length) {
      warnings.push({
        field: 'equipment',
        message: 'Duplicate equipment features detected',
        suggestedAction: 'Remove duplicate features from the list'
      });
    }

    // Warn if equipment list is empty (might be intentional but worth noting)
    if (equipment.length === 0) {
      warnings.push({
        field: 'equipment',
        message: 'No equipment features selected',
        suggestedAction: 'Consider adding equipment features for more accurate adjustments'
      });
    }
  }

  /**
   * Validate distance from loss vehicle
   */
  private validateDistance(
    distance: number,
    warnings: Array<{ field: string; message: string; suggestedAction?: string }>
  ): void {
    if (distance > ComparableValidationService.MAX_REASONABLE_DISTANCE) {
      warnings.push({
        field: 'distanceFromLoss',
        message: `Distance (${Math.round(distance)} miles) is very far from loss vehicle location`,
        suggestedAction: 'Consider finding closer comparables for better market representation'
      });
    } else if (distance > ComparableValidationService.WARN_DISTANCE_THRESHOLD) {
      warnings.push({
        field: 'distanceFromLoss',
        message: `Distance (${Math.round(distance)} miles) is somewhat far from loss vehicle location`,
        suggestedAction: 'Closer comparables may provide better market data'
      });
    }
  }

  /**
   * Cross-validate comparable against loss vehicle
   */
  private validateAgainstLossVehicle(
    comparable: Partial<ComparableVehicle>,
    lossVehicle: ExtractedVehicleData,
    warnings: Array<{ field: string; message: string; suggestedAction?: string }>
  ): void {
    // Check year difference
    if (comparable.year && lossVehicle.year) {
      const yearDiff = Math.abs(comparable.year - lossVehicle.year);
      if (yearDiff > 3) {
        warnings.push({
          field: 'year',
          message: `Year differs by ${yearDiff} years from loss vehicle (${lossVehicle.year})`,
          suggestedAction: 'Comparables within 2-3 years typically provide better market data'
        });
      }
    }

    // Check make/model match
    if (comparable.make && lossVehicle.make) {
      if (comparable.make.toLowerCase() !== lossVehicle.make.toLowerCase()) {
        warnings.push({
          field: 'make',
          message: `Make (${comparable.make}) differs from loss vehicle (${lossVehicle.make})`,
          suggestedAction: 'Same make comparables are typically more accurate'
        });
      }
    }

    if (comparable.model && lossVehicle.model) {
      if (comparable.model.toLowerCase() !== lossVehicle.model.toLowerCase()) {
        warnings.push({
          field: 'model',
          message: `Model (${comparable.model}) differs from loss vehicle (${lossVehicle.model})`,
          suggestedAction: 'Same model comparables provide the most accurate market data'
        });
      }
    }

    // Check mileage difference
    if (comparable.mileage && lossVehicle.mileage) {
      const mileageDiff = Math.abs(comparable.mileage - lossVehicle.mileage);
      const percentDiff = (mileageDiff / lossVehicle.mileage) * 100;
      
      if (percentDiff > 50) {
        warnings.push({
          field: 'mileage',
          message: `Mileage differs significantly from loss vehicle (${Math.round(percentDiff)}% difference)`,
          suggestedAction: 'Large mileage differences may reduce comparable quality'
        });
      }
    }
  }

  /**
   * Detect if price is an outlier compared to other comparables
   * Uses statistical method (standard deviations from mean)
   * Requirement 9.1: Flag prices that are outliers
   */
  private detectPriceOutlier(
    price: number,
    allComparables: ComparableVehicle[],
    warnings: Array<{ field: string; message: string; suggestedAction?: string }>
  ): void {
    if (allComparables.length < 3) {
      // Need at least 3 comparables for meaningful outlier detection
      return;
    }

    const prices = allComparables.map(c => c.listPrice);
    const mean = this.calculateMean(prices);
    const stdDev = this.calculateStandardDeviation(prices);

    if (stdDev === 0) {
      // All prices are the same
      return;
    }

    const zScore = Math.abs((price - mean) / stdDev);

    if (zScore > ComparableValidationService.OUTLIER_THRESHOLD) {
      const direction = price > mean ? 'higher' : 'lower';
      const percentDiff = Math.abs(((price - mean) / mean) * 100);
      warnings.push({
        field: 'listPrice',
        message: `Price ($${price.toLocaleString()}) is significantly ${direction} than other comparables ` +
          `(average: $${Math.round(mean).toLocaleString()}, ${Math.round(percentDiff)}% difference).`,
        suggestedAction: 'Verify this is truly comparable or consider finding alternatives closer to the average'
      });
    }
  }

  /**
   * Calculate mean of an array of numbers
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation of an array of numbers
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return 0;

    const mean = this.calculateMean(values);
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    const variance = this.calculateMean(squaredDifferences);
    return Math.sqrt(variance);
  }

  /**
   * Validate multiple comparables and check for consistency
   * 
   * @param comparables - Array of comparables to validate
   * @param lossVehicle - Loss vehicle for comparison (optional)
   * @returns Array of validation results
   */
  validateMultiple(
    comparables: ComparableVehicle[],
    lossVehicle?: ExtractedVehicleData
  ): ComparableValidationResult[] {
    return comparables.map(comp => this.validate(comp, comparables, lossVehicle));
  }

  /**
   * Get validation summary for a set of comparables
   * 
   * @param comparables - Array of comparables to summarize
   * @param lossVehicle - Loss vehicle for comparison (optional)
   * @returns Summary of validation issues
   */
  getValidationSummary(
    comparables: ComparableVehicle[],
    lossVehicle?: ExtractedVehicleData
  ): {
    totalComparables: number;
    validComparables: number;
    totalErrors: number;
    totalWarnings: number;
    criticalIssues: string[];
  } {
    const results = this.validateMultiple(comparables, lossVehicle);
    
    const validComparables = results.filter(r => r.isValid).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    
    // Collect critical issues (errors that prevent use)
    const criticalIssues: string[] = [];
    results.forEach((result, index) => {
      if (!result.isValid) {
        const errorMessages = result.errors.map(e => e.message).join(', ');
        criticalIssues.push(`Comparable ${index + 1}: ${errorMessages}`);
      }
    });

    return {
      totalComparables: comparables.length,
      validComparables,
      totalErrors,
      totalWarnings,
      criticalIssues
    };
  }
}
