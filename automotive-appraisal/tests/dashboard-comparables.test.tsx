import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../src/renderer/pages/Dashboard';
import { useAppStore } from '../src/renderer/store';
import { AppraisalRecord } from '../src/types';

// Mock the store
jest.mock('../src/renderer/store');

describe('Dashboard - Comparables Integration', () => {
  const mockAppraisalWithComparables: AppraisalRecord = {
    id: 'appraisal-1',
    data: {
      vin: '1HGCM82633A123456',
      year: 2015,
      make: 'Honda',
      model: 'Accord',
      trim: 'EX-L',
      mileage: 45000,
      location: 'Los Angeles, CA',
      marketValue: 18500,
      settlementValue: 18000,
      reportType: 'CCC One',
      extractionMethod: 'standard',
      extractionConfidence: 95,
      extractionErrors: [],
    },
    status: 'complete',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    hasComparables: true,
    comparableCount: 3,
    calculatedMarketValue: 19200,
  } as any;

  const mockAppraisalWithoutComparables: AppraisalRecord = {
    id: 'appraisal-2',
    data: {
      vin: '2HGCM82633A654321',
      year: 2016,
      make: 'Toyota',
      model: 'Camry',
      trim: 'SE',
      mileage: 38000,
      location: 'San Diego, CA',
      marketValue: 16500,
      settlementValue: 16000,
      reportType: 'Mitchell',
      extractionMethod: 'ocr',
      extractionConfidence: 88,
      extractionErrors: [],
    },
    status: 'draft',
    createdAt: new Date('2025-01-16'),
    updatedAt: new Date('2025-01-16'),
  };

  const mockStore = {
    appraisalHistory: [mockAppraisalWithComparables, mockAppraisalWithoutComparables],
    historyLoading: false,
    historyError: null,
    loadHistory: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as any).mockReturnValue(mockStore);
  });

  it('should display market analysis widget', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('With Market Analysis')).toBeInTheDocument();
    });

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should display average value difference', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Average Value Difference')).toBeInTheDocument();
    });

    // Should show positive difference
    expect(screen.getByText(/\+\$1,200/)).toBeInTheDocument();
  });

  it('should display completion rate', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Appraisals with Comparables')).toBeInTheDocument();
    });

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('50% completion rate')).toBeInTheDocument();
  });

  it('should show undervaluation alert when difference is significant', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Potential Undervaluation Detected')).toBeInTheDocument();
    });
  });

  it('should display recent market analyses section', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Market Analyses')).toBeInTheDocument();
    });

    expect(screen.getByText('3 comparables')).toBeInTheDocument();
    expect(screen.getByText('$19,200')).toBeInTheDocument();
  });

  it('should not show market analysis sections when no comparables exist', () => {
    (useAppStore as any).mockReturnValue({
      ...mockStore,
      appraisalHistory: [mockAppraisalWithoutComparables],
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.queryByText('Market Analysis Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent Market Analyses')).not.toBeInTheDocument();
  });

  it('should show 4 statistics widgets', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Appraisals')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Drafts')).toBeInTheDocument();
      expect(screen.getByText('With Market Analysis')).toBeInTheDocument();
    });
  });

  it('should calculate correct statistics', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Total appraisals
      const totalCards = screen.getAllByText('2');
      expect(totalCards.length).toBeGreaterThan(0);
    });

    // Completed
    expect(screen.getByText('1')).toBeInTheDocument();
    
    // Drafts
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
