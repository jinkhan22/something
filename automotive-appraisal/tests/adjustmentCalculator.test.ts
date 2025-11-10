import { AdjustmentCalculator, EQUIPMENT_VALUES } from '../src/renderer/services/adjustmentCalculator';
import type { ComparableVehicle, ExtractedVehicleData } from '../src/types';

describe('AdjustmentCalculator', () => {
  let calculator: AdjustmentCalculator;
  let lossVehicle: ExtractedVehicleData;
  let comparable: ComparableVehicle;

  beforeEach(() => {
    calculator = new AdjustmentCalculator();
    
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

    comparable = {
      id: 'comp-1',
      appraisalId: 'appraisal-1',
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
      qualityScore: 95,
      qualityScoreBreakdown: {
        baseScore: 100,
        distancePenalty: 2,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 10,
        equipmentPenalty: 0,
        equipmentBonus: 15,
        finalScore: 95,
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
        adjustedPrice: 18000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('calculateMileageAdjustment', () => {
    it('should apply no adjustment for mileage difference below 1000 miles', () => {
      comparable.mileage = 50500; // 500 miles difference

      const result = calculator.calculateMileageAdjustment(comparable, lossVehicle);

      expect(result.mileageDifference).toBe(0);
      expect(result.adjustmentAmount).toBe(0);
      expect(result.explanation).toContain('below 1,000 mile threshold');
    });

    it('should use $0.25/mile rate for vehicles 0-3 years old', () => {
      const currentYear = new Date().getFullYear();
      comparable.year = currentYear - 2; // 2 years old
      comparable.mileage = 60000; // 10,000 miles higher

      const result = calculator.calculateMileageAdjustment(comparable, lossVehicle);

      expect(result.depreciationRate).toBe(0.25);
      expect(result.mileageDifference).toBe(10000);
      expect(result.adjustmentAmount).toBe(-2500); // -10000 * 0.25
      expect(result.explanation).toContain('0-3 years');
    });

    it('should use $0.15/mile rate for vehicles 4-7 years old', () => {
      const currentYear = new Date().getFullYear();
      comparable.year = currentYear - 5; // 5 years old
      comparable.mileage = 60000; // 10,000 miles higher

      const result = calculator.calculateMileageAdjustment(comparable, lossVehicle);

      expect(result.depreciationRate).toBe(0.15);
      expect(result.adjustmentAmount).toBe(-1500); // -10000 * 0.15
      expect(result.explanation).toContain('4-7 years');
    });

    it('should use $0.05/mile rate for vehicles 8+ years old', () => {
      const currentYear = new Date().getFullYear();
      comparable.year = currentYear - 10; // 10 years old
      comparable.mileage = 60000; // 10,000 miles higher

      const result = calculator.calculateMileageAdjustment(comparable, lossVehicle);

      expect(result.depreciationRate).toBe(0.05);
      expect(result.adjustmentAmount).toBe(-500); // -10000 * 0.05
      expect(result.explanation).toContain('8+ years');
    });

    it('should add value when comparable has lower mileage', () => {
      comparable.mileage = 40000; // 10,000 miles lower
      comparable.year = 2015;

      const result = calculator.calculateMileageAdjustment(comparable, lossVehicle);

      expect(result.mileageDifference).toBe(-10000);
      expect(result.adjustmentAmount).toBeGreaterThan(0); // Positive adjustment
      expect(result.explanation).toContain('lower');
    });

    it('should subtract value when comparable has higher mileage', () => {
      comparable.mileage = 60000; // 10,000 miles higher
      comparable.year = 2015;

      const result = calculator.calculateMileageAdjustment(comparable, lossVehicle);

      expect(result.mileageDifference).toBe(10000);
      expect(result.adjustmentAmount).toBeLessThan(0); // Negative adjustment
      expect(result.explanation).toContain('higher');
    });

    it('should handle exactly 1000 mile difference', () => {
      comparable.mileage = 51000; // Exactly 1000 miles higher
      comparable.year = 2015;

      const result = calculator.calculateMileageAdjustment(comparable, lossVehicle);

      expect(result.adjustmentAmount).not.toBe(0); // Should apply adjustment
    });
  });

  describe('calculateEquipmentAdjustments', () => {
    it('should return empty array when equipment matches perfectly', () => {
      const result = calculator.calculateEquipmentAdjustments(comparable, lossVehicle);

      expect(result).toHaveLength(0);
    });

    it('should add value for missing equipment', () => {
      comparable.equipment = ['Navigation']; // Missing Sunroof and Leather Seats

      const result = calculator.calculateEquipmentAdjustments(comparable, lossVehicle);

      expect(result).toHaveLength(2);
      expect(result.every(adj => adj.type === 'missing')).toBe(true);
      
      const sunroofAdj = result.find(adj => adj.feature === 'Sunroof');
      expect(sunroofAdj?.value).toBe(EQUIPMENT_VALUES['Sunroof']);
      expect(sunroofAdj?.explanation).toContain('missing');
    });

    it('should subtract value for extra equipment', () => {
      comparable.equipment = [
        'Navigation',
        'Sunroof',
        'Leather Seats',
        'Heated Seats',
        'Backup Camera'
      ];

      const result = calculator.calculateEquipmentAdjustments(comparable, lossVehicle);

      expect(result).toHaveLength(2);
      expect(result.every(adj => adj.type === 'extra')).toBe(true);
      
      const heatedSeatsAdj = result.find(adj => adj.feature === 'Heated Seats');
      expect(heatedSeatsAdj?.value).toBe(EQUIPMENT_VALUES['Heated Seats']);
      expect(heatedSeatsAdj?.explanation).toContain('extra');
    });

    it('should handle both missing and extra equipment', () => {
      comparable.equipment = ['Navigation', 'Heated Seats']; // Missing 2, has 1 extra

      const result = calculator.calculateEquipmentAdjustments(comparable, lossVehicle);

      const missingCount = result.filter(adj => adj.type === 'missing').length;
      const extraCount = result.filter(adj => adj.type === 'extra').length;

      expect(missingCount).toBe(2);
      expect(extraCount).toBe(1);
    });

    it('should be case-insensitive for equipment matching', () => {
      comparable.equipment = ['NAVIGATION', 'sunroof', 'Leather Seats'];

      const result = calculator.calculateEquipmentAdjustments(comparable, lossVehicle);

      expect(result).toHaveLength(0); // Should match perfectly
    });

    it('should use default value for unknown equipment', () => {
      comparable.equipment = ['Navigation', 'Sunroof', 'Leather Seats', 'Unknown Feature'];

      const result = calculator.calculateEquipmentAdjustments(comparable, lossVehicle);

      const unknownAdj = result.find(adj => adj.feature === 'Unknown Feature');
      expect(unknownAdj?.value).toBe(500); // Default value
    });

    it('should handle empty equipment lists', () => {
      comparable.equipment = [];

      const result = calculator.calculateEquipmentAdjustments(comparable, lossVehicle);

      expect(result).toHaveLength(3); // All 3 features missing
      expect(result.every(adj => adj.type === 'missing')).toBe(true);
    });

    it('should accept custom equipment values', () => {
      const customValues = new Map([
        ['Navigation', 2000],
        ['Sunroof', 1500]
      ]);
      comparable.equipment = ['Leather Seats']; // Missing Navigation and Sunroof

      const result = calculator.calculateEquipmentAdjustments(
        comparable,
        lossVehicle,
        customValues
      );

      const navAdj = result.find(adj => adj.feature === 'Navigation');
      expect(navAdj?.value).toBe(2000); // Custom value
    });
  });

  describe('calculateConditionAdjustment', () => {
    it('should apply no adjustment when conditions match', () => {
      comparable.condition = 'Good';

      const result = calculator.calculateConditionAdjustment(comparable, 'Good');

      expect(result.adjustmentAmount).toBe(0);
      expect(result.multiplier).toBe(1.0);
      expect(result.explanation).toContain('no adjustment needed');
    });

    it('should reduce price when comparable is in better condition', () => {
      comparable.condition = 'Excellent';
      comparable.listPrice = 20000;

      const result = calculator.calculateConditionAdjustment(comparable, 'Good');

      expect(result.adjustmentAmount).toBeLessThan(0); // Negative adjustment
      expect(result.comparableCondition).toBe('Excellent');
      expect(result.lossVehicleCondition).toBe('Good');
    });

    it('should increase price when comparable is in worse condition', () => {
      comparable.condition = 'Fair';
      comparable.listPrice = 16000;

      const result = calculator.calculateConditionAdjustment(comparable, 'Good');

      expect(result.adjustmentAmount).toBeGreaterThan(0); // Positive adjustment
    });

    it('should use 1.05 multiplier for Excellent condition', () => {
      comparable.condition = 'Excellent';
      comparable.listPrice = 21000; // 21000 / 1.05 = 20000

      const result = calculator.calculateConditionAdjustment(comparable, 'Good');

      // 21000 / 1.05 * 1.00 = 20000, adjustment = -1000
      expect(result.adjustmentAmount).toBeCloseTo(-1000, 0);
    });

    it('should use 1.00 multiplier for Good condition', () => {
      comparable.condition = 'Good';
      comparable.listPrice = 20000;

      const result = calculator.calculateConditionAdjustment(comparable, 'Good');

      expect(result.adjustmentAmount).toBe(0);
    });

    it('should use 0.95 multiplier for Fair condition', () => {
      comparable.condition = 'Fair';
      comparable.listPrice = 19000; // 19000 / 0.95 = 20000

      const result = calculator.calculateConditionAdjustment(comparable, 'Good');

      // 19000 / 0.95 * 1.00 = 20000, adjustment = +1000
      expect(result.adjustmentAmount).toBeCloseTo(1000, 0);
    });

    it('should use 0.85 multiplier for Poor condition', () => {
      comparable.condition = 'Poor';
      comparable.listPrice = 17000; // 17000 / 0.85 = 20000

      const result = calculator.calculateConditionAdjustment(comparable, 'Good');

      // 17000 / 0.85 * 1.00 = 20000, adjustment = +3000
      expect(result.adjustmentAmount).toBeCloseTo(3000, 0);
    });

    it('should handle adjusting from Poor to Excellent', () => {
      comparable.condition = 'Poor';
      comparable.listPrice = 17000;

      const result = calculator.calculateConditionAdjustment(comparable, 'Excellent');

      // 17000 / 0.85 * 1.05 = 21000, adjustment = +4000
      expect(result.adjustmentAmount).toBeGreaterThan(3000);
    });
  });

  describe('calculateTotalAdjustments', () => {
    it('should combine all adjustment types correctly', () => {
      comparable.mileage = 60000; // 10,000 miles higher
      comparable.year = 2015;
      comparable.equipment = ['Navigation']; // Missing 2 features
      comparable.condition = 'Fair';
      comparable.listPrice = 18000;

      const result = calculator.calculateTotalAdjustments(comparable, lossVehicle);

      expect(result.mileageAdjustment.adjustmentAmount).toBeLessThan(0);
      expect(result.equipmentAdjustments.length).toBeGreaterThan(0);
      expect(result.conditionAdjustment.adjustmentAmount).toBeGreaterThan(0);
      expect(result.adjustedPrice).toBe(comparable.listPrice + result.totalAdjustment);
    });

    it('should calculate adjusted price correctly', () => {
      comparable.mileage = 50000;
      comparable.equipment = ['Navigation', 'Sunroof', 'Leather Seats'];
      comparable.condition = 'Good';
      comparable.listPrice = 20000;

      const result = calculator.calculateTotalAdjustments(comparable, lossVehicle);

      expect(result.adjustedPrice).toBe(20000 + result.totalAdjustment);
    });

    it('should handle positive total adjustment', () => {
      comparable.mileage = 40000; // Lower mileage
      comparable.year = 2015;
      comparable.equipment = ['Navigation', 'Sunroof']; // Missing 1 feature
      comparable.condition = 'Fair'; // Worse condition
      comparable.listPrice = 16000;

      const result = calculator.calculateTotalAdjustments(comparable, lossVehicle);

      // Lower mileage adds value, missing equipment adds value, worse condition adds value
      expect(result.totalAdjustment).toBeGreaterThan(0);
      expect(result.adjustedPrice).toBeGreaterThan(comparable.listPrice);
    });

    it('should handle negative total adjustment', () => {
      comparable.mileage = 60000; // Higher mileage
      comparable.year = 2015;
      comparable.equipment = ['Navigation', 'Sunroof', 'Leather Seats', 'Heated Seats']; // Extra feature
      comparable.condition = 'Excellent'; // Better condition
      comparable.listPrice = 22000;

      const result = calculator.calculateTotalAdjustments(comparable, lossVehicle);

      // Higher mileage reduces value, extra equipment reduces value, better condition reduces value
      expect(result.totalAdjustment).toBeLessThan(0);
      expect(result.adjustedPrice).toBeLessThan(comparable.listPrice);
    });

    it('should use default Good condition when loss vehicle condition is undefined', () => {
      const lossWithoutCondition = { ...lossVehicle, condition: undefined };
      comparable.condition = 'Excellent';
      comparable.listPrice = 20000;

      const result = calculator.calculateTotalAdjustments(comparable, lossWithoutCondition);

      expect(result.conditionAdjustment.lossVehicleCondition).toBe('Good');
    });

    it('should accept custom equipment values', () => {
      const customValues = new Map([['Navigation', 2000]]);
      comparable.equipment = []; // Missing all equipment

      const result = calculator.calculateTotalAdjustments(
        comparable,
        lossVehicle,
        customValues
      );

      const navAdj = result.equipmentAdjustments.find(adj => adj.feature === 'Navigation');
      expect(navAdj?.value).toBe(2000);
    });

    it('should handle complex real-world scenario', () => {
      // Comparable: Higher mileage, missing equipment, worse condition
      const currentYear = new Date().getFullYear();
      comparable.mileage = 65000; // 15,000 miles higher
      comparable.year = currentYear - 5; // 5 years old, uses $0.15/mile rate
      comparable.equipment = ['Navigation']; // Missing Sunroof ($1200) and Leather Seats ($1000)
      comparable.condition = 'Fair'; // Worse than Good
      comparable.listPrice = 16500;

      const result = calculator.calculateTotalAdjustments(comparable, lossVehicle);

      // Mileage: -15000 * 0.15 = -2250 (negative, reduces value)
      // Equipment: +1200 + 1000 = +2200 (positive, adds value)
      // Condition: Fair to Good should add value
      // Net should be close to zero or slightly positive

      expect(result.mileageAdjustment.adjustmentAmount).toBeCloseTo(-2250, 0);
      expect(result.equipmentAdjustments.reduce((sum, adj) => sum + adj.value, 0)).toBe(2200);
      expect(result.conditionAdjustment.adjustmentAmount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty equipment arrays', () => {
      lossVehicle.equipment = [];
      comparable.equipment = [];

      const result = calculator.calculateTotalAdjustments(comparable, lossVehicle);

      expect(result.equipmentAdjustments).toHaveLength(0);
    });

    it('should handle very large mileage differences', () => {
      const currentYear = new Date().getFullYear();
      comparable.mileage = 200000; // 150,000 miles higher
      comparable.year = currentYear - 2; // 2 years old, uses $0.25/mile rate

      const result = calculator.calculateMileageAdjustment(comparable, lossVehicle);

      expect(result.adjustmentAmount).toBeLessThan(-10000); // Significant negative adjustment
    });

    it('should handle zero mileage', () => {
      lossVehicle.mileage = 0;
      comparable.mileage = 0;

      const result = calculator.calculateMileageAdjustment(comparable, lossVehicle);

      expect(result.adjustmentAmount).toBe(0);
    });

    it('should handle brand new vehicles (current year)', () => {
      const currentYear = new Date().getFullYear();
      comparable.year = currentYear;
      comparable.mileage = 60000;
      lossVehicle.mileage = 50000;

      const result = calculator.calculateMileageAdjustment(comparable, lossVehicle);

      expect(result.depreciationRate).toBe(0.25); // Highest rate for new vehicles
    });
  });
});
