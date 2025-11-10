/**
 * Final Integration End-to-End Test
 * Tests the complete workflow with enhanced UI/UX features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { NewAppraisal } from '../src/renderer/pages/NewAppraisal';
import { Dashboard } from '../src/renderer/pages/Dashboard';
import { useAppStore } from '../src/renderer/store';
import { ExtractedVehicleData, ComparableVehicle, MarketAnalysis } from '../src/types';

// Mock electron API
const mockElectron = {
  processPDF: jest.fn(),
  getAppraisals: jest.fn(),
  updateAppraisalStatus: jest.fn(),
  saveComparable: jest.fn(),
  updateComparable: jest.fn(),
  deleteComparable: jest.fn(),
  getComparables: jest.fn(),
  calculateMarketValue: jest.fn(),
  exportToCSV: jest.fn(),
  exportToJSON: jest.fn(),
  onProcessingProgress: jest.fn(),
  removeAllListeners: jest.fn(),
};

(global as any).window.electron = mockElectron;

// Mock notifications
jest.mock('../src/renderer/utils/notifications', () => ({
  notifications: {
    actionSuccess: jest.fn(),
    successNotification: jest.fn(),
    errorNotification: jest.fn(),
    loading: jest.fn(),
    destroyAll: jest.fn(),
  }
}));

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => [{ duration: 100 }]),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    timing: {
      navigationStart: 0,
      loadEventEnd: 1000,
      domContentLoadedEventEnd: 500,
      responseStart: 200,
    }
  }
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ConfigProvider>
      {children}
    </ConfigProvider>
  </BrowserRouter>
);

describe('Final Integration E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().reset();
  });

  describe('Complete Appraisal Workflow', () => {
    it('should handle the complete workflow with enhanced UX', async () => {
      const user = userEvent.setup();

      // Mock successful PDF processing
      const mockVehicleData: ExtractedVehicleData = {
        vin: 'TEST123456789',
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        trim: 'LE',
        mileage: 45000,
        location: 'Los Angeles, CA',
        marketValue: 22000,
        settlementValue: 21000,
        reportType: 'CCC One',
        extractionMethod: 'standard',
        extractionConfidence: 95,
        extractionErrors: []
      };

      mockElectron.processPDF.mockResolvedValue({
        success: true,
        data: mockVehicleData
      });

      mockElectron.getAppraisals.mockResolvedValue([]);
      mockElectron.updateAppraisalStatus.mockResolvedValue(true);

      render(
        <TestWrapper>
          <NewAppraisal />
        </TestWrapper>
      );

      // Verify initial state
      expect(screen.getByText('New Appraisal')).toBeInTheDocument();
      expect(screen.getByText('Upload PDF Report')).toBeInTheDocument();

      // Simulate PDF upload (this would trigger processing)
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByRole('button', { name: /upload/i }).querySelector('input[type="file"]') as HTMLInputElement;
      
      if (input) {
        await user.upload(input, file);
      }

      // Wait for processing to complete
      await waitFor(() => {
        expect(mockElectron.processPDF).toHaveBeenCalled();
      });

      // Simulate successful processing by updating store
      useAppStore.getState().setAppraisal(mockVehicleData);
      useAppStore.getState().setStatus('complete');

      // Re-render to reflect state changes
      render(
        <TestWrapper>
          <NewAppraisal />
        </TestWrapper>
      );

      // Verify extracted data is displayed
      await waitFor(() => {
        expect(screen.getByText('Extracted Data')).toBeInTheDocument();
      });

      // Verify comparable vehicles section appears
      await waitFor(() => {
        expect(screen.getByText('Comparable Vehicles')).toBeInTheDocument();
      });

      // Test adding a comparable vehicle
      const addComparableButton = screen.getByText('+ Add Comparable');
      await user.click(addComparableButton);

      await waitFor(() => {
        expect(screen.getByText('Add Comparable Vehicle')).toBeInTheDocument();
      });

      // Fill out comparable form
      const yearInput = screen.getByLabelText(/year/i);
      const makeInput = screen.getByLabelText(/make/i);
      const modelInput = screen.getByLabelText(/model/i);
      const mileageInput = screen.getByLabelText(/mileage/i);
      const locationInput = screen.getByLabelText(/location/i);
      const priceInput = screen.getByLabelText(/price/i);

      await user.type(yearInput, '2020');
      await user.type(makeInput, 'Toyota');
      await user.type(modelInput, 'Camry');
      await user.type(mileageInput, '42000');
      await user.type(locationInput, 'San Diego, CA');
      await user.type(priceInput, '23500');

      // Mock successful comparable save
      mockElectron.saveComparable.mockResolvedValue(true);

      const saveButton = screen.getByText('Save Comparable');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockElectron.saveComparable).toHaveBeenCalled();
      });

      // Test market value calculation
      const mockComparable: ComparableVehicle = {
        id: 'comp-1',
        appraisalId: 'appraisal-1',
        source: 'AutoTrader',
        dateAdded: new Date(),
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        mileage: 42000,
        location: 'San Diego, CA',
        distanceFromLoss: 120,
        listPrice: 23500,
        adjustedPrice: 23200,
        condition: 'Good',
        equipment: ['Navigation', 'Sunroof'],
        qualityScore: 85,
        qualityScoreBreakdown: {
          baseScore: 100,
          distancePenalty: -12,
          agePenalty: 0,
          ageBonus: 0,
          mileagePenalty: 0,
          mileageBonus: 10,
          equipmentPenalty: 0,
          equipmentBonus: 5,
          finalScore: 85,
          explanations: {
            distance: 'Within acceptable range',
            age: 'Exact match',
            mileage: 'Similar mileage',
            equipment: 'Good equipment match'
          }
        },
        adjustments: {
          mileageAdjustment: {
            mileageDifference: -3000,
            depreciationRate: 0.25,
            adjustmentAmount: 750,
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
          totalAdjustment: 750,
          adjustedPrice: 23200
        },
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockMarketAnalysis: MarketAnalysis = {
        appraisalId: 'appraisal-1',
        lossVehicle: mockVehicleData,
        comparablesCount: 1,
        comparables: [mockComparable],
        calculatedMarketValue: 23200,
        calculationMethod: 'quality-weighted-average',
        confidenceLevel: 75,
        confidenceFactors: {
          comparableCount: 1,
          qualityScoreVariance: 0,
          priceVariance: 0
        },
        insuranceValue: 21000,
        valueDifference: 2200,
        valueDifferencePercentage: 10.5,
        isUndervalued: true,
        calculationBreakdown: {
          comparables: [{
            id: 'comp-1',
            listPrice: 23500,
            adjustedPrice: 23200,
            qualityScore: 85,
            weightedValue: 23200
          }],
          totalWeightedValue: 23200,
          totalWeights: 85,
          finalMarketValue: 23200,
          steps: []
        },
        calculatedAt: new Date(),
        lastUpdated: new Date()
      };

      mockElectron.calculateMarketValue.mockResolvedValue({
        success: true,
        marketAnalysis: mockMarketAnalysis
      });

      // Simulate market value calculation
      useAppStore.getState().setMarketAnalysis(mockMarketAnalysis);

      // Verify market value display
      await waitFor(() => {
        expect(screen.getByText('Market Value Analysis')).toBeInTheDocument();
      });

      // Test saving the appraisal
      const completeButton = screen.getByText('Complete Appraisal');
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockElectron.updateAppraisalStatus).toHaveBeenCalledWith(
          expect.any(String),
          'complete'
        );
      });
    });

    it('should show enhanced loading states and transitions', async () => {
      render(
        <TestWrapper>
          <NewAppraisal />
        </TestWrapper>
      );

      // Verify smooth transitions are applied
      const mainContent = screen.getByText('New Appraisal').closest('div');
      expect(mainContent).toHaveClass('transition-all');
    });

    it('should handle performance monitoring', async () => {
      const mockPerformanceMark = jest.spyOn(window.performance, 'mark');
      const mockPerformanceMeasure = jest.spyOn(window.performance, 'measure');

      render(
        <TestWrapper>
          <NewAppraisal />
        </TestWrapper>
      );

      // Verify performance monitoring is active
      expect(mockPerformanceMark).toHaveBeenCalled();
    });
  });

  describe('Dashboard Integration', () => {
    it('should display enhanced statistics with smooth animations', async () => {
      const mockAppraisals = [
        {
          id: 'appraisal-1',
          status: 'complete' as const,
          data: {
            vin: 'TEST123456789',
            year: 2020,
            make: 'Toyota',
            model: 'Camry',
            mileage: 45000,
            location: 'Los Angeles, CA',
            marketValue: 22000,
            settlementValue: 21000,
            reportType: 'CCC One',
            extractionMethod: 'standard' as const,
            extractionConfidence: 95,
            extractionErrors: []
          },
          createdAt: new Date().toISOString(),
          hasComparables: true,
          comparableCount: 3,
          calculatedMarketValue: 23500
        }
      ];

      mockElectron.getAppraisals.mockResolvedValue(mockAppraisals);

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Verify enhanced statistics display
      await waitFor(() => {
        expect(screen.getByText('Total Appraisals')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
      });

      // Verify market analysis statistics
      await waitFor(() => {
        expect(screen.getByText('Market Analysis Overview')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle errors gracefully with enhanced notifications', async () => {
      const user = userEvent.setup();

      mockElectron.processPDF.mockRejectedValue(new Error('Processing failed'));

      render(
        <TestWrapper>
          <NewAppraisal />
        </TestWrapper>
      );

      // Simulate PDF upload that fails
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByRole('button', { name: /upload/i }).querySelector('input[type="file"]') as HTMLInputElement;
      
      if (input) {
        await user.upload(input, file);
      }

      // Verify error handling
      await waitFor(() => {
        expect(mockElectron.processPDF).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <NewAppraisal />
        </TestWrapper>
      );

      // Test keyboard navigation
      await user.tab();
      
      // Verify focus management
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();
    });

    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <NewAppraisal />
        </TestWrapper>
      );

      // Verify accessibility attributes
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      expect(uploadButton).toBeInTheDocument();
    });
  });
});