/**
 * Comprehensive React Component Tests
 * Tests all UI components with various states and interactions
 * Requirements: 10.4, 10.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import components
import PDFUploader from '../src/renderer/components/PDFUploader';
import DataDisplay from '../src/renderer/components/DataDisplay';
import OCRStatusIndicator from '../src/renderer/components/OCRStatusIndicator';
import { OptimizedDataDisplay } from '../src/renderer/components/OptimizedDataDisplay';
import { VirtualizedTable } from '../src/renderer/components/VirtualizedTable';
import ConfirmDialog from '../src/renderer/components/ConfirmDialog';
import EditAppraisalDialog from '../src/renderer/components/EditAppraisalDialog';

// Mock window.electron
const mockElectron = {
  processPDF: jest.fn(),
  saveAppraisal: jest.fn(),
  getAppraisals: jest.fn(),
  deleteAppraisal: jest.fn(),
  updateAppraisal: jest.fn(),
  exportToCSV: jest.fn(),
  onProgress: jest.fn(),
};

(global as any).window.electron = mockElectron;

describe('React Components - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('PDFUploader Component', () => {
    it('should render upload button', () => {
      render(<PDFUploader />);
      
      const uploadButton = screen.getByText(/upload/i);
      expect(uploadButton).toBeInTheDocument();
    });
    
    it('should handle file selection', async () => {
      render(<PDFUploader />);
      
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(mockElectron.processPDF).toHaveBeenCalled();
      });
    });
    
    it('should display progress during processing', async () => {
      mockElectron.processPDF.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 100);
        });
      });
      
      render(<PDFUploader />);
      
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });
    });
    
    it('should show error message on upload failure', async () => {
      mockElectron.processPDF.mockRejectedValue(new Error('Upload failed'));
      
      render(<PDFUploader />);
      
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });
    
    it('should validate file type', () => {
      render(<PDFUploader />);
      
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [invalidFile] } });
      
      expect(screen.getByText(/only PDF files/i)).toBeInTheDocument();
    });
    
    it('should handle drag and drop', async () => {
      render(<PDFUploader />);
      
      const dropZone = screen.getByText(/drag.*drop/i).parentElement;
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });
      
      await waitFor(() => {
        expect(mockElectron.processPDF).toHaveBeenCalled();
      });
    });
    
    it('should show OCR progress messages', async () => {
      let progressCallback: any;
      mockElectron.onProgress.mockImplementation((callback: any) => {
        progressCallback = callback;
      });
      
      render(<PDFUploader />);
      
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      // Simulate progress updates
      if (progressCallback) {
        progressCallback(50, 'Processing with OCR');
      }
      
      await waitFor(() => {
        expect(screen.getByText(/OCR/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('DataDisplay Component', () => {
    const mockData = {
      vin: '5XYZT3LB0EG123456',
      year: 2014,
      make: 'Hyundai',
      model: 'Santa Fe Sport',
      mileage: 85234,
      location: 'CA 90210',
      reportType: 'MITCHELL' as const,
      extractionConfidence: 95,
      extractionErrors: [],
      settlementValue: 10741.06,
      marketValue: 10062.32,
      fieldConfidences: {
        vin: 100,
        year: 95,
        make: 90,
        model: 85,
        mileage: 95
      }
    };
    
    it('should display all vehicle data fields', () => {
      render(<DataDisplay data={mockData} />);
      
      expect(screen.getByText(/5XYZT3LB0EG123456/)).toBeInTheDocument();
      expect(screen.getByText(/2014/)).toBeInTheDocument();
      expect(screen.getByText(/Hyundai/)).toBeInTheDocument();
      expect(screen.getByText(/Santa Fe Sport/)).toBeInTheDocument();
      expect(screen.getByText(/85,234/)).toBeInTheDocument();
    });
    
    it('should show confidence indicators', () => {
      render(<DataDisplay data={mockData} />);
      
      const confidenceIndicators = screen.getAllByText(/confidence/i);
      expect(confidenceIndicators.length).toBeGreaterThan(0);
    });
    
    it('should color-code confidence levels', () => {
      render(<DataDisplay data={mockData} />);
      
      // High confidence (>80%) should be green
      const vinField = screen.getByText(/5XYZT3LB0EG123456/).closest('div');
      expect(vinField).toHaveClass(/green|success/i);
    });
    
    it('should highlight low confidence fields', () => {
      const lowConfidenceData = {
        ...mockData,
        fieldConfidences: {
          ...mockData.fieldConfidences,
          model: 55 // Low confidence
        }
      };
      
      render(<DataDisplay data={lowConfidenceData} />);
      
      const modelField = screen.getByText(/Santa Fe Sport/).closest('div');
      expect(modelField).toHaveClass(/red|warning|error/i);
    });
    
    it('should enable inline editing', async () => {
      render(<DataDisplay data={mockData} editable={true} />);
      
      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });
    
    it('should save edited values', async () => {
      const onSave = jest.fn();
      render(<DataDisplay data={mockData} editable={true} onSave={onSave} />);
      
      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      fireEvent.click(editButton);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Value' } });
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });
    
    it('should show export button', () => {
      render(<DataDisplay data={mockData} />);
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();
    });
    
    it('should handle export action', async () => {
      mockElectron.exportToCSV.mockResolvedValue({ success: true });
      
      render(<DataDisplay data={mockData} />);
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(mockElectron.exportToCSV).toHaveBeenCalled();
      });
    });
  });
  
  describe('OCRStatusIndicator Component', () => {
    it('should show OCR warning when OCR was used', () => {
      render(<OCRStatusIndicator ocrUsed={true} confidence={75} />);
      
      expect(screen.getByText(/OCR/i)).toBeInTheDocument();
      expect(screen.getByText(/warning/i)).toBeInTheDocument();
    });
    
    it('should not show warning when OCR was not used', () => {
      render(<OCRStatusIndicator ocrUsed={false} confidence={95} />);
      
      expect(screen.queryByText(/warning/i)).not.toBeInTheDocument();
    });
    
    it('should display confidence score', () => {
      render(<OCRStatusIndicator ocrUsed={true} confidence={85} />);
      
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });
    
    it('should show different colors based on confidence', () => {
      const { rerender } = render(<OCRStatusIndicator ocrUsed={true} confidence={95} />);
      let indicator = screen.getByText(/95%/).closest('div');
      expect(indicator).toHaveClass(/green|success/i);
      
      rerender(<OCRStatusIndicator ocrUsed={true} confidence={70} />);
      indicator = screen.getByText(/70%/).closest('div');
      expect(indicator).toHaveClass(/yellow|warning/i);
      
      rerender(<OCRStatusIndicator ocrUsed={true} confidence={50} />);
      indicator = screen.getByText(/50%/).closest('div');
      expect(indicator).toHaveClass(/red|error/i);
    });
    
    it('should show guidance message', () => {
      render(<OCRStatusIndicator ocrUsed={true} confidence={65} />);
      
      expect(screen.getByText(/verify/i)).toBeInTheDocument();
    });
  });
  
  describe('OptimizedDataDisplay Component', () => {
    const mockAppraisals = Array.from({ length: 100 }, (_, i) => ({
      id: `appraisal-${i}`,
      vin: `VIN${i.toString().padStart(14, '0')}`,
      year: 2010 + (i % 15),
      make: ['Toyota', 'Honda', 'Ford'][i % 3],
      model: 'Model ' + i,
      mileage: 50000 + i * 1000,
      date: new Date(2024, 0, i + 1).toISOString(),
    }));
    
    it('should render large datasets efficiently', () => {
      const { container } = render(<OptimizedDataDisplay appraisals={mockAppraisals} />);
      
      // Should use virtualization
      expect(container.querySelector('[data-virtualized]')).toBeInTheDocument();
    });
    
    it('should handle search filtering', async () => {
      render(<OptimizedDataDisplay appraisals={mockAppraisals} />);
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Toyota' } });
      
      await waitFor(() => {
        const toyotaItems = screen.getAllByText(/Toyota/);
        expect(toyotaItems.length).toBeLessThan(mockAppraisals.length);
      });
    });
    
    it('should handle sorting', async () => {
      render(<OptimizedDataDisplay appraisals={mockAppraisals} />);
      
      const yearHeader = screen.getByText(/year/i);
      fireEvent.click(yearHeader);
      
      await waitFor(() => {
        // Should be sorted
        const years = screen.getAllByText(/\d{4}/);
        expect(years[0].textContent).toBe('2010');
      });
    });
  });
  
  describe('VirtualizedTable Component', () => {
    const mockData = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: i * 100,
    }));
    
    it('should render only visible rows', () => {
      const { container } = render(
        <VirtualizedTable
          data={mockData}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'value', label: 'Value' },
          ]}
          rowHeight={50}
        />
      );
      
      // Should not render all 1000 rows
      const rows = container.querySelectorAll('[data-row]');
      expect(rows.length).toBeLessThan(100);
    });
    
    it('should handle scrolling', async () => {
      const { container } = render(
        <VirtualizedTable
          data={mockData}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'value', label: 'Value' },
          ]}
          rowHeight={50}
        />
      );
      
      const scrollContainer = container.querySelector('[data-scroll-container]');
      fireEvent.scroll(scrollContainer!, { target: { scrollTop: 5000 } });
      
      await waitFor(() => {
        // Should render different rows after scrolling
        expect(screen.getByText(/Item 100/)).toBeInTheDocument();
      });
    });
  });
  
  describe('ConfirmDialog Component', () => {
    it('should render with title and message', () => {
      render(
        <ConfirmDialog
          open={true}
          title="Confirm Delete"
          message="Are you sure you want to delete this appraisal?"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      
      expect(screen.getByText(/Confirm Delete/)).toBeInTheDocument();
      expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
    });
    
    it('should call onConfirm when confirmed', () => {
      const onConfirm = jest.fn();
      render(
        <ConfirmDialog
          open={true}
          title="Confirm"
          message="Confirm action?"
          onConfirm={onConfirm}
          onCancel={jest.fn()}
        />
      );
      
      const confirmButton = screen.getByRole('button', { name: /confirm|yes|ok/i });
      fireEvent.click(confirmButton);
      
      expect(onConfirm).toHaveBeenCalled();
    });
    
    it('should call onCancel when cancelled', () => {
      const onCancel = jest.fn();
      render(
        <ConfirmDialog
          open={true}
          title="Confirm"
          message="Confirm action?"
          onConfirm={jest.fn()}
          onCancel={onCancel}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /cancel|no/i });
      fireEvent.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
    });
    
    it('should not render when closed', () => {
      render(
        <ConfirmDialog
          open={false}
          title="Confirm"
          message="Confirm action?"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      
      expect(screen.queryByText(/Confirm/)).not.toBeInTheDocument();
    });
  });
  
  describe('EditAppraisalDialog Component', () => {
    const mockAppraisal = {
      id: 'test-id',
      vin: '5XYZT3LB0EG123456',
      year: 2014,
      make: 'Hyundai',
      model: 'Santa Fe Sport',
      mileage: 85234,
      location: 'CA 90210',
    };
    
    it('should render with appraisal data', () => {
      render(
        <EditAppraisalDialog
          open={true}
          appraisal={mockAppraisal}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      
      expect(screen.getByDisplayValue(/5XYZT3LB0EG123456/)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Hyundai/)).toBeInTheDocument();
    });
    
    it('should allow editing fields', () => {
      render(
        <EditAppraisalDialog
          open={true}
          appraisal={mockAppraisal}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      
      const makeInput = screen.getByDisplayValue(/Hyundai/);
      fireEvent.change(makeInput, { target: { value: 'Toyota' } });
      
      expect(screen.getByDisplayValue(/Toyota/)).toBeInTheDocument();
    });
    
    it('should validate edited data', async () => {
      render(
        <EditAppraisalDialog
          open={true}
          appraisal={mockAppraisal}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      
      const vinInput = screen.getByDisplayValue(/5XYZT3LB0EG123456/);
      fireEvent.change(vinInput, { target: { value: 'INVALID' } });
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid/i)).toBeInTheDocument();
      });
    });
    
    it('should call onSave with updated data', async () => {
      const onSave = jest.fn();
      render(
        <EditAppraisalDialog
          open={true}
          appraisal={mockAppraisal}
          onSave={onSave}
          onCancel={jest.fn()}
        />
      );
      
      const makeInput = screen.getByDisplayValue(/Hyundai/);
      fireEvent.change(makeInput, { target: { value: 'Toyota' } });
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({ make: 'Toyota' })
        );
      });
    });
  });
  
  describe('Component Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PDFUploader />);
      
      const uploadButton = screen.getByLabelText(/upload/i);
      expect(uploadButton).toHaveAttribute('aria-label');
    });
    
    it('should support keyboard navigation', () => {
      render(<PDFUploader />);
      
      const uploadButton = screen.getByRole('button');
      uploadButton.focus();
      
      expect(document.activeElement).toBe(uploadButton);
    });
    
    it('should announce status changes to screen readers', async () => {
      render(<PDFUploader />);
      
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toBeInTheDocument();
      });
    });
  });
});
