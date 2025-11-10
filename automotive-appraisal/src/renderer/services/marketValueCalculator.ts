import type {
  ComparableVehicle,
  ExtractedVehicleData,
  MarketValueCalculation,
  ConfidenceFactors,
  CalculationStep
} from '../../types';

/**
 * Error context for logging
 */
interface CalculationErrorContext {
  lossVehicle?: {
    vin?: string;
    year?: number;
    make?: string;
    model?: string;
    mileage?: number;
  };
  comparablesCount?: number;
  comparables?: Array<{
    id: string;
    year?: number;
    make?: string;
    model?: string;
    listPrice?: number;
    adjustedPrice?: number;
    qualityScore?: number;
  }>;
  step?: string;
  values?: Record<string, unknown>;
}

/**
 * MarketValueCalculator
 * 
 * Calculates fair market value using quality-weighted average of comparable vehicles.
 * Also calculates confidence level based on comparable count and variance.
 * 
 * Formula: Market Value = Σ(Adjusted Price × Quality Score) / Σ(Quality Scores)
 * 
 * Enhanced with comprehensive error logging for debugging and troubleshooting.
 * Includes result caching and memoization for performance optimization.
 */
export class MarketValueCalculator {
  private static readonly SERVICE_NAME = 'MarketValueCalculator';
  // Confidence calculation constants
  private static readonly CONFIDENCE_PER_COMPARABLE = 20;
  private static readonly MAX_COUNT_CONFIDENCE = 60;
  private static readonly HIGH_QUALITY_CONSISTENCY_THRESHOLD = 10;
  private static readonly MEDIUM_QUALITY_CONSISTENCY_THRESHOLD = 20;
  private static readonly HIGH_QUALITY_CONSISTENCY_BONUS = 20;
  private static readonly MEDIUM_QUALITY_CONSISTENCY_BONUS = 10;
  private static readonly LOW_PRICE_VARIANCE_THRESHOLD = 0.15;
  private static readonly MEDIUM_PRICE_VARIANCE_THRESHOLD = 0.25;
  private static readonly LOW_PRICE_VARIANCE_BONUS = 20;
  private static readonly MEDIUM_PRICE_VARIANCE_BONUS = 10;
  private static readonly MAX_CONFIDENCE = 95;

  // Performance optimization - Memoization cache
  private calculationCache: Map<string, {
    result: MarketValueCalculation;
    timestamp: number;
  }> = new Map();
  
  private confidenceCache: Map<string, {
    result: { level: number; factors: ConfidenceFactors };
    timestamp: number;
  }> = new Map();
  
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key from comparables data
   */
  private generateCacheKey(comparables: ComparableVehicle[], lossVehicle: ExtractedVehicleData): string {
    const comparablesData = comparables.map(c => ({
      id: c.id,
      price: c.listPrice,
      adjustedPrice: c.adjustments?.adjustedPrice,
      mileage: c.mileage,
      qualityScore: c.qualityScore
    }));
    
    const lossVehicleData = {
      year: lossVehicle.year,
      mileage: lossVehicle.mileage,
      condition: lossVehicle.condition
    };
    
    return JSON.stringify({ comparables: comparablesData, lossVehicle: lossVehicleData });
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < MarketValueCalculator.CACHE_TTL;
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    
    // Clear expired calculation cache
    for (const [key, value] of this.calculationCache.entries()) {
      if (now - value.timestamp >= MarketValueCalculator.CACHE_TTL) {
        this.calculationCache.delete(key);
      }
    }
    
    // Clear expired confidence cache
    for (const [key, value] of this.confidenceCache.entries()) {
      if (now - value.timestamp >= MarketValueCalculator.CACHE_TTL) {
        this.confidenceCache.delete(key);
      }
    }
  }

  /**
   * Invalidate all caches
   */
  public invalidateCache(): void {
    this.calculationCache.clear();
    this.confidenceCache.clear();
  }

