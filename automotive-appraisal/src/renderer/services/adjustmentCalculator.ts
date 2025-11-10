import type {
  ComparableVehicle,
  ExtractedVehicleData,
  MileageAdjustment,
  EquipmentAdjustment,
  ConditionAdjustment,
  PriceAdjustments
} from '../../types';

/**
 * Error context for logging
 */
interface AdjustmentErrorContext {
  comparable?: {
    id: string;
    year?: number;
    make?: string;
    model?: string;
    mileage?: number;
    condition?: string;
  };
  lossVehicle?: {
    year?: number;
    make?: string;
    model?: string;
    mileage?: number;
    condition?: string;
  };
  step?: string;
  values?: Record<string, unknown>;
}

/**
 * Standard equipment values for common features
 * Based on industry standards and market research
 */
export const EQUIPMENT_VALUES: Record<string, number> = {
  'Navigation': 1200,
  'Sunroof': 1200,
  'Premium Audio': 800,
  'Sport Package': 1500,
  'Leather Seats': 1000,
  'Heated Seats': 500,
  'Backup Camera': 400,
  'Blind Spot Monitoring': 600,
  'Adaptive Cruise Control': 800,
  'Parking Sensors': 400,
  'Keyless Entry': 300,
  'Remote Start': 300,
  'Tow Package': 700,
  'All-Wheel Drive': 2000,
  'Premium Wheels': 800
};

/**
 * AdjustmentCalculator
 * 
 * Calculates price adjustments for comparable vehicles based on:
 * - Mileage differences (age-based depreciation rates)
 * - Equipment differences (standard values)
 * - Condition differences (multipliers)
 * 
 * All adjustments are applied to normalize comparable prices to match
 * the loss vehicle's characteristics.
 * 
 * Enhanced with comprehensive error logging for debugging and troubleshooting.
 */
export class AdjustmentCalculator {
  private static readonly SERVICE_NAME = 'AdjustmentCalculator';

  // Depreciation rates by vehicle age
  private static readonly DEPRECIATION_RATES = {
    NEW: { maxAge: 3, ratePerMile: 0.25 },
    MIDDLE: { maxAge: 7, ratePerMile: 0.15 },
    OLD: { maxAge: Infinity, ratePerMile: 0.05 }
  };

  // Condition multipliers
  private static readonly CONDITION_MULTIPLIERS: Record<string, number> = {
    'Excellent': 1.05,
    'Good': 1.00,
    'Fair': 0.95,
    'Poor': 0.85
  };

  // Minimum mileage difference to apply adjustment
  private static readonly MIN_MILEAGE_DIFFERENCE = 1000;

  /**
   * Log error with context
   */
  private logError(operation: string, error: Error | unknown, context?: AdjustmentErrorContext): void {
    const errorContext = {
      ...context,
      timestamp: new Date().toISOString(),
      operation
    };
    
    console.error(`[${AdjustmentCalculator.SERVICE_NAME}] ${operation} failed:`, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      context: errorContext
    });
    
