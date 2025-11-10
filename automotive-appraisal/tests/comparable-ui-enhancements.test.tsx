import React from 'react';
import { render, screen } from '@testing-library/react';
import { ComparableVehicleList } from '../src/renderer/components/ComparableVehicleList';
import { ComparableVehicle } from '../src/types';

describe('ComparableVehicleList UI Enhancements', () => {
  const mockComparables: ComparableVehicle[] = [
    {
      id: 'comp1',
      appraisalId: 'appraisal1',
      source: 'AutoTrader',
      sourceUrl: 'https://example.com',
      dateAdded: new Date(),
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      trim: 'SE',
      mileage: 50000,
      location: 'Los Angeles, CA',
      distanceFromLoss: 25,
      listPrice: 25000,
      condition: 'Good',
      equipment: ['Navigation', 'Sunroof', 'Leather Seats'],
      qualityScore: 85,
      qualityScoreBreakdown: {
        baseScore: 100,
        distancePenalty: -5,
        agePenalty: 0,
        ageBonus: 0,
        mileagePenalty: -5,
        mileageBonus: 0,
        equipmentPenalty: 0,
        equipmentBonus: 5,
        finalScore: 85,
        explanations: {
          distance: 'Within 50 miles',
          age: 'Same year',
          mileage: 'Similar mileage',
          equipment: 'Similar equipment'
        }
      },
      adjustments: {
        mileageAdjustment: {
          mileageDifference: 0,
          depreciationRate: 0.15,
          adjustmentAmount: 0,
          explanation: 'Similar mileage'
        },
        equipmentAdjustments: [],
        conditionAdjustment: {
          comparableCondition: 'Good',
          lossVehicleCondition: 'Good',
          multiplier: 1,
          adjustmentAmount: 0,
          explanation: 'Same condition'
        },
        totalAdjustment: 0,
        adjustedPrice: 25000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  it('should render enhanced empty state with guidance', () => {
    const { container } = render(
      <ComparableVehicleList
        comparables={[]}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    // Check for enhanced empty state
    expect(screen.getByText(/No Comparable Vehicles Yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Getting Started Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/Search online marketplaces/i)).toBeInTheDocument();
    expect(screen.getByText(/Add at least/i)).toBeInTheDocument();
    
    // Check for gradient background
    const emptyState = container.querySelector('.bg-gradient-to-br');
    expect(emptyState).toBeInTheDocument();
  });

  it('should render quality score with enhanced visualization', () => {
    render(
      <ComparableVehicleList
        comparables={mockComparables}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    // Check for quality score display
    expect(screen.getByText('85.0')).toBeInTheDocument();
    expect(screen.getByText('Very Good')).toBeInTheDocument();
  });

  it('should show appropriate guidance based on comparable count', () => {
    const { rerender } = render(
      <ComparableVehicleList
        comparables={[mockComparables[0]]}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    // With 1 comparable
    expect(screen.getByText(/Add at least 2 more comparables/i)).toBeInTheDocument();

    // With 3 comparables
    rerender(
      <ComparableVehicleList
        comparables={[mockComparables[0], mockComparables[0], mockComparables[0]]}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText(/Good for analysis/i)).toBeInTheDocument();

    // With 5 comparables
    rerender(
      <ComparableVehicleList
        comparables={[
          mockComparables[0],
          mockComparables[0],
          mockComparables[0],
          mockComparables[0],
          mockComparables[0]
        ]}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText(/Excellent data quality/i)).toBeInTheDocument();
  });

  it('should render enhanced table headers with icons', () => {
    const { container } = render(
      <ComparableVehicleList
        comparables={mockComparables}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    // Check for table headers
    expect(screen.getByText('Vehicle')).toBeInTheDocument();
    expect(screen.getByText('Mileage')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Distance')).toBeInTheDocument();
    expect(screen.getByText('Quality Score')).toBeInTheDocument();

    // Check for gradient header background
    const thead = container.querySelector('.bg-gradient-to-r');
    expect(thead).toBeInTheDocument();
  });

  it('should render enhanced action buttons', () => {
    render(
      <ComparableVehicleList
        comparables={mockComparables}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    // Check for styled buttons
    const editButton = screen.getByLabelText(/Edit 2020 Toyota Camry/i);
    const deleteButton = screen.getByLabelText(/Delete 2020 Toyota Camry/i);

    expect(editButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();
    expect(editButton).toHaveClass('bg-blue-50');
    expect(deleteButton).toHaveClass('bg-red-50');
  });

  it('should display vehicle condition badges', () => {
    render(
      <ComparableVehicleList
        comparables={mockComparables}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('AutoTrader')).toBeInTheDocument();
  });
});
