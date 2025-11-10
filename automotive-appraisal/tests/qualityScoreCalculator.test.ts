import { QualityScoreCalculator } from '../src/renderer/services/qualityScoreCalculator';
import type { ComparableVehicle, ExtractedVehicleData } from '../src/types';

describe('QualityScoreCalculator', () => {
  let calculator: QualityScoreCalculator;
  let lossVehicle: ExtractedVehicleData;

  beforeEach(() => {
    calculator = new QualityScoreCalculator();
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
      equipment: ['Navigation', 'Sunroof', 'Leather Seats']
    };
  });

  describe('calculateScore', () => {
    it('should return base score of 100 with no penalties or bonuses', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2015,
        mileage: 50000,
        distanceFromLoss: 50,
        equipment: ['Navigation', 'Sunroof', 'Leather Seats']
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.baseScore).toBe(100);
      expect(result.finalScore).toBeGreaterThan(100); // Should have bonuses
    });

    it('should handle partial comparable data gracefully', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2015
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.baseScore).toBe(100);
      expect(result.finalScore).toBe(100); // Only age factor applied (exact match)
    });

    it('should never return negative final score', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2005, // 10 years older
        mileage: 200000, // Much higher mileage
        distanceFromLoss: 500, // Very far
        equipment: [] // No equipment
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.finalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Distance Penalty', () => {
    it('should apply no penalty for distance within 100 miles', () => {
      const comparable: Partial<ComparableVehicle> = {
        distanceFromLoss: 50
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.distancePenalty).toBe(0);
      expect(result.explanations.distance).toContain('no penalty');
    });

    it('should apply 0.1 points penalty per mile over 100', () => {
      const comparable: Partial<ComparableVehicle> = {
        distanceFromLoss: 150 // 50 miles over threshold
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.distancePenalty).toBe(5.0); // 50 * 0.1
      expect(result.explanations.distance).toContain('150 miles');
    });

    it('should cap distance penalty at 20 points', () => {
      const comparable: Partial<ComparableVehicle> = {
        distanceFromLoss: 500 // 400 miles over threshold
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.distancePenalty).toBe(20.0); // Capped at max
      expect(result.explanations.distance).toContain('500 miles');
    });

    it('should handle exactly 100 miles with no penalty', () => {
      const comparable: Partial<ComparableVehicle> = {
        distanceFromLoss: 100
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.distancePenalty).toBe(0);
    });
  });

  describe('Age Factor', () => {
    it('should apply no adjustment for exact year match', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2015
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.agePenalty).toBe(0);
      expect(result.ageBonus).toBe(0);
      expect(result.explanations.age).toContain('Exact match');
    });

    it('should apply 2 points penalty per year difference', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2013 // 2 years older
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.agePenalty).toBe(4.0); // 2 years * 2.0
      expect(result.explanations.age).toContain('2 years older');
    });

    it('should cap age penalty at 10 points', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2005 // 10 years older
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.agePenalty).toBe(10.0); // Capped at max
    });

    it('should handle newer vehicles correctly', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2017 // 2 years newer
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.agePenalty).toBe(4.0);
      expect(result.explanations.age).toContain('2 years newer');
    });

    it('should handle single year difference', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2014
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.agePenalty).toBe(2.0);
      expect(result.explanations.age).toContain('1 year older');
    });
  });

  describe('Mileage Factor', () => {
    it('should apply 10 point bonus for mileage within 20%', () => {
      const comparable: Partial<ComparableVehicle> = {
        mileage: 52000 // 4% higher
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.mileageBonus).toBe(10.0);
      expect(result.mileagePenalty).toBe(0);
      expect(result.explanations.mileage).toContain('within 20%');
    });

    it('should apply 5 point penalty for 20-40% difference', () => {
      const comparable: Partial<ComparableVehicle> = {
        mileage: 65000 // 30% higher
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.mileagePenalty).toBe(5.0);
      expect(result.mileageBonus).toBe(0);
      expect(result.explanations.mileage).toContain('20-40%');
    });

    it('should apply 10 point penalty for 40-60% difference', () => {
      const comparable: Partial<ComparableVehicle> = {
        mileage: 75000 // 50% higher
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.mileagePenalty).toBe(10.0);
      expect(result.explanations.mileage).toContain('40-60%');
    });

    it('should apply 15 point penalty for >60% difference', () => {
      const comparable: Partial<ComparableVehicle> = {
        mileage: 100000 // 100% higher
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.mileagePenalty).toBe(15.0);
      expect(result.explanations.mileage).toContain('>60%');
    });

    it('should handle lower mileage correctly', () => {
      const comparable: Partial<ComparableVehicle> = {
        mileage: 30000 // 40% lower
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.mileagePenalty).toBe(5.0);
      expect(result.explanations.mileage).toContain('lower');
    });

    it('should handle zero loss vehicle mileage', () => {
      const newLossVehicle = { ...lossVehicle, mileage: 0 };
      const comparable: Partial<ComparableVehicle> = {
        mileage: 50000
      };

      const result = calculator.calculateScore(comparable, newLossVehicle);

      expect(result.mileagePenalty).toBe(0);
      expect(result.mileageBonus).toBe(0);
      expect(result.explanations.mileage).toContain('0 miles');
    });

    it('should handle exact mileage match', () => {
      const comparable: Partial<ComparableVehicle> = {
        mileage: 50000
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.mileageBonus).toBe(10.0);
      expect(result.mileagePenalty).toBe(0);
    });
  });

  describe('Equipment Factor', () => {
    it('should apply 15 point bonus for perfect equipment match', () => {
      const comparable: Partial<ComparableVehicle> = {
        equipment: ['Navigation', 'Sunroof', 'Leather Seats']
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.equipmentBonus).toBe(15.0);
      expect(result.equipmentPenalty).toBe(0);
      expect(result.explanations.equipment).toContain('Perfect match');
    });

    it('should apply 10 point penalty per missing feature', () => {
      const comparable: Partial<ComparableVehicle> = {
        equipment: ['Navigation'] // Missing Sunroof and Leather Seats
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.equipmentPenalty).toBe(20.0); // 2 missing * 10
      expect(result.equipmentBonus).toBe(0);
      expect(result.explanations.equipment).toContain('2 missing');
    });

    it('should apply 5 point bonus per extra feature', () => {
      const comparable: Partial<ComparableVehicle> = {
        equipment: ['Navigation', 'Sunroof', 'Leather Seats', 'Heated Seats', 'Backup Camera']
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.equipmentBonus).toBe(10.0); // 2 extra * 5
      expect(result.equipmentPenalty).toBe(0);
      expect(result.explanations.equipment).toContain('2 extra');
    });

    it('should handle both missing and extra features', () => {
      const comparable: Partial<ComparableVehicle> = {
        equipment: ['Navigation', 'Heated Seats'] // Missing 2, has 1 extra
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.equipmentPenalty).toBe(20.0); // 2 missing * 10
      expect(result.equipmentBonus).toBe(5.0); // 1 extra * 5
      expect(result.explanations.equipment).toContain('2 missing');
      expect(result.explanations.equipment).toContain('1 extra');
    });

    it('should be case-insensitive for equipment matching', () => {
      const comparable: Partial<ComparableVehicle> = {
        equipment: ['NAVIGATION', 'sunroof', 'Leather Seats']
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.equipmentBonus).toBe(15.0); // Perfect match
      expect(result.equipmentPenalty).toBe(0);
    });

    it('should handle empty equipment lists', () => {
      const comparable: Partial<ComparableVehicle> = {
        equipment: []
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.equipmentPenalty).toBe(30.0); // 3 missing * 10
      expect(result.equipmentBonus).toBe(0);
    });

    it('should handle loss vehicle with no equipment', () => {
      const noEquipmentLoss = { ...lossVehicle, equipment: [] };
      const comparable: Partial<ComparableVehicle> = {
        equipment: ['Navigation', 'Sunroof']
      };

      const result = calculator.calculateScore(comparable, noEquipmentLoss);

      expect(result.equipmentBonus).toBe(10.0); // 2 extra * 5
      expect(result.equipmentPenalty).toBe(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should calculate correct score for excellent comparable', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2015, // Exact match
        mileage: 48000, // Within 20%
        distanceFromLoss: 25, // Close
        equipment: ['Navigation', 'Sunroof', 'Leather Seats'] // Perfect match
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      // Base 100 + mileage bonus 10 + equipment bonus 15 = 125
      expect(result.finalScore).toBe(125.0);
    });

    it('should calculate correct score for poor comparable', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2010, // 5 years older
        mileage: 120000, // >60% higher
        distanceFromLoss: 250, // 150 miles over threshold
        equipment: [] // No equipment
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      // Base 100 - age 10 - mileage 15 - distance 15 - equipment 30 = 30
      expect(result.finalScore).toBe(30.0);
    });

    it('should calculate correct score for average comparable', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2014, // 1 year older
        mileage: 65000, // 30% higher
        distanceFromLoss: 120, // 20 miles over threshold
        equipment: ['Navigation', 'Sunroof'] // Missing 1
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      // Base 100 - age 2 - mileage 5 - distance 2 - equipment 10 = 81
      expect(result.finalScore).toBe(81.0);
    });

    it('should provide detailed explanations for all factors', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2014,
        mileage: 65000,
        distanceFromLoss: 120,
        equipment: ['Navigation', 'Sunroof']
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.explanations.distance).toBeTruthy();
      expect(result.explanations.age).toBeTruthy();
      expect(result.explanations.mileage).toBeTruthy();
      expect(result.explanations.equipment).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined equipment in loss vehicle', () => {
      const noEquipmentLoss = { ...lossVehicle, equipment: undefined };
      const comparable: Partial<ComparableVehicle> = {
        equipment: ['Navigation']
      };

      const result = calculator.calculateScore(comparable, noEquipmentLoss);

      // Should not crash, equipment factor not calculated
      expect(result.equipmentPenalty).toBe(0);
      expect(result.equipmentBonus).toBe(0);
    });

    it('should handle undefined equipment in comparable', () => {
      const comparable: Partial<ComparableVehicle> = {
        equipment: undefined
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      // Should not crash, equipment factor not calculated
      expect(result.equipmentPenalty).toBe(0);
      expect(result.equipmentBonus).toBe(0);
    });

    it('should handle very high mileage differences', () => {
      const comparable: Partial<ComparableVehicle> = {
        mileage: 500000 // 10x higher
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.mileagePenalty).toBe(15.0); // Max penalty for >60%
    });

    it('should handle zero distance', () => {
      const comparable: Partial<ComparableVehicle> = {
        distanceFromLoss: 0
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.distancePenalty).toBe(0);
    });

    it('should handle future year vehicles', () => {
      const comparable: Partial<ComparableVehicle> = {
        year: 2025 // 10 years newer
      };

      const result = calculator.calculateScore(comparable, lossVehicle);

      expect(result.agePenalty).toBe(10.0); // Capped at max
    });
  });
});