    // Log to console for debugging
    console.error(`[${AdjustmentCalculator.SERVICE_NAME}] ${operation}:`, error, errorContext);
  }

  /**
   * Calculate mileage adjustment based on age-based depreciation rates
   * 
   * @param comparable - The comparable vehicle
   * @param lossVehicle - The loss vehicle
   * @returns Mileage adjustment details
   */
  calculateMileageAdjustment(
    comparable: ComparableVehicle,
    lossVehicle: ExtractedVehicleData
  ): MileageAdjustment {
    const mileageDifference = comparable.mileage - lossVehicle.mileage;

    // No adjustment if difference is less than threshold
    if (Math.abs(mileageDifference) < AdjustmentCalculator.MIN_MILEAGE_DIFFERENCE) {
      return {
        mileageDifference: 0,
        depreciationRate: 0,
        adjustmentAmount: 0,
        explanation: `Mileage difference (${Math.abs(mileageDifference).toLocaleString()} miles) is below ${AdjustmentCalculator.MIN_MILEAGE_DIFFERENCE.toLocaleString()} mile threshold, no adjustment applied`
      };
    }

    // Determine depreciation rate based on vehicle age
    const vehicleAge = new Date().getFullYear() - comparable.year;
    const depreciationRate = this.getDepreciationRate(vehicleAge);

    // Calculate adjustment amount
    // Positive difference means comparable has MORE miles (worth less)
    // Negative difference means comparable has FEWER miles (worth more)
    const adjustmentAmount = -mileageDifference * depreciationRate;

    const direction = mileageDifference > 0 ? 'higher' : 'lower';
    const ageCategory = vehicleAge <= 3 ? '0-3 years' : vehicleAge <= 7 ? '4-7 years' : '8+ years';

    return {
      mileageDifference,
      depreciationRate,
      adjustmentAmount,
      explanation: `Comparable has ${Math.abs(mileageDifference).toLocaleString()} miles ${direction} than loss vehicle. ` +
        `Using $${depreciationRate.toFixed(2)}/mile rate (${ageCategory} old). ` +
        `Adjustment: ${adjustmentAmount >= 0 ? '+' : ''}$${adjustmentAmount.toLocaleString()}`
    };
  }

  /**
   * Calculate equipment adjustments based on standard values
   * 
   * @param comparable - The comparable vehicle
   * @param lossVehicle - The loss vehicle
   * @param customEquipmentValues - Optional custom equipment values (overrides defaults)
   * @returns Array of equipment adjustments
   */
  calculateEquipmentAdjustments(
    comparable: ComparableVehicle,
    lossVehicle: ExtractedVehicleData,
    customEquipmentValues?: Map<string, number>
  ): EquipmentAdjustment[] {
    const adjustments: EquipmentAdjustment[] = [];
    const equipmentValues = customEquipmentValues || new Map(Object.entries(EQUIPMENT_VALUES));

    const lossEquipment = lossVehicle.equipment || [];
    const comparableEquipment = comparable.equipment || [];

    // Create case-insensitive sets for comparison
    const lossSet = new Map(
      lossEquipment.map(e => [e.toLowerCase(), e])
    );
    const comparableSet = new Map(
      comparableEquipment.map(e => [e.toLowerCase(), e])
    );

    // Find missing features (loss vehicle has, comparable doesn't)
    for (const [lowerFeature, originalFeature] of lossSet) {
      if (!comparableSet.has(lowerFeature)) {
        const value = this.getEquipmentValue(originalFeature, equipmentValues);
        adjustments.push({
          feature: originalFeature,
          type: 'missing',
          value,
          explanation: `Comparable missing ${originalFeature} (loss vehicle has it): +$${value.toLocaleString()}`
        });
      }
    }

    // Find extra features (comparable has, loss vehicle doesn't)
    for (const [lowerFeature, originalFeature] of comparableSet) {
      if (!lossSet.has(lowerFeature)) {
        const value = this.getEquipmentValue(originalFeature, equipmentValues);
        adjustments.push({
          feature: originalFeature,
          type: 'extra',
          value,
          explanation: `Comparable has extra ${originalFeature} (loss vehicle doesn't): -$${value.toLocaleString()}`
        });
      }
    }

    return adjustments;
  }

  /**
   * Calculate condition adjustment based on condition multipliers
   * 
   * @param comparable - The comparable vehicle
   * @param lossVehicleCondition - The loss vehicle's condition
   * @returns Condition adjustment details
   */
  calculateConditionAdjustment(
    comparable: ComparableVehicle,
    lossVehicleCondition: string
  ): ConditionAdjustment {
    const comparableMultiplier = this.getConditionMultiplier(comparable.condition);
    const lossMultiplier = this.getConditionMultiplier(lossVehicleCondition);

    // Calculate the adjustment needed to normalize the comparable to loss vehicle condition
    // If comparable is in better condition, we need to reduce its price
    // If comparable is in worse condition, we need to increase its price
    const basePrice = comparable.listPrice;
    const normalizedPrice = (basePrice / comparableMultiplier) * lossMultiplier;
    const adjustmentAmount = normalizedPrice - basePrice;

    let explanation: string;
    if (comparable.condition === lossVehicleCondition) {
      explanation = `Both vehicles in ${comparable.condition} condition, no adjustment needed`;
    } else {
      explanation = `Adjusting from ${comparable.condition} (${comparableMultiplier}x) to ${lossVehicleCondition} (${lossMultiplier}x): ` +
        `${adjustmentAmount >= 0 ? '+' : ''}$${adjustmentAmount.toLocaleString()}`;
    }

    return {
      comparableCondition: comparable.condition,
      lossVehicleCondition,
      multiplier: lossMultiplier / comparableMultiplier,
      adjustmentAmount,
      explanation
    };
  }

  /**
   * Calculate total adjustments combining all adjustment types
   * 
   * @param comparable - The comparable vehicle
   * @param lossVehicle - The loss vehicle
   * @param customEquipmentValues - Optional custom equipment values
   * @returns Complete price adjustments
   */
  calculateTotalAdjustments(
    comparable: ComparableVehicle,
    lossVehicle: ExtractedVehicleData,
    customEquipmentValues?: Map<string, number>
  ): PriceAdjustments {
    const context: AdjustmentErrorContext = {
      comparable: {
        id: comparable.id,
        year: comparable.year,
        make: comparable.make,
        model: comparable.model,
        mileage: comparable.mileage,
        condition: comparable.condition
      },
      lossVehicle: {
        year: lossVehicle.year,
        make: lossVehicle.make,
        model: lossVehicle.model,
        mileage: lossVehicle.mileage,
        condition: lossVehicle.condition
      }
    };

    try {
      // Calculate individual adjustments
      const mileageAdjustment = this.calculateMileageAdjustment(comparable, lossVehicle);
      const equipmentAdjustments = this.calculateEquipmentAdjustments(
        comparable,
        lossVehicle,
        customEquipmentValues
      );
      const lossCondition = lossVehicle.condition || 'Good';
      const conditionAdjustment = this.calculateConditionAdjustment(comparable, lossCondition);

      // Calculate total equipment adjustment
      const equipmentTotal = equipmentAdjustments.reduce((sum, adj) => {
        return sum + (adj.type === 'missing' ? adj.value : -adj.value);
      }, 0);

      // Calculate total adjustment
      const totalAdjustment = 
        mileageAdjustment.adjustmentAmount +
        equipmentTotal +
        conditionAdjustment.adjustmentAmount;

      // Calculate adjusted price
      const adjustedPrice = comparable.listPrice + totalAdjustment;

      // Validate result
      if (isNaN(adjustedPrice) || !isFinite(adjustedPrice) || adjustedPrice < 0) {
        const error = new Error('Invalid adjusted price calculated');
        this.logError('calculateTotalAdjustments', error, {
          ...context,
          values: {
            listPrice: comparable.listPrice,
            mileageAdjustment: mileageAdjustment.adjustmentAmount,
            equipmentTotal,
            conditionAdjustment: conditionAdjustment.adjustmentAmount,
            totalAdjustment,
            adjustedPrice
          }
        });
        throw error;
      }

      return {
        mileageAdjustment,
        equipmentAdjustments,
        conditionAdjustment,
        totalAdjustment,
        adjustedPrice
      };
    } catch (error) {
      this.logError('calculateTotalAdjustments', error, context);
      throw error;
    }
  }

  /**
   * Get depreciation rate based on vehicle age
   * 
   * @param vehicleAge - Age of vehicle in years
   * @returns Depreciation rate per mile
   */
  private getDepreciationRate(vehicleAge: number): number {
    if (vehicleAge <= AdjustmentCalculator.DEPRECIATION_RATES.NEW.maxAge) {
      return AdjustmentCalculator.DEPRECIATION_RATES.NEW.ratePerMile;
    } else if (vehicleAge <= AdjustmentCalculator.DEPRECIATION_RATES.MIDDLE.maxAge) {
      return AdjustmentCalculator.DEPRECIATION_RATES.MIDDLE.ratePerMile;
    } else {
      return AdjustmentCalculator.DEPRECIATION_RATES.OLD.ratePerMile;
    }
  }

  /**
   * Get condition multiplier for a given condition
   * 
   * @param condition - Vehicle condition
   * @returns Condition multiplier
   */
  private getConditionMultiplier(condition: string): number {
    return AdjustmentCalculator.CONDITION_MULTIPLIERS[condition] || 1.0;
  }

  /**
   * Get equipment value from map or use default
   * 
   * @param feature - Equipment feature name
   * @param equipmentValues - Map of equipment values
   * @returns Equipment value
   */
  private getEquipmentValue(
    feature: string,
    equipmentValues: Map<string, number>
  ): number {
    // Try exact match first
    if (equipmentValues.has(feature)) {
      return equipmentValues.get(feature)!;
    }

    // Try case-insensitive match
    for (const [key, value] of equipmentValues) {
      if (key.toLowerCase() === feature.toLowerCase()) {
        return value;
      }
    }

    // Default value for unknown equipment
    return 500;
  }
}
