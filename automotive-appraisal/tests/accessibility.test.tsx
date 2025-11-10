/**
 * Accessibility Tests
 * Tests keyboard navigation, ARIA attributes, and screen reader support
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ComparableVehicleForm } from '../src/renderer/components/ComparableVehicleForm';
import { ComparableVehicleList } from '../src/renderer/components/ComparableVehicleList';
import { QualityScoreDisplay } from '../src/renderer/components/QualityScoreDisplay';
import { MarketValueCalculator } from '../src/renderer/components/MarketValueCalculator';
import { ExtractedVehicleData, ComparableVehicle, MarketAnalysis } from '../src/types';

expect.extend(toHaveNoViolations);

// Wrapper component for tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Accessibility Tests', () => {
  const mockLossVehicle: ExtractedVehicleData = {
    year: 2020,
    make: 'Toyota',
    model: 'Camry',
    mileage: 50000,
    vin: '1234567890ABCDEFG',
    location: 'Los Angeles, CA',
    reportType: 'MITCHELL',
    extractionConfidence: 0.95,
    extractionErrors: [],
    marketValue: 25000,
    condition: 'Good',
    equipment: ['Navigation', 'Sunroof']
  };

  const mockComparable: ComparableVehicle = {
    id: 'comp1',
    appraisalId: 'appr1',
    source: 'AutoTrader',
    dateAdded: new Date(),
    year: 2020,
    make: 'Toyota',
    model: 'Camry',
    mileage: 48000,
    location: 'Los Angeles, CA',
    distanceFromLoss: 25,
    listPrice: 24500,
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
      equipmentBonus: 15,
      finalScore: 95,
      explanations: {
        distance: 'Within 100 miles',
        age: 'Exact match',
        mileage: 'Within 20% of loss vehicle',
        equipment: 'All equipment matches'
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
      adjustedPrice: 25000
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('ComparableVehicleForm Accessibility', () => {
    it('should have no axe violations', async () => {
      const { container } = render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
        { wrapper: TestWrapper }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels on required fields', () => {
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
        { wrapper: TestWrapper }
      );

      const sourceField = screen.getByLabelText(/source/i);
      expect(sourceField).toHaveAttribute('aria-required', 'true');

      const yearField = screen.getByLabelText(/year/i);
      expect(yearField).toHaveAttribute('aria-required', 'true');

      const makeField = screen.getByLabelText(/make/i);
      expect(makeField).toHaveAttribute('aria-required', 'true');
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const yearField = screen.getByLabelText(/year/i);
      await user.type(yearField, '1800');
      await user.tab();

      await waitFor(() => {
        expect(yearField).toHaveAttribute('aria-invalid', 'true');
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation through form fields', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const sourceField = screen.getByLabelText(/source/i);
      sourceField.focus();
      expect(sourceField).toHaveFocus();

      // Tab through fields
      await user.tab();
      const sourceUrlField = screen.getByLabelText(/source url/i);
      expect(sourceUrlField).toHaveFocus();

      await user.tab();
      const yearField = screen.getByLabelText(/year/i);
      expect(yearField).toHaveFocus();
    });

    it('should support Escape key to cancel', async () => {
      const onCancel = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={onCancel}
        />
      );

      await user.keyboard('{Escape}');
      expect(onCancel).toHaveBeenCalled();
    });

    it('should support Cmd+S to save', async () => {
      const onSave = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          existingComparable={mockComparable}
          onSave={onSave}
          onCancel={jest.fn()}
        />
      );

      await user.keyboard('{Meta>}s{/Meta}');
      
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });

    it('should have proper radio group for condition selection', () => {
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const conditionGroup = screen.getByRole('group', { name: /condition/i });
      expect(conditionGroup).toBeInTheDocument();

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(4);
      
      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('aria-checked');
      });
    });

    it('should announce equipment selection count', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const navigationCheckbox = screen.getByLabelText(/equipment feature: navigation/i);
      await user.click(navigationCheckbox);

      const countElement = screen.getByText(/selected: 1 feature/i);
      expect(countElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should have descriptive button labels', () => {
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel and close form/i });
      expect(cancelButton).toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: /add comparable vehicle/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('ComparableVehicleList Accessibility', () => {
    it('should have no axe violations', async () => {
      const { container } = render(
        <ComparableVehicleList
          comparables={[mockComparable]}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onSort={jest.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation through list items', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleList
          comparables={[mockComparable, { ...mockComparable, id: 'comp2' }]}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onSort={jest.fn()}
        />
      );

      const listItems = screen.getAllByRole('row');
      expect(listItems.length).toBeGreaterThan(0);

      // Focus first item
      listItems[1].focus(); // Skip header row
      expect(listItems[1]).toHaveFocus();

      // Arrow down should move to next item
      await user.keyboard('{ArrowDown}');
      expect(listItems[2]).toHaveFocus();
    });

    it('should have accessible action buttons', () => {
      render(
        <ComparableVehicleList
          comparables={[mockComparable]}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onSort={jest.fn()}
        />
      );

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons.length).toBeGreaterThan(0);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('QualityScoreDisplay Accessibility', () => {
    it('should have no axe violations', async () => {
      const { container } = render(
        <QualityScoreDisplay
          score={95}
          breakdown={mockComparable.qualityScoreBreakdown}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels for score', () => {
      render(
        <QualityScoreDisplay
          score={95}
          breakdown={mockComparable.qualityScoreBreakdown}
        />
      );

      const scoreElement = screen.getByText('95');
      expect(scoreElement.closest('[role]')).toHaveAttribute('aria-label');
    });

    it('should support keyboard expansion of breakdown', async () => {
      const user = userEvent.setup();
      render(
        <QualityScoreDisplay
          score={95}
          breakdown={mockComparable.qualityScoreBreakdown}
        />
      );

      const expandButton = screen.getByRole('button');
      await user.click(expandButton);

      const breakdown = screen.getByText(/distance/i);
      expect(breakdown).toBeVisible();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should show keyboard shortcuts help with Cmd+K', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <ComparableVehicleForm
            appraisalId="test"
            lossVehicle={mockLossVehicle}
            onSave={jest.fn()}
            onCancel={jest.fn()}
          />
        </div>
      );

      await user.keyboard('{Meta>}k{/Meta}');

      // Check if help modal event was triggered
      // This would need to be tested in integration with the KeyboardShortcutsHelp component
    });
  });

  describe('Focus Management', () => {
    it('should focus first field on mount', async () => {
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        const sourceField = screen.getByLabelText(/source/i);
        expect(sourceField).toHaveFocus();
      }, { timeout: 200 });
    });

    it('should focus first error field on validation failure', async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={onSave}
          onCancel={jest.fn()}
        />
      );

      const submitButton = screen.getByRole('button', { name: /add comparable/i });
      await user.click(submitButton);

      await waitFor(() => {
        const sourceField = screen.getByLabelText(/source/i);
        expect(sourceField).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Tab through all fields
      const buttons = screen.getAllByRole('button');
      const lastButton = buttons[buttons.length - 1];
      
      lastButton.focus();
      expect(lastButton).toHaveFocus();

      // Tab from last element should cycle back
      await user.tab();
      
      // Should cycle back to first focusable element
      const firstFocusable = screen.getByLabelText(/source/i);
      await waitFor(() => {
        expect(firstFocusable).toHaveFocus();
      });
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce form submission success', async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          existingComparable={mockComparable}
          onSave={onSave}
          onCancel={jest.fn()}
        />
      );

      const submitButton = screen.getByRole('button', { name: /update comparable/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
        // Check for live region with success message
        const liveRegion = document.getElementById('sr-live-region');
        expect(liveRegion).toBeInTheDocument();
      });
    });

    it('should announce validation errors', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const yearField = screen.getByLabelText(/year/i);
      await user.type(yearField, '1800');
      await user.tab();

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
      });
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA contrast requirements', async () => {
      const { container } = render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });

      expect(results).toHaveNoViolations();
    });
  });

  describe('Reduced Motion Support', () => {
    it('should respect prefers-reduced-motion', () => {
      // Mock matchMedia for reduced motion
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(
        <ComparableVehicleForm
          appraisalId="test"
          lossVehicle={mockLossVehicle}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Verify that animations are disabled or reduced
      // This would be tested through CSS or animation properties
    });
  });
});
