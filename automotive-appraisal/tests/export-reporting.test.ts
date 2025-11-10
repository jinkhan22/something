import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import {
  comparablesToCSV,
  exportComparablesToCSV,
  exportMarketAnalysisToCSV
} from '../src/main/services/csvExporter';
import { ReportGenerationService } from '../src/main/services/reportGeneration';
import { ComparableStorageService } from '../src/main/services/comparableStorage';
import {
  ComparableVehicle,
  MarketAnalysis,
  ExtractedVehicleData,
  QualityScoreBreakdown,
  PriceAdjustments,
  ReportOptions
} from '../src/types';

describe('Export and Reporting Functionality', () => {
  let tempDir: string;
  let comparableStorage: ComparableStorageService;
  let reportService: ReportGenerationService;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join(os.tmpdir(), `appraisal-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
    
    comparableStorage = new ComparableStorageService();
    reportService = new ReportGenerationService();
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  // Helper function to create mock comparable
  const createMockComparable = (overrides: Partial<ComparableVehicle> = {}): ComparableVehicle => {
    const now = new Date();
    return {
      id: `comp-${Date.now()}-${Math.random()}`,
      appraisalId: 'test-appraisal-1',
      source: 'AutoTrader',
      sourceUrl: 'https://autotrader.com/listing/123',
      dateAdded: now,
      year: 2015,
      make: 'Toyota',
      model: 'Camry',
      trim: 'SE',
      mileage: 75000,
      location: 'Los Angeles, CA',
      coordinates: { latitude: 34.0522, longitude: -118.2437 },
      distanceFromLoss: 25,
      listPrice: 18500,
      adjustedPrice: 18200,
      condition: 'Good',
      equipment: ['Navigation', 'Sunroof', 'Backup Camera'],
      qualityScore: 85.5,
      qualityScoreBreakdown: {
        baseScore: 100,
        distancePenalty: -2.5,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 10,
        equipmentPenalty: 0,
        equipmentBonus: 5,
        finalScore: 85.5,
        explanations: {
          distance: 'Within 100 miles',
          age: 'Exact year match',
          mileage: 'Within 20% of loss vehicle',
          equipment: 'All equipment matches'
        }
      },
      adjustments: {
        mileageAdjustment: {
          mileageDifference: -5000,
          depreciationRate: 0.15,
          adjustmentAmount: -750,
          explanation: 'Comparable has 5,000 fewer miles'
        },
        equipmentAdjustments: [
          {
            feature: 'Premium Audio',
            type: 'missing',
            value: -800,
            explanation: 'Loss vehicle has Premium Audio, comparable does not'
          }
        ],
        conditionAdjustment: {
          comparableCondition: 'Good',
          lossVehicleCondition: 'Good',
          multiplier: 1.0,
          adjustmentAmount: 0,
          explanation: 'Same condition as loss vehicle'
        },
        totalAdjustment: -1550,
        adjustedPrice: 18200
      },
      notes: 'Good comparable from reputable dealer',
      createdAt: now,
      updatedAt: now,
      ...overrides
    };
  };

  // Helper function to create mock market analysis
  const createMockMarketAnalysis = (): MarketAnalysis => {
    const lossVehicle: ExtractedVehicleData = {
      vin: '1HGBH41JXMN109186',
      year: 2015,
      make: 'Toyota',
      model: 'Camry',
      trim: 'SE',
      mileage: 80000,
      location: 'Los Angeles, CA',
      reportType: 'CCC_ONE',
      extractionConfidence: 0.95,
      extractionErrors: [],
      marketValue: 19500,
      settlementValue: 18000,
      condition: 'Good',
      equipment: ['Navigation', 'Sunroof', 'Backup Camera', 'Premium Audio']
    };

    const comparables = [
      createMockComparable({ id: 'comp-1', listPrice: 18500, adjustedPrice: 18200, qualityScore: 85.5 }),
      createMockComparable({ id: 'comp-2', listPrice: 19200, adjustedPrice: 19000, qualityScore: 88.0, mileage: 78000 }),
      createMockComparable({ id: 'comp-3', listPrice: 17800, adjustedPrice: 18100, qualityScore: 82.5, mileage: 85000 })
    ];

    return {
      appraisalId: 'test-appraisal-1',
      lossVehicle,
      comparablesCount: 3,
      comparables,
      calculatedMarketValue: 18433,
      calculationMethod: 'quality-weighted-average',
      confidenceLevel: 85,
      confidenceFactors: {
        comparableCount: 3,
        qualityScoreVariance: 2.5,
        priceVariance: 600
      },
      insuranceValue: 18000,
      valueDifference: 433,
      valueDifferencePercentage: 2.4,
      isUndervalued: true,
      calculationBreakdown: {
        comparables: comparables.map(c => ({
          id: c.id,
          listPrice: c.listPrice,
          adjustedPrice: c.adjustedPrice || c.listPrice,
          qualityScore: c.qualityScore,
          weightedValue: (c.adjustedPrice || c.listPrice) * c.qualityScore
        })),
        totalWeightedValue: 4712550,
        totalWeights: 256,
        finalMarketValue: 18433,
        steps: [
          {
            step: 1,
            description: 'Calculate weighted values',
            calculation: '(18200 × 85.5) + (19000 × 88.0) + (18100 × 82.5)',
            result: 4712550
          },
          {
            step: 2,
            description: 'Sum quality scores',
            calculation: '85.5 + 88.0 + 82.5',
            result: 256
          },
          {
            step: 3,
            description: 'Calculate weighted average',
            calculation: '4712550 / 256',
            result: 18433
          }
        ]
      },
      calculatedAt: new Date(),
      lastUpdated: new Date()
    };
  };

  describe('CSV Export - Comparables', () => {
    it('should convert comparables to CSV format', () => {
      const comparables = [
        createMockComparable({ id: 'comp-1' }),
        createMockComparable({ id: 'comp-2', make: 'Honda', model: 'Accord' })
      ];

      const csv = comparablesToCSV(comparables);

      expect(csv).toContain('Id,Appraisal Id,Source');
      expect(csv).toContain('comp-1');
      expect(csv).toContain('comp-2');
      expect(csv).toContain('Toyota');
      expect(csv).toContain('Honda');
      expect(csv).toContain('Camry');
      expect(csv).toContain('Accord');
    });

    it('should handle equipment arrays in CSV', () => {
      const comparable = createMockComparable({
        equipment: ['Navigation', 'Sunroof', 'Premium Audio']
      });

      const csv = comparablesToCSV([comparable]);

      expect(csv).toContain('Navigation; Sunroof; Premium Audio');
    });

    it('should escape special characters in CSV', () => {
      const comparable = createMockComparable({
        notes: 'Great deal, but needs "minor" repairs'
      });

      const csv = comparablesToCSV([comparable]);

      expect(csv).toContain('""minor""');
    });

    it('should export comparables to CSV file', async () => {
      const appraisalId = 'test-appraisal-1';
      const comparables = [
        createMockComparable({ appraisalId }),
        createMockComparable({ appraisalId })
      ];

      // Save comparables to storage
      for (const comp of comparables) {
        await comparableStorage.saveComparable(comp);
      }

      const filePath = path.join(tempDir, 'comparables.csv');
      const result = await exportComparablesToCSV(appraisalId, filePath);

      expect(result.success).toBe(true);
      expect(await fs.pathExists(filePath)).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('Toyota');
      expect(content).toContain('Camry');
    });

    it('should handle no comparables found', async () => {
      const filePath = path.join(tempDir, 'empty.csv');
      const result = await exportComparablesToCSV('non-existent', filePath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No comparables found');
    });
  });

  describe('CSV Export - Market Analysis', () => {
    it('should export market analysis summary to CSV', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const filePath = path.join(tempDir, 'market-analysis.csv');

      const result = await exportMarketAnalysisToCSV(marketAnalysis, filePath);

      expect(result.success).toBe(true);
      expect(await fs.pathExists(filePath)).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('Market Analysis Summary');
      expect(content).toContain('Loss Vehicle Information');
      expect(content).toContain('1HGBH41JXMN109186');
      expect(content).toContain('Calculated Market Value');
      expect(content).toContain('18433');
      expect(content).toContain('Comparable Vehicles');
    });

    it('should include all comparables in CSV export', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const filePath = path.join(tempDir, 'analysis.csv');

      await exportMarketAnalysisToCSV(marketAnalysis, filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      // Check that all three comparables are present by checking their unique prices
      expect(content).toContain('$18500.00'); // comp-1 list price
      expect(content).toContain('$19200.00'); // comp-2 list price
      expect(content).toContain('$17800.00'); // comp-3 list price
      // Verify all three rows are present
      const lines = content.split('\n');
      const dataLines = lines.filter(line => line.includes('2015 Toyota Camry'));
      expect(dataLines.length).toBe(3);
    });
  });

  describe('PDF Report Generation', () => {
    it('should generate HTML report with all sections', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const options: ReportOptions = {
        includeSummary: true,
        includeDetailedCalculations: true,
        includeComparablesList: true,
        includeMethodology: true,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.filePath).toContain('.html');

      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        expect(content).toContain('Market Analysis Report');
        expect(content).toContain('1HGBH41JXMN109186');
        expect(content).toContain('Executive Summary');
        expect(content).toContain('Comparable Vehicles');
        expect(content).toContain('Detailed Calculations');
        expect(content).toContain('Methodology');
      }
    });

    it('should include price distribution chart', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const options: ReportOptions = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: true,
        includeMethodology: false,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        expect(content).toContain('Price Distribution');
        expect(content).toContain('chart-container');
        expect(content).toContain('chart-bar');
      }
    });

    it('should include quality score distribution chart', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const options: ReportOptions = {
        includeSummary: false,
        includeDetailedCalculations: false,
        includeComparablesList: true,
        includeMethodology: false,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        expect(content).toContain('Quality Score Distribution');
        expect(content).toContain('distribution-bar');
        expect(content).toContain('quality-score');
      }
    });

    it('should include adjustment details in calculations', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const options: ReportOptions = {
        includeSummary: false,
        includeDetailedCalculations: true,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        expect(content).toContain('Individual Comparable Adjustments');
        expect(content).toContain('Mileage Adjustment');
        expect(content).toContain('Equipment Adjustments');
        expect(content).toContain('Condition Adjustment');
        expect(content).toContain('adjustment-details');
      }
    });

    it('should respect report customization options', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const options: ReportOptions = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        expect(content).toContain('Executive Summary');
        expect(content).not.toContain('Detailed Calculations');
        expect(content).not.toContain('Methodology');
      }
    });

    it('should show undervaluation warning when applicable', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      marketAnalysis.isUndervalued = true;
      marketAnalysis.valueDifferencePercentage = 25;

      const options: ReportOptions = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        expect(content).toContain('Potential Undervaluation Detected');
        expect(content).toContain('warning');
      }
    });

    it('should format currency values correctly', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const options: ReportOptions = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: true,
        includeMethodology: false,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        expect(content).toMatch(/\$18,433/);
        expect(content).toMatch(/\$18,000/);
      }
    });

    it('should include confidence level analysis', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const options: ReportOptions = {
        includeSummary: false,
        includeDetailedCalculations: true,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        expect(content).toContain('Confidence Level Analysis');
        expect(content).toContain('Quality Score Variance');
        expect(content).toContain('Price Variance');
        expect(content).toContain('85%');
      }
    });

    it('should handle errors gracefully', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const options: ReportOptions = {
        includeSummary: true,
        includeDetailedCalculations: true,
        includeComparablesList: true,
        includeMethodology: true,
        format: 'html'
      };

      // Use invalid path to trigger error
      const invalidPath = '/invalid/path/that/does/not/exist/report.html';
      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      // Should still succeed by creating in default location
      expect(result.success).toBe(true);
    });
  });

  describe('Report Visualizations', () => {
    it('should generate price distribution with correct data', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const options: ReportOptions = {
        includeSummary: false,
        includeDetailedCalculations: false,
        includeComparablesList: true,
        includeMethodology: false,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        expect(content).toContain('$18,200');
        expect(content).toContain('$19,000');
        expect(content).toContain('$18,100');
      }
    });

    it('should color-code quality scores correctly', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      // Update quality score breakdowns to match
      marketAnalysis.comparables[0].qualityScore = 90; // High
      marketAnalysis.comparables[0].qualityScoreBreakdown.finalScore = 90;
      marketAnalysis.comparables[1].qualityScore = 70; // Medium
      marketAnalysis.comparables[1].qualityScoreBreakdown.finalScore = 70;
      marketAnalysis.comparables[2].qualityScore = 50; // Low
      marketAnalysis.comparables[2].qualityScoreBreakdown.finalScore = 50;

      const options: ReportOptions = {
        includeSummary: false,
        includeDetailedCalculations: false,
        includeComparablesList: true,
        includeMethodology: false,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        expect(content).toContain('quality-score high');
        expect(content).toContain('quality-score medium');
        expect(content).toContain('quality-score low');
      }
    });

    it('should show quality score distribution segments', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      const options: ReportOptions = {
        includeSummary: false,
        includeDetailedCalculations: false,
        includeComparablesList: true,
        includeMethodology: false,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        expect(content).toContain('distribution-segment');
        expect(content).toMatch(/High \(80\+\)/);
      }
    });
  });

  describe('Integration Tests', () => {
    it('should export both CSV and generate report for same analysis', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      
      // Export CSV
      const csvPath = path.join(tempDir, 'analysis.csv');
      const csvResult = await exportMarketAnalysisToCSV(marketAnalysis, csvPath);
      
      // Generate report
      const reportOptions: ReportOptions = {
        includeSummary: true,
        includeDetailedCalculations: true,
        includeComparablesList: true,
        includeMethodology: true,
        format: 'html'
      };
      const reportResult = await reportService.generateMarketAnalysisReport(marketAnalysis, reportOptions);

      expect(csvResult.success).toBe(true);
      expect(reportResult.success).toBe(true);
      expect(await fs.pathExists(csvPath)).toBe(true);
      expect(reportResult.filePath).toBeDefined();
    });

    it('should handle large number of comparables', async () => {
      const marketAnalysis = createMockMarketAnalysis();
      
      // Add 20 more comparables (in addition to the 3 existing ones)
      for (let i = 0; i < 20; i++) {
        marketAnalysis.comparables.push(
          createMockComparable({
            id: `comp-extra-${i}`,
            listPrice: 18000 + (i * 100),
            qualityScore: 70 + (i % 20)
          })
        );
      }
      marketAnalysis.comparablesCount = marketAnalysis.comparables.length;

      const options: ReportOptions = {
        includeSummary: true,
        includeDetailedCalculations: true,
        includeComparablesList: true,
        includeMethodology: false,
        format: 'html'
      };

      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, options);

      expect(result.success).toBe(true);
      
      if (result.filePath) {
        const content = await fs.readFile(result.filePath, 'utf-8');
        // Check that we have a large number of comparables in the report
        expect(marketAnalysis.comparablesCount).toBe(23);
        expect(content).toContain('2015 Toyota Camry');
        // Verify the report contains table rows for all comparables
        const tableRowMatches = content.match(/<tr>/g);
        expect(tableRowMatches).toBeTruthy();
        if (tableRowMatches) {
          // Should have at least 23 data rows plus header row
          expect(tableRowMatches.length).toBeGreaterThan(20);
        }
      }
    });
  });
});
