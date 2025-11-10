import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as DataDisplayModule from '../src/renderer/components/DataDisplay';
import { useAppStore } from '../src/renderer/store';
import { App } from 'antd';

const { DataDisplay } = DataDisplayModule;

// Mock the store
jest.mock('../src/renderer/store');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock the useNotifications hook
jest.mock('../src/renderer/hooks/useNotifications', () => ({
  useNotifications: () => ({
    success: jest.fn(),
    successNotification: jest.fn(),
    error: jest.fn(),
    actionSuccess: jest.fn(),
    message: { success: jest.fn(), error: jest.fn() },
    notification: { success: jest.fn(), error: jest.fn() }
  })
}));

describe('DataDisplay Component', () => {
  const mockAppraisal = {
    vin: '1HGBH41JXMN109186',
    year: 2021,
    make: 'Honda',
    model: 'Accord',
    mileage: 25000,
    location: 'Los Angeles, CA',
    reportType: 'CCC_ONE',
    extractionConfidence: 85,
    extractionErrors: [],
    marketValue: 25000,
    settlementValue: 24500,
    extractionMethod: 'standard' as const,
    ocrConfidence: 0,
    fieldConfidences: {
      vin: 95,
      year: 90,
      make: 88,
      model: 87,
      mileage: 85
    }
  };

  const mockSettings = {
    autoOCRFallback: true,
    ocrQuality: 'balanced' as const,
    confidenceThresholds: {
      warning: 80,
      error: 60
    },
    defaultExportFormat: 'csv' as const,
    defaultSaveLocation: ''
  };

  beforeEach(() => {
    mockUseAppStore.mockReturnValue({
      currentAppraisal: mockAppraisal,
      setAppraisal: jest.fn(),
      extractionMethod: 'standard',
      ocrConfidence: 0,
      settings: mockSettings,
      // Add other required store properties
      processingStatus: 'complete',
      appraisalHistory: [],
      comparableVehicles: [],
      marketAnalysis: undefined,
      errors: []
    } as any);
  });

  const renderWithApp = (component: React.ReactElement) => {
    return render(
      <App>
        {component}
      </App>
    );
  };

  it('renders without crashing', () => {
    renderWithApp(<DataDisplay />);
    expect(screen.getByText('Extracted Vehicle Data')).toBeInTheDocument();
  });

  it('displays vehicle identification fields correctly', () => {
    renderWithApp(<DataDisplay />);
    
    expect(screen.getByText('Vehicle Identification')).toBeInTheDocument();
    expect(screen.getByText('1HGBH41JXMN109186')).toBeInTheDocument();
    expect(screen.getByText('2021')).toBeInTheDocument();
    expect(screen.getByText('Honda')).toBeInTheDocument();
    expect(screen.getByText('Accord')).toBeInTheDocument();
  });

  it('displays vehicle details correctly', () => {
    renderWithApp(<DataDisplay />);
    
    expect(screen.getByText('Vehicle Details')).toBeInTheDocument();
    expect(screen.getByText('25,000')).toBeInTheDocument();
    expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument();
  });

  it('displays valuation fields correctly', () => {
    renderWithApp(<DataDisplay />);
    
    expect(screen.getByText('Valuation')).toBeInTheDocument();
    expect(screen.getByText('$25,000.00')).toBeInTheDocument();
    expect(screen.getByText('$24,500.00')).toBeInTheDocument();
  });

  it('shows confidence indicators', () => {
    renderWithApp(<DataDisplay />);
    
    // Overall confidence should be displayed (there may be multiple instances)
    const confidenceElements = screen.getAllByText('85%');
    expect(confidenceElements.length).toBeGreaterThan(0);
  });

  it('shows extraction method badge for standard extraction', () => {
    renderWithApp(<DataDisplay />);
    
    expect(screen.getByText('Standard')).toBeInTheDocument();
  });

  it('shows OCR badge when OCR is used', () => {
    mockUseAppStore.mockReturnValue({
      currentAppraisal: { ...mockAppraisal, extractionMethod: 'ocr' },
      setAppraisal: jest.fn(),
      extractionMethod: 'ocr',
      ocrConfidence: 75,
      settings: mockSettings,
      processingStatus: 'complete',
      appraisalHistory: [],
      comparableVehicles: [],
      marketAnalysis: undefined,
      errors: []
    } as any);

    renderWithApp(<DataDisplay />);
    
    expect(screen.getByText('OCR')).toBeInTheDocument();
    expect(screen.getByText('OCR: 75%')).toBeInTheDocument();
  });

  it('allows editing fields when edit button is clicked', async () => {
    renderWithApp(<DataDisplay />);
    
    // Find and click an edit button (they appear on hover)
    const vinField = screen.getByText('1HGBH41JXMN109186').closest('.group');
    expect(vinField).toBeInTheDocument();
    
    // Hover over the field to show edit button
    if (vinField) {
      fireEvent.mouseEnter(vinField);
      
      // Find edit button - look for pencil icon specifically
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && btn.closest('.group');
      });
      
      if (editButton) {
        fireEvent.click(editButton);
        
        // Input field should appear - check for aria-label instead of placeholder
        await waitFor(() => {
          const input = screen.getByLabelText(/edit vin/i);
          expect(input).toBeInTheDocument();
        });
      }
    }
  });

  it('returns null when no current appraisal', () => {
    mockUseAppStore.mockReturnValue({
      currentAppraisal: null,
      setAppraisal: jest.fn(),
      extractionMethod: 'standard',
      ocrConfidence: 0,
      settings: mockSettings,
      processingStatus: 'idle',
      appraisalHistory: [],
      comparableVehicles: [],
      marketAnalysis: undefined,
      errors: []
    } as any);

    renderWithApp(<DataDisplay />);
    // Component should not display any vehicle data when no appraisal
    expect(screen.queryByText('Extracted Vehicle Data')).not.toBeInTheDocument();
  });

  it('displays field confidence badges', () => {
    renderWithApp(<DataDisplay />);
    
    // Should show confidence percentages for fields
    expect(screen.getByText('95%')).toBeInTheDocument(); // VIN confidence
    expect(screen.getByText('90%')).toBeInTheDocument(); // Year confidence
  });

  it('shows export button', () => {
    renderWithApp(<DataDisplay />);
    
    expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
  });

  it('displays extraction method information card', () => {
    renderWithApp(<DataDisplay />);
    
    expect(screen.getByText('Extraction Method')).toBeInTheDocument();
    expect(screen.getByText(/Standard text extraction was used/i)).toBeInTheDocument();
  });
});
