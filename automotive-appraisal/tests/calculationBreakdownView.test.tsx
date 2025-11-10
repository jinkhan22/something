import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CalculationBreakdownView } from '../src/renderer/components/CalculationBreakdownView';
import type { MarketAnalysis } from '../src/types';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

const mockMarketAnalysis: MarketAnalysis = {
  appraisalId: 'test-123',
  lossVehicle: {
    year: 2018,
    make: 'Toyota',
    model: 'Camry',
    vin: '1234567890',
    mileage: 50000,
    location: 'Los Angeles, CA',
    reportType: 'CCC_ONE',
    extractionConfidence: 95,
    extractionErrors: [],
    condition: 'Good',
    equipment: ['Navigation', 'Sunroof'],
  },
  comparablesCount: 2,
  comparables: [
    {
      id: 'comp-1',
      appraisalId: 'test-123',
      source: 'AutoTrader',
      year: 2018,
      make: 'Toyota',
      model: 'Camry',
      mileage: 48000,
      location: 'Los Angeles, CA',
      distanceFromLoss: 15,
      listPrice: 24000,
      condition: 'Good',
      equipment: ['Navigation'],
      qualityScore: 92.5,
      qualityScoreBreakdown: {
        baseScore: 100,
        distancePenalty: 0,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 10,
        equipmentPenalty: 10,
        equipmentBonus: 0,
        finalScore: 92.5,
        explanations: {
          distance: 'Within 100 miles',
          age: 'Exact match',
          mileage: 'Within 20%',
          equipment: 'Missing Sunroof',
        },
      },
      adjustments: {
        mileageAdjustment: {
          mileageDifference: -2000,
          depreciationRate: 0.15,
          adjustmentAmount: 300,
          explanation: 'Comparable has 2,000 fewer miles',
        },
        equipmentAdjustments: [
          {
            feature: 'Sunroof',
            type: 'missing',
            value: -1200,
            explanation: 'Loss vehicle has Sunroof, comparable does not',
          },
        ],
        conditionAdjustment: {
          comparableCondition: 'Good',
          lossVehicleCondition: 'Good',
          multiplier: 1.0,
          adjustmentAmount: 0,
          explanation: 'Same condition',
        },
        totalAdjustment: -900,
        adjustedPrice: 23100,
      },
      dateAdded: new Date('2024-01-15'),
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'comp-2',
      appraisalId: 'test-123',
      source: 'Cars.com',
      year: 2018,
      make: 'Toyota',
      model: 'Camry',
      mileage: 52000,
      location: 'San Diego, CA',
      distanceFromLoss: 120,
      listPrice: 25500,
      condition: 'Excellent',
      equipment: ['Navigation', 'Sunroof', 'Leather Seats'],
      qualityScore: 85.0,
      qualityScoreBreakdown: {
        baseScore: 100,
        distancePenalty: 2,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 10,
        equipmentPenalty: 0,
        equipmentBonus: 5,
        finalScore: 85.0,
        explanations: {
          distance: '120 miles away',
          age: 'Exact match',
          mileage: 'Within 20%',
          equipment: 'Has extra Leather Seats',
        },
      },
      adjustments: {
        mileageAdjustment: {
          mileageDifference: 2000,
          depreciationRate: 0.15,
          adjustmentAmount: -300,
          explanation: 'Comparable has 2,000 more miles',
        },
        equipmentAdjustments: [
          {
            feature: 'Leather Seats',
            type: 'extra',
            value: 1000,
            explanation: 'Comparable has Leather Seats, loss vehicle does not',
          },
        ],
        conditionAdjustment: {
          comparableCondition: 'Excellent',
          lossVehicleCondition: 'Good',
          multiplier: 1.05,
          adjustmentAmount: -1275,
          explanation: 'Comparable is in better condition',
        },
        totalAdjustment: -575,
        adjustedPrice: 24925,
      },
      dateAdded: new Date('2024-01-16'),
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16'),
    },
  ],
  calculatedMarketValue: 24012.50,
  calculationMethod: 'quality-weighted-average',
  confidenceLevel: 85,
  confidenceFactors: {
    comparableCount: 2,
    qualityScoreVariance: 3.75,
    priceVariance: 912.5,
  },
  insuranceValue: 25000,
  valueDifference: -987.50,
  valueDifferencePercentage: -3.95,
  isUndervalued: false,
  calculationBreakdown: {
    comparables: [
      {
        id: 'comp-1',
        listPrice: 24000,
        adjustedPrice: 23100,
        qualityScore: 92.5,
        weightedValue: 2136675,
      },
      {
        id: 'comp-2',
        listPrice: 25500,
        adjustedPrice: 24925,
        qualityScore: 85.0,
        weightedValue: 2118625,
      },
    ],
    totalWeightedValue: 4255300,
    totalWeights: 177.5,
    finalMarketValue: 24012.50,
    steps: [
      {
        step: 1,
        description: 'Calculate weighted values for each comparable',
        calculation: '(23100 × 92.5) + (24925 × 85.0) = 4,255,300',
        result: 4255300,
      },
      {
        step: 2,
        description: 'Sum all quality scores',
        calculation: '92.5 + 85.0 = 177.5',
        result: 177.5,
      },
      {
        step: 3,
        description: 'Divide total weighted value by total weights',
        calculation: '4,255,300 ÷ 177.5 = 24,012.50',
        result: 24012.50,
      },
    ],
  },
  calculatedAt: new Date('2024-01-16'),
  lastUpdated: new Date('2024-01-16'),
};

