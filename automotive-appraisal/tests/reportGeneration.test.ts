import { ReportGenerationService } from '../src/main/services/reportGeneration';
import { MarketAnalysis, ExtractedVehicleData, ComparableVehicle } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ReportGenerationService', () => {
  let service: ReportGenerationService;
  const reportsDir = path.join(os.homedir(), '.automotive-appraisal', 'reports');

  // Helper to create test market analysis
  const createTestMarketAnalysis = (): MarketAnalysis => {
    const lossVehicle: ExtractedVehicleData = {
      vin: 'TEST123456789',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      trim: 'SE',
      mileage: 30000,
      location: 'Los Angeles, CA',
      reportType: 'CCC_ONE',
      extractionConfidence: 95,
      extractionErrors: [],
      condition: 'Good',
      equipment: ['Navigation', 'Sunroof', 'Leather Seats']
    };

    const comparable: ComparableVehicle = {
      id: 'comp_1',
      appraisalId: 'test_appraisal',
      source: 'AutoTrader',
      dateAdded: new Date(),
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      trim: 'SE',
      mileage: 28000,
      location: 'Los Angeles, CA',
      coordinates: { latitude: 34.0522, longitude: -118.2437 },
      distanceFromLoss: 10,
      listPrice: 25000,
      adjustedPrice: 24800,
      condition: 'Good',
      equipment: ['Navigation', 'Sunroof'],
      qualityScore: 92,
      qualityScoreBreakdown: {
        baseScore: 100,
        distancePenalty: 0,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 10,
        equipmentPenalty: 10,
        equipmentBonus: 0,
        finalScore: 92,
        explanations: {
          distance: 'Within 100 miles',
          age: 'Exact match',
          mileage: 'Within 20%',
          equipment: 'Missing 1 feature'
        }
      },
      adjustments: {
        mileageAdjustment: {
          mileageDifference: 2000,
          depreciationRate: 0.25,
          adjustmentAmount: -500,
          explanation: 'Lower mileage adds value'
        },
        equipmentAdjustments: [
          {
            feature: 'Leather Seats',
            type: 'missing',
            value: -1000,
            explanation: 'Missing leather seats'
          }
        ],
        conditionAdjustment: {
          comparableCondition: 'Good',
          lossVehicleCondition: 'Good',
          multiplier: 1.0,
          adjustmentAmount: 0,
          explanation: 'Same condition'
        },
        totalAdjustment: -200,
        adjustedPrice: 24800
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return {
      appraisalId: 'test_appraisal',
      lossVehicle,
      comparablesCount: 1,
      comparables: [comparable],
      calculatedMarketValue: 24800,
      calculationMethod: 'quality-weighted-average',
      confidenceLevel: 75,
      confidenceFactors: {
        comparableCount: 1,
        qualityScoreVariance: 0,
        priceVariance: 0
      },
      insuranceValue: 23000,
      valueDifference: 1800,
      valueDifferencePercentage: 7.8,
      isUndervalued: true,
      calculationBreakdown: {
        comparables: [
          {
            id: 'comp_1',
            listPrice: 25000,
            adjustedPrice: 24800,
            qualityScore: 92,
            weightedValue: 2281600
          }
        ],
        totalWeightedValue: 2281600,
        totalWeights: 92,
        finalMarketValue: 24800,
        steps: [
          {
            step: 1,
            description: 'Calculate weighted values',
            calculation: '24800 × 92 = 2,281,600',
            result: 2281600
          },
          {
            step: 2,
            description: 'Sum quality scores',
            calculation: '92',
            result: 92
          },
          {
            step: 3,
            description: 'Calculate weighted average',
            calculation: '2,281,600 / 92 = 24,800',
            result: 24800
          }
        ]
      },
      calculatedAt: new Date(),
      lastUpdated: new Date()
    };
  };

  beforeEach(() => {
    service = new ReportGenerationService();
  });

  afterEach(() => {
    // Clean up generated reports
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      files.forEach(file => {
        if (file.startsWith('market-analysis-test_appraisal')) {
          fs.unlinkSync(path.join(reportsDir, file));
        }
      });
    }
  });

  describe('generateMarketAnalysisReport', () => {
    it('should generate HTML report successfully', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: true,
        includeDetailedCalculations: true,
        includeComparablesList: true,
        includeMethodology: true,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.filePath).toContain('.html');
      expect(fs.existsSync(result.filePath!)).toBe(true);
    });

    it('should generate report with all sections', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: true,
        includeDetailedCalculations: true,
        includeComparablesList: true,
        includeMethodology: true,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('Market Analysis Report');
      expect(content).toContain('Executive Summary');
      expect(content).toContain('Loss Vehicle Details');
      expect(content).toContain('Comparable Vehicles');
      expect(content).toContain('Detailed Calculations');
      expect(content).toContain('Methodology');
    });

    it('should include vehicle information in report', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('TEST123456789'); // VIN
      expect(content).toContain('2020');
      expect(content).toContain('Toyota');
      expect(content).toContain('Camry');
    });

    it('should include market value in report', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('$24,800'); // Calculated market value
      expect(content).toContain('$23,000'); // Insurance value
    });

    it('should show undervaluation warning when applicable', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      marketAnalysis.isUndervalued = true;
      
      const options = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('Undervaluation');
    });

    it('should include comparables table when requested', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: false,
        includeDetailedCalculations: false,
        includeComparablesList: true,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('Comparable Vehicles');
      expect(content).toContain('<table>');
      expect(content).toContain('AutoTrader');
      expect(content).toContain('$25,000'); // List price
    });

    it('should include detailed calculations when requested', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: false,
        includeDetailedCalculations: true,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('Detailed Calculations');
      expect(content).toContain('Step 1');
      expect(content).toContain('Step 2');
      expect(content).toContain('Step 3');
    });

    it('should include methodology when requested', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: false,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: true,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('Methodology');
      expect(content).toContain('Quality Score Calculation');
      expect(content).toContain('Price Adjustments');
      expect(content).toContain('Market Value Formula');
    });

    it('should exclude sections when not requested', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: false,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).not.toContain('Executive Summary');
      expect(content).not.toContain('Comparable Vehicles');
      expect(content).not.toContain('Detailed Calculations');
      expect(content).not.toContain('Methodology');
    });

    it('should handle PDF format request', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: true,
        includeDetailedCalculations: true,
        includeComparablesList: true,
        includeMethodology: true,
        format: 'pdf' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      // Currently returns HTML with a note about PDF not implemented
      expect(result.error).toContain('PDF generation not yet implemented');
    });

    it('should create reports directory if it does not exist', async () => {
      // Remove reports directory if it exists
      if (fs.existsSync(reportsDir)) {
        fs.rmSync(reportsDir, { recursive: true });
      }

      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);

      expect(result.success).toBe(true);
      expect(fs.existsSync(reportsDir)).toBe(true);
    });

    it('should generate unique filenames for multiple reports', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html' as const
      };

      const result1 = await service.generateMarketAnalysisReport(marketAnalysis, options);
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result2 = await service.generateMarketAnalysisReport(marketAnalysis, options);

      expect(result1.filePath).not.toBe(result2.filePath);
      expect(fs.existsSync(result1.filePath!)).toBe(true);
      expect(fs.existsSync(result2.filePath!)).toBe(true);
    });

    it('should handle multiple comparables', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      
      // Add more comparables
      const comparable2 = { ...marketAnalysis.comparables[0], id: 'comp_2', listPrice: 26000 };
      const comparable3 = { ...marketAnalysis.comparables[0], id: 'comp_3', listPrice: 24500 };
      marketAnalysis.comparables.push(comparable2, comparable3);
      marketAnalysis.comparablesCount = 3;

      const options = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: true,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('$25,000');
      expect(content).toContain('$26,000');
      expect(content).toContain('$24,500');
    });

    it('should format currency correctly', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      // Check for proper currency formatting
      expect(content).toMatch(/\$[\d,]+/);
      expect(content).not.toContain('$24800'); // Should have comma
      expect(content).toContain('$24,800');
    });

    it('should include quality scores with proper styling', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: false,
        includeDetailedCalculations: false,
        includeComparablesList: true,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('quality-score');
      expect(content).toContain('92'); // Quality score value
    });

    it('should handle error gracefully', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      // @ts-ignore - Force an error by passing invalid data
      marketAnalysis.lossVehicle = null;
      
      const options = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('HTML structure', () => {
    it('should generate valid HTML', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: true,
        includeDetailedCalculations: true,
        includeComparablesList: true,
        includeMethodology: true,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('<html');
      expect(content).toContain('<head>');
      expect(content).toContain('<body>');
      expect(content).toContain('</html>');
    });

    it('should include CSS styles', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('<style>');
      expect(content).toContain('</style>');
      expect(content).toContain('.report-container');
      expect(content).toContain('.summary-card');
    });

    it('should include print styles', async () => {
      const marketAnalysis = createTestMarketAnalysis();
      const options = {
        includeSummary: true,
        includeDetailedCalculations: false,
        includeComparablesList: false,
        includeMethodology: false,
        format: 'html' as const
      };

      const result = await service.generateMarketAnalysisReport(marketAnalysis, options);
      const content = fs.readFileSync(result.filePath!, 'utf8');

      expect(content).toContain('@media print');
    });
  });
});
