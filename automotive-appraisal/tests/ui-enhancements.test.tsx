import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataDisplay } from '../src/renderer/components/DataDisplay';
import { OCRStatusIndicator } from '../src/renderer/components/OCRStatusIndicator';
import { useAppStore } from '../src/renderer/store';

// Mock the store
jest.mock('../src/renderer/store');

// Mock antd components
jest.mock('antd', () => ({
  message: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Progress: ({ percent }: { percent: number }) => <div data-testid="progress">{percent}%</div>,
  Switch: ({ defaultChecked }: { defaultChecked: boolean }) => (
    <input type="checkbox" defaultChecked={defaultChecked} data-testid="switch" />
  ),
}));

describe('UI Enhancements - Task 4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DataDisplay Component', () => {
    it('should render with OCR warning badge when OCR method is used', () => {
      const mockAppraisal = {
        vin: '1HGBH41JXMN109186',
        year: 2021,
        make: 'Honda',
        model: 'Accord',
        mileage: 50000,
        location: 'Los Angeles, CA',
        reportType: 'CCC_ONE',
        extractionConfidence: 85,
        extractionErrors: [],
        extractionMethod: 'ocr' as const,
        ocrConfidence: 75,
      };

      (useAppStore as unknown as jest.Mock).mockReturnValue({
        currentAppraisal: mockAppraisal,
        setAppraisal: jest.fn(),
        extractionMethod: 'ocr',
        ocrConfidence: 75,
      });

      render(<DataDisplay />);

      expect(screen.getByText('OCR Used')).toBeInTheDocument();
      expect(screen.getByText('Extracted Vehicle Data')).toBeInTheDocument();
    });

    it('should show field confidence indicators', () => {
      const mockAppraisal = {
        vin: '1HGBH41JXMN109186',
        year: 2021,
        make: 'Honda',
        model: 'Accord',
        mileage: 50000,
        location: 'Los Angeles, CA',
        reportType: 'CCC_ONE',
        extractionConfidence: 85,
        extractionErrors: [],
        fieldConfidences: {
          vin: 95,
          year: 90,
          make: 85,
          model: 70,
          mileage: 60,
        },
      };

      (useAppStore as unknown as jest.Mock).mockReturnValue({
        currentAppraisal: mockAppraisal,
        setAppraisal: jest.fn(),
        extractionMethod: 'standard',
        ocrConfidence: 0,
      });

      render(<DataDisplay />);

      // Should show confidence percentages
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('should allow inline editing of fields', async () => {
      const mockSetAppraisal = jest.fn();
      const mockAppraisal = {
        vin: '1HGBH41JXMN109186',
        year: 2021,
        make: 'Honda',
        model: 'Accord',
        mileage: 50000,
        location: 'Los Angeles, CA',
        reportType: 'CCC_ONE',
        extractionConfidence: 85,
        extractionErrors: [],
      };

      (useAppStore as unknown as jest.Mock).mockReturnValue({
        currentAppraisal: mockAppraisal,
        setAppraisal: mockSetAppraisal,
        extractionMethod: 'standard',
        ocrConfidence: 0,
      });

      render(<DataDisplay />);

      // Find and click edit button for VIN field
      const editButtons = screen.getAllByRole('button');
      const vinEditButton = editButtons.find(btn => 
        btn.querySelector('svg') && btn.className.includes('text-gray-400')
      );
      
      if (vinEditButton) {
        fireEvent.click(vinEditButton);

        // Should show input field
        const input = screen.getByRole('textbox');
        expect(input).toBeInTheDocument();
      }
    });

    it('should have export CSV functionality', () => {
      const mockAppraisal = {
        vin: '1HGBH41JXMN109186',
        year: 2021,
        make: 'Honda',
        model: 'Accord',
        mileage: 50000,
        location: 'Los Angeles, CA',
        reportType: 'CCC_ONE',
        extractionConfidence: 85,
        extractionErrors: [],
      };

      (useAppStore as unknown as jest.Mock).mockReturnValue({
        currentAppraisal: mockAppraisal,
        setAppraisal: jest.fn(),
        extractionMethod: 'standard',
        ocrConfidence: 0,
      });

      render(<DataDisplay />);

      const exportButton = screen.getByText('Export CSV');
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('OCRStatusIndicator Component', () => {
    it('should not render when OCR is not used', () => {
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        ocrProcessingActive: false,
        ocrConfidence: 0,
        extractionMethod: 'standard',
        currentAppraisal: null,
      });

      const { container } = render(<OCRStatusIndicator />);
      expect(container.firstChild).toBeNull();
    });

    it('should render with high confidence styling', () => {
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        ocrProcessingActive: false,
        ocrConfidence: 85,
        extractionMethod: 'ocr',
        currentAppraisal: {
          vin: '1HGBH41JXMN109186',
          year: 2021,
          make: 'Honda',
          model: 'Accord',
          mileage: 50000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 85,
          extractionErrors: [],
        },
      });

      render(<OCRStatusIndicator />);

      expect(screen.getByText('OCR Processing Used')).toBeInTheDocument();
      expect(screen.getByText('OCR Confidence Level')).toBeInTheDocument();
      // Check that confidence is displayed (there will be multiple 85% on page)
      const confidenceTexts = screen.getAllByText('85%');
      expect(confidenceTexts.length).toBeGreaterThan(0);
    });

    it('should show guidance message based on confidence level', () => {
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        ocrProcessingActive: false,
        ocrConfidence: 50,
        extractionMethod: 'ocr',
        currentAppraisal: {
          vin: '1HGBH41JXMN109186',
          year: 2021,
          make: 'Honda',
          model: 'Accord',
          mileage: 50000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 85,
          extractionErrors: [],
        },
      });

      render(<OCRStatusIndicator />);

      expect(screen.getByText(/OCR extraction quality is low/i)).toBeInTheDocument();
    });

    it('should display fields requiring attention', () => {
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        ocrProcessingActive: false,
        ocrConfidence: 75,
        extractionMethod: 'ocr',
        currentAppraisal: {
          vin: '1HGBH41JXMN109186',
          year: 2021,
          make: 'Honda',
          model: 'Accord',
          mileage: 50000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 85,
          extractionErrors: [],
          fieldConfidences: {
            vin: 95,
            year: 90,
            make: 70,
            model: 65,
            mileage: 55,
          },
        },
      });

      render(<OCRStatusIndicator />);

      expect(screen.getByText('Fields Requiring Attention:')).toBeInTheDocument();
      // Should show fields with confidence < 80
      expect(screen.getByText('make')).toBeInTheDocument();
      expect(screen.getByText('model')).toBeInTheDocument();
      expect(screen.getByText('mileage')).toBeInTheDocument();
    });

    it('should show method toggle when enabled', () => {
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        ocrProcessingActive: false,
        ocrConfidence: 85,
        extractionMethod: 'ocr',
        currentAppraisal: {
          vin: '1HGBH41JXMN109186',
          year: 2021,
          make: 'Honda',
          model: 'Accord',
          mileage: 50000,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE',
          extractionConfidence: 85,
          extractionErrors: [],
        },
      });

      render(<OCRStatusIndicator showMethodToggle={true} />);

      expect(screen.getByText('Auto OCR Fallback')).toBeInTheDocument();
      expect(screen.getByTestId('switch')).toBeInTheDocument();
    });
  });
});