describe('CalculationBreakdownView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with title', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      expect(screen.getByText('Detailed Calculation Breakdown')).toBeInTheDocument();
    });

    it('should render market value calculation section', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      expect(screen.getByText('Market Value Calculation')).toBeInTheDocument();
    });

    it('should render individual comparable adjustments section', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      expect(screen.getByText('Individual Comparable Adjustments')).toBeInTheDocument();
    });

    it('should display the formula', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      expect(
        screen.getByText(/Market Value = Σ\(Adjusted Price × Quality Score\) \/ Σ\(Quality Scores\)/)
      ).toBeInTheDocument();
    });
  });

  describe('Market Value Calculation Display', () => {
    it('should display all calculation steps', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      mockMarketAnalysis.calculationBreakdown.steps.forEach((step) => {
        expect(screen.getByText(new RegExp(`Step ${step.step}`))).toBeInTheDocument();
        expect(screen.getByText(new RegExp(step.description))).toBeInTheDocument();
      });
    });

    it('should display final market value', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      const marketValueElements = screen.getAllByText(/\$24,012\.50/);
      expect(marketValueElements.length).toBeGreaterThan(0);
    });

    it('should display confidence level', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      expect(screen.getByText('85.0%')).toBeInTheDocument();
    });

    it('should format currency values correctly', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      const currencyElements = screen.getAllByText(/\$24,012\.50/);
      expect(currencyElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accordion Functionality', () => {
    it('should render all comparables as collapsed by default', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      // Headers should be visible
      const headers = screen.getAllByText(/2018 Toyota Camry/);
      expect(headers.length).toBeGreaterThan(0);
      
      // Details should not be visible initially
      expect(screen.queryByText('Original List Price')).not.toBeInTheDocument();
    });

    it('should expand comparable when clicked', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const accordionButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('2018 Toyota Camry')
      );
      
      fireEvent.click(accordionButton!);
      
      expect(screen.getByText('Original List Price')).toBeInTheDocument();
    });

    it('should collapse expanded comparable when clicked again', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const accordionButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('2018 Toyota Camry')
      );
      
      // Expand
      fireEvent.click(accordionButton!);
      expect(screen.getByText('Original List Price')).toBeInTheDocument();
      
      // Collapse
      fireEvent.click(accordionButton!);
      expect(screen.queryByText('Original List Price')).not.toBeInTheDocument();
    });

    it('should expand all comparables when expandAll is true', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} expandAll={true} />);
      
      const originalPriceElements = screen.getAllByText('Original List Price');
      expect(originalPriceElements.length).toBe(2);
    });
  });

  describe('Comparable Details Display', () => {
    beforeEach(() => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      const accordionButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('2018 Toyota Camry')
      );
      fireEvent.click(accordionButton!);
    });

    it('should display source information', () => {
      expect(screen.getByText(/AutoTrader/)).toBeInTheDocument();
    });

    it('should display original list price', () => {
      expect(screen.getByText('$24,000.00')).toBeInTheDocument();
    });

    it('should display mileage adjustment', () => {
      expect(screen.getByText('Mileage Adjustment')).toBeInTheDocument();
      expect(screen.getByText('Comparable has 2,000 fewer miles')).toBeInTheDocument();
    });

    it('should display equipment adjustments', () => {
      expect(screen.getByText('Equipment Adjustments')).toBeInTheDocument();
      expect(screen.getByText(/Sunroof/)).toBeInTheDocument();
    });

    it('should display total adjustments', () => {
      expect(screen.getByText('Total Adjustments:')).toBeInTheDocument();
    });

    it('should display adjusted price', () => {
      expect(screen.getByText('Adjusted Price:')).toBeInTheDocument();
      expect(screen.getByText('$23,100.00')).toBeInTheDocument();
    });

    it('should display quality score', () => {
      expect(screen.getByText(/Quality Score:/)).toBeInTheDocument();
      expect(screen.getByText('92.5')).toBeInTheDocument();
    });
  });

  describe('Mathematical Formulas Display', () => {
    beforeEach(() => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      const accordionButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('2018 Toyota Camry')
      );
      fireEvent.click(accordionButton!);
    });

    it('should display mileage calculation formula', () => {
      expect(screen.getByText(/2,000 miles/)).toBeInTheDocument();
      expect(screen.getByText(/\$0.15\/mile/)).toBeInTheDocument();
    });

    it('should display condition multiplier', () => {
      // Expand second comparable which has condition adjustment
      const accordionButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent?.includes('Toyota Camry')
      );
      fireEvent.click(accordionButtons[1]);
      
      expect(screen.getByText(/Multiplier: 1.05/)).toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard Functionality', () => {
    it('should copy market value calculation when copy all button is clicked', async () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const copyButton = screen.getByText('Copy All').closest('button');
      fireEvent.click(copyButton!);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it('should show "Copied!" feedback after copying', async () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const copyButton = screen.getByText('Copy All').closest('button');
      fireEvent.click(copyButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('should copy individual comparable when copy button is clicked', async () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      // Expand first comparable
      const accordionButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('2018 Toyota Camry')
      );
      fireEvent.click(accordionButton!);
      
      // Find and click copy button
      const copyButton = screen.getByText('Copy').closest('button');
      fireEvent.click(copyButton!);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it('should include all details in copied comparable text', async () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const accordionButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('2018 Toyota Camry')
      );
      fireEvent.click(accordionButton!);
      
      const copyButton = screen.getByText('Copy').closest('button');
      fireEvent.click(copyButton!);
      
      await waitFor(() => {
        const copiedText = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
        expect(copiedText).toContain('2018 Toyota Camry');
        expect(copiedText).toContain('AutoTrader');
        expect(copiedText).toContain('$24,000.00');
        expect(copiedText).toContain('Mileage Adjustment');
        expect(copiedText).toContain('Quality Score');
      });
    });
  });

  describe('Color Coding', () => {
    it('should use green color for positive adjustments', () => {
      const { container } = render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      const accordionButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('2018 Toyota Camry')
      );
      fireEvent.click(accordionButton!);
      
      const greenElements = container.querySelectorAll('.text-green-600, .text-green-700, .text-green-900');
      expect(greenElements.length).toBeGreaterThan(0);
    });

    it('should use red color for negative adjustments', () => {
      const { container } = render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      const accordionButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('2018 Toyota Camry')
      );
      fireEvent.click(accordionButton!);
      
      const redElements = container.querySelectorAll('.text-red-600, .text-red-700');
      expect(redElements.length).toBeGreaterThan(0);
    });
  });

  describe('Print Formatting', () => {
    it('should include print-specific classes', () => {
      const { container } = render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const printElements = container.querySelectorAll('.print\\:hidden, .print\\:block, .print\\:shadow-none');
      expect(printElements.length).toBeGreaterThan(0);
    });

    it('should have print-friendly borders', () => {
      const { container } = render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const printBorders = container.querySelectorAll('[class*="print:border"]');
      expect(printBorders.length).toBeGreaterThan(0);
    });

    it('should prevent page breaks inside comparables', () => {
      const { container } = render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const breakAvoid = container.querySelectorAll('.print\\:break-inside-avoid');
      expect(breakAvoid.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle comparables with no equipment adjustments', () => {
      const analysisWithoutEquipment: MarketAnalysis = {
        ...mockMarketAnalysis,
        comparables: [
          {
            ...mockMarketAnalysis.comparables[0],
            adjustments: {
              ...mockMarketAnalysis.comparables[0].adjustments,
              equipmentAdjustments: [],
            },
          },
        ],
      };
      
      render(<CalculationBreakdownView marketAnalysis={analysisWithoutEquipment} />);
      
      const accordionButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('2018 Toyota Camry')
      );
      fireEvent.click(accordionButton!);
      
      expect(screen.queryByText('Equipment Adjustments')).not.toBeInTheDocument();
    });

    it('should handle comparables with no condition adjustment', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const accordionButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('2018 Toyota Camry')
      );
      fireEvent.click(accordionButton!);
      
      // First comparable has no condition adjustment
      expect(screen.queryByText('Condition Adjustment')).not.toBeInTheDocument();
    });

    it('should handle single comparable', () => {
      const singleComparableAnalysis: MarketAnalysis = {
        ...mockMarketAnalysis,
        comparables: [mockMarketAnalysis.comparables[0]],
        comparablesCount: 1,
      };
      
      render(<CalculationBreakdownView marketAnalysis={singleComparableAnalysis} />);
      
      const headers = screen.getAllByText(/2018 Toyota Camry/);
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should handle many comparables', () => {
      const manyComparablesAnalysis: MarketAnalysis = {
        ...mockMarketAnalysis,
        comparables: Array(10).fill(mockMarketAnalysis.comparables[0]).map((comp, idx) => ({
          ...comp,
          id: `comp-${idx}`,
        })),
        comparablesCount: 10,
      };
      
      render(<CalculationBreakdownView marketAnalysis={manyComparablesAnalysis} />);
      
      const comparableHeaders = screen.getAllByText(/2018 Toyota Camry/);
      expect(comparableHeaders.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const h3 = screen.getByText('Detailed Calculation Breakdown');
      expect(h3.tagName).toBe('H3');
      
      const h4Elements = screen.getAllByRole('heading', { level: 4 });
      expect(h4Elements.length).toBeGreaterThan(0);
    });

    it('should have accessible buttons', () => {
      render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button).toBeInTheDocument();
      });
    });

    it('should have SVG icons with proper attributes', () => {
      const { container } = render(<CalculationBreakdownView marketAnalysis={mockMarketAnalysis} />);
      
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('viewBox');
      });
    });
  });
});
