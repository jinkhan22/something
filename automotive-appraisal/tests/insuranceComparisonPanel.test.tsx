import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InsuranceComparisonPanel } from '../src/renderer/components/InsuranceComparisonPanel';

describe('InsuranceComparisonPanel', () => {
  describe('Value Display', () => {
    it('should display insurance value correctly', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      expect(screen.getByText('$25,000')).toBeInTheDocument();
      expect(screen.getByText('Insurance Value')).toBeInTheDocument();
    });

    it('should display calculated market value correctly', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      expect(screen.getByText('$28,000')).toBeInTheDocument();
      expect(screen.getByText('Calculated Market Value')).toBeInTheDocument();
    });

    it('should format currency values without decimals', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25750.50}
          calculatedValue={28250.75}
          difference={2500.25}
          differencePercentage={9.7}
        />
      );

      // Should round to nearest dollar
      expect(screen.getByText('$25,751')).toBeInTheDocument();
      expect(screen.getByText('$28,251')).toBeInTheDocument();
    });
  });

  describe('Difference Display', () => {
    it('should display absolute difference in dollars', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      // Should appear in the difference section
      const differenceElements = screen.getAllByText('$3,000');
      expect(differenceElements.length).toBeGreaterThan(0);
    });

    it('should display percentage difference with sign', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      const percentageElements = screen.getAllByText('+12.0%');
      expect(percentageElements.length).toBeGreaterThan(0);
    });

    it('should handle negative differences', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={28000}
          calculatedValue={25000}
          difference={-3000}
          differencePercentage={-10.7}
        />
      );

      expect(screen.getByText('-10.7%')).toBeInTheDocument();
    });

    it('should display difference in quick facts section', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      expect(screen.getByText('Absolute Difference:')).toBeInTheDocument();
      expect(screen.getByText('Percentage Difference:')).toBeInTheDocument();
    });
  });

  describe('Undervaluation Alert', () => {
    it('should show undervaluation alert when difference > 20%', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={20000}
          calculatedValue={25000}
          difference={5000}
          differencePercentage={25}
        />
      );

      expect(screen.getByText('⚠️ Potential Undervaluation')).toBeInTheDocument();
      expect(screen.getByText('Significant Undervaluation Detected')).toBeInTheDocument();
    });

    it('should not show undervaluation alert when difference = 20%', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={30000}
          difference={5000}
          differencePercentage={20}
        />
      );

      expect(screen.queryByText('⚠️ Potential Undervaluation')).not.toBeInTheDocument();
    });

    it('should not show undervaluation alert when difference < 20%', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      expect(screen.queryByText('⚠️ Potential Undervaluation')).not.toBeInTheDocument();
    });

    it('should not show undervaluation alert for negative differences', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={30000}
          calculatedValue={20000}
          difference={-10000}
          differencePercentage={-33.3}
        />
      );

      expect(screen.queryByText('⚠️ Potential Undervaluation')).not.toBeInTheDocument();
    });

    it('should include difference amount in undervaluation message', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={20000}
          calculatedValue={25000}
          difference={5000}
          differencePercentage={25}
        />
      );

      const dollarElements = screen.getAllByText(/\$5,000/);
      expect(dollarElements.length).toBeGreaterThan(0);
      const percentageElements = screen.getAllByText(/\+25.0%/);
      expect(percentageElements.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Indicators', () => {
    it('should show red styling for significant positive differences', () => {
      const { container } = render(
        <InsuranceComparisonPanel
          insuranceValue={20000}
          calculatedValue={25000}
          difference={5000}
          differencePercentage={25}
        />
      );

      const redElements = container.querySelectorAll('.text-red-600, .bg-red-500');
      expect(redElements.length).toBeGreaterThan(0);
    });

    it('should show green styling for negative differences', () => {
      const { container } = render(
        <InsuranceComparisonPanel
          insuranceValue={28000}
          calculatedValue={25000}
          difference={-3000}
          differencePercentage={-10.7}
        />
      );

      const greenElements = container.querySelectorAll('.text-green-600, .bg-green-500');
      expect(greenElements.length).toBeGreaterThan(0);
    });

    it('should show gray styling for minimal differences', () => {
      const { container } = render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={25500}
          difference={500}
          differencePercentage={2}
        />
      );

      const grayElements = container.querySelectorAll('.text-gray-600, .bg-gray-400');
      expect(grayElements.length).toBeGreaterThan(0);
    });

    it('should render bar chart visualization', () => {
      const { container } = render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      const barChart = container.querySelector('.bg-gray-200.rounded-full');
      expect(barChart).toBeInTheDocument();
    });
  });

  describe('Interpretation Messages', () => {
    it('should show undervaluation message for >20% positive difference', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={20000}
          calculatedValue={25000}
          difference={5000}
          differencePercentage={25}
        />
      );

      expect(screen.getByText('Significant Undervaluation Detected')).toBeInTheDocument();
      expect(
        screen.getByText(/insurance valuation is.*lower than the calculated market value/i)
      ).toBeInTheDocument();
    });

    it('should show notable difference message for 5-20% difference', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      expect(screen.getByText('Notable Difference')).toBeInTheDocument();
      expect(screen.getByText(/may warrant further review/i)).toBeInTheDocument();
    });

    it('should show aligned message for <5% difference', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={25500}
          difference={500}
          differencePercentage={2}
        />
      );

      expect(screen.getByText('Values Closely Aligned')).toBeInTheDocument();
      expect(screen.getByText(/indicating good alignment/i)).toBeInTheDocument();
    });

    it('should show notable difference for negative differences >5%', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={28000}
          calculatedValue={25000}
          difference={-3000}
          differencePercentage={-10.7}
        />
      );

      expect(screen.getByText('Notable Difference')).toBeInTheDocument();
    });
  });

  describe('Quick Facts Section', () => {
    it('should display all quick facts', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      expect(screen.getByText('Quick Facts')).toBeInTheDocument();
      expect(screen.getByText('Absolute Difference:')).toBeInTheDocument();
      expect(screen.getByText('Percentage Difference:')).toBeInTheDocument();
      expect(screen.getByText('Higher Value:')).toBeInTheDocument();
      expect(screen.getByText('Status:')).toBeInTheDocument();
    });

    it('should indicate market analysis is higher when difference is positive', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      expect(screen.getByText('Market Analysis')).toBeInTheDocument();
    });

    it('should indicate insurance is higher when difference is negative', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={28000}
          calculatedValue={25000}
          difference={-3000}
          differencePercentage={-10.7}
        />
      );

      expect(screen.getByText('Insurance')).toBeInTheDocument();
    });

    it('should indicate equal when difference is zero', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={25000}
          difference={0}
          differencePercentage={0}
        />
      );

      expect(screen.getByText('Equal')).toBeInTheDocument();
    });

    it('should show undervalued status for >20% positive difference', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={20000}
          calculatedValue={25000}
          difference={5000}
          differencePercentage={25}
        />
      );

      expect(screen.getByText('Undervalued')).toBeInTheDocument();
    });

    it('should show review needed status for 5-20% difference', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      expect(screen.getByText('Review Needed')).toBeInTheDocument();
    });

    it('should show aligned status for <5% difference', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={25500}
          difference={500}
          differencePercentage={2}
        />
      );

      expect(screen.getByText('Aligned')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={0}
          calculatedValue={25000}
          difference={25000}
          differencePercentage={100}
        />
      );

      expect(screen.getByText('$0')).toBeInTheDocument();
      const dollarElements = screen.getAllByText('$25,000');
      expect(dollarElements.length).toBeGreaterThan(0);
    });

    it('should handle very large values', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={150000}
          calculatedValue={175000}
          difference={25000}
          differencePercentage={16.7}
        />
      );

      expect(screen.getByText('$150,000')).toBeInTheDocument();
      expect(screen.getByText('$175,000')).toBeInTheDocument();
    });

    it('should handle very small percentage differences', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={25100}
          difference={100}
          differencePercentage={0.4}
        />
      );

      const percentageElements = screen.getAllByText('+0.4%');
      expect(percentageElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Values Closely Aligned')).toBeInTheDocument();
    });

    it('should handle exactly 5% difference boundary', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={20000}
          calculatedValue={21000}
          difference={1000}
          differencePercentage={5}
        />
      );

      // At exactly 5%, should show aligned message
      expect(screen.getByText('Values Closely Aligned')).toBeInTheDocument();
    });

    it('should handle exactly 20% difference boundary', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={30000}
          difference={5000}
          differencePercentage={20}
        />
      );

      // At exactly 20%, should not show undervaluation alert
      expect(screen.queryByText('⚠️ Potential Undervaluation')).not.toBeInTheDocument();
      expect(screen.getByText('Notable Difference')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <InsuranceComparisonPanel
          insuranceValue={25000}
          calculatedValue={28000}
          difference={3000}
          differencePercentage={12}
        />
      );

      const heading = screen.getByText('Insurance vs Market Value Comparison');
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    it('should use semantic HTML for alerts', () => {
      const { container } = render(
        <InsuranceComparisonPanel
          insuranceValue={20000}
          calculatedValue={25000}
          difference={5000}
          differencePercentage={25}
        />
      );

      // Check for alert-style divs with proper styling
      const alerts = container.querySelectorAll('.bg-red-50.border');
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should include SVG icons with proper attributes', () => {
      const { container } = render(
        <InsuranceComparisonPanel
          insuranceValue={20000}
          calculatedValue={25000}
          difference={5000}
          differencePercentage={25}
        />
      );

      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('fill');
        expect(svg).toHaveAttribute('viewBox');
      });
    });
  });
});
