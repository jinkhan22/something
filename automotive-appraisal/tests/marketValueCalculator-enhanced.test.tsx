import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MarketValueCalculator } from '../src/renderer/components/MarketValueCalculator';
import { MarketAnalysis } from '../src/types';

describe('MarketValueCalculator - Enhanced Features', () => {
  const mockMarketAnalysis: MarketAnalysis = {
    appraisalId: 'test-123',
    lossVehicle: {
      vin: '1HGBH41JXMN109186',
      year: 2020,
      make: 'Honda',
      model: 'Accord',
      trim: 'EX-L',
      mileage: 45000,
      location: 'Los Angeles, CA',
      reportType: 'CCC_ONE',
      extractionConfidence: 95,
      extractionErrors: [],
      marketValue: 25000,
      settlementValue: 24000,
      extractionMethod: 'standard'
    },
    comparablesCount: 5,
    comparables: [],
    calculatedMarketValue: 25500,
    calculationMethod: 'quality-weighted-average',
    confidenceLevel: 85,
    confidenceFactors: {
      comparableCount: 5,
      qualityScoreVariance: 8.5,
      priceVariance: 0.12
    },
    insuranceValue: 24000,
    valueDifference: 1500,
    valueDifferencePercentage: 6.25,
    isUndervalued: true,
    calculationBreakdown: {
      comparables: [
        {
          id: 'comp-1',
          listPrice: 26000,
          adjustedPrice: 25800,
          qualityScore: 92,
          weightedValue: 23736
        },
        {
          id: 'comp-2',
          listPrice: 25500,
          adjustedPrice: 25300,
          qualityScore: 88,
          weightedValue: 22264
        }
      ],
      totalWeightedValue: 46000,
      totalWeights: 1.8,
      finalMarketValue: 25500,
      steps: [
        {
          step: 1,
          description: 'Calculate adjusted prices for each comparable',
          calculation: 'adjustedPrice = listPrice + sum(adjustments)',
          result: 25800
        },
        {
          step: 2,
          description: 'Apply quality score weights',
          calculation: 'weightedValue = adjustedPrice * (qualityScore / 100)',
          result: 46000
        }
      ]
    },
    calculatedAt: new Date('2024-01-15T10:00:00Z'),
    lastUpdated: new Date('2024-01-15T10:00:00Z')
  };

  const mockOnRecalculate = jest.fn();
  const mockOnExportPDF = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visual Hierarchy', () => {
    it('should display market value prominently with enhanced styling', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      const marketValues = screen.getAllByText('$25,500');
      expect(marketValues.length).toBeGreaterThan(0);
      // The main display should have the largest text
      const mainValue = marketValues.find(el => el.className.includes('text-6xl'));
      expect(mainValue).toBeInTheDocument();
      expect(mainValue).toHaveClass('text-6xl', 'font-bold');
    });

    it('should display calculation method and comparable count', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      expect(screen.getByText(/5 comparables/i)).toBeInTheDocument();
      expect(screen.getByText(/Quality-Weighted Average/i)).toBeInTheDocument();
    });
  });

  describe('Confidence Indicators', () => {
    it('should display confidence level with appropriate styling', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      expect(screen.getByText('Medium Confidence')).toBeInTheDocument();
      expect(screen.getByText('85% confidence score')).toBeInTheDocument();
    });

    it('should show confidence details when details button is clicked', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      const detailsButton = screen.getAllByRole('button', { name: /details/i })[0];
      fireEvent.click(detailsButton);

      expect(screen.getByText(/reasonably reliable/i)).toBeInTheDocument();
      expect(screen.getByText(/Comparable Count: 5/i)).toBeInTheDocument();
      expect(screen.getByText(/Quality Score Variance: 8.5/i)).toBeInTheDocument();
      expect(screen.getByText(/Price Variance: 12.0%/i)).toBeInTheDocument();
    });

    it('should display high confidence correctly', () => {
      const highConfidenceAnalysis = {
        ...mockMarketAnalysis,
        confidenceLevel: 95
      };

      render(
        <MarketValueCalculator
          marketAnalysis={highConfidenceAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      expect(screen.getByText('High Confidence')).toBeInTheDocument();
    });

    it('should display low confidence with warning', () => {
      const lowConfidenceAnalysis = {
        ...mockMarketAnalysis,
        confidenceLevel: 65,
        confidenceFactors: {
          ...mockMarketAnalysis.confidenceFactors,
          comparableCount: 2
        }
      };

      render(
        <MarketValueCalculator
          marketAnalysis={lowConfidenceAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      expect(screen.getByText('Low Confidence')).toBeInTheDocument();
      
      const detailsButton = screen.getAllByRole('button', { name: /details/i })[0];
      fireEvent.click(detailsButton);

      expect(screen.getByText(/limited reliability/i)).toBeInTheDocument();
    });
  });

  describe('Insurance Comparison', () => {
    it('should display insurance comparison with visual elements', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      expect(screen.getByText('Insurance Comparison')).toBeInTheDocument();
      expect(screen.getByText('$24,000')).toBeInTheDocument();
      expect(screen.getByText('+$1,500')).toBeInTheDocument();
      expect(screen.getByText('+6.3%')).toBeInTheDocument(); // 6.25 rounds to 6.3
    });

    it('should show visual comparison bar', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      expect(screen.getByText('Visual Comparison')).toBeInTheDocument();
      expect(screen.getByText('Market value higher')).toBeInTheDocument();
    });

    it('should display warning for significant undervaluation', () => {
      const undervaluedAnalysis = {
        ...mockMarketAnalysis,
        insuranceValue: 20000,
        valueDifference: 5500,
        valueDifferencePercentage: 27.5,
        isUndervalued: true
      };

      render(
        <MarketValueCalculator
          marketAnalysis={undervaluedAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      expect(screen.getByText('Significant Undervaluation Detected')).toBeInTheDocument();
      const percentageElements = screen.getAllByText(/27\.5%/);
      expect(percentageElements.length).toBeGreaterThan(0);
    });

    it('should display moderate difference note', () => {
      const moderateDiffAnalysis = {
        ...mockMarketAnalysis,
        insuranceValue: 23000,
        valueDifference: 2500,
        valueDifferencePercentage: 10.9,
        isUndervalued: false
      };

      render(
        <MarketValueCalculator
          marketAnalysis={moderateDiffAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      expect(screen.getByText('Moderate Difference Noted')).toBeInTheDocument();
    });

    it('should display aligned values message', () => {
      const alignedAnalysis = {
        ...mockMarketAnalysis,
        insuranceValue: 25000,
        valueDifference: 500,
        valueDifferencePercentage: 2.0,
        isUndervalued: false
      };

      render(
        <MarketValueCalculator
          marketAnalysis={alignedAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      expect(screen.getByText('Values Closely Aligned')).toBeInTheDocument();
    });
  });

  describe('Expandable Calculation Breakdown', () => {
    it('should toggle detailed calculation section', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /toggle detailed calculation/i });
      
      // Initially hidden
      expect(screen.queryByText('Comparable Vehicles Analysis')).not.toBeInTheDocument();

      // Click to show
      fireEvent.click(toggleButton);
      expect(screen.getByText('Comparable Vehicles Analysis')).toBeInTheDocument();

      // Click to hide
      fireEvent.click(toggleButton);
      expect(screen.queryByText('Comparable Vehicles Analysis')).not.toBeInTheDocument();
    });

    it('should display comparable breakdown with enhanced styling', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /toggle detailed calculation/i });
      fireEvent.click(toggleButton);

      expect(screen.getByText('Comparable 1')).toBeInTheDocument();
      expect(screen.getByText('Comparable 2')).toBeInTheDocument();
      expect(screen.getByText('$26,000')).toBeInTheDocument();
      const adjustedPrices = screen.getAllByText('$25,800');
      expect(adjustedPrices.length).toBeGreaterThan(0);
    });

    it('should display final calculation summary', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /toggle detailed calculation/i });
      fireEvent.click(toggleButton);

      expect(screen.getByText('Final Calculation Summary')).toBeInTheDocument();
      expect(screen.getByText('Total Weighted Value:')).toBeInTheDocument();
      const totalValues = screen.getAllByText('$46,000');
      expect(totalValues.length).toBeGreaterThan(0);
      expect(screen.getByText('1.80')).toBeInTheDocument();
    });

    it('should display calculation steps when available', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /toggle detailed calculation/i });
      fireEvent.click(toggleButton);

      expect(screen.getByText('Step-by-Step Calculation')).toBeInTheDocument();
      expect(screen.getByText('Calculate adjusted prices for each comparable')).toBeInTheDocument();
      expect(screen.getByText('Apply quality score weights')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should handle recalculate action', async () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      const recalculateButton = screen.getByRole('button', { name: /recalculate/i });
      fireEvent.click(recalculateButton);

      expect(mockOnRecalculate).toHaveBeenCalledTimes(1);
    });

    it('should handle export PDF action', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export to pdf/i });
      fireEvent.click(exportButton);

      expect(mockOnExportPDF).toHaveBeenCalledTimes(1);
    });

    it('should disable recalculate button during calculation', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      const recalculateButton = screen.getByRole('button', { name: /recalculate/i });
      fireEvent.click(recalculateButton);

      expect(recalculateButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for progress bar', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '85');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Confidence level: 85%');
    });

    it('should have proper ARIA expanded attributes for expandable sections', () => {
      render(
        <MarketValueCalculator
          marketAnalysis={mockMarketAnalysis}
          onRecalculate={mockOnRecalculate}
          onExportPDF={mockOnExportPDF}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /toggle detailed calculation/i });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
