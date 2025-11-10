import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ComparableVehicleList } from '../src/renderer/components/ComparableVehicleList';
import { ComparableVehicle } from '../src/types';

describe('ComparableVehicleList', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnSort = jest.fn();

  const createMockComparable = (overrides: Partial<ComparableVehicle> = {}): ComparableVehicle => ({
    id: 'comp-1',
    appraisalId: 'appraisal-1',
    source: 'AutoTrader',
    sourceUrl: 'https://example.com',
    dateAdded: new Date('2024-01-01'),
    year: 2018,
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    mileage: 48000,
    location: 'Los Angeles, CA',
    distanceFromLoss: 25,
    listPrice: 22000,
    adjustedPrice: 22500,
    condition: 'Good',
    equipment: ['Navigation', 'Sunroof'],
    qualityScore: 92.5,
    qualityScoreBreakdown: {
      baseScore: 100,
      distancePenalty: 0,
      agePenalty: 0,
      ageBonus: 0,
      mileagePenalty: 0,
      mileageBonus: 10,
      equipmentPenalty: 0,
      equipmentBonus: 5,
      finalScore: 92.5,
      explanations: {
        distance: 'Within 100 miles',
        age: 'Same year',
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
      adjustedPrice: 22500
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should display empty state when no comparables', () => {
      render(
        <ComparableVehicleList
          comparables={[]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('No comparable vehicles')).toBeInTheDocument();
      expect(screen.getByText(/Get started by adding comparable vehicles/)).toBeInTheDocument();
      expect(screen.getByText(/Add at least 3 comparables/)).toBeInTheDocument();
    });

    it('should show helpful message in empty state', () => {
      render(
        <ComparableVehicleList
          comparables={[]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/Tip:/)).toBeInTheDocument();
    });
  });

  describe('List Rendering', () => {
    it('should render table with comparables', () => {
      const comparables = [createMockComparable()];

      render(
        <ComparableVehicleList
          comparables={comparables}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('2018 Toyota Camry')).toBeInTheDocument();
      expect(screen.getByText('SE')).toBeInTheDocument();
      expect(screen.getByText('48,000 mi')).toBeInTheDocument();
      expect(screen.getByText('$22,000')).toBeInTheDocument();
      expect(screen.getByText('25 mi')).toBeInTheDocument();
      expect(screen.getByText('92.5')).toBeInTheDocument();
    });

    it('should render multiple comparables', () => {
      const comparables = [
        createMockComparable({ id: 'comp-1', make: 'Toyota', model: 'Camry' }),
        createMockComparable({ id: 'comp-2', make: 'Honda', model: 'Accord' }),
        createMockComparable({ id: 'comp-3', make: 'Ford', model: 'Fusion' })
      ];

      render(
        <ComparableVehicleList
          comparables={comparables}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/Toyota Camry/)).toBeInTheDocument();
      expect(screen.getByText(/Honda Accord/)).toBeInTheDocument();
      expect(screen.getByText(/Ford Fusion/)).toBeInTheDocument();
    });

    it('should show adjusted price when different from list price', () => {
      const comparable = createMockComparable({
        listPrice: 22000,
        adjustedPrice: 22500
      });

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('$22,000')).toBeInTheDocument();
      expect(screen.getByText(/Adj: \$22,500/)).toBeInTheDocument();
    });

    it('should display source information', () => {
      const comparable = createMockComparable({ source: 'CarMax' });

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('CarMax')).toBeInTheDocument();
    });
  });

  describe('Quality Score Display', () => {
    it('should show green badge for high quality score', () => {
      const comparable = createMockComparable({ qualityScore: 85 });

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const badge = screen.getByText('85.0');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should show yellow badge for medium quality score', () => {
      const comparable = createMockComparable({ qualityScore: 70 });

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const badge = screen.getByText('70.0');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should show red badge for low quality score', () => {
      const comparable = createMockComparable({ qualityScore: 50 });

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const badge = screen.getByText('50.0');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('Expandable Rows', () => {
    it('should expand row to show details when clicked', async () => {
      const user = userEvent.setup();
      const comparable = createMockComparable();

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const expandButton = screen.getByLabelText('Expand details');
      await user.click(expandButton);

      expect(screen.getByText('Location & Condition')).toBeInTheDocument();
      expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should collapse row when clicked again', async () => {
      const user = userEvent.setup();
      const comparable = createMockComparable();

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const expandButton = screen.getByLabelText('Expand details');
      await user.click(expandButton);
      expect(screen.getByText('Location & Condition')).toBeInTheDocument();

      const collapseButton = screen.getByLabelText('Collapse details');
      await user.click(collapseButton);
      expect(screen.queryByText('Location & Condition')).not.toBeInTheDocument();
    });

    it('should show equipment in expanded view', async () => {
      const user = userEvent.setup();
      const comparable = createMockComparable({
        equipment: ['Navigation', 'Sunroof', 'Leather Seats']
      });

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByLabelText('Expand details'));

      expect(screen.getByText('Equipment')).toBeInTheDocument();
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Sunroof')).toBeInTheDocument();
      expect(screen.getByText('Leather Seats')).toBeInTheDocument();
    });

    it('should show price adjustments in expanded view', async () => {
      const user = userEvent.setup();
      const comparable = createMockComparable({
        adjustments: {
          mileageAdjustment: {
            mileageDifference: 2000,
            depreciationRate: 0.25,
            adjustmentAmount: 500,
            explanation: 'Lower mileage'
          },
          equipmentAdjustments: [
            {
              feature: 'Navigation',
              type: 'missing',
              value: -1200,
              explanation: 'Missing navigation'
            }
          ],
          conditionAdjustment: {
            comparableCondition: 'Excellent',
            lossVehicleCondition: 'Good',
            multiplier: 1.05,
            adjustmentAmount: 1000,
            explanation: 'Better condition'
          },
          totalAdjustment: 300,
          adjustedPrice: 22300
        }
      });

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByLabelText('Expand details'));

      expect(screen.getByText('Price Adjustments')).toBeInTheDocument();
      expect(screen.getByText('Mileage Adjustment:')).toBeInTheDocument();
      expect(screen.getByText('Navigation:')).toBeInTheDocument();
      expect(screen.getByText('Condition Adjustment:')).toBeInTheDocument();
      expect(screen.getByText('Total Adjustment:')).toBeInTheDocument();
    });

    it('should show quality score breakdown in expanded view', async () => {
      const user = userEvent.setup();
      const comparable = createMockComparable();

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByLabelText('Expand details'));

      expect(screen.getByText('Quality Score Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Base Score:')).toBeInTheDocument();
      expect(screen.getByText('Final Score:')).toBeInTheDocument();
    });

    it('should show notes in expanded view if present', async () => {
      const user = userEvent.setup();
      const comparable = createMockComparable({
        notes: 'This is a great comparable vehicle'
      });

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByLabelText('Expand details'));

      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('This is a great comparable vehicle')).toBeInTheDocument();
    });

    it('should show source URL link in expanded view if present', async () => {
      const user = userEvent.setup();
      const comparable = createMockComparable({
        sourceUrl: 'https://example.com/listing'
      });

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByLabelText('Expand details'));

      const link = screen.getByText('View Original Listing →');
      expect(link).toHaveAttribute('href', 'https://example.com/listing');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('Actions', () => {
    it('should call onEdit when edit button clicked', async () => {
      const user = userEvent.setup();
      const comparable = createMockComparable({ id: 'comp-123' });

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const editButton = screen.getByRole('button', { name: /Edit 2018 Toyota Camry/ });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith('comp-123');
    });

    it('should call onDelete when delete button clicked', async () => {
      const user = userEvent.setup();
      const comparable = createMockComparable({ id: 'comp-456' });

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /Delete 2018 Toyota Camry/ });
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith('comp-456');
    });
  });

  describe('Sorting', () => {
    it('should call onSort when column header clicked', async () => {
      const user = userEvent.setup();
      const comparables = [createMockComparable()];

      render(
        <ComparableVehicleList
          comparables={comparables}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onSort={mockOnSort}
        />
      );

      const priceHeader = screen.getByText('Price').closest('th');
      await user.click(priceHeader!);

      expect(mockOnSort).toHaveBeenCalledWith('listPrice', 'asc');
    });

    it('should toggle sort direction on second click', async () => {
      const user = userEvent.setup();
      const comparables = [createMockComparable()];

      render(
        <ComparableVehicleList
          comparables={comparables}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onSort={mockOnSort}
          sortField="listPrice"
          sortDirection="asc"
        />
      );

      const priceHeader = screen.getByText('Price').closest('th');
      await user.click(priceHeader!);

      expect(mockOnSort).toHaveBeenCalledWith('listPrice', 'desc');
    });

    it('should show sort indicator for active column', () => {
      const comparables = [createMockComparable()];

      render(
        <ComparableVehicleList
          comparables={comparables}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onSort={mockOnSort}
          sortField="qualityScore"
          sortDirection="desc"
        />
      );

      // The sort icon should be visible in the Quality Score column
      const qualityScoreHeader = screen.getByText('Quality Score').closest('th');
      expect(qualityScoreHeader).toBeInTheDocument();
    });
  });

  describe('Footer Information', () => {
    it('should show count of comparables', () => {
      const comparables = [
        createMockComparable({ id: 'comp-1' }),
        createMockComparable({ id: 'comp-2' })
      ];

      render(
        <ComparableVehicleList
          comparables={comparables}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/Showing 2 comparables/)).toBeInTheDocument();
    });

    it('should show sufficient data message when 3 or more comparables', () => {
      const comparables = [
        createMockComparable({ id: 'comp-1' }),
        createMockComparable({ id: 'comp-2' }),
        createMockComparable({ id: 'comp-3' })
      ];

      render(
        <ComparableVehicleList
          comparables={comparables}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/Sufficient data for reliable analysis/)).toBeInTheDocument();
    });

    it('should show warning when fewer than 3 comparables', () => {
      const comparables = [
        createMockComparable({ id: 'comp-1' })
      ];

      render(
        <ComparableVehicleList
          comparables={comparables}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/Add 2 more for better reliability/)).toBeInTheDocument();
    });

    it('should use singular form for 1 comparable', () => {
      const comparables = [createMockComparable()];

      render(
        <ComparableVehicleList
          comparables={comparables}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/Showing 1 comparable$/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for expand buttons', () => {
      const comparable = createMockComparable();

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByLabelText('Expand details')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for action buttons', () => {
      const comparable = createMockComparable();

      render(
        <ComparableVehicleList
          comparables={[comparable]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByLabelText(/Edit 2018 Toyota Camry/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Delete 2018 Toyota Camry/)).toBeInTheDocument();
    });
  });
});
