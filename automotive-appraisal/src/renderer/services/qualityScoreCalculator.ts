import type { ComparableVehicle, ExtractedVehicleData, QualityScoreBreakdown } from '../../types';

/**
 * QualityScoreCalculator
 * 
 * Calculates quality scores for comparable vehicles based on multiple factors:
 * - Distance from loss vehicle location
 * - Age difference (year)
 * - Mileage difference
 * - Equipment match
 * 
 * The scoring algorithm starts with a base score of 100.0 and applies
 * penalties and bonuses based on how well the comparable matches the loss vehicle.
 */
export class QualityScoreCalculator {
  // Scoring constants
  private static readonly BASE_SCORE = 100.0;
  private static readonly DISTANCE_THRESHOLD = 100; // miles
  private static readonly DISTANCE_PENALTY_PER_MILE = 0.1;
  private static readonly MAX_DISTANCE_PENALTY = 20.0;
  private static readonly AGE_PENALTY_PER_YEAR = 2.0;
  private static readonly MAX_AGE_PENALTY = 10.0;
  private static readonly MILEAGE_MATCH_THRESHOLD = 0.2; // 20%
  private static readonly MILEAGE_MATCH_BONUS = 10.0;
  private static readonly MILEAGE_PENALTY_PER_10_PERCENT = 5.0;
  private static readonly EQUIPMENT_MATCH_BONUS = 15.0;
  private static readonly EQUIPMENT_MISSING_PENALTY = 10.0;
  private static readonly EQUIPMENT_EXTRA_BONUS = 5.0;

  /**
   * Calculate the quality score for a comparable vehicle
   * 
   * @param comparable - The comparable vehicle (partial for form preview)
   * @param lossVehicle - The loss vehicle being appraised
   * @returns Complete quality score breakdown with explanations
   */
  calculateScore(
    comparable: Partial<ComparableVehicle>,
    lossVehicle: ExtractedVehicleData
  ): QualityScoreBreakdown {
    const breakdown: QualityScoreBreakdown = {
      baseScore: QualityScoreCalculator.BASE_SCORE,
      distancePenalty: 0,
      agePenalty: 0,
      ageBonus: 0,
      mileagePenalty: 0,
      mileageBonus: 0,
      equipmentPenalty: 0,
      equipmentBonus: 0,
      finalScore: QualityScoreCalculator.BASE_SCORE,
      explanations: {
        distance: '',
        age: '',
        mileage: '',
        equipment: ''
      }
    };

    // Calculate distance penalty
    if (typeof comparable.distanceFromLoss === 'number') {
      const distanceResult = this.calculateDistancePenalty(comparable.distanceFromLoss);
      breakdown.distancePenalty = distanceResult.penalty;
      breakdown.explanations.distance = distanceResult.explanation;
    }

    // Calculate age factor
    if (typeof comparable.year === 'number') {
      const ageResult = this.calculateAgeFactor(comparable.year, lossVehicle.year);
      breakdown.agePenalty = ageResult.penalty;
      breakdown.ageBonus = ageResult.bonus;
      breakdown.explanations.age = ageResult.explanation;
    }

    // Calculate mileage factor
    if (typeof comparable.mileage === 'number') {
      const mileageResult = this.calculateMileageFactor(comparable.mileage, lossVehicle.mileage);
      breakdown.mileagePenalty = mileageResult.penalty;
      breakdown.mileageBonus = mileageResult.bonus;
      breakdown.explanations.mileage = mileageResult.explanation;
    }

    // Calculate equipment factor
    if (comparable.equipment && lossVehicle.equipment) {
      const equipmentResult = this.calculateEquipmentFactor(
        comparable.equipment,
        lossVehicle.equipment
      );
      breakdown.equipmentPenalty = equipmentResult.penalty;
      breakdown.equipmentBonus = equipmentResult.bonus;
      breakdown.explanations.equipment = equipmentResult.explanation;
    }

    // Calculate final score
    // Clamp between 0 and 100 to ensure valid range
    const rawScore = breakdown.baseScore -
      breakdown.distancePenalty -
      breakdown.agePenalty +
      breakdown.ageBonus -
      breakdown.mileagePenalty +
      breakdown.mileageBonus -
      breakdown.equipmentPenalty +
      breakdown.equipmentBonus;
    
    breakdown.finalScore = Math.max(0, Math.min(100, rawScore));

    return breakdown;
  }

  /**
   * Calculate distance penalty
   * 
   * No penalty if ≤100 miles
   * -0.1 points per mile over 100
   * Max penalty: -20 points (at 300 miles)
   * 
   * @param distance - Distance in miles from loss vehicle
   * @returns Penalty amount and explanation
   */
  private calculateDistancePenalty(distance: number): { penalty: number; explanation: string } {
    if (distance <= QualityScoreCalculator.DISTANCE_THRESHOLD) {
      return {
        penalty: 0,
        explanation: `Distance: ${distance.toFixed(0)} miles (within ${QualityScoreCalculator.DISTANCE_THRESHOLD} mile threshold, no penalty)`
      };
    }

    const excessMiles = distance - QualityScoreCalculator.DISTANCE_THRESHOLD;
    const penalty = Math.min(
      excessMiles * QualityScoreCalculator.DISTANCE_PENALTY_PER_MILE,
      QualityScoreCalculator.MAX_DISTANCE_PENALTY
    );

    return {
      penalty,
      explanation: `Distance: ${distance.toFixed(0)} miles (${excessMiles.toFixed(0)} miles over threshold, -${penalty.toFixed(1)} points)`
    };
  }

