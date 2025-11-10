import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { History } from '../src/renderer/pages/History';
import { useAppStore } from '../src/renderer/store';
import { AppraisalRecord } from '../src/types';

// Mock the store
jest.mock('../src/renderer/store');

// Mock window.electron
const mockElectron = {
  getAppraisals: jest.fn(),
  updateAppraisalStatus: jest.fn(),
  deleteAppraisal: jest.fn(),
  exportToCSV: jest.fn(),
  exportToJSON: jest.fn(),
  validateVehicleData: jest.fn(),
};

(global as any).window.electron = mockElectron;

describe('History - Comparables Integration', () => {
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
    settings: {
      autoOCRFallback: true,
      ocrQuality: 'balanced' as const,
      confidenceThresholds: {
        warning: 60,
        error: 40,
      },
      defaultExportFormat: 'csv' as const,
      defaultSaveLocation: '',
    },
    loadHistory: jest.fn(),
    updateHistoryItem: jest.fn(),
    removeFromHistory: jest.fn(),
    createError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as any).mockReturnValue(mockStore);
    mockElectron.getAppraisals.mockResolvedValue([mockAppraisalWithComparables, mockAppraisalWithoutComparables]);
  });

  it('should display comparable indicator for appraisals with comparables', async () => {
    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('3 vehicles')).toBeInTheDocument();
    });

    expect(screen.getByText('$19,200')).toBeInTheDocument();
  });

  it('should display "No comparables" for appraisals without comparables', async () => {
    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No comparables')).toBeInTheDocument();
    });
  });

  it('should show market analysis filter option', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>
    );

    // Open filters
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filtersButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/market analysis/i)).toBeInTheDocument();
    });

    const marketAnalysisSelect = screen.getByLabelText(/market analysis/i);
    expect(marketAnalysisSelect).toHaveValue('all');
  });

  it('should filter appraisals with comparables', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>
    );

    // Open filters
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filtersButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/market analysis/i)).toBeInTheDocument();
    });

    // Select "With Comparables"
    const marketAnalysisSelect = screen.getByLabelText(/market analysis/i);
    await user.selectOptions(marketAnalysisSelect, 'with');

    await waitFor(() => {
      // Should show only the appraisal with comparables
      expect(screen.getByText('1HGCM82633A123456')).toBeInTheDocument();
      expect(screen.queryByText('2HGCM82633A654321')).not.toBeInTheDocument();
    });
  });

  it('should filter appraisals without comparables', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>
    );

    // Open filters
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filtersButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/market analysis/i)).toBeInTheDocument();
    });

    // Select "Without Comparables"
    const marketAnalysisSelect = screen.getByLabelText(/market analysis/i);
    await user.selectOptions(marketAnalysisSelect, 'without');

    await waitFor(() => {
      // Should show only the appraisal without comparables
      expect(screen.queryByText('1HGCM82633A123456')).not.toBeInTheDocument();
      expect(screen.getByText('2HGCM82633A654321')).toBeInTheDocument();
    });
  });

  it('should include market value in search', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by vin/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by vin/i);
    await user.type(searchInput, '19200');

    await waitFor(() => {
      // Should find the appraisal with calculated market value of 19200
      expect(screen.getByText('1HGCM82633A123456')).toBeInTheDocument();
      expect(screen.queryByText('2HGCM82633A654321')).not.toBeInTheDocument();
    });
  });

  it('should show comparables column header', async () => {
    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Comparables')).toBeInTheDocument();
    });
  });

  it('should clear market analysis filter when clearing all filters', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>
    );

    // Open filters
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filtersButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/market analysis/i)).toBeInTheDocument();
    });

    // Select "With Comparables"
    const marketAnalysisSelect = screen.getByLabelText(/market analysis/i);
    await user.selectOptions(marketAnalysisSelect, 'with');

    // Clear all filters
    const clearButton = screen.getByRole('button', { name: /clear all filters/i });
    await user.click(clearButton);

    await waitFor(() => {
      expect(marketAnalysisSelect).toHaveValue('all');
    });
  });

  it('should show both appraisals when no filter is applied', async () => {
    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1HGCM82633A123456')).toBeInTheDocument();
      expect(screen.getByText('2HGCM82633A654321')).toBeInTheDocument();
    });
  });
});
