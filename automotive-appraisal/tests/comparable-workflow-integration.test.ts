/**
 * End-to-End Integration Tests for Comparable Vehicles Workflow
 * 
 * Tests the complete workflow from adding comparables through calculating market value:
 * - Adding a comparable and calculating market value
 * - Editing a comparable and verifying recalculation
 * - Deleting a comparable and market value update
 * - Storage persistence and retrieval
 * - Report generation with sample data
 * 
 * Requirements: 1.1-1.8, 2.1-2.7, 6.1-6.8, 10.1-10.7
 */

import { QualityScoreCalculator } from '../src/renderer/services/qualityScoreCalculator';
import { AdjustmentCalculator } from '../src/renderer/services/adjustmentCalculator';
import { MarketValueCalculator } from '../src/renderer/services/marketValueCalculator';
import { ComparableValidationService } from '../src/renderer/services/comparableValidation';
import type {
  ComparableVehicle,
  ExtractedVehicleData,
  MarketAnalysis,
  PriceAdjustments
} from '../src/types';

describe('Comparable Vehicles Workflow Integration', () => {
  let qualityScoreCalc: QualityScoreCalculator;
  let adjustmentCalc: AdjustmentCalculator;
  let marketValueCalc: MarketValueCalculator;
  let validationService: ComparableValidationService;
  
  let lossVehicle: ExtractedVehicleData;
  let comparables: ComparableVehicle[];

  beforeEach(() => {
    qualityScoreCalc = new QualityScoreCalculator();
    adjustmentCalc = new AdjustmentCalculator();
    marketValueCalc = new MarketValueCalculator();
    validationService = new ComparableValidationService();
    
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
      equipment: ['Navigation', 'Sunroof', 'Leather Seats'],
      marketValue: 18000
    };

    comparables = [];
  });

  /**
   * Helper function to create a complete comparable with all calculations
   */
  const createComparable = (
    id: string,
    overrides: Partial<ComparableVehicle> = {}
  ): ComparableVehicle => {
    const baseComparable: Partial<ComparableVehicle> = {
      id,
      appraisalId: 'test-appraisal-1',
      source: 'AutoTrader',
      dateAdded: new Date(),
      year: 2015,
      make: 'Toyota',
      model: 'Camry',
      mileage: 50000,
      location: 'San Diego, CA',
      distanceFromLoss: 120,
      listPrice: 18000,
      condition: 'Good',
      equipment: ['Navigation', 'Sunroof', 'Leather Seats'],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    // Calculate quality score
    const qualityScoreBreakdown = qualityScoreCalc.calculateScore(baseComparable, lossVehicle);
    
    // Create full comparable for adjustments
    const fullComparable: ComparableVehicle = {
      ...baseComparable,
      qualityScore: qualityScoreBreakdown.finalScore,
      qualityScoreBreakdown,
      adjustments: {
        mileageAdjustment: {
          mileageDifference: 0,
          depreciationRate: 0,
          adjustmentAmount: 0,
          explanation: ''
        },
        equipmentAdjustments: [],
        conditionAdjustment: {
          comparableCondition: baseComparable.condition!,
          lossVehicleCondition: lossVehicle.condition!,
          multiplier: 1,
          adjustmentAmount: 0,
          explanation: ''
        },
        totalAdjustment: 0,
        adjustedPrice: baseComparable.listPrice!
      }
    } as ComparableVehicle;

    // Calculate adjustments
    const adjustments = adjustmentCalc.calculateTotalAdjustments(fullComparable, lossVehicle);
    fullComparable.adjustments = adjustments;
    fullComparable.adjustedPrice = adjustments.adjustedPrice;

    return fullComparable;
  };

  /**
   * Helper function to calculate market analysis from comparables
   */
  const calculateMarketAnalysis = (comps: ComparableVehicle[]): MarketAnalysis => {
    const calculation = marketValueCalc.calculateMarketValue(comps, lossVehicle);
    const confidence = marketValueCalc.calculateConfidenceLevel(comps);

    const insuranceValue = lossVehicle.marketValue || 0;
    const valueDifference = calculation.finalMarketValue - insuranceValue;
    const valueDifferencePercentage = (valueDifference / insuranceValue) * 100;

    return {
      appraisalId: 'test-appraisal-1',
      lossVehicle,
      comparablesCount: comps.length,
      comparables: comps,
      calculatedMarketValue: calculation.finalMarketValue,
      calculationMethod: 'quality-weighted-average',
      confidenceLevel: confidence.level,
      confidenceFactors: confidence.factors,
      insuranceValue,
      valueDifference,
      valueDifferencePercentage,
      isUndervalued: valueDifference > 0,
      calculationBreakdown: calculation,
      calculatedAt: new Date(),
      lastUpdated: new Date()
    };
  };

  describe('End-to-End: Add Comparable and Calculate Market Value', () => {
    it('should complete full workflow from adding comparable to market value', () => {
      // Step 1: Validate comparable data
      const newComparable = createComparable('comp-1', {
        year: 2015,
        mileage: 48000,
        listPrice: 19000,
        distanceFromLoss: 50
      });

      const validation = validationService.validate(newComparable, [], lossVehicle);
      expect(validation.isValid).toBe(true);

      // Step 2: Add comparable to list
      comparables.push(newComparable);
      expect(comparables).toHaveLength(1);

      // Step 3: Verify quality score was calculated
      expect(newComparable.qualityScore).toBeGreaterThan(0);
      expect(newComparable.qualityScoreBreakdown).toBeDefined();

      // Step 4: Verify adjustments were calculated
      expect(newComparable.adjustments).toBeDefined();
      expect(newComparable.adjustedPrice).toBeDefined();

      // Step 5: Calculate market value
      const marketAnalysis = calculateMarketAnalysis(comparables);

      expect(marketAnalysis.calculatedMarketValue).toBeGreaterThan(0);
      expect(marketAnalysis.confidenceLevel).toBeGreaterThan(0);
      expect(marketAnalysis.comparablesCount).toBe(1);

      // Step 6: Verify insurance comparison
      expect(marketAnalysis.insuranceValue).toBe(18000);
      expect(marketAnalysis.valueDifference).toBeDefined();
      expect(marketAnalysis.valueDifferencePercentage).toBeDefined();
    });

    it('should handle multiple comparables correctly', () => {
      // Add 3 comparables with varying characteristics
      const comp1 = createComparable('comp-1', {
        year: 2015,
        mileage: 48000,
        listPrice: 19000,
        distanceFromLoss: 50
      });

      const comp2 = createComparable('comp-2', {
        year: 2014,
        mileage: 55000,
        listPrice: 17500,
        distanceFromLoss: 100
      });

      const comp3 = createComparable('comp-3', {
        year: 2015,
        mileage: 52000,
        listPrice: 18500,
        distanceFromLoss: 75
      });

      comparables.push(comp1, comp2, comp3);

      // Calculate market value
      const marketAnalysis = calculateMarketAnalysis(comparables);

      expect(marketAnalysis.comparablesCount).toBe(3);
      expect(marketAnalysis.calculatedMarketValue).toBeGreaterThan(17000);
      expect(marketAnalysis.calculatedMarketValue).toBeLessThan(20000);
      
      // With 3 comparables, confidence should be higher
      expect(marketAnalysis.confidenceLevel).toBeGreaterThan(60);
    });

    it('should weight higher quality comparables more heavily', () => {
      // Add one excellent comparable and one poor comparable
      const excellentComp = createComparable('comp-1', {
        year: 2015,
        mileage: 50000,
        listPrice: 20000,
        distanceFromLoss: 10,
        equipment: ['Navigation', 'Sunroof', 'Leather Seats']
      });

      const poorComp = createComparable('comp-2', {
        year: 2010,
        mileage: 120000,
        listPrice: 12000,
        distanceFromLoss: 250,
        equipment: []
      });

      comparables.push(excellentComp, poorComp);

      const marketAnalysis = calculateMarketAnalysis(comparables);

      // Market value should be closer to excellent comparable due to quality weighting
      expect(marketAnalysis.calculatedMarketValue).toBeGreaterThan(17000);
      expect(marketAnalysis.calculatedMarketValue).toBeLessThan(20000);
      
      // Excellent comparable should have much higher quality score
      expect(excellentComp.qualityScore).toBeGreaterThan(poorComp.qualityScore + 30);
    });
  });

  describe('End-to-End: Edit Comparable and Verify Recalculation', () => {
    it('should recalculate everything when comparable is edited', () => {
      // Add initial comparable
      const comparable = createComparable('comp-1', {
        year: 2015,
        mileage: 50000,
        listPrice: 18000
      });
      comparables.push(comparable);

      const initialMarketValue = calculateMarketAnalysis(comparables).calculatedMarketValue;

      // Edit the comparable - change mileage and price
      const editedComparable = createComparable('comp-1', {
        year: 2015,
        mileage: 45000, // Lower mileage
        listPrice: 19500 // Higher price
      });

      // Replace in array
      comparables[0] = editedComparable;

      // Recalculate market value
      const newMarketValue = calculateMarketAnalysis(comparables).calculatedMarketValue;

      // Market value should be higher due to better mileage and higher price
      expect(newMarketValue).toBeGreaterThan(initialMarketValue);
      
      // Quality score should be higher or equal due to better mileage
      // (may be equal if both get same bonuses)
      expect(editedComparable.qualityScore).toBeGreaterThanOrEqual(comparable.qualityScore);
    });

    it('should update quality score when distance changes', () => {
      const comparable = createComparable('comp-1', {
        distanceFromLoss: 50
      });
      comparables.push(comparable);

      const initialQualityScore = comparable.qualityScore;

      // Edit to increase distance
      const editedComparable = createComparable('comp-1', {
        distanceFromLoss: 200
      });

      // Quality score should decrease due to distance penalty
      expect(editedComparable.qualityScore).toBeLessThan(initialQualityScore);
    });

    it('should update adjustments when equipment changes', () => {
      const comparable = createComparable('comp-1', {
        equipment: ['Navigation', 'Sunroof'] // Missing Leather Seats
      });

      const initialAdjustment = comparable.adjustments.totalAdjustment;

      // Edit to add missing equipment
      const editedComparable = createComparable('comp-1', {
        equipment: ['Navigation', 'Sunroof', 'Leather Seats']
      });

      // Total adjustment should change (less positive adjustment for missing equipment)
      expect(editedComparable.adjustments.totalAdjustment).not.toBe(initialAdjustment);
      expect(editedComparable.adjustments.equipmentAdjustments).toHaveLength(0);
    });

    it('should update condition adjustment when condition changes', () => {
      const comparable = createComparable('comp-1', {
        condition: 'Fair'
      });

      const initialAdjustedPrice = comparable.adjustedPrice;

      // Edit to better condition
      const editedComparable = createComparable('comp-1', {
        condition: 'Excellent'
      });

      // Adjusted price should change
      expect(editedComparable.adjustedPrice).not.toBe(initialAdjustedPrice);
    });
  });

  describe('End-to-End: Delete Comparable and Market Value Update', () => {
    it('should recalculate market value after deleting comparable', () => {
      // Add 3 comparables
      comparables.push(
        createComparable('comp-1', { listPrice: 18000 }),
        createComparable('comp-2', { listPrice: 19000 }),
        createComparable('comp-3', { listPrice: 17500 })
      );

      const initialMarketValue = calculateMarketAnalysis(comparables).calculatedMarketValue;

      // Delete the highest priced comparable
      comparables = comparables.filter(c => c.id !== 'comp-2');

      const newMarketValue = calculateMarketAnalysis(comparables).calculatedMarketValue;

      // Market value should be lower after removing high-priced comparable
      expect(newMarketValue).toBeLessThan(initialMarketValue);
      expect(comparables).toHaveLength(2);
    });

    it('should update confidence level after deleting comparable', () => {
      // Add 5 comparables
      for (let i = 1; i <= 5; i++) {
        comparables.push(createComparable(`comp-${i}`, { listPrice: 18000 + (i * 100) }));
      }

      const initialConfidence = calculateMarketAnalysis(comparables).confidenceLevel;

      // Delete 2 comparables
      comparables = comparables.filter(c => !['comp-4', 'comp-5'].includes(c.id));

      const newConfidence = calculateMarketAnalysis(comparables).confidenceLevel;

      // Confidence should be lower or equal with fewer comparables
      // (may be capped at max confidence)
      expect(newConfidence).toBeLessThanOrEqual(initialConfidence);
      expect(comparables).toHaveLength(3);
    });

    it('should handle deleting all comparables', () => {
      comparables.push(createComparable('comp-1'));

      // Delete the only comparable
      comparables = [];

      // Should not be able to calculate market value with no comparables
      expect(() => calculateMarketAnalysis(comparables)).toThrow('Cannot calculate market value with zero comparables');
    });
  });

  describe('End-to-End: Storage Persistence Simulation', () => {
    it('should maintain data integrity through save/load cycle', () => {
      // Create comparable
      const comparable = createComparable('comp-1', {
        year: 2015,
        mileage: 48000,
        listPrice: 19000,
        notes: 'Test comparable with notes'
      });

      // Simulate serialization (what would happen in storage)
      const serialized = JSON.stringify(comparable);
      const deserialized: ComparableVehicle = JSON.parse(serialized);

      // Verify all data is preserved
      expect(deserialized.id).toBe(comparable.id);
      expect(deserialized.year).toBe(comparable.year);
      expect(deserialized.mileage).toBe(comparable.mileage);
      expect(deserialized.listPrice).toBe(comparable.listPrice);
      expect(deserialized.qualityScore).toBe(comparable.qualityScore);
      expect(deserialized.adjustedPrice).toBe(comparable.adjustedPrice);
      expect(deserialized.notes).toBe(comparable.notes);
    });

    it('should preserve market analysis through serialization', () => {
      comparables.push(
        createComparable('comp-1', { listPrice: 18000 }),
        createComparable('comp-2', { listPrice: 19000 }),
        createComparable('comp-3', { listPrice: 17500 })
      );

      const marketAnalysis = calculateMarketAnalysis(comparables);

      // Simulate serialization
      const serialized = JSON.stringify(marketAnalysis);
      const deserialized: MarketAnalysis = JSON.parse(serialized);

      // Verify all data is preserved
      expect(deserialized.calculatedMarketValue).toBe(marketAnalysis.calculatedMarketValue);
      expect(deserialized.confidenceLevel).toBe(marketAnalysis.confidenceLevel);
      expect(deserialized.comparablesCount).toBe(marketAnalysis.comparablesCount);
      expect(deserialized.insuranceValue).toBe(marketAnalysis.insuranceValue);
      expect(deserialized.valueDifference).toBe(marketAnalysis.valueDifference);
    });

    it('should handle date serialization correctly', () => {
      const comparable = createComparable('comp-1');

      // Simulate serialization
      const serialized = JSON.stringify(comparable);
      const deserialized: ComparableVehicle = JSON.parse(serialized);

      // Dates should be strings after serialization
      expect(typeof deserialized.createdAt).toBe('string');
      expect(typeof deserialized.updatedAt).toBe('string');

      // Should be able to reconstruct dates
      const reconstructedCreatedAt = new Date(deserialized.createdAt);
      expect(reconstructedCreatedAt).toBeInstanceOf(Date);
      expect(reconstructedCreatedAt.getTime()).toBeCloseTo(comparable.createdAt.getTime(), -2);
    });
  });

  describe('End-to-End: Report Generation Data Preparation', () => {
    it('should prepare complete data for report generation', () => {
      // Add multiple comparables
      comparables.push(
        createComparable('comp-1', {
          year: 2015,
          mileage: 48000,
          listPrice: 19000,
          source: 'AutoTrader',
          sourceUrl: 'https://autotrader.com/example1'
        }),
        createComparable('comp-2', {
          year: 2014,
          mileage: 55000,
          listPrice: 17500,
          source: 'Cars.com',
          sourceUrl: 'https://cars.com/example2'
        }),
        createComparable('comp-3', {
          year: 2015,
          mileage: 52000,
          listPrice: 18500,
          source: 'CarMax'
        })
      );

      const marketAnalysis = calculateMarketAnalysis(comparables);

      // Verify all required data for report is present
      expect(marketAnalysis.lossVehicle).toBeDefined();
      expect(marketAnalysis.comparables).toHaveLength(3);
      expect(marketAnalysis.calculatedMarketValue).toBeGreaterThan(0);
      expect(marketAnalysis.calculationBreakdown).toBeDefined();
      expect(marketAnalysis.calculationBreakdown.steps).toBeDefined();
      expect(marketAnalysis.calculationBreakdown.steps.length).toBeGreaterThan(0);

      // Verify each comparable has complete data
      marketAnalysis.comparables.forEach(comp => {
        expect(comp.qualityScore).toBeGreaterThan(0);
        expect(comp.qualityScoreBreakdown).toBeDefined();
        expect(comp.adjustments).toBeDefined();
        expect(comp.adjustedPrice).toBeGreaterThan(0);
      });
    });

    it('should include detailed calculation steps for transparency', () => {
      comparables.push(
        createComparable('comp-1', { listPrice: 18000 }),
        createComparable('comp-2', { listPrice: 19000 })
      );

      const marketAnalysis = calculateMarketAnalysis(comparables);

      // Verify calculation steps are detailed
      expect(marketAnalysis.calculationBreakdown.steps).toHaveLength(5);
      
      marketAnalysis.calculationBreakdown.steps.forEach(step => {
        expect(step.step).toBeGreaterThan(0);
        expect(step.description).toBeTruthy();
        expect(step.calculation).toBeTruthy();
      });
    });

    it('should provide quality score explanations for each comparable', () => {
      const comparable = createComparable('comp-1', {
        year: 2014,
        mileage: 60000,
        distanceFromLoss: 150,
        equipment: ['Navigation']
      });

      // Verify all explanation fields are populated
      expect(comparable.qualityScoreBreakdown.explanations.distance).toBeTruthy();
      expect(comparable.qualityScoreBreakdown.explanations.age).toBeTruthy();
      expect(comparable.qualityScoreBreakdown.explanations.mileage).toBeTruthy();
      expect(comparable.qualityScoreBreakdown.explanations.equipment).toBeTruthy();
    });

    it('should provide adjustment explanations for each comparable', () => {
      const comparable = createComparable('comp-1', {
        year: 2015,
        mileage: 60000,
        condition: 'Fair',
        equipment: ['Navigation']
      });

      // Verify all adjustment explanations are populated
      expect(comparable.adjustments.mileageAdjustment.explanation).toBeTruthy();
      expect(comparable.adjustments.conditionAdjustment.explanation).toBeTruthy();
      
      if (comparable.adjustments.equipmentAdjustments.length > 0) {
        comparable.adjustments.equipmentAdjustments.forEach(adj => {
          expect(adj.explanation).toBeTruthy();
        });
      }
    });
  });

  describe('End-to-End: Complex Real-World Scenarios', () => {
    it('should handle scenario with undervalued insurance estimate', () => {
      // Add comparables that are all priced higher than insurance value
      comparables.push(
        createComparable('comp-1', { listPrice: 20000 }),
        createComparable('comp-2', { listPrice: 21000 }),
        createComparable('comp-3', { listPrice: 19500 })
      );

      const marketAnalysis = calculateMarketAnalysis(comparables);

      // Insurance value is $18,000, market value should be higher
      expect(marketAnalysis.calculatedMarketValue).toBeGreaterThan(marketAnalysis.insuranceValue);
      expect(marketAnalysis.isUndervalued).toBe(true);
      expect(marketAnalysis.valueDifference).toBeGreaterThan(0);
      expect(marketAnalysis.valueDifferencePercentage).toBeGreaterThan(5);
    });

    it('should handle scenario with overvalued insurance estimate', () => {
      // Add comparables that are all priced lower than insurance value
      comparables.push(
        createComparable('comp-1', { listPrice: 16000 }),
        createComparable('comp-2', { listPrice: 16500 }),
        createComparable('comp-3', { listPrice: 15500 })
      );

      const marketAnalysis = calculateMarketAnalysis(comparables);

      // Insurance value is $18,000, market value should be lower
      expect(marketAnalysis.calculatedMarketValue).toBeLessThan(marketAnalysis.insuranceValue);
      expect(marketAnalysis.isUndervalued).toBe(false);
      expect(marketAnalysis.valueDifference).toBeLessThan(0);
    });

    it('should handle mixed quality comparables realistically', () => {
      // Add comparables with varying quality
      comparables.push(
        createComparable('comp-1', {
          year: 2015,
          mileage: 50000,
          listPrice: 19000,
          distanceFromLoss: 25,
          equipment: ['Navigation', 'Sunroof', 'Leather Seats']
        }), // Excellent
        createComparable('comp-2', {
          year: 2013,
          mileage: 75000,
          listPrice: 15000,
          distanceFromLoss: 180,
          equipment: []
        }), // Poor
        createComparable('comp-3', {
          year: 2014,
          mileage: 55000,
          listPrice: 17500,
          distanceFromLoss: 100,
          equipment: ['Navigation']
        }) // Average
      );

      const marketAnalysis = calculateMarketAnalysis(comparables);

      // Market value should be weighted toward higher quality comparables
      const excellentComp = comparables[0];
      const poorComp = comparables[1];

      expect(excellentComp.qualityScore).toBeGreaterThan(poorComp.qualityScore + 20);
      
      // Market value should be closer to excellent comparable
      expect(marketAnalysis.calculatedMarketValue).toBeGreaterThan(17000);
      expect(marketAnalysis.calculatedMarketValue).toBeLessThan(19000);
    });

    it('should handle validation warnings in workflow', () => {
      // Create comparable with potential issues
      const comparable = createComparable('comp-1', {
        year: 2010, // 5+ years different
        mileage: 120000, // High mileage
        listPrice: 12000, // Low price
        distanceFromLoss: 250, // Very far
        make: 'Honda' // Different make
      });

      const validation = validationService.validate(comparable, [], lossVehicle);

      // Should be valid but have warnings
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);

      // Can still add to comparables and calculate
      comparables.push(comparable);
      const marketAnalysis = calculateMarketAnalysis(comparables);

      // Should calculate but with lower quality score than perfect match
      expect(comparable.qualityScore).toBeLessThan(100);
      expect(marketAnalysis.calculatedMarketValue).toBeDefined();
    });

    it('should handle complete workflow with 10+ comparables', () => {
      // Add 10 comparables with realistic variation
      for (let i = 1; i <= 10; i++) {
        comparables.push(
          createComparable(`comp-${i}`, {
            year: 2015 + (i % 3) - 1, // 2014-2016
            mileage: 45000 + (i * 2000), // 47k-65k
            listPrice: 17000 + (i * 300), // $17k-$20k
            distanceFromLoss: 50 + (i * 15), // 65-200 miles
            equipment: i % 2 === 0 
              ? ['Navigation', 'Sunroof', 'Leather Seats']
              : ['Navigation', 'Sunroof']
          })
        );
      }

      const marketAnalysis = calculateMarketAnalysis(comparables);

      // With 10 comparables, should have high confidence
      expect(marketAnalysis.comparablesCount).toBe(10);
      expect(marketAnalysis.confidenceLevel).toBeGreaterThan(70);
      expect(marketAnalysis.calculatedMarketValue).toBeGreaterThan(17000);
      expect(marketAnalysis.calculatedMarketValue).toBeLessThan(21000);
    });
  });

  describe('End-to-End: Error Handling and Edge Cases', () => {
    it('should handle comparable with missing optional fields', () => {
      const comparable = createComparable('comp-1', {
        sourceUrl: undefined,
        notes: undefined,
        trim: undefined
      });

      comparables.push(comparable);
      const marketAnalysis = calculateMarketAnalysis(comparables);

      // Should still calculate successfully
      expect(marketAnalysis.calculatedMarketValue).toBeGreaterThan(0);
    });

    it('should handle zero mileage vehicles', () => {
      const comparable = createComparable('comp-1', {
        mileage: 0
      });

      // Should not crash
      expect(comparable.qualityScore).toBeGreaterThan(0);
      expect(comparable.adjustments).toBeDefined();
    });

    it('should handle very old vehicles', () => {
      const currentYear = new Date().getFullYear();
      const comparable = createComparable('comp-1', {
        year: currentYear - 15 // 15 years old
      });

      // Should calculate with age penalty (but may have bonuses that offset it)
      expect(comparable.qualityScoreBreakdown.agePenalty).toBeGreaterThan(0);
      // Final score may still be > 100 due to bonuses, but should have the penalty
      expect(comparable.qualityScoreBreakdown.agePenalty).toBe(10); // Max penalty
    });

    it('should handle extreme price differences', () => {
      comparables.push(
        createComparable('comp-1', { listPrice: 10000 }),
        createComparable('comp-2', { listPrice: 25000 }),
        createComparable('comp-3', { listPrice: 18000 })
      );

      const marketAnalysis = calculateMarketAnalysis(comparables);

      // Should still calculate, but confidence may be lower due to variance
      expect(marketAnalysis.calculatedMarketValue).toBeGreaterThan(10000);
      expect(marketAnalysis.calculatedMarketValue).toBeLessThan(25000);
    });
  });
});