  /**
   * Calculate age factor (penalty or bonus)
   * 
   * Exact match: 0 adjustment
   * -2.0 points per year difference
   * Max penalty: -10 points (5+ years difference)
   * 
   * @param comparableYear - Year of comparable vehicle
   * @param lossYear - Year of loss vehicle
   * @returns Penalty/bonus amounts and explanation
   */
  private calculateAgeFactor(
    comparableYear: number,
    lossYear: number
  ): { penalty: number; bonus: number; explanation: string } {
    const yearDifference = Math.abs(comparableYear - lossYear);

    if (yearDifference === 0) {
      return {
        penalty: 0,
        bonus: 0,
        explanation: `Age: Exact match (${comparableYear}), no adjustment`
      };
    }

    const penalty = Math.min(
      yearDifference * QualityScoreCalculator.AGE_PENALTY_PER_YEAR,
      QualityScoreCalculator.MAX_AGE_PENALTY
    );

    const direction = comparableYear > lossYear ? 'newer' : 'older';
    return {
      penalty,
      bonus: 0,
      explanation: `Age: ${yearDifference} year${yearDifference > 1 ? 's' : ''} ${direction} (${comparableYear} vs ${lossYear}, -${penalty.toFixed(1)} points)`
    };
  }

  /**
   * Calculate mileage factor (penalty or bonus)
   * 
   * Within 20% of loss vehicle: +10 points bonus
   * 20-40% difference: -5 points
   * 40-60% difference: -10 points
   * >60% difference: -15 points
   * 
   * @param comparableMileage - Mileage of comparable vehicle
   * @param lossMileage - Mileage of loss vehicle
   * @returns Penalty/bonus amounts and explanation
   */
  private calculateMileageFactor(
    comparableMileage: number,
    lossMileage: number
  ): { penalty: number; bonus: number; explanation: string } {
    // Avoid division by zero
    if (lossMileage === 0) {
      return {
        penalty: 0,
        bonus: 0,
        explanation: 'Mileage: Loss vehicle has 0 miles, no adjustment'
      };
    }

    const percentDifference = Math.abs(comparableMileage - lossMileage) / lossMileage;

    // Within 20% - bonus
    if (percentDifference <= QualityScoreCalculator.MILEAGE_MATCH_THRESHOLD) {
      return {
        penalty: 0,
        bonus: QualityScoreCalculator.MILEAGE_MATCH_BONUS,
        explanation: `Mileage: ${comparableMileage.toLocaleString()} vs ${lossMileage.toLocaleString()} (within 20%, +${QualityScoreCalculator.MILEAGE_MATCH_BONUS} points)`
      };
    }

    // Calculate penalty based on difference ranges
    let penalty = 0;
    let range = '';

    if (percentDifference <= 0.4) {
      penalty = QualityScoreCalculator.MILEAGE_PENALTY_PER_10_PERCENT;
      range = '20-40%';
    } else if (percentDifference <= 0.6) {
      penalty = QualityScoreCalculator.MILEAGE_PENALTY_PER_10_PERCENT * 2;
      range = '40-60%';
    } else {
      penalty = QualityScoreCalculator.MILEAGE_PENALTY_PER_10_PERCENT * 3;
      range = '>60%';
    }

    const direction = comparableMileage > lossMileage ? 'higher' : 'lower';
    return {
      penalty,
      bonus: 0,
      explanation: `Mileage: ${comparableMileage.toLocaleString()} vs ${lossMileage.toLocaleString()} (${range} ${direction}, -${penalty.toFixed(1)} points)`
    };
  }

  /**
   * Calculate equipment factor (penalty or bonus)
   * 
   * All equipment matches: +15 points
   * Each missing major feature: -10 points
   * Each extra major feature: +5 points
   * 
   * @param comparableEquipment - Equipment list of comparable vehicle
   * @param lossEquipment - Equipment list of loss vehicle
   * @returns Penalty/bonus amounts and explanation
   */
  private calculateEquipmentFactor(
    comparableEquipment: string[],
    lossEquipment: string[]
  ): { penalty: number; bonus: number; explanation: string } {
    const lossSet = new Set(lossEquipment.map(e => e.toLowerCase()));
    const comparableSet = new Set(comparableEquipment.map(e => e.toLowerCase()));

    // Find missing and extra features
    const missingFeatures = lossEquipment.filter(
      feature => !comparableSet.has(feature.toLowerCase())
    );
    const extraFeatures = comparableEquipment.filter(
      feature => !lossSet.has(feature.toLowerCase())
    );

    // All equipment matches
    if (missingFeatures.length === 0 && extraFeatures.length === 0) {
      return {
        penalty: 0,
        bonus: QualityScoreCalculator.EQUIPMENT_MATCH_BONUS,
        explanation: `Equipment: Perfect match (all ${lossEquipment.length} features, +${QualityScoreCalculator.EQUIPMENT_MATCH_BONUS} points)`
      };
    }

    // Calculate penalties and bonuses
    const penalty = missingFeatures.length * QualityScoreCalculator.EQUIPMENT_MISSING_PENALTY;
    const bonus = extraFeatures.length * QualityScoreCalculator.EQUIPMENT_EXTRA_BONUS;

    const parts: string[] = [];
    if (missingFeatures.length > 0) {
      parts.push(`${missingFeatures.length} missing (-${penalty.toFixed(1)} points)`);
    }
    if (extraFeatures.length > 0) {
      parts.push(`${extraFeatures.length} extra (+${bonus.toFixed(1)} points)`);
    }

    return {
      penalty,
      bonus,
      explanation: `Equipment: ${parts.join(', ')}`
    };
  }
}