  /**
   * Log error with context
   */
  private logError(operation: string, error: Error | unknown, context?: CalculationErrorContext): void {
    const errorContext = {
      ...context,
      timestamp: new Date().toISOString(),
      operation
    };
    
    console.error(`[${MarketValueCalculator.SERVICE_NAME}] ${operation} failed:`, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      context: errorContext
    });
    
    // Log to console for debugging
    console.error(`[${MarketValueCalculator.SERVICE_NAME}] ${operation}:`, error, errorContext);
  }

  /**
   * Validate inputs before calculation
   * 
   * @param comparables - Array of comparable vehicles
   * @param lossVehicle - The loss vehicle
   * @throws Error if validation fails
   */
  private validateInputs(
    comparables: ComparableVehicle[],
    lossVehicle: ExtractedVehicleData
  ): void {
    const context: CalculationErrorContext = {
      lossVehicle: {
        vin: lossVehicle.vin,
        year: lossVehicle.year,
        make: lossVehicle.make,
        model: lossVehicle.model,
        mileage: lossVehicle.mileage
      },
      comparablesCount: comparables?.length || 0
    };

    // Validate loss vehicle has required fields
    if (!lossVehicle.year || lossVehicle.year < 1900 || lossVehicle.year > new Date().getFullYear() + 1) {
      const error = new Error('Loss vehicle must have a valid year');
      this.logError('validateInputs', error, context);
      throw error;
    }
    
    if (!lossVehicle.mileage || lossVehicle.mileage < 0) {
      const error = new Error('Loss vehicle must have a valid mileage');
      this.logError('validateInputs', error, context);
      throw error;
    }

    // Validate comparables array is not empty
    if (!comparables || comparables.length === 0) {
      const error = new Error('Cannot calculate market value with zero comparables. Please add at least one comparable vehicle.');
      this.logError('validateInputs', error, context);
      throw error;
    }

    // Validate each comparable has required fields
    comparables.forEach((comp, index) => {
        const compContext = {
          ...context,
          comparable: {
            id: comp.id,
            year: comp.year,
            make: comp.make,
            model: comp.model,
            listPrice: comp.listPrice,
            adjustedPrice: comp.adjustments?.adjustedPrice,
            qualityScore: comp.qualityScore
          }
        };

        if (!comp.listPrice || comp.listPrice <= 0) {
          const error = new Error(`Comparable ${index + 1} must have a valid list price`);
          this.logError('validateInputs', error, compContext);
          throw error;
        }
        
        if (!comp.mileage || comp.mileage < 0) {
          const error = new Error(`Comparable ${index + 1} must have a valid mileage`);
          this.logError('validateInputs', error, compContext);
          throw error;
        }
        
        if (!comp.year || comp.year < 1900 || comp.year > new Date().getFullYear() + 1) {
          const error = new Error(`Comparable ${index + 1} must have a valid year`);
          this.logError('validateInputs', error, compContext);
          throw error;
        }

        if (!comp.adjustments || comp.adjustments.adjustedPrice == null) {
          const error = new Error(`Comparable ${index + 1} must have adjustments calculated`);
          this.logError('validateInputs', error, compContext);
          throw error;
        }

        if (comp.qualityScore == null || comp.qualityScore < 0 || comp.qualityScore > 100) {
          const error = new Error(`Comparable ${index + 1} must have a valid quality score (0-100)`);
          this.logError('validateInputs', error, compContext);
          throw error;
        }
      });
  }

  /**
   * Calculate market value using quality-weighted average
   * 
   * @param comparables - Array of comparable vehicles with adjusted prices
   * @param lossVehicle - The loss vehicle (for reference in calculation steps)
   * @returns Complete market value calculation with breakdown
   */
  calculateMarketValue(
    comparables: ComparableVehicle[],
    lossVehicle: ExtractedVehicleData
  ): MarketValueCalculation {
    // Clear expired cache entries periodically
    this.clearExpiredCache();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(comparables, lossVehicle);
    const cached = this.calculationCache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('=== MarketValueCalculator: Using cached result ===');
      return cached.result;
    }
    
    const startTime = Date.now();
    const context: CalculationErrorContext = {
      lossVehicle: {
        vin: lossVehicle.vin,
        year: lossVehicle.year,
        make: lossVehicle.make,
        model: lossVehicle.model,
        mileage: lossVehicle.mileage
      },
      comparablesCount: comparables.length,
      comparables: comparables.map(c => ({
        id: c.id,
        year: c.year,
        make: c.make,
        model: c.model,
        listPrice: c.listPrice,
        adjustedPrice: c.adjustments?.adjustedPrice,
        qualityScore: c.qualityScore
      }))
    };

    console.log('=== MarketValueCalculator.calculateMarketValue START ===');
    console.log('Input - Loss Vehicle:', context.lossVehicle);
    console.log('Input - Comparables Count:', comparables.length);
    console.log('Input - Comparables:', context.comparables);

    try {
      // Validate inputs
      this.validateInputs(comparables, lossVehicle);
      console.log('Input validation passed');
    } catch (error) {
      this.logError('calculateMarketValue', error, { ...context, step: 'validation' });
      throw error;
    }

    const steps: CalculationStep[] = [];
    let stepNumber = 1;

    // Step 1: List all comparables with their adjusted prices and quality scores
    steps.push({
      step: stepNumber++,
      description: 'List comparable vehicles with adjusted prices and quality scores',
      calculation: comparables
        .map((c, i) => `Comparable ${i + 1}: ${c.adjustments.adjustedPrice.toLocaleString()} × ${c.qualityScore.toFixed(1)}`)
        .join('\n'),
      result: 0
    });

    // Calculate weighted values for each comparable
    console.log('Calculating weighted values for each comparable...');
    const comparableDetails = comparables.map((comp, index) => {
      try {
        const adjustedPrice = comp.adjustments.adjustedPrice;
        const qualityScore = comp.qualityScore;
        
        // Add null/undefined checks
        if (adjustedPrice == null || isNaN(adjustedPrice)) {
          const error = new Error(`Comparable ${index + 1} has invalid adjusted price`);
          this.logError('calculateMarketValue', error, {
            ...context,
            step: 'weighted_values',
            values: { adjustedPrice, qualityScore, comparableId: comp.id }
          });
          throw error;
        }
        
        if (qualityScore == null || isNaN(qualityScore)) {
          const error = new Error(`Comparable ${index + 1} has invalid quality score`);
          this.logError('calculateMarketValue', error, {
            ...context,
            step: 'weighted_values',
            values: { adjustedPrice, qualityScore, comparableId: comp.id }
          });
          throw error;
        }

        const weightedValue = adjustedPrice * qualityScore;

        console.log(`Comparable ${index + 1}:`, {
          id: comp.id,
          listPrice: comp.listPrice,
          adjustedPrice,
          qualityScore,
          weightedValue,
          calculation: `${adjustedPrice} × ${qualityScore} = ${weightedValue}`
        });

        return {
          id: comp.id,
          listPrice: comp.listPrice,
          adjustedPrice,
          qualityScore,
          weightedValue
        };
      } catch (error) {
        this.logError('calculateMarketValue', error, {
          ...context,
          step: 'weighted_values_iteration',
          values: { index, comparableId: comp.id }
        });
        throw error;
      }
    });

    // Step 2: Calculate weighted values
    steps.push({
      step: stepNumber++,
      description: 'Calculate weighted values (Adjusted Price × Quality Score)',
      calculation: comparableDetails
        .map((c, i) => `Comparable ${i + 1}: ${c.adjustedPrice.toLocaleString()} × ${c.qualityScore.toFixed(1)} = ${c.weightedValue.toLocaleString()}`)
        .join('\n'),
      result: 0
    });

    // Step 3: Sum weighted values
    let totalWeightedValue: number;
    try {
      totalWeightedValue = comparableDetails.reduce((sum, c) => sum + c.weightedValue, 0);
      console.log('Total Weighted Value:', totalWeightedValue);
      
      // Check for invalid total
      if (isNaN(totalWeightedValue) || !isFinite(totalWeightedValue)) {
        const error = new Error('Calculation error: Invalid total weighted value');
        this.logError('calculateMarketValue', error, {
          ...context,
          step: 'sum_weighted_values',
          values: { totalWeightedValue, comparableDetails }
        });
        throw error;
      }
      
      steps.push({
        step: stepNumber++,
        description: 'Sum all weighted values',
        calculation: comparableDetails
          .map(c => c.weightedValue.toLocaleString())
          .join(' + ') + ` = ${totalWeightedValue.toLocaleString()}`,
        result: totalWeightedValue
      });
    } catch (error) {
      this.logError('calculateMarketValue', error, {
        ...context,
        step: 'sum_weighted_values'
      });
      throw error;
    }

    // Step 4: Sum quality scores
    let totalWeights: number;
    try {
      totalWeights = comparableDetails.reduce((sum, c) => sum + c.qualityScore, 0);
      console.log('Total Weights (Quality Scores):', totalWeights);
      
      // Check for division by zero
      if (totalWeights === 0) {
        const error = new Error('Cannot calculate market value: total quality scores equal zero');
        this.logError('calculateMarketValue', error, {
          ...context,
          step: 'sum_quality_scores',
          values: { totalWeights, comparableDetails }
        });
        throw error;
      }
      
      if (isNaN(totalWeights) || !isFinite(totalWeights)) {
        const error = new Error('Calculation error: Invalid total weights');
        this.logError('calculateMarketValue', error, {
          ...context,
          step: 'sum_quality_scores',
          values: { totalWeights, comparableDetails }
        });
        throw error;
      }
      
      steps.push({
        step: stepNumber++,
        description: 'Sum all quality scores (weights)',
        calculation: comparableDetails
          .map(c => c.qualityScore.toFixed(1))
          .join(' + ') + ` = ${totalWeights.toFixed(1)}`,
        result: totalWeights
      });
    } catch (error) {
      this.logError('calculateMarketValue', error, {
        ...context,
        step: 'sum_quality_scores'
      });
      throw error;
    }

    // Step 5: Calculate final market value
    let finalMarketValue: number;
    try {
      finalMarketValue = totalWeightedValue / totalWeights;
      console.log('Final Market Value Calculation:', {
        totalWeightedValue,
        totalWeights,
        formula: `${totalWeightedValue} ÷ ${totalWeights}`,
        result: finalMarketValue,
        rounded: Math.round(finalMarketValue)
      });
      
      // Check for invalid result
      if (isNaN(finalMarketValue) || !isFinite(finalMarketValue)) {
        const error = new Error('Calculation error: Invalid final market value');
        this.logError('calculateMarketValue', error, {
          ...context,
          step: 'calculate_final_value',
          values: { totalWeightedValue, totalWeights, finalMarketValue }
        });
        throw error;
      }
      
      steps.push({
        step: stepNumber++,
        description: 'Calculate quality-weighted average (Market Value)',
        calculation: `${totalWeightedValue.toLocaleString()} ÷ ${totalWeights.toFixed(1)} = ${finalMarketValue.toLocaleString()}`,
        result: finalMarketValue
      });
    } catch (error) {
      this.logError('calculateMarketValue', error, {
        ...context,
        step: 'calculate_final_value'
      });
      throw error;
    }

    const result = {
      comparables: comparableDetails,
      totalWeightedValue,
      totalWeights,
      finalMarketValue: Math.round(finalMarketValue),
      steps
    };

    const duration = Date.now() - startTime;
    console.log('=== MarketValueCalculator.calculateMarketValue COMPLETE ===');
    console.log('Final Result:', result);
    console.log(`Duration: ${duration}ms`);
    console.log(`[${MarketValueCalculator.SERVICE_NAME}] Successfully calculated market value: ${result.finalMarketValue}`);

    // Cache the result
    this.calculationCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Calculate confidence level based on comparable count and variance
   * 
   * @param comparables - Array of comparable vehicles
   * @returns Confidence level (0-100) and contributing factors
   */
  calculateConfidenceLevel(
    comparables: ComparableVehicle[]
  ): { level: number; factors: ConfidenceFactors } {
    if (comparables.length === 0) {
      return {
        level: 0,
        factors: {
          comparableCount: 0,
          qualityScoreVariance: 0,
          priceVariance: 0
        }
      };
    }

    // Check cache first
    const cacheKey = JSON.stringify(comparables.map(c => ({
      id: c.id,
      qualityScore: c.qualityScore,
      adjustedPrice: c.adjustments?.adjustedPrice
    })));
    
    const cached = this.confidenceCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.result;
    }

    // Base confidence from comparable count
    let confidence = Math.min(
      comparables.length * MarketValueCalculator.CONFIDENCE_PER_COMPARABLE,
      MarketValueCalculator.MAX_COUNT_CONFIDENCE
    );

    // Calculate quality score variance
    const qualityScores = comparables.map(c => c.qualityScore);
    const qualityScoreStdDev = this.calculateStandardDeviation(qualityScores);

    // Adjust for quality score consistency
    if (qualityScoreStdDev < MarketValueCalculator.HIGH_QUALITY_CONSISTENCY_THRESHOLD) {
      confidence += MarketValueCalculator.HIGH_QUALITY_CONSISTENCY_BONUS;
    } else if (qualityScoreStdDev < MarketValueCalculator.MEDIUM_QUALITY_CONSISTENCY_THRESHOLD) {
      confidence += MarketValueCalculator.MEDIUM_QUALITY_CONSISTENCY_BONUS;
    }

    // Calculate price variance using coefficient of variation
    const adjustedPrices = comparables.map(c => c.adjustments.adjustedPrice);
    const priceStdDev = this.calculateStandardDeviation(adjustedPrices);
    const priceMean = this.calculateMean(adjustedPrices);
    const priceCV = priceMean > 0 ? priceStdDev / priceMean : 0;

    // Adjust for price consistency
    if (priceCV < MarketValueCalculator.LOW_PRICE_VARIANCE_THRESHOLD) {
      confidence += MarketValueCalculator.LOW_PRICE_VARIANCE_BONUS;
    } else if (priceCV < MarketValueCalculator.MEDIUM_PRICE_VARIANCE_THRESHOLD) {
      confidence += MarketValueCalculator.MEDIUM_PRICE_VARIANCE_BONUS;
    }

    // Cap at maximum confidence
    confidence = Math.min(confidence, MarketValueCalculator.MAX_CONFIDENCE);

    const result = {
      level: Math.round(confidence),
      factors: {
        comparableCount: comparables.length,
        qualityScoreVariance: qualityScoreStdDev,
        priceVariance: priceCV
      }
    };

    // Cache the result
    this.confidenceCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Calculate mean (average) of an array of numbers
   * 
   * @param values - Array of numbers
   * @returns Mean value
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation of an array of numbers
   * 
   * @param values - Array of numbers
   * @returns Standard deviation
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
   * Calculate coefficient of variation (CV)
   * CV = Standard Deviation / Mean
   * 
   * @param values - Array of numbers
   * @returns Coefficient of variation
   */
  calculateCoefficientOfVariation(values: number[]): number {
    const mean = this.calculateMean(values);
    if (mean === 0) return 0;
    
    const stdDev = this.calculateStandardDeviation(values);
    return stdDev / mean;
  }
}
