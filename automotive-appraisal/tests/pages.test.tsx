import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../src/renderer/pages/Dashboard';
import { History } from '../src/renderer/pages/History';
import { Settings } from '../src/renderer/pages/Settings';
import { useAppStore } from '../src/renderer/store';

// Mock the store
jest.mock('../src/renderer/store');

// Mock window.electron
const mockElectron = {
  getAppraisals: jest.fn(),
  updateAppraisalStatus: jest.fn(),
  deleteAppraisal: jest.fn(),
};

(global as any).window.electron = mockElectron;

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      appraisalHistory: [],
      historyLoading: true,
      historyError: null,
      loadHistory: jest.fn(),
      clearError: jest.fn(),
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should render empty state when no appraisals', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      appraisalHistory: [],
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      clearError: jest.fn(),
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Welcome to Automotive Appraisal')).toBeInTheDocument();
    expect(screen.getByText('Upload Your First Report')).toBeInTheDocument();
  });

  it('should render statistics with real data', () => {
    const mockHistory = [
      {
        id: '1',
        createdAt: new Date(),
        status: 'complete' as const,
        data: {
          vin: 'TEST123',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
          mileage: 50000,
          location: 'CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
        },
      },
      {
        id: '2',
        createdAt: new Date(),
        status: 'draft' as const,
        data: {
          vin: 'TEST456',
          year: 2021,
          make: 'Honda',
          model: 'Accord',
          mileage: 30000,
          location: 'NY',
          reportType: 'MITCHELL',
          extractionConfidence: 90,
          extractionErrors: [],
        },
      },
    ];

    (useAppStore as unknown as jest.Mock).mockReturnValue({
      appraisalHistory: mockHistory,
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      clearError: jest.fn(),
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('2')).toBeInTheDocument(); // Total
    const completedElements = screen.getAllByText('1');
    expect(completedElements.length).toBeGreaterThanOrEqual(1); // Completed and Drafts both show 1
  });

  it('should render error state', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      appraisalHistory: [],
      historyLoading: false,
      historyError: 'Failed to load data',
      loadHistory: jest.fn(),
      clearError: jest.fn(),
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Failed to Load Dashboard Data')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });
});

describe('History Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      appraisalHistory: [],
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      updateHistoryItem: jest.fn(),
      removeFromHistory: jest.fn(),
      createError: jest.fn(),
    });

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    expect(screen.getByText('No appraisals yet')).toBeInTheDocument();
  });

  it('should render appraisal list', () => {
    const mockHistory = [
      {
        id: '1',
        createdAt: new Date(),
        status: 'complete' as const,
        data: {
          vin: 'TEST123',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
          mileage: 50000,
          location: 'CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 95,
          extractionErrors: [],
        },
      },
    ];

    (useAppStore as unknown as jest.Mock).mockReturnValue({
      appraisalHistory: mockHistory,
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      updateHistoryItem: jest.fn(),
      removeFromHistory: jest.fn(),
      createError: jest.fn(),
    });

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    expect(screen.getByText('TEST123')).toBeInTheDocument();
  });
});

describe('Settings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should render settings page', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
      createError: jest.fn(),
    });

    render(<Settings />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('General Settings')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('should load saved settings from localStorage', async () => {
    const savedSettings = {
      defaultReportType: 'CCC_ONE',
      confidenceThreshold: 80,
      autoSaveDrafts: false,
    };
    localStorage.setItem('app-settings', JSON.stringify(savedSettings));

    (useAppStore as unknown as jest.Mock).mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
      createError: jest.fn(),
    });

    render(<Settings />);

    await waitFor(() => {
      const select = screen.getByDisplayValue('CCC One') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
    });
  });
});
