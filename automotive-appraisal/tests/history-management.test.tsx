/**
 * Tests for Task 6: Advanced History and Management Features
 * 
 * This test suite verifies:
 * - Task 6.1: Enhanced history page with search and filtering
 * - Task 6.2: CSV export functionality
 * - Task 6.3: Appraisal management operations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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
  updateAppraisal: jest.fn(),
  findDuplicates: jest.fn(),
  hasDuplicate: jest.fn(),
  backupStorage: jest.fn(),
  restoreStorage: jest.fn(),
  verifyStorageIntegrity: jest.fn()
};

(global as any).window.electron = mockElectron;

// Sample test data
const mockAppraisals: AppraisalRecord[] = [
  {
    id: 'apr_1',
    createdAt: new Date('2025-01-15'),
    status: 'complete',
    data: {
      vin: '1HGBH41JXMN109186',
      year: 2021,
      make: 'Honda',
      model: 'Accord',
      trim: 'EX-L',
      mileage: 45000,
      location: 'Los Angeles, CA',
      reportType: 'CCC_ONE',
      extractionConfidence: 95,
      extractionMethod: 'standard',
      extractionErrors: [],
      marketValue: 25000,
      settlementValue: 24500
    }
  },
  {
    id: 'apr_2',
    createdAt: new Date('2025-01-10'),
    status: 'draft',
    data: {
      vin: '5YJSA1E14HF123456',
      year: 2017,
      make: 'Tesla',
      model: 'Model S',
      mileage: 78000,
      location: 'San Francisco, CA',
      reportType: 'MITCHELL',
      extractionConfidence: 72,
      extractionMethod: 'ocr',
      extractionErrors: ['Low confidence on mileage'],
      marketValue: 35000
    }
  },
  {
    id: 'apr_3',
    createdAt: new Date('2025-01-05'),
    status: 'complete',
    data: {
      vin: 'WBADT43452G123456',
      year: 2019,
      make: 'BMW',
      model: 'M3',
      trim: 'Competition',
      mileage: 32000,
      location: 'New York, NY',
      reportType: 'CCC_ONE',
      extractionConfidence: 88,
      extractionMethod: 'hybrid',
      extractionErrors: [],
      marketValue: 52000,
      settlementValue: 51000
    }
  }
];

describe('Task 6.1: Enhanced History Page with Search and Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock store implementation
    (useAppStore as any).mockReturnValue({
      appraisalHistory: mockAppraisals,
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      updateHistoryItem: jest.fn(),
      removeFromHistory: jest.fn(),
      createError: jest.fn()
    });
  });

  it('should render searchable appraisal table', () => {
    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText(/search by vin/i)).toBeInTheDocument();
    expect(screen.getByText('Honda')).toBeInTheDocument();
    expect(screen.getByText('Tesla')).toBeInTheDocument();
    expect(screen.getByText('BMW')).toBeInTheDocument();
  });

  it('should filter appraisals by search query', async () => {
    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText(/search by vin/i);
    fireEvent.change(searchInput, { target: { value: 'Tesla' } });

    await waitFor(() => {
      expect(screen.getByText('Tesla')).toBeInTheDocument();
      expect(screen.queryByText('Honda')).not.toBeInTheDocument();
      expect(screen.queryByText('BMW')).not.toBeInTheDocument();
    });
  });

  it('should filter by status', async () => {
    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Open filters
    const filtersButton = screen.getByText(/filters/i);
    fireEvent.click(filtersButton);

    // Select draft status
    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: 'draft' } });

    await waitFor(() => {
      expect(screen.getByText('Tesla')).toBeInTheDocument();
      expect(screen.queryByText('Honda')).not.toBeInTheDocument();
    });
  });

  it('should filter by extraction method', async () => {
    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Open filters
    const filtersButton = screen.getByText(/filters/i);
    fireEvent.click(filtersButton);

    // Select OCR method
    const methodSelect = screen.getByLabelText(/extraction method/i);
    fireEvent.change(methodSelect, { target: { value: 'ocr' } });

    await waitFor(() => {
      expect(screen.getByText('Tesla')).toBeInTheDocument();
      expect(screen.queryByText('Honda')).not.toBeInTheDocument();
    });
  });

  it('should filter by confidence range', async () => {
    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Open filters
    const filtersButton = screen.getByText(/filters/i);
    fireEvent.click(filtersButton);

    // Set confidence range
    const minConfidence = screen.getByLabelText(/min confidence/i);
    fireEvent.change(minConfidence, { target: { value: '80' } });

    await waitFor(() => {
      expect(screen.getByText('Honda')).toBeInTheDocument();
      expect(screen.getByText('BMW')).toBeInTheDocument();
      expect(screen.queryByText('Tesla')).not.toBeInTheDocument();
    });
  });

  it('should sort appraisals by different fields', async () => {
    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Click on Year column header to sort
    const yearHeader = screen.getByText(/vehicle/i);
    fireEvent.click(yearHeader);

    // Verify sorting indicator appears
    await waitFor(() => {
      expect(yearHeader.textContent).toContain('↑');
    });
  });

  it('should support bulk selection', () => {
    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Find and click select all checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheckbox = checkboxes[0];
    
    fireEvent.click(selectAllCheckbox);

    // Verify bulk actions appear
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
    expect(screen.getByText(/export csv/i)).toBeInTheDocument();
    expect(screen.getByText(/delete selected/i)).toBeInTheDocument();
  });

  it('should clear all filters', async () => {
    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Open filters and set some
    const filtersButton = screen.getByText(/filters/i);
    fireEvent.click(filtersButton);

    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: 'draft' } });

    // Clear filters
    const clearButton = screen.getByText(/clear all filters/i);
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('Honda')).toBeInTheDocument();
      expect(screen.getByText('Tesla')).toBeInTheDocument();
      expect(screen.getByText('BMW')).toBeInTheDocument();
    });
  });
});

describe('Task 6.2: CSV Export Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useAppStore as any).mockReturnValue({
      appraisalHistory: mockAppraisals,
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      updateHistoryItem: jest.fn(),
      removeFromHistory: jest.fn(),
      createError: jest.fn()
    });
  });

  it('should export selected appraisals to CSV', async () => {
    mockElectron.exportToCSV.mockResolvedValue({
      success: true,
      filePath: '/path/to/export.csv'
    });

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Select an appraisal
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Select first appraisal

    // Click export CSV
    const exportButton = screen.getByText(/export csv/i);
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockElectron.exportToCSV).toHaveBeenCalledWith(['apr_1']);
    });
  });

  it('should export selected appraisals to JSON', async () => {
    mockElectron.exportToJSON.mockResolvedValue({
      success: true,
      filePath: '/path/to/export.json'
    });

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Select an appraisal
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    // Click export JSON
    const exportButton = screen.getByText(/export json/i);
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockElectron.exportToJSON).toHaveBeenCalledWith(['apr_1']);
    });
  });

  it('should handle export errors gracefully', async () => {
    const createError = jest.fn();
    mockElectron.exportToCSV.mockResolvedValue({
      success: false,
      error: 'Export failed'
    });

    (useAppStore as any).mockReturnValue({
      appraisalHistory: mockAppraisals,
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      updateHistoryItem: jest.fn(),
      removeFromHistory: jest.fn(),
      createError
    });

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Select and export
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    
    const exportButton = screen.getByText(/export csv/i);
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(createError).toHaveBeenCalled();
    });
  });

  it('should support batch export of multiple appraisals', async () => {
    mockElectron.exportToCSV.mockResolvedValue({
      success: true,
      filePath: '/path/to/export.csv'
    });

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Select multiple appraisals
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);

    // Export
    const exportButton = screen.getByText(/export csv/i);
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockElectron.exportToCSV).toHaveBeenCalledWith(['apr_1', 'apr_2']);
    });
  });
});

describe('Task 6.3: Appraisal Management Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useAppStore as any).mockReturnValue({
      appraisalHistory: mockAppraisals,
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      updateHistoryItem: jest.fn(),
      removeFromHistory: jest.fn(),
      createError: jest.fn()
    });
  });

  it('should show confirmation dialog before deletion', async () => {
    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Click delete button
    const deleteButtons = screen.getAllByText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    // Verify confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });

  it('should delete appraisal after confirmation', async () => {
    const removeFromHistory = jest.fn();
    mockElectron.deleteAppraisal.mockResolvedValue(true);

    (useAppStore as any).mockReturnValue({
      appraisalHistory: mockAppraisals,
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      updateHistoryItem: jest.fn(),
      removeFromHistory,
      createError: jest.fn()
    });

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Click delete and confirm
    const deleteButtons = screen.getAllByText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockElectron.deleteAppraisal).toHaveBeenCalled();
      expect(removeFromHistory).toHaveBeenCalled();
    });
  });

  it('should open edit dialog when edit button is clicked', async () => {
    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Click edit button
    const editButtons = screen.getAllByText(/edit/i);
    fireEvent.click(editButtons[0]);

    // Verify edit dialog appears
    await waitFor(() => {
      expect(screen.getByText(/edit appraisal/i)).toBeInTheDocument();
    });
  });

  it('should update appraisal data when edited', async () => {
    const updateHistoryItem = jest.fn();
    mockElectron.updateAppraisal.mockResolvedValue(true);

    (useAppStore as any).mockReturnValue({
      appraisalHistory: mockAppraisals,
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      updateHistoryItem,
      removeFromHistory: jest.fn(),
      createError: jest.fn()
    });

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Open edit dialog
    const editButtons = screen.getAllByText(/edit/i);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      const vinInput = screen.getByDisplayValue('1HGBH41JXMN109186');
      expect(vinInput).toBeInTheDocument();
    });

    // Modify VIN
    const vinInput = screen.getByDisplayValue('1HGBH41JXMN109186');
    fireEvent.change(vinInput, { target: { value: '1HGBH41JXMN109999' } });

    // Save
    const saveButton = screen.getByText(/save changes/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockElectron.updateAppraisal).toHaveBeenCalled();
      expect(updateHistoryItem).toHaveBeenCalled();
    });
  });

  it('should detect duplicate VINs when editing', async () => {
    mockElectron.hasDuplicate.mockResolvedValue(true);

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Open edit dialog
    const editButtons = screen.getAllByText(/edit/i);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      const vinInput = screen.getByDisplayValue('1HGBH41JXMN109186');
      fireEvent.change(vinInput, { target: { value: '5YJSA1E14HF123456' } });
    });

    // Wait for duplicate check
    await waitFor(() => {
      expect(screen.getByText(/another appraisal with this vin/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should support bulk deletion with confirmation', async () => {
    const removeFromHistory = jest.fn();
    mockElectron.deleteAppraisal.mockResolvedValue(true);

    (useAppStore as any).mockReturnValue({
      appraisalHistory: mockAppraisals,
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      updateHistoryItem: jest.fn(),
      removeFromHistory,
      createError: jest.fn()
    });

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    );

    // Select multiple appraisals
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);

    // Click bulk delete
    const deleteButton = screen.getByText(/delete selected/i);
    fireEvent.click(deleteButton);

    // Confirm
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockElectron.deleteAppraisal).toHaveBeenCalledTimes(2);
    });
  });
});
