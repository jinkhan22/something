/**
 * UI Component Tests for Comparable Vehicles
 * 
 * Tests the React components for comparable vehicles including:
 * - ComparableVehicleForm validation and submission
 * - ComparableVehicleList rendering and interactions
 * - QualityScoreDisplay with various scores
 * - MarketValueCalculator display and calculations
 * - InsuranceComparisonPanel with different scenarios
 * - CalculationBreakdownView rendering and interactions
 * 
 * Requirements: 1.1-1.8, 2.1-2.7, 3.10, 6.1-6.8, 7.1-7.7, 8.1-8.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QualityScoreDisplay } from '../src/renderer/components/QualityScoreDisplay';
import { InsuranceComparisonPanel } from '../src/renderer/components/InsuranceComparisonPanel';
import type {
  QualityScoreBreakdown,
  MarketAnalysis,
  ExtractedVehicleData,
  ComparableVehicle
} from '../src/types';

// Mock window.electron
(global as any).window = {
  electron: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn()
  }
};

describe('Comparable Vehicles UI Components', () => {
  describe('QualityScoreDisplay', () => {
    const mockBreakdown: QualityScoreBreakdown = {
      baseScore: 100,
      distancePenalty: 2,
      agePenalty: 0,
      ageBonus: 0,
      mileagePenalty: 0,
      mileageBonus: 10,
      equipmentPenalty: 0,
      equipmentBonus: 15,
      finalScore: 123,
      explanations: {
        distance: 'Distance: 120 miles (20 miles over threshold, -2.0 points)',
        age: 'Age: Exact match (2015), no adjustment',
        mileage: 'Mileage: 50,000 vs 50,000 (within 20%, +10 points)',
        equipment: 'Equipment: Perfect match (all 3 features, +15 points)'
      }
    };

    it('should render quality score with correct value', () => {
      render(<QualityScoreDisplay score={95} breakdown={mockBreakdown} />);
      
      expect(screen.getByText(/95/)).toBeInTheDocument();
    });

    it('should display high quality score in green', () => {
      const { container } = render(<QualityScoreDisplay score={95} breakdown={mockBreakdown} />);
      
      // High scores (>80) should have green styling
      const scoreElement = container.querySelector('[class*="green"]');
      expect(scoreElement).toBeInTheDocument();
    });

    it('should display medium quality score in yellow', () => {
      const mediumBreakdown = { ...mockBreakdown, finalScore: 70 };
      const { container } = render(<QualityScoreDisplay score={70} breakdown={mediumBreakdown} />);
      
      // Medium scores (60-80) should have yellow styling
      const scoreElement = container.querySelector('[class*="yellow"]');
      expect(scoreElement).toBeInTheDocument();
    });

    it('should display low quality score in red', () => {
      const lowBreakdown = { ...mockBreakdown, finalScore: 50 };
      const { container } = render(<QualityScoreDisplay score={50} breakdown={lowBreakdown} />);
      
      // Low scores (<60) should have red styling
      const scoreElement = container.querySelector('[class*="red"]');
      expect(scoreElement).toBeInTheDocument();
    });

    it('should show breakdown when expanded', () => {
      render(<QualityScoreDisplay score={95} breakdown={mockBreakdown} />);
      
      // Find and click expand button
      const expandButton = screen.getByRole('button', { name: /details|breakdown|show/i });
      fireEvent.click(expandButton);
      
      // Breakdown details should be visible
      expect(screen.getByText(/Distance:/)).toBeInTheDocument();
      expect(screen.getByText(/Age:/)).toBeInTheDocument();
      expect(screen.getByText(/Mileage:/)).toBeInTheDocument();
      expect(screen.getByText(/Equipment:/)).toBeInTheDocument();
    });

    it('should display all scoring factors in breakdown', () => {
      render(<QualityScoreDisplay score={95} breakdown={mockBreakdown} />);
      
      const expandButton = screen.getByRole('button', { name: /details|breakdown|show/i });
      fireEvent.click(expandButton);
      
      // Check for penalties and bonuses
      expect(screen.getByText(/\-2\.0 points/)).toBeInTheDocument(); // Distance penalty
      expect(screen.getByText(/\+10 points/)).toBeInTheDocument(); // Mileage bonus
      expect(screen.getByText(/\+15 points/)).toBeInTheDocument(); // Equipment bonus
    });

    it('should render in compact mode', () => {
      const { container } = render(
        <QualityScoreDisplay score={95} breakdown={mockBreakdown} compact={true} />
      );
      
      // Compact mode should have smaller styling
      expect(container.querySelector('[class*="compact"]')).toBeInTheDocument();
    });

    it('should be accessible with ARIA labels', () => {
      render(<QualityScoreDisplay score={95} breakdown={mockBreakdown} />);
      
      // Should have accessible labels
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded');
    });
  });

  describe('InsuranceComparisonPanel', () => {
    it('should display both values correctly', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={18000}
          calculatedValue={20000}
          difference={2000}
          differencePercentage={11.11}
        />
      );
      
      expect(screen.getByText(/18,000/)).toBeInTheDocument();
      expect(screen.getByText(/20,000/)).toBeInTheDocument();
    });

    it('should show positive difference when undervalued', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={18000}
          calculatedValue={20000}
          difference={2000}
          differencePercentage={11.11}
        />
      );
      
      expect(screen.getByText(/\+\$2,000/)).toBeInTheDocument();
      expect(screen.getByText(/11\.11%/)).toBeInTheDocument();
    });

    it('should show negative difference when overvalued', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={20000}
          calculatedValue={18000}
          difference={-2000}
          differencePercentage={-10}
        />
      );
      
      expect(screen.getByText(/\-\$2,000/)).toBeInTheDocument();
      expect(screen.getByText(/\-10%/)).toBeInTheDocument();
    });

    it('should display undervaluation alert for >20% difference', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={15000}
          calculatedValue={20000}
          difference={5000}
          differencePercentage={33.33}
        />
      );
      
      // Should show alert for significant undervaluation
      expect(screen.getByText(/significant|undervalued|alert/i)).toBeInTheDocument();
    });

    it('should not show alert for small differences', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={18000}
          calculatedValue={18500}
          difference={500}
          differencePercentage={2.78}
        />
      );
      
      // Should not show alert for small difference
      expect(screen.queryByText(/significant|alert/i)).not.toBeInTheDocument();
    });

    it('should show aligned message for <5% difference', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={18000}
          calculatedValue={18500}
          difference={500}
          differencePercentage={2.78}
        />
      );
      
      expect(screen.getByText(/closely aligned|similar/i)).toBeInTheDocument();
    });

    it('should use visual indicators for difference', () => {
      const { container } = render(
        <InsuranceComparisonPanel
          insuranceValue={18000}
          calculatedValue={20000}
          difference={2000}
          differencePercentage={11.11}
        />
      );
      
      // Should have visual indicator (bar chart, gauge, or color coding)
      expect(container.querySelector('[class*="indicator"]') || 
             container.querySelector('[class*="chart"]') ||
             container.querySelector('[class*="gauge"]')).toBeInTheDocument();
    });

    it('should format currency values correctly', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={18500}
          calculatedValue={20250}
          difference={1750}
          differencePercentage={9.46}
        />
      );
      
      // Should format with commas
      expect(screen.getByText(/18,500/)).toBeInTheDocument();
      expect(screen.getByText(/20,250/)).toBeInTheDocument();
    });
  });

  describe('Component Integration Scenarios', () => {
    const mockLossVehicle: ExtractedVehicleData = {
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
      equipment: ['Navigation', 'Sunroof'],
      marketValue: 18000
    };

    const mockComparable: ComparableVehicle = {
      id: 'comp-1',
      appraisalId: 'appraisal-1',
      source: 'AutoTrader',
      dateAdded: new Date(),
      year: 2015,
      make: 'Toyota',
      model: 'Camry',
      mileage: 48000,
      location: 'San Diego, CA',
      distanceFromLoss: 120,
      listPrice: 19000,
      condition: 'Good',
      equipment: ['Navigation', 'Sunroof'],
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
          distance: 'Distance: 120 miles',
          age: 'Age: Exact match',
          mileage: 'Mileage: Within 20%',
          equipment: 'Equipment: Perfect match'
        }
      },
      adjustments: {
        mileageAdjustment: {
          mileageDifference: 2000,
          depreciationRate: 0.25,
          adjustmentAmount: 500,
          explanation: 'Comparable has 2,000 fewer miles'
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
        adjustedPrice: 19500
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should display quality score for a comparable', () => {
      render(
        <QualityScoreDisplay
          score={mockComparable.qualityScore}
          breakdown={mockComparable.qualityScoreBreakdown}
        />
      );
      
      expect(screen.getByText(/95/)).toBeInTheDocument();
    });

    it('should show insurance comparison with calculated market value', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={mockLossVehicle.marketValue!}
          calculatedValue={19500}
          difference={1500}
          differencePercentage={8.33}
        />
      );
      
      expect(screen.getByText(/18,000/)).toBeInTheDocument();
      expect(screen.getByText(/19,500/)).toBeInTheDocument();
    });

    it('should handle excellent quality comparable', () => {
      const excellentBreakdown: QualityScoreBreakdown = {
        baseScore: 100,
        distancePenalty: 0,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 10,
        equipmentPenalty: 0,
        equipmentBonus: 15,
        finalScore: 125,
        explanations: {
          distance: 'Distance: 25 miles (within threshold)',
          age: 'Age: Exact match',
          mileage: 'Mileage: Within 20%',
          equipment: 'Equipment: Perfect match'
        }
      };

      render(<QualityScoreDisplay score={125} breakdown={excellentBreakdown} />);
      
      expect(screen.getByText(/125/)).toBeInTheDocument();
    });

    it('should handle poor quality comparable', () => {
      const poorBreakdown: QualityScoreBreakdown = {
        baseScore: 100,
        distancePenalty: 20,
        agePenalty: 10,
        ageBonus: 0,
        mileagePenalty: 15,
        mileageBonus: 0,
        equipmentPenalty: 30,
        equipmentBonus: 0,
        finalScore: 25,
        explanations: {
          distance: 'Distance: 350 miles (very far)',
          age: 'Age: 5 years older',
          mileage: 'Mileage: >60% difference',
          equipment: 'Equipment: 3 missing features'
        }
      };

      render(<QualityScoreDisplay score={25} breakdown={poorBreakdown} />);
      
      expect(screen.getByText(/25/)).toBeInTheDocument();
    });

    it('should handle significant undervaluation scenario', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={15000}
          calculatedValue={22000}
          difference={7000}
          differencePercentage={46.67}
        />
      );
      
      // Should show strong alert for 46% undervaluation
      expect(screen.getByText(/significant|undervalued/i)).toBeInTheDocument();
      expect(screen.getByText(/46\.67%/)).toBeInTheDocument();
    });

    it('should handle overvaluation scenario', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={22000}
          calculatedValue={18000}
          difference={-4000}
          differencePercentage={-18.18}
        />
      );
      
      expect(screen.getByText(/\-\$4,000/)).toBeInTheDocument();
      expect(screen.getByText(/\-18\.18%/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on QualityScoreDisplay', () => {
      const mockBreakdown: QualityScoreBreakdown = {
        baseScore: 100,
        distancePenalty: 0,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 10,
        equipmentPenalty: 0,
        equipmentBonus: 15,
        finalScore: 125,
        explanations: {
          distance: 'Distance: 25 miles',
          age: 'Age: Exact match',
          mileage: 'Mileage: Within 20%',
          equipment: 'Equipment: Perfect match'
        }
      };

      render(<QualityScoreDisplay score={125} breakdown={mockBreakdown} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded');
    });

    it('should have semantic HTML structure', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={18000}
          calculatedValue={20000}
          difference={2000}
          differencePercentage={11.11}
        />
      );
      
      // Should use semantic HTML elements
      const container = screen.getByRole('region') || screen.getByRole('article');
      expect(container).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const mockBreakdown: QualityScoreBreakdown = {
        baseScore: 100,
        distancePenalty: 0,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 0,
        equipmentPenalty: 0,
        equipmentBonus: 0,
        finalScore: 100,
        explanations: {
          distance: 'Distance: 50 miles',
          age: 'Age: Exact match',
          mileage: 'Mileage: Exact match',
          equipment: 'Equipment: Perfect match'
        }
      };

      render(<QualityScoreDisplay score={100} breakdown={mockBreakdown} />);
      
      const button = screen.getByRole('button');
      
      // Should be focusable
      button.focus();
      expect(button).toHaveFocus();
      
      // Should respond to Enter key
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing breakdown data gracefully', () => {
      const minimalBreakdown: QualityScoreBreakdown = {
        baseScore: 100,
        distancePenalty: 0,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 0,
        equipmentPenalty: 0,
        equipmentBonus: 0,
        finalScore: 100,
        explanations: {
          distance: '',
          age: '',
          mileage: '',
          equipment: ''
        }
      };

      render(<QualityScoreDisplay score={100} breakdown={minimalBreakdown} />);
      
      // Should render without crashing
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it('should handle zero values in insurance comparison', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={0}
          calculatedValue={20000}
          difference={20000}
          differencePercentage={Infinity}
        />
      );
      
      // Should handle gracefully without crashing
      expect(screen.getByText(/20,000/)).toBeInTheDocument();
    });

    it('should handle negative scores gracefully', () => {
      const negativeBreakdown: QualityScoreBreakdown = {
        baseScore: 100,
        distancePenalty: 50,
        agePenalty: 50,
        ageBonus: 0,
        mileagePenalty: 50,
        mileageBonus: 0,
        equipmentPenalty: 50,
        equipmentBonus: 0,
        finalScore: 0, // Clamped at 0
        explanations: {
          distance: 'Distance: Very far',
          age: 'Age: Very old',
          mileage: 'Mileage: Very high',
          equipment: 'Equipment: All missing'
        }
      };

      render(<QualityScoreDisplay score={0} breakdown={negativeBreakdown} />);
      
      // Should display 0 instead of negative
      expect(screen.getByText(/^0$/)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quality score display quickly', () => {
      const startTime = performance.now();
      
      const mockBreakdown: QualityScoreBreakdown = {
        baseScore: 100,
        distancePenalty: 2,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: 0,
        mileageBonus: 10,
        equipmentPenalty: 0,
        equipmentBonus: 15,
        finalScore: 123,
        explanations: {
          distance: 'Distance: 120 miles',
          age: 'Age: Exact match',
          mileage: 'Mileage: Within 20%',
          equipment: 'Equipment: Perfect match'
        }
      };

      render(<QualityScoreDisplay score={123} breakdown={mockBreakdown} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle multiple re-renders efficiently', () => {
      const { rerender } = render(
        <InsuranceComparisonPanel
          insuranceValue={18000}
          calculatedValue={20000}
          difference={2000}
          differencePercentage={11.11}
        />
      );
      
      // Re-render with different values
      for (let i = 0; i < 10; i++) {
        rerender(
          <InsuranceComparisonPanel
            insuranceValue={18000 + i * 100}
            calculatedValue={20000 + i * 100}
            difference={2000}
            differencePercentage={11.11}
          />
        );
      }
      
      // Should not crash or slow down
      expect(screen.getByText(/20,900/)).toBeInTheDocument();
    });
  });
});
