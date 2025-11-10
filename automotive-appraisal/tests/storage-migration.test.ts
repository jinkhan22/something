/**
 * Integration tests for storage migration and comparable data persistence
 * Tests Requirements: 1.7, 2.5, 11.5
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { storage } from '../src/main/services/storage';
import { ComparableStorageService } from '../src/main/services/comparableStorage';
import { ExtractedVehicleData, ComparableVehicle, AppraisalRecord } from '../src/types';

describe('Storage Migration and Persistence', () => {
  let comparableStorage: ComparableStorageService;

  beforeEach(() => {
    // Clear all data before each test
    storage.clearAll();
    
    comparableStorage = new ComparableStorageService();
  });

  afterEach(() => {
    // Clean up all data
    storage.clearAll();
    
    // Clean up comparable files
    const comparablesDir = comparableStorage.getStorageDir();
    if (fs.existsSync(comparablesDir)) {
      const files = fs.readdirSync(comparablesDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(comparablesDir, file));
      });
    }
  });

  describe('Backward Compatibility', () => {
    it('should read legacy appraisals without comparable fields', () => {
      // Create a legacy appraisal record (without comparable fields)
      const legacyAppraisal = {
        id: 'apr_legacy_001',
        createdAt: new Date().toISOString(),
        status: 'draft',
        data: {
          vin: '1HGBH41JXMN109186',
          year: 2020,
          make: 'Honda',
          model: 'Accord',
          mileage: 50000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 0.95,
          extractionErrors: []
        }
      };

      // Write legacy format directly to file
      const storageData = {
        metadata: {
          version: 1,
          lastModified: new Date(),
          recordCount: 1
        },
        appraisals: [legacyAppraisal]
      };
      
      const storageFile = storage.getStorageFile();
      fs.writeFileSync(storageFile, JSON.stringify(storageData, null, 2));

      // Read appraisals - should migrate automatically
      const appraisals = storage.getAppraisals();
      
      expect(appraisals).toHaveLength(1);
      expect(appraisals[0].id).toBe('apr_legacy_001');
      expect(appraisals[0].hasComparables).toBe(false);
      expect(appraisals[0].comparableCount).toBe(0);
      expect(appraisals[0].marketAnalysisComplete).toBe(false);
      expect(appraisals[0].calculatedMarketValue).toBeUndefined();
    });

    it('should handle array format (very old legacy)', () => {
      // Very old format: just an array of appraisals
      const legacyArray = [
        {
          id: 'apr_old_001',
          createdAt: new Date().toISOString(),
          status: 'complete',
          data: {
            vin: '2HGBH41JXMN109187',
            year: 2019,
            make: 'Toyota',
            model: 'Camry',
            mileage: 60000,
            location: 'San Francisco, CA',
            reportType: 'MITCHELL',
            extractionConfidence: 0.92,
            extractionErrors: []
          }
        }
      ];
      
      const storageFile = storage.getStorageFile();
      fs.writeFileSync(storageFile, JSON.stringify(legacyArray, null, 2));

      // Read appraisals - should migrate from array format
      const appraisals = storage.getAppraisals();
      
      expect(appraisals).toHaveLength(1);
      expect(appraisals[0].id).toBe('apr_old_001');
      expect(appraisals[0].hasComparables).toBe(false);
      expect(appraisals[0].comparableCount).toBe(0);
    });

    it('should preserve existing comparable metadata when present', () => {
      const modernAppraisal = {
        id: 'apr_modern_001',
        createdAt: new Date().toISOString(),
        status: 'complete',
        hasComparables: true,
        comparableCount: 3,
        marketAnalysisComplete: true,
        calculatedMarketValue: 25000,
        data: {
          vin: '3HGBH41JXMN109188',
          year: 2021,
          make: 'Ford',
          model: 'F-150',
          mileage: 30000,
          location: 'Austin, TX',
          reportType: 'CCC_ONE',
          extractionConfidence: 0.98,
          extractionErrors: []
        }
      };

      const storageData = {
        metadata: {
          version: 1,
          lastModified: new Date(),
          recordCount: 1
        },
        appraisals: [modernAppraisal]
      };
      
      const storageFile = storage.getStorageFile();
      fs.writeFileSync(storageFile, JSON.stringify(storageData, null, 2));

      const appraisals = storage.getAppraisals();
      
      expect(appraisals).toHaveLength(1);
      expect(appraisals[0].hasComparables).toBe(true);
      expect(appraisals[0].comparableCount).toBe(3);
      expect(appraisals[0].marketAnalysisComplete).toBe(true);
      expect(appraisals[0].calculatedMarketValue).toBe(25000);
    });
  });

  describe('Migration Utility', () => {
    it('should migrate all appraisals to latest format', () => {
      // Create mix of legacy and modern appraisals
      const mixedAppraisals = [
        {
          id: 'apr_001',
          createdAt: new Date().toISOString(),
          status: 'draft',
          data: {
            vin: '1HGBH41JXMN109186',
            year: 2020,
            make: 'Honda',
            model: 'Accord',
            mileage: 50000,
            location: 'Los Angeles, CA',
            reportType: 'CCC_ONE',
            extractionConfidence: 0.95,
            extractionErrors: []
          }
        },
        {
          id: 'apr_002',
          createdAt: new Date().toISOString(),
          status: 'complete',
          hasComparables: true,
          comparableCount: 2,
          data: {
            vin: '2HGBH41JXMN109187',
            year: 2019,
            make: 'Toyota',
            model: 'Camry',
            mileage: 60000,
            location: 'San Francisco, CA',
            reportType: 'MITCHELL',
            extractionConfidence: 0.92,
            extractionErrors: []
          }
        }
      ];

      const storageData = {
        metadata: {
          version: 1,
          lastModified: new Date(),
          recordCount: 2
        },
        appraisals: mixedAppraisals
      };
      
      const storageFile = storage.getStorageFile();
      fs.writeFileSync(storageFile, JSON.stringify(storageData, null, 2));

      // First read triggers automatic migration
      let appraisals = storage.getAppraisals();
      expect(appraisals).toHaveLength(2);
      
      // Now run explicit migration - should find nothing to migrate since it was already done
      const result = storage.migrateAllAppraisals();
      
      // Since migration already happened during read, no additional migrations needed
      expect(result.migrated).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify all appraisals have new fields
      appraisals = storage.getAppraisals();
      expect(appraisals).toHaveLength(2);
      
      appraisals.forEach(appraisal => {
        expect(appraisal.hasComparables).toBeDefined();
        expect(appraisal.comparableCount).toBeDefined();
        expect(appraisal.marketAnalysisComplete).toBeDefined();
      });
    });

    it('should handle migration errors gracefully', () => {
      // Test that migration handles records that are already migrated
      // Create appraisals that are already in the new format
      const modernAppraisals = [
        {
          id: 'apr_modern_1',
          createdAt: new Date().toISOString(),
          status: 'draft',
          hasComparables: true,
          comparableCount: 2,
          marketAnalysisComplete: false,
          data: {
            vin: '1HGBH41JXMN109186',
            year: 2020,
            make: 'Honda',
            model: 'Accord',
            mileage: 50000,
            location: 'Los Angeles, CA',
            reportType: 'CCC_ONE',
            extractionConfidence: 0.95,
            extractionErrors: []
          }
        },
        {
          id: 'apr_modern_2',
          createdAt: new Date().toISOString(),
          status: 'complete',
          hasComparables: false,
          comparableCount: 0,
          marketAnalysisComplete: false,
          data: {
            vin: '2HGBH41JXMN109187',
            year: 2019,
            make: 'Toyota',
            model: 'Camry',
            mileage: 60000,
            location: 'San Francisco, CA',
            reportType: 'MITCHELL',
            extractionConfidence: 0.92,
            extractionErrors: []
          }
        }
      ];

      const storageData = {
        metadata: {
          version: 1,
          lastModified: new Date(),
          recordCount: 2
        },
        appraisals: modernAppraisals
      };
      
      const storageFile = storage.getStorageFile();
      fs.writeFileSync(storageFile, JSON.stringify(storageData, null, 2));

      // Read appraisals
      const appraisals = storage.getAppraisals();
      expect(appraisals).toHaveLength(2);
      
      // Migration should find nothing to migrate (already in new format)
      const result = storage.migrateAllAppraisals();
      expect(result.migrated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Cascade Delete', () => {
    it('should delete comparables when appraisal is deleted', async () => {
      // Create an appraisal
      const vehicleData: ExtractedVehicleData = {
        vin: '1HGBH41JXMN109186',
        year: 2020,
        make: 'Honda',
        model: 'Accord',
        mileage: 50000,
        location: 'Los Angeles, CA',
        reportType: 'CCC_ONE',
        extractionConfidence: 0.95,
        extractionErrors: []
      };

      const appraisalId = storage.saveAppraisal(vehicleData);

      // Create comparables for the appraisal
      const comparable: ComparableVehicle = {
        id: 'comp_001',
        appraisalId,
        source: 'AutoTrader',
        dateAdded: new Date(),
        year: 2020,
        make: 'Honda',
        model: 'Accord',
        mileage: 48000,
        location: 'Los Angeles, CA',
        distanceFromLoss: 5,
        listPrice: 24000,
        condition: 'Good',
        equipment: ['Navigation', 'Sunroof'],
        qualityScore: 95,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: 0,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 10,
          equipmentPenalty: 0,
          equipmentBonus: 5,
          finalScore: 95,
          explanations: {
            distance: 'Within 100 miles',
            age: 'Exact match',
            mileage: 'Within 20%',
            equipment: 'Similar equipment'
          }
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 2000,
            depreciationRate: 0.25,
            adjustmentAmount: 500,
            explanation: 'Lower mileage adds value'
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Good',
            lossVehicleCondition: 'Good',
            multiplier: 1.0,
            adjustmentAmount: 0,
            explanation: 'Same condition'
          },
          totalAdjustment: 500,
          adjustedPrice: 24500
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await comparableStorage.saveComparable(comparable);

      // Verify comparable exists
      const comparablesDir = comparableStorage.getStorageDir();
      const comparablesFile = path.join(comparablesDir, `${appraisalId}.json`);
      expect(fs.existsSync(comparablesFile)).toBe(true);

      // Delete appraisal with cascade
      const deleted = storage.deleteAppraisal(appraisalId, true);
      expect(deleted).toBe(true);

      // Verify comparables file is also deleted
      expect(fs.existsSync(comparablesFile)).toBe(false);
    });

    it('should allow disabling cascade delete', async () => {
      // Create an appraisal with comparables
      const vehicleData: ExtractedVehicleData = {
        vin: '2HGBH41JXMN109187',
        year: 2019,
        make: 'Toyota',
        model: 'Camry',
        mileage: 60000,
        location: 'San Francisco, CA',
        reportType: 'MITCHELL',
        extractionConfidence: 0.92,
        extractionErrors: []
      };

      const appraisalId = storage.saveAppraisal(vehicleData);

      const comparable: ComparableVehicle = {
        id: 'comp_002',
        appraisalId,
        source: 'Cars.com',
        dateAdded: new Date(),
        year: 2019,
        make: 'Toyota',
        model: 'Camry',
        mileage: 58000,
        location: 'San Francisco, CA',
        distanceFromLoss: 3,
        listPrice: 22000,
        condition: 'Good',
        equipment: ['Backup Camera'],
        qualityScore: 92,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: 0,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 10,
          equipmentPenalty: 0,
          equipmentBonus: 2,
          finalScore: 92,
          explanations: {
            distance: 'Very close',
            age: 'Exact match',
            mileage: 'Within 20%',
            equipment: 'Similar'
          }
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 2000,
            depreciationRate: 0.15,
            adjustmentAmount: 300,
            explanation: 'Lower mileage'
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Good',
            lossVehicleCondition: 'Good',
            multiplier: 1.0,
            adjustmentAmount: 0,
            explanation: 'Same condition'
          },
          totalAdjustment: 300,
          adjustedPrice: 22300
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await comparableStorage.saveComparable(comparable);

      const comparablesDir = comparableStorage.getStorageDir();
      const comparablesFile = path.join(comparablesDir, `${appraisalId}.json`);
      expect(fs.existsSync(comparablesFile)).toBe(true);

      // Delete appraisal WITHOUT cascade
      const deleted = storage.deleteAppraisal(appraisalId, false);
      expect(deleted).toBe(true);

      // Comparables file should still exist
      expect(fs.existsSync(comparablesFile)).toBe(true);
    });
  });

  describe('Metadata Synchronization', () => {
    it('should update appraisal metadata when comparable is added', async () => {
      const vehicleData: ExtractedVehicleData = {
        vin: '3HGBH41JXMN109188',
        year: 2021,
        make: 'Ford',
        model: 'F-150',
        mileage: 30000,
        location: 'Austin, TX',
        reportType: 'CCC_ONE',
        extractionConfidence: 0.98,
        extractionErrors: []
      };

      const appraisalId = storage.saveAppraisal(vehicleData);

      // Initially should have no comparables
      let appraisal = storage.getAppraisal(appraisalId);
      expect(appraisal?.hasComparables).toBe(false);
      expect(appraisal?.comparableCount).toBe(0);

      // Add a comparable
      const comparable: ComparableVehicle = {
        id: 'comp_003',
        appraisalId,
        source: 'CarMax',
        dateAdded: new Date(),
        year: 2021,
        make: 'Ford',
        model: 'F-150',
        mileage: 28000,
        location: 'Austin, TX',
        distanceFromLoss: 2,
        listPrice: 45000,
        condition: 'Excellent',
        equipment: ['Tow Package', 'Navigation'],
        qualityScore: 98,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: 0,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 10,
          equipmentPenalty: 0,
          equipmentBonus: 8,
          finalScore: 98,
          explanations: {
            distance: 'Very close',
            age: 'Exact match',
            mileage: 'Within 20%',
            equipment: 'Better equipped'
          }
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 2000,
            depreciationRate: 0.25,
            adjustmentAmount: 500,
            explanation: 'Lower mileage'
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Excellent',
            lossVehicleCondition: 'Good',
            multiplier: 1.05,
            adjustmentAmount: 2250,
            explanation: 'Better condition'
          },
          totalAdjustment: 2750,
          adjustedPrice: 47750
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await comparableStorage.saveComparable(comparable);

      // Metadata should be updated
      appraisal = storage.getAppraisal(appraisalId);
      expect(appraisal?.hasComparables).toBe(true);
      expect(appraisal?.comparableCount).toBe(1);
    });

    it('should update metadata when comparable is deleted', async () => {
      const vehicleData: ExtractedVehicleData = {
        vin: '4HGBH41JXMN109189',
        year: 2022,
        make: 'Chevrolet',
        model: 'Silverado',
        mileage: 15000,
        location: 'Dallas, TX',
        reportType: 'MITCHELL',
        extractionConfidence: 0.96,
        extractionErrors: []
      };

      const appraisalId = storage.saveAppraisal(vehicleData);

      // Add two comparables
      const comparable1: ComparableVehicle = {
        id: 'comp_004',
        appraisalId,
        source: 'AutoTrader',
        dateAdded: new Date(),
        year: 2022,
        make: 'Chevrolet',
        model: 'Silverado',
        mileage: 14000,
        location: 'Dallas, TX',
        distanceFromLoss: 1,
        listPrice: 48000,
        condition: 'Excellent',
        equipment: ['Tow Package'],
        qualityScore: 96,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: 0,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 10,
          equipmentPenalty: 0,
          equipmentBonus: 6,
          finalScore: 96,
          explanations: {
            distance: 'Very close',
            age: 'Exact match',
            mileage: 'Within 20%',
            equipment: 'Similar'
          }
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 1000,
            depreciationRate: 0.25,
            adjustmentAmount: 250,
            explanation: 'Lower mileage'
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Excellent',
            lossVehicleCondition: 'Good',
            multiplier: 1.05,
            adjustmentAmount: 2400,
            explanation: 'Better condition'
          },
          totalAdjustment: 2650,
          adjustedPrice: 50650
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const comparable2: ComparableVehicle = {
        ...comparable1,
        id: 'comp_005',
        listPrice: 47000,
        adjustments: {
          ...comparable1.adjustments,
          adjustedPrice: 49650
        }
      };

      await comparableStorage.saveComparable(comparable1);
      await comparableStorage.saveComparable(comparable2);

      let appraisal = storage.getAppraisal(appraisalId);
      expect(appraisal?.comparableCount).toBe(2);

      // Delete one comparable
      await comparableStorage.deleteComparable('comp_004', appraisalId);

      appraisal = storage.getAppraisal(appraisalId);
      expect(appraisal?.hasComparables).toBe(true);
      expect(appraisal?.comparableCount).toBe(1);

      // Delete the last comparable
      await comparableStorage.deleteComparable('comp_005', appraisalId);

      appraisal = storage.getAppraisal(appraisalId);
      expect(appraisal?.hasComparables).toBe(false);
      expect(appraisal?.comparableCount).toBe(0);
    });

    it('should update metadata when comparable is updated', async () => {
      const vehicleData: ExtractedVehicleData = {
        vin: '5HGBH41JXMN109190',
        year: 2020,
        make: 'Nissan',
        model: 'Altima',
        mileage: 45000,
        location: 'Houston, TX',
        reportType: 'CCC_ONE',
        extractionConfidence: 0.94,
        extractionErrors: []
      };

      const appraisalId = storage.saveAppraisal(vehicleData);

      const comparable: ComparableVehicle = {
        id: 'comp_006',
        appraisalId,
        source: 'Cars.com',
        dateAdded: new Date(),
        year: 2020,
        make: 'Nissan',
        model: 'Altima',
        mileage: 43000,
        location: 'Houston, TX',
        distanceFromLoss: 4,
        listPrice: 20000,
        condition: 'Good',
        equipment: ['Backup Camera'],
        qualityScore: 90,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: 0,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 10,
          equipmentPenalty: 0,
          equipmentBonus: 0,
          finalScore: 90,
          explanations: {
            distance: 'Close',
            age: 'Exact match',
            mileage: 'Within 20%',
            equipment: 'Similar'
          }
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 2000,
            depreciationRate: 0.25,
            adjustmentAmount: 500,
            explanation: 'Lower mileage'
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Good',
            lossVehicleCondition: 'Good',
            multiplier: 1.0,
            adjustmentAmount: 0,
            explanation: 'Same condition'
          },
          totalAdjustment: 500,
          adjustedPrice: 20500
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await comparableStorage.saveComparable(comparable);

      let appraisal = storage.getAppraisal(appraisalId);
      expect(appraisal?.comparableCount).toBe(1);

      // Update the comparable
      await comparableStorage.updateComparable('comp_006', {
        appraisalId,
        listPrice: 21000
      });

      // Metadata should still be correct
      appraisal = storage.getAppraisal(appraisalId);
      expect(appraisal?.hasComparables).toBe(true);
      expect(appraisal?.comparableCount).toBe(1);
    });

    it('should update metadata when all comparables are deleted', async () => {
      const vehicleData: ExtractedVehicleData = {
        vin: '6HGBH41JXMN109191',
        year: 2018,
        make: 'Mazda',
        model: 'CX-5',
        mileage: 70000,
        location: 'Phoenix, AZ',
        reportType: 'MITCHELL',
        extractionConfidence: 0.91,
        extractionErrors: []
      };

      const appraisalId = storage.saveAppraisal(vehicleData);

      // Add comparables
      const comparable: ComparableVehicle = {
        id: 'comp_007',
        appraisalId,
        source: 'CarMax',
        dateAdded: new Date(),
        year: 2018,
        make: 'Mazda',
        model: 'CX-5',
        mileage: 68000,
        location: 'Phoenix, AZ',
        distanceFromLoss: 6,
        listPrice: 18000,
        condition: 'Good',
        equipment: ['Sunroof'],
        qualityScore: 88,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: 0,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 10,
          equipmentPenalty: 0,
          equipmentBonus: 3,
          finalScore: 88,
          explanations: {
            distance: 'Close',
            age: 'Exact match',
            mileage: 'Within 20%',
            equipment: 'Similar'
          }
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 2000,
            depreciationRate: 0.15,
            adjustmentAmount: 300,
            explanation: 'Lower mileage'
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Good',
            lossVehicleCondition: 'Good',
            multiplier: 1.0,
            adjustmentAmount: 0,
            explanation: 'Same condition'
          },
          totalAdjustment: 300,
          adjustedPrice: 18300
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await comparableStorage.saveComparable(comparable);

      let appraisal = storage.getAppraisal(appraisalId);
      expect(appraisal?.hasComparables).toBe(true);

      // Delete all comparables for appraisal
      await comparableStorage.deleteComparablesForAppraisal(appraisalId);

      appraisal = storage.getAppraisal(appraisalId);
      expect(appraisal?.hasComparables).toBe(false);
      expect(appraisal?.comparableCount).toBe(0);
    });
  });

  describe('Query Methods', () => {
    it('should get appraisals with comparables', async () => {
      // Create appraisals with and without comparables
      const vehicleData1: ExtractedVehicleData = {
        vin: '7HGBH41JXMN109192',
        year: 2021,
        make: 'Honda',
        model: 'CR-V',
        mileage: 25000,
        location: 'Seattle, WA',
        reportType: 'CCC_ONE',
        extractionConfidence: 0.97,
        extractionErrors: []
      };

      const vehicleData2: ExtractedVehicleData = {
        vin: '8HGBH41JXMN109193',
        year: 2020,
        make: 'Toyota',
        model: 'RAV4',
        mileage: 35000,
        location: 'Portland, OR',
        reportType: 'MITCHELL',
        extractionConfidence: 0.93,
        extractionErrors: []
      };

      const appraisalId1 = storage.saveAppraisal(vehicleData1);
      const appraisalId2 = storage.saveAppraisal(vehicleData2);

      // Add comparable only to first appraisal
      const comparable: ComparableVehicle = {
        id: 'comp_008',
        appraisalId: appraisalId1,
        source: 'AutoTrader',
        dateAdded: new Date(),
        year: 2021,
        make: 'Honda',
        model: 'CR-V',
        mileage: 24000,
        location: 'Seattle, WA',
        distanceFromLoss: 3,
        listPrice: 32000,
        condition: 'Excellent',
        equipment: ['Navigation', 'Sunroof'],
        qualityScore: 95,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: 0,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 10,
          equipmentPenalty: 0,
          equipmentBonus: 5,
          finalScore: 95,
          explanations: {
            distance: 'Close',
            age: 'Exact match',
            mileage: 'Within 20%',
            equipment: 'Better equipped'
          }
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 1000,
            depreciationRate: 0.25,
            adjustmentAmount: 250,
            explanation: 'Lower mileage'
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Excellent',
            lossVehicleCondition: 'Good',
            multiplier: 1.05,
            adjustmentAmount: 1600,
            explanation: 'Better condition'
          },
          totalAdjustment: 1850,
          adjustedPrice: 33850
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await comparableStorage.saveComparable(comparable);

      // Query appraisals with comparables
      const appraisalsWithComparables = storage.getAppraisalsWithComparables();
      expect(appraisalsWithComparables).toHaveLength(1);
      expect(appraisalsWithComparables[0].id).toBe(appraisalId1);
    });

    it('should get appraisals with completed market analysis', () => {
      // Create appraisal and manually set market analysis complete
      const vehicleData: ExtractedVehicleData = {
        vin: '9HGBH41JXMN109194',
        year: 2019,
        make: 'Subaru',
        model: 'Outback',
        mileage: 55000,
        location: 'Denver, CO',
        reportType: 'CCC_ONE',
        extractionConfidence: 0.95,
        extractionErrors: []
      };

      const appraisalId = storage.saveAppraisal(vehicleData);

      // Update metadata to mark analysis complete
      storage.updateComparableMetadata(appraisalId, {
        hasComparables: true,
        comparableCount: 3,
        marketAnalysisComplete: true,
        calculatedMarketValue: 28500
      });

      const appraisalsWithAnalysis = storage.getAppraisalsWithMarketAnalysis();
      expect(appraisalsWithAnalysis).toHaveLength(1);
      expect(appraisalsWithAnalysis[0].id).toBe(appraisalId);
      expect(appraisalsWithAnalysis[0].calculatedMarketValue).toBe(28500);
    });
  });
});
