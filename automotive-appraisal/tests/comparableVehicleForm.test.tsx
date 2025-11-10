import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ComparableVehicleForm } from '../src/renderer/components/ComparableVehicleForm';
import { ExtractedVehicleData, ComparableVehicle } from '../src/types';

describe('ComparableVehicleForm', () => {
  const mockLossVehicle: ExtractedVehicleData = {
    year: 2018,
    make: 'Toyota',
    model: 'Camry',
    mileage: 50000,
    vin: '1234567890ABCDEFG',
    condition: 'Good',
    equipment: ['Navigation', 'Sunroof'],
    location: 'Los Angeles, CA',
    reportType: 'CCC',
    extractionConfidence: 0.95,
    extractionErrors: []
  };

  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form with all required fields', () => {
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Add Comparable Vehicle')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /Source/ })).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: /Year/ })).toBeInTheDocument();
      expect(screen.getByLabelText(/^Make \*/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Model \*/)).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: /Mileage/ })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /^Location/ })).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: /List Price/ })).toBeInTheDocument();
      expect(screen.getByText(/Condition/)).toBeInTheDocument();
    });

    it('should render with existing comparable data', () => {
      const existingComparable: ComparableVehicle = {
        id: 'comp-1',
        appraisalId: 'test-appraisal',
        source: 'AutoTrader',
        sourceUrl: 'https://example.com',
        dateAdded: new Date(),
        year: 2018,
        make: 'Toyota',
        model: 'Camry',
        mileage: 48000,
        location: 'Los Angeles, CA',
        distanceFromLoss: 25,
        listPrice: 22000,
        condition: 'Excellent',
        equipment: ['Navigation'],
        qualityScore: 95,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: 0,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 10,
          equipmentPenalty: 0,
          equipmentBonus: 0,
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
            mileageDifference: 2000,
            depreciationRate: 0.25,
            adjustmentAmount: 500,
            explanation: ''
          },
          equipmentAdjustments: [],
          conditionAdjustment: {
            comparableCondition: 'Excellent',
            lossVehicleCondition: 'Good',
            multiplier: 1.05,
            adjustmentAmount: 0,
            explanation: ''
          },
          totalAdjustment: 500,
          adjustedPrice: 22500
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          existingComparable={existingComparable}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Edit Comparable Vehicle')).toBeInTheDocument();
      expect(screen.getByDisplayValue('AutoTrader')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2018')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Toyota')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Camry')).toBeInTheDocument();
      expect(screen.getByDisplayValue('48000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('22000')).toBeInTheDocument();
    });

    it('should show equipment multi-select with common features', () => {
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Sunroof')).toBeInTheDocument();
      expect(screen.getByText('Premium Audio')).toBeInTheDocument();
      expect(screen.getByText('Sport Package')).toBeInTheDocument();
      expect(screen.getByText('Leather Seats')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByText('Add Comparable');
      await user.click(submitButton);

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate year range', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const yearInput = screen.getByLabelText(/Year/);
      await user.type(yearInput, '1800');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/Year must be between/)).toBeInTheDocument();
      });
    });

    it('should validate mileage is positive', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const mileageInput = screen.getByLabelText(/Mileage/);
      await user.type(mileageInput, '-1000');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/Mileage must be a positive number/)).toBeInTheDocument();
      });
    });

    it('should validate unrealistic mileage', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const mileageInput = screen.getByLabelText(/Mileage/);
      await user.type(mileageInput, '600000');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/Mileage seems unrealistically high/)).toBeInTheDocument();
      });
    });

    it('should validate location format', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const locationInput = screen.getByRole('textbox', { name: /^Location/ });
      await user.type(locationInput, 'Invalid Location');
      await user.tab();

      await waitFor(() => {
        const errorMessages = screen.getAllByText(/Format: City, ST/);
        expect(errorMessages.length).toBeGreaterThan(0);
        expect(errorMessages[0]).toHaveClass('text-red-600');
      });
    });

    it('should validate price is positive', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const priceInput = screen.getByLabelText(/List Price/);
      await user.type(priceInput, '-5000');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/Price must be a positive number/)).toBeInTheDocument();
      });
    });

    it('should warn about unrealistic prices', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const priceInput = screen.getByLabelText(/List Price/);
      await user.type(priceInput, '100');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/Price seems unrealistically low/)).toBeInTheDocument();
      });
    });

    it('should validate high mileage for vehicle age', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const yearInput = screen.getByLabelText(/Year/);
      const mileageInput = screen.getByLabelText(/Mileage/);

      await user.type(yearInput, '2023');
      await user.type(mileageInput, '100000');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/High mileage for age/)).toBeInTheDocument();
      });
    });
  });

  describe('Auto-complete', () => {
    it('should suggest loss vehicle make', () => {
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const makeInput = screen.getByLabelText(/Make/) as HTMLInputElement;
      expect(makeInput.placeholder).toBe('Toyota');
    });

    it('should suggest loss vehicle model when make matches', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const makeInput = screen.getByLabelText(/Make/);
      await user.type(makeInput, 'Toyota');

      const modelInput = screen.getByLabelText(/Model/) as HTMLInputElement;
      expect(modelInput.placeholder).toBe('Camry');
    });
  });

  describe('Equipment Selection', () => {
    it('should toggle equipment features', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const navigationCheckbox = screen.getByRole('checkbox', { name: /Navigation/ });
      expect(navigationCheckbox).not.toBeChecked();

      await user.click(navigationCheckbox);
      expect(navigationCheckbox).toBeChecked();

      await user.click(navigationCheckbox);
      expect(navigationCheckbox).not.toBeChecked();
    });

    it('should show selected equipment count', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Selected: 0 features')).toBeInTheDocument();

      const navigationCheckbox = screen.getByRole('checkbox', { name: /Navigation/ });
      await user.click(navigationCheckbox);

      expect(screen.getByText('Selected: 1 feature')).toBeInTheDocument();

      const sunroofCheckbox = screen.getByRole('checkbox', { name: /Sunroof/ });
      await user.click(sunroofCheckbox);

      expect(screen.getByText('Selected: 2 features')).toBeInTheDocument();
    });
  });

  describe('Condition Selection', () => {
    it('should select condition', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const excellentButton = screen.getByRole('button', { name: 'Excellent' });
      await user.click(excellentButton);

      expect(excellentButton).toHaveClass('border-blue-500');
    });

    it('should default to Good condition', () => {
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const goodButton = screen.getByRole('button', { name: 'Good' });
      expect(goodButton).toHaveClass('border-blue-500');
    });
  });

  describe('Quality Score Preview', () => {
    it('should show quality score preview when sufficient data entered', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByRole('spinbutton', { name: /Year/ }), '2018');
      await user.type(screen.getByLabelText(/^Make \*/), 'Toyota');
      await user.type(screen.getByLabelText(/^Model \*/), 'Camry');
      await user.type(screen.getByRole('spinbutton', { name: /Mileage/ }), '48000');
      await user.type(screen.getByRole('textbox', { name: /^Location/ }), 'Los Angeles, CA');

      await waitFor(() => {
        expect(screen.getByText('Quality Score Preview')).toBeInTheDocument();
      });
    });

    it('should not show preview with invalid data', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByRole('spinbutton', { name: /Year/ }), '1800');
      await user.type(screen.getByLabelText(/^Make \*/), 'Toyota');
      await user.type(screen.getByLabelText(/^Model \*/), 'Camry');

      expect(screen.queryByText('Quality Score Preview')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit valid form data', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.selectOptions(screen.getByRole('combobox', { name: /Source/ }), 'AutoTrader');
      await user.type(screen.getByRole('spinbutton', { name: /Year/ }), '2018');
      await user.type(screen.getByLabelText(/^Make \*/), 'Toyota');
      await user.type(screen.getByLabelText(/^Model \*/), 'Camry');
      await user.type(screen.getByRole('spinbutton', { name: /Mileage/ }), '48000');
      await user.type(screen.getByRole('textbox', { name: /^Location/ }), 'Los Angeles, CA');
      await user.type(screen.getByRole('spinbutton', { name: /List Price/ }), '22000');

      const submitButton = screen.getByText('Add Comparable');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            appraisalId: 'test-appraisal',
            source: 'AutoTrader',
            year: 2018,
            make: 'Toyota',
            model: 'Camry',
            mileage: 48000,
            location: 'Los Angeles, CA',
            listPrice: 22000,
            condition: 'Good'
          })
        );
      });
    });

    it('should include equipment in submission', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.selectOptions(screen.getByRole('combobox', { name: /Source/ }), 'AutoTrader');
      await user.type(screen.getByRole('spinbutton', { name: /Year/ }), '2018');
      await user.type(screen.getByLabelText(/^Make \*/), 'Toyota');
      await user.type(screen.getByLabelText(/^Model \*/), 'Camry');
      await user.type(screen.getByRole('spinbutton', { name: /Mileage/ }), '48000');
      await user.type(screen.getByRole('textbox', { name: /^Location/ }), 'Los Angeles, CA');
      await user.type(screen.getByRole('spinbutton', { name: /List Price/ }), '22000');

      const navigationCheckbox = screen.getByRole('checkbox', { name: /Navigation/ });
      await user.click(navigationCheckbox);

      const submitButton = screen.getByText('Add Comparable');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            equipment: ['Navigation']
          })
        );
      });
    });

    it('should not submit with validation errors', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByRole('spinbutton', { name: /Year/ }), '1800');
      await user.type(screen.getByLabelText(/^Make \*/), 'Toyota');

      const submitButton = screen.getByText('Add Comparable');
      await user.click(submitButton);

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should disable submit button when form is invalid', () => {
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByText('Add Comparable');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Cancel Action', () => {
    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Inline Validation Messages', () => {
    it('should show inline error messages on blur', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const yearInput = screen.getByLabelText(/Year/);
      await user.click(yearInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Year is required')).toBeInTheDocument();
      });
    });

    it('should clear error messages when field becomes valid', async () => {
      const user = userEvent.setup();
      render(
        <ComparableVehicleForm
          appraisalId="test-appraisal"
          lossVehicle={mockLossVehicle}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const yearInput = screen.getByLabelText(/Year/);
      await user.click(yearInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Year is required')).toBeInTheDocument();
      });

      await user.type(yearInput, '2018');

      await waitFor(() => {
        expect(screen.queryByText('Year is required')).not.toBeInTheDocument();
      });
    });
  });
});
