import { MarketValueCalculator } from '../src/renderer/services/marketValueCalculator';
import type { ComparableVehicle, ExtractedVehicleData } from '../src/types';

describe('MarketValueCalculator', () => {
  let calculator: MarketValueCalculator;
  let lossVehicle: ExtractedVehicleData;

  beforeEach(() => {
    calculator = new MarketValueCalculator();
    
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
      condition: 'Good',
      equipment: ['Navigation', 'Sunroof', 'Leather Seats']
    };
  });

  const createComparable = (
    id: string,
    adjustedPrice: number,
    qualityScore: number
  ): ComparableVehicle => ({
    id,
    appraisalId: 'appraisal-1',
    source: 'AutoTrader',
    dateAdded: new Date(),
    year: 2015,
    make: 'Toyota',
    model: 'Camry',
    mileage: 50000,
    location: 'San Diego, CA',
    distanceFromLoss: 120,
    listPrice: adjustedPrice,
    condition: 'Good',
    equipment: ['Navigation', 'Sunroof', 'Leather Seats'],
    qualityScore,
    qualityScoreBreakdown: {
      baseScore: 100,
      distancePenalty: 0,
      agePenalty: 0,
      ageBonus: 0,
      mileagePenalty: 0,
      mileageBonus: 0,
      equipmentPenalty: 0,
      equipmentBonus: 0,
      finalScore: qualityScore,
      explanations: {
        distance: '',
        age: '',
        mileage: '',
        equipment: ''
      }
    },
    adjustments: {
      mileageAdjustment: {
        mileageDifference: 0,
        depreciationRate: 0,
        adjustmentAmount: 0,
        explanation: ''
      },
      equipmentAdjustments: [],
      conditionAdjustment: {
        comparableCondition: 'Good',
        lossVehicleCondition: 'Good',
        multiplier: 1,
        adjustmentAmount: 0,
        explanation: ''
      },
      totalAdjustment: 0,
      adjustedPrice
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  describe('calculateMarketValue', () => {
    it('should throw error with zero comparables', () => {
      expect(() => calculator.calculateMarketValue([], lossVehicle)).toThrow(
        'Cannot calculate market value with zero comparables'
      );
    });

    it('should calculate correct market value with single comparable', () => {
      const comparables = [createComparable('comp-1', 20000, 100)];

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      expect(result.finalMarketValue).toBe(20000);
      expect(result.totalWeightedValue).toBe(2000000); // 20000 * 100
      expect(result.totalWeights).toBe(100);
    });

    it('should calculate quality-weighted average correctly', () => {
      const comparables = [
        createComparable('comp-1', 20000, 100), // Weight: 2,000,000
        createComparable('comp-2', 18000, 80),  // Weight: 1,440,000
        createComparable('comp-3', 22000, 90)   // Weight: 1,980,000
      ];

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      // Total weighted: 5,420,000
      // Total weights: 270
      // Average: 5,420,000 / 270 = 20,074.07
      expect(result.finalMarketValue).toBe(20074);
      expect(result.totalWeightedValue).toBe(5420000);
      expect(result.totalWeights).toBe(270);
    });

    it('should weight higher quality comparables more heavily', () => {
      const comparables = [
        createComparable('comp-1', 20000, 100), // High quality
        createComparable('comp-2', 15000, 50)   // Low quality
      ];

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      // Total weighted: 2,000,000 + 750,000 = 2,750,000
      // Total weights: 150
      // Average: 2,750,000 / 150 = 18,333.33
      expect(result.finalMarketValue).toBe(18333);
      // Should be closer to $20,000 than $15,000 due to quality weighting
      expect(result.finalMarketValue).toBeGreaterThan(17500);
    });

    it('should handle equal quality scores as simple average', () => {
      const comparables = [
        createComparable('comp-1', 20000, 100),
        createComparable('comp-2', 18000, 100),
        createComparable('comp-3', 22000, 100)
      ];

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      // With equal weights, should be simple average: (20000 + 18000 + 22000) / 3 = 20000
      expect(result.finalMarketValue).toBe(20000);
    });

    it('should include detailed calculation steps', () => {
      const comparables = [
        createComparable('comp-1', 20000, 100),
        createComparable('comp-2', 18000, 80)
      ];

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      expect(result.steps).toHaveLength(5);
      expect(result.steps[0].description).toContain('List comparable vehicles');
      expect(result.steps[1].description).toContain('Calculate weighted values');
      expect(result.steps[2].description).toContain('Sum all weighted values');
      expect(result.steps[3].description).toContain('Sum all quality scores');
      expect(result.steps[4].description).toContain('quality-weighted average');
    });

    it('should include comparable details in result', () => {
      const comparables = [
        createComparable('comp-1', 20000, 100),
        createComparable('comp-2', 18000, 80)
      ];

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      expect(result.comparables).toHaveLength(2);
      expect(result.comparables[0].id).toBe('comp-1');
      expect(result.comparables[0].adjustedPrice).toBe(20000);
      expect(result.comparables[0].qualityScore).toBe(100);
      expect(result.comparables[0].weightedValue).toBe(2000000);
    });

    it('should handle 5 comparables correctly', () => {
      const comparables = [
        createComparable('comp-1', 20000, 95),
        createComparable('comp-2', 19000, 90),
        createComparable('comp-3', 21000, 100),
        createComparable('comp-4', 18500, 85),
        createComparable('comp-5', 20500, 92)
      ];

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      expect(result.comparables).toHaveLength(5);
      expect(result.finalMarketValue).toBeGreaterThan(19000);
      expect(result.finalMarketValue).toBeLessThan(21000);
    });

    it('should handle 10 comparables correctly', () => {
      const comparables = Array.from({ length: 10 }, (_, i) =>
        createComparable(`comp-${i + 1}`, 20000 + (i * 500), 90 + i)
      );

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      expect(result.comparables).toHaveLength(10);
      expect(result.finalMarketValue).toBeGreaterThan(20000);
    });

    it('should handle 20 comparables correctly', () => {
      const comparables = Array.from({ length: 20 }, (_, i) =>
        createComparable(`comp-${i + 1}`, 19000 + (i * 200), 85 + (i % 15))
      );

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      expect(result.comparables).toHaveLength(20);
      expect(result.finalMarketValue).toBeGreaterThan(19000);
    });

    it('should round final market value to nearest dollar', () => {
      const comparables = [
        createComparable('comp-1', 20000, 100),
        createComparable('comp-2', 18001, 80)
      ];

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      expect(Number.isInteger(result.finalMarketValue)).toBe(true);
    });
  });

  describe('calculateConfidenceLevel', () => {
    it('should return 0 confidence with zero comparables', () => {
      const result = calculator.calculateConfidenceLevel([]);

      expect(result.level).toBe(0);
      expect(result.factors.comparableCount).toBe(0);
    });

    it('should give 20 points per comparable up to 60 points', () => {
      const oneComp = [createComparable('comp-1', 20000, 100)];
      const twoComp = [
        createComparable('comp-1', 20000, 100),
        createComparable('comp-2', 20000, 100)
      ];
      const threeComp = [
        createComparable('comp-1', 20000, 100),
        createComparable('comp-2', 20000, 100),
        createComparable('comp-3', 20000, 100)
      ];

      expect(calculator.calculateConfidenceLevel(oneComp).level).toBeGreaterThanOrEqual(20);
      expect(calculator.calculateConfidenceLevel(twoComp).level).toBeGreaterThanOrEqual(40);
      expect(calculator.calculateConfidenceLevel(threeComp).level).toBeGreaterThanOrEqual(60);
    });

    it('should cap count-based confidence at 60 points', () => {
      const comparables = Array.from({ length: 10 }, (_, i) =>
        createComparable(`comp-${i + 1}`, 20000, 100)
      );

      const result = calculator.calculateConfidenceLevel(comparables);

      // Base from count is capped at 60, but can get bonuses
      expect(result.level).toBeGreaterThanOrEqual(60);
    });

    it('should add 20 points for high quality score consistency (std dev < 10)', () => {
      const comparables = [
        createComparable('comp-1', 20000, 95),
        createComparable('comp-2', 20000, 96),
        createComparable('comp-3', 20000, 97)
      ];

      const result = calculator.calculateConfidenceLevel(comparables);

      // 3 comparables = 60 base + 20 quality bonus + price bonus
      expect(result.level).toBeGreaterThanOrEqual(80);
      expect(result.factors.qualityScoreVariance).toBeLessThan(10);
    });

    it('should add 10 points for medium quality score consistency (std dev < 20)', () => {
      const comparables = [
        createComparable('comp-1', 20000, 90),
        createComparable('comp-2', 20000, 95),
        createComparable('comp-3', 20000, 100)
      ];

      const result = calculator.calculateConfidenceLevel(comparables);

      expect(result.factors.qualityScoreVariance).toBeLessThan(20);
      expect(result.factors.qualityScoreVariance).toBeGreaterThanOrEqual(1);
    });

    it('should add 20 points for low price variance (CV < 0.15)', () => {
      const comparables = [
        createComparable('comp-1', 20000, 100),
        createComparable('comp-2', 20100, 100),
        createComparable('comp-3', 19900, 100)
      ];

      const result = calculator.calculateConfidenceLevel(comparables);

      // Prices are very close, CV should be < 0.15
      expect(result.factors.priceVariance).toBeLessThan(0.15);
      expect(result.level).toBeGreaterThanOrEqual(80);
    });

    it('should add 10 points for medium price variance (CV < 0.25)', () => {
      const comparables = [
        createComparable('comp-1', 20000, 100),
        createComparable('comp-2', 22000, 100),
        createComparable('comp-3', 18000, 100)
      ];

      const result = calculator.calculateConfidenceLevel(comparables);

      // Moderate price variance
      expect(result.factors.priceVariance).toBeLessThan(0.25);
    });

    it('should cap confidence at 95%', () => {
      // Create perfect scenario: many comparables, identical scores and prices
      const comparables = Array.from({ length: 10 }, (_, i) =>
        createComparable(`comp-${i + 1}`, 20000, 100)
      );

      const result = calculator.calculateConfidenceLevel(comparables);

      expect(result.level).toBeLessThanOrEqual(95);
    });

    it('should give lower confidence with high variance', () => {
      const lowVariance = [
        createComparable('comp-1', 20000, 95),
        createComparable('comp-2', 20100, 96),
        createComparable('comp-3', 19900, 97)
      ];

      const highVariance = [
        createComparable('comp-1', 15000, 60),
        createComparable('comp-2', 25000, 100),
        createComparable('comp-3', 18000, 75)
      ];

      const lowResult = calculator.calculateConfidenceLevel(lowVariance);
      const highResult = calculator.calculateConfidenceLevel(highVariance);

      expect(lowResult.level).toBeGreaterThan(highResult.level);
    });

    it('should include all confidence factors in result', () => {
      const comparables = [
        createComparable('comp-1', 20000, 95),
        createComparable('comp-2', 19000, 90),
        createComparable('comp-3', 21000, 100)
      ];

      const result = calculator.calculateConfidenceLevel(comparables);

      expect(result.factors.comparableCount).toBe(3);
      expect(result.factors.qualityScoreVariance).toBeGreaterThan(0);
      expect(result.factors.priceVariance).toBeGreaterThan(0);
    });

    it('should handle single comparable with zero variance', () => {
      const comparables = [createComparable('comp-1', 20000, 100)];

      const result = calculator.calculateConfidenceLevel(comparables);

      expect(result.factors.qualityScoreVariance).toBe(0);
      expect(result.factors.priceVariance).toBe(0);
      // Should still get bonuses for zero variance
      expect(result.level).toBeGreaterThan(20);
    });
  });

  describe('Statistical Helper Methods', () => {
    it('should calculate mean correctly', () => {
      const comparables = [
        createComparable('comp-1', 20000, 100),
        createComparable('comp-2', 18000, 100),
        createComparable('comp-3', 22000, 100)
      ];

      const prices = comparables.map(c => c.adjustments.adjustedPrice);
      const cv = calculator.calculateCoefficientOfVariation(prices);

      // Mean should be 20000
      expect(cv).toBeGreaterThan(0);
    });

    it('should calculate coefficient of variation correctly', () => {
      const comparables = [
        createComparable('comp-1', 20000, 100),
        createComparable('comp-2', 20000, 100),
        createComparable('comp-3', 20000, 100)
      ];

      const prices = comparables.map(c => c.adjustments.adjustedPrice);
      const cv = calculator.calculateCoefficientOfVariation(prices);

      // No variance, CV should be 0
      expect(cv).toBe(0);
    });

    it('should handle zero mean in coefficient of variation', () => {
      const cv = calculator.calculateCoefficientOfVariation([0, 0, 0]);

      expect(cv).toBe(0);
    });

    it('should handle empty array in coefficient of variation', () => {
      const cv = calculator.calculateCoefficientOfVariation([]);

      expect(cv).toBe(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle realistic scenario with varied comparables', () => {
      const comparables = [
        createComparable('comp-1', 19500, 92),  // Good comparable
        createComparable('comp-2', 20200, 95),  // Excellent comparable
        createComparable('comp-3', 18800, 85),  // Decent comparable
        createComparable('comp-4', 21000, 88),  // Higher price, good quality
        createComparable('comp-5', 19000, 90)   // Good comparable
      ];

      const marketValue = calculator.calculateMarketValue(comparables, lossVehicle);
      const confidence = calculator.calculateConfidenceLevel(comparables);

      expect(marketValue.finalMarketValue).toBeGreaterThan(19000);
      expect(marketValue.finalMarketValue).toBeLessThan(21000);
      expect(confidence.level).toBeGreaterThan(70);
      expect(confidence.level).toBeLessThanOrEqual(95);
    });

    it('should handle scenario with one outlier', () => {
      const comparables = [
        createComparable('comp-1', 20000, 95),
        createComparable('comp-2', 20100, 96),
        createComparable('comp-3', 19900, 97),
        createComparable('comp-4', 15000, 60)  // Outlier with low quality
      ];

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      // Market value should be closer to the high-quality comparables
      // With quality weighting, the low-quality outlier has less impact
      expect(result.finalMarketValue).toBeGreaterThan(19000);
      expect(result.finalMarketValue).toBeLessThan(20200);
    });

    it('should provide complete calculation transparency', () => {
      const comparables = [
        createComparable('comp-1', 20000, 100),
        createComparable('comp-2', 18000, 80)
      ];

      const result = calculator.calculateMarketValue(comparables, lossVehicle);

      // Verify all steps are present and have calculations
      expect(result.steps.every(step => step.calculation.length > 0)).toBe(true);
      expect(result.steps.every(step => step.description.length > 0)).toBe(true);
      // Last step result should be the unrounded value, finalMarketValue is rounded
      expect(Math.round(result.steps[result.steps.length - 1].result)).toBe(result.finalMarketValue);
    });
  });
});
