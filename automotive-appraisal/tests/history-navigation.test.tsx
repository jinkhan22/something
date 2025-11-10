/**
 * Tests for Task 8: Update History page for navigation
 * 
 * This test suite verifies:
 * - Task 8.1: Appraisal items are clickable with proper styling
 * - Task 8.2: "View Details" button navigates correctly
 * - Task 8.3: Card styling with hover effects and navigation indicators
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { History } from '../src/renderer/pages/History';
import { useAppStore } from '../src/renderer/store';
import { AppraisalRecord } from '../src/types';

// Mock the store
jest.mock('../src/renderer/store');

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom') as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({})
  };
});

// Mock window.electron
const mockElectron: any = {
  getAppraisals: jest.fn(),
  updateAppraisalStatus: jest.fn(),
  deleteAppraisal: jest.fn(),
  exportToCSV: jest.fn(),
  exportToJSON: jest.fn(),
  getReportHistory: jest.fn(),
  deleteReportFromHistory: jest.fn(),
  openReportFile: jest.fn()
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
      extractionErrors: ['Low confidence on mileage']
    }
  }
];

describe('Task 8: Update History page for navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup store mock
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      appraisalHistory: mockAppraisals,
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      updateHistoryItem: jest.fn(),
      removeFromHistory: jest.fn(),
      createError: jest.fn(),
      settings: {
        defaultExportFormat: 'csv',
        confidenceThresholds: {
          warning: 80,
          error: 60
        }
      },
      comparableVehicles: [],
      marketAnalysis: null,
      addComparable: jest.fn(),
      updateComparable: jest.fn(),
      deleteComparable: jest.fn(),
      calculateMarketValue: jest.fn(),
      loadComparables: jest.fn(),
      reportHistory: [],
      reportHistoryLoading: false,
      reportHistoryError: null,
      loadReportHistory: jest.fn(),
      deleteReportFromHistory: jest.fn()
    });

    mockElectron.getAppraisals.mockResolvedValue(mockAppraisals);
    mockElectron.getReportHistory.mockResolvedValue([]);
  });

  describe('Task 8.1: Make appraisal items clickable', () => {
    it('should render appraisal items with cursor pointer', () => {
      const { container } = render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      // Find appraisal rows
      const appraisalRows = container.querySelectorAll('[role="button"]');
      expect(appraisalRows.length).toBeGreaterThan(0);

      // Check that rows have cursor-pointer class
      appraisalRows.forEach(row => {
        expect(row.className).toContain('cursor-pointer');
      });
    });

    it('should navigate to detail view when clicking on appraisal row', async () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      // Find and click the first appraisal row (not the button)
      const appraisalRows = screen.getAllByRole('button');
      const firstAppraisalRow = appraisalRows.find(el => 
        el.getAttribute('aria-label')?.includes('2021 Honda Accord') && 
        el.className.includes('px-6 py-4')
      );
      
      expect(firstAppraisalRow).toBeDefined();
      fireEvent.click(firstAppraisalRow!);

      // Verify navigation was called with correct path
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/history/apr_1');
      });
    });

    it('should show hover effect on appraisal items', () => {
      const { container } = render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      const appraisalRows = container.querySelectorAll('[role="button"]');
      appraisalRows.forEach(row => {
        expect(row.className).toContain('hover:bg-blue-50');
        expect(row.className).toContain('transition');
      });
    });

    it('should support keyboard navigation with Enter key', async () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      const appraisalRows = screen.getAllByRole('button');
      const firstAppraisalRow = appraisalRows.find(el => 
        el.getAttribute('aria-label')?.includes('2021 Honda Accord') && 
        el.className.includes('px-6 py-4')
      );
      
      // Simulate Enter key press
      fireEvent.keyDown(firstAppraisalRow!, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/history/apr_1');
      });
    });

    it('should support keyboard navigation with Space key', async () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      const appraisalRows = screen.getAllByRole('button');
      const firstAppraisalRow = appraisalRows.find(el => 
        el.getAttribute('aria-label')?.includes('2021 Honda Accord') && 
        el.className.includes('px-6 py-4')
      );
      
      // Simulate Space key press
      fireEvent.keyDown(firstAppraisalRow!, { key: ' ', code: 'Space' });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/history/apr_1');
      });
    });
  });

  describe('Task 8.2: Add "View Details" button', () => {
    it('should render "View Details" button for each appraisal', () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      const viewDetailsButtons = screen.getAllByText(/View Details/i);
      expect(viewDetailsButtons.length).toBe(mockAppraisals.length);
    });

    it('should navigate when clicking "View Details" button', async () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      const viewDetailsButtons = screen.getAllByText(/View Details/i);
      fireEvent.click(viewDetailsButtons[0]);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/history/apr_1');
      });
    });

    it('should stop event propagation when clicking button', async () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      const viewDetailsButtons = screen.getAllByText(/View Details/i);
      
      // Click the button
      fireEvent.click(viewDetailsButtons[0]);

      // Should only navigate once (not twice from both row and button)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });
    });

    it('should have proper aria-label for accessibility', () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      const viewDetailsButtons = screen.getAllByText(/View Details/i);
      const firstButton = viewDetailsButtons[0];
      
      expect(firstButton).toHaveAttribute('aria-label');
      expect(firstButton.getAttribute('aria-label')).toContain('2021 Honda Accord');
    });
  });

  describe('Task 8.3: Update appraisal card styling', () => {
    it('should render navigation arrow icon', () => {
      const { container } = render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      // Check for arrow SVG icons
      const arrowIcons = container.querySelectorAll('svg');
      expect(arrowIcons.length).toBeGreaterThan(0);
    });

    it('should have hover effect classes on cards', () => {
      const { container } = render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      const appraisalRows = container.querySelectorAll('[role="button"]');
      appraisalRows.forEach(row => {
        expect(row.className).toContain('hover:bg-blue-50');
        expect(row.className).toContain('hover:shadow-sm');
        expect(row.className).toContain('transition-all');
      });
    });

    it('should maintain accessibility with proper ARIA attributes', () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      const appraisalRows = screen.getAllByRole('button').filter(el => 
        el.className.includes('px-6 py-4')
      );
      
      appraisalRows.forEach(row => {
        expect(row).toHaveAttribute('aria-label');
        expect(row).toHaveAttribute('tabIndex');
      });
    });

    it('should not navigate when clicking checkbox', async () => {
      const { container } = render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      // Find checkboxes
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const firstCheckbox = checkboxes[1]; // Skip the "select all" checkbox
      
      fireEvent.click(firstCheckbox);

      // Should not navigate
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      }, { timeout: 500 });
    });

    it('should not navigate when clicking Edit button', async () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      const editButtons = screen.getAllByText(/^Edit$/i);
      fireEvent.click(editButtons[0]);

      // Should not navigate to detail view
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/history/'));
      }, { timeout: 500 });
    });

    it('should not navigate when clicking Delete button', async () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      const deleteButtons = screen.getAllByText(/^Delete$/i);
      fireEvent.click(deleteButtons[0]);

      // Should not navigate to detail view
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/history/'));
      }, { timeout: 500 });
    });
  });

  describe('Integration: Complete navigation flow', () => {
    it('should handle complete user flow from list to detail', async () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      // User sees the list
      expect(screen.getByText('Accord')).toBeInTheDocument();
      expect(screen.getByText('Model S')).toBeInTheDocument();

      // User clicks on first appraisal row
      const appraisalRows = screen.getAllByRole('button');
      const firstAppraisalRow = appraisalRows.find(el => 
        el.getAttribute('aria-label')?.includes('2021 Honda Accord') && 
        el.className.includes('px-6 py-4')
      );
      
      fireEvent.click(firstAppraisalRow!);

      // Navigation should be triggered
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/history/apr_1');
      });
    });

    it('should handle navigation via View Details button', async () => {
      render(
        <BrowserRouter>
          <History />
        </BrowserRouter>
      );

      // User clicks View Details button
      const viewDetailsButton = screen.getAllByText(/View Details/i)[1]; // Second appraisal
      fireEvent.click(viewDetailsButton);

      // Should navigate to correct detail page
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/history/apr_2');
      });
    });
  });
});
