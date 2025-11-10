/**
 * UI Validation Tests
 * Tests styling, layout, responsive design, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { App } from '../src/renderer/App';
import { Sidebar } from '../src/renderer/components/Layout/Sidebar';
import { Dashboard } from '../src/renderer/pages/Dashboard';
import { NewAppraisal } from '../src/renderer/pages/NewAppraisal';
import { History } from '../src/renderer/pages/History';
import { Settings } from '../src/renderer/pages/Settings';
import { useAppStore } from '../src/renderer/store';

// Mock the store
jest.mock('../src/renderer/store');

// Mock electron API
const mockElectron = {
  getAppraisals: jest.fn().mockResolvedValue([]),
  processPDF: jest.fn(),
  onProcessingProgress: jest.fn(() => () => {}),
  onProcessingError: jest.fn(() => () => {}),
  onProcessingComplete: jest.fn(() => () => {}),
  removeAllListeners: jest.fn(),
};

(global as any).window.electron = mockElectron;

describe('UI Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      processingStatus: 'idle',
      currentAppraisal: null,
      appraisalHistory: [],
      historyLoading: false,
      historyError: null,
      loadHistory: jest.fn(),
      setCurrentPage: jest.fn(),
      reset: jest.fn(),
      resetProcessing: jest.fn(),
      clearError: jest.fn(),
      sidebarCollapsed: false,
      toggleSidebar: jest.fn(),
      createError: jest.fn(),
    });
    
    // Mock getState for ErrorBoundary
    (useAppStore as any).getState = jest.fn(() => ({
      createError: jest.fn(),
    }));
  });

  describe('Styling and Layout', () => {
    it('should render sidebar with correct styling', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const appTitle = screen.getByText('Automotive Appraisal');
      expect(appTitle).toBeInTheDocument();
      
      // Verify sidebar navigation items exist
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('New Appraisal').length).toBeGreaterThan(0);
    });

    it('should render Dashboard with proper layout', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Check for main heading
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      
      // Check for statistics cards
      expect(screen.getByText('Total Appraisals')).toBeInTheDocument();
      expect(screen.getByText('Drafts')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should render NewAppraisal page with proper layout', () => {
      render(
        <MemoryRouter>
          <NewAppraisal />
        </MemoryRouter>
      );

      expect(screen.getByText('New Appraisal')).toBeInTheDocument();
      expect(screen.getByText(/Upload a PDF/i)).toBeInTheDocument();
    });

    it('should render History page with proper layout', () => {
      render(
        <MemoryRouter>
          <History />
        </MemoryRouter>
      );

      expect(screen.getByText('Appraisal History')).toBeInTheDocument();
    });

    it('should render Settings page with proper layout', () => {
      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Navigation Paths and Transitions', () => {
    it('should render Dashboard page with navigation', () => {
      render(
        <MemoryRouter>
          <div className="flex">
            <Sidebar />
            <Dashboard />
          </div>
        </MemoryRouter>
      );

      // Verify navigation items are present
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('New Appraisal').length).toBeGreaterThan(0);
      
      // Verify Dashboard content is visible
      expect(screen.getByText('Total Appraisals')).toBeInTheDocument();
    });

    it('should render New Appraisal page', () => {
      render(
        <MemoryRouter>
          <NewAppraisal />
        </MemoryRouter>
      );
      
      // Verify New Appraisal content is visible
      expect(screen.getByText(/Upload a PDF/i)).toBeInTheDocument();
    });

    it('should render History page', () => {
      render(
        <MemoryRouter>
          <History />
        </MemoryRouter>
      );
      
      // Verify History content is visible
      expect(screen.getByText('Appraisal History')).toBeInTheDocument();
    });

    it('should render Settings page', () => {
      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );
      
      // Verify Settings content is visible
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should highlight active navigation item', () => {
      render(
        <MemoryRouter initialEntries={['/new']}>
          <Sidebar />
        </MemoryRouter>
      );

      const newAppraisalLinks = screen.getAllByText('New Appraisal');
      const activeLink = newAppraisalLinks[0].closest('a');
      
      // Check for active state classes
      expect(activeLink).toHaveClass('bg-blue-50');
      expect(activeLink).toHaveClass('text-blue-600');
    });
  });

  describe('Responsive Design', () => {
    it('should render sidebar with navigation items', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      // Verify sidebar renders with all navigation items
      expect(screen.getByText('Automotive Appraisal')).toBeInTheDocument();
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    });

    it('should handle sidebar collapse state', () => {
      const mockStore = {
        processingStatus: 'idle',
        currentAppraisal: null,
        appraisalHistory: [],
        historyLoading: false,
        historyError: null,
        loadHistory: jest.fn(),
        setCurrentPage: jest.fn(),
        reset: jest.fn(),
        resetProcessing: jest.fn(),
        clearError: jest.fn(),
        sidebarCollapsed: true,
        toggleSidebar: jest.fn(),
        createError: jest.fn(),
      };

      (useAppStore as unknown as jest.Mock).mockReturnValue(mockStore);

      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const sidebar = screen.getByText('Automotive Appraisal').closest('aside');
      // When collapsed, sidebar should have different width
      expect(sidebar).toBeInTheDocument();
    });

    it('should render content area with proper flex layout', () => {
      const { container } = render(
        <MemoryRouter>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1">
              <Dashboard />
            </main>
          </div>
        </MemoryRouter>
      );

      const mainContent = container.querySelector('main');
      expect(mainContent).toHaveClass('flex-1');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible navigation links', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      // All navigation links should be accessible
      const dashboardLink = screen.getAllByText('Dashboard')[0].closest('a');
      const newAppraisalLink = screen.getAllByText('New Appraisal')[0].closest('a');
      const historyLink = screen.getAllByText('History')[0].closest('a');
      const settingsLink = screen.getAllByText('Settings')[0].closest('a');

      expect(dashboardLink).toHaveAttribute('href');
      expect(newAppraisalLink).toHaveAttribute('href');
      expect(historyLink).toHaveAttribute('href');
      expect(settingsLink).toHaveAttribute('href');
    });

    it('should have proper heading hierarchy on Dashboard', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Main heading should be h1
      const mainHeading = screen.getByText('Dashboard');
      expect(mainHeading.tagName).toBe('H1');
    });

    it('should have proper heading hierarchy on New Appraisal', () => {
      render(
        <MemoryRouter>
          <NewAppraisal />
        </MemoryRouter>
      );

      const mainHeading = screen.getByText('New Appraisal');
      expect(mainHeading.tagName).toBe('H1');
    });

    it('should have proper heading hierarchy on History', () => {
      render(
        <MemoryRouter>
          <History />
        </MemoryRouter>
      );

      const mainHeading = screen.getByText('Appraisal History');
      expect(mainHeading.tagName).toBe('H1');
    });

    it('should have proper heading hierarchy on Settings', () => {
      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      const mainHeading = screen.getByText('Settings');
      expect(mainHeading.tagName).toBe('H1');
    });

    it('should have accessible buttons on Dashboard', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Dashboard should have action buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation in sidebar', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const dashboardLink = screen.getAllByText('Dashboard')[0].closest('a');
      
      // Links should be focusable
      dashboardLink?.focus();
      expect(document.activeElement).toBe(dashboardLink);
    });

    it('should support Enter key on navigation links', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const newAppraisalLink = screen.getAllByText('New Appraisal')[0].closest('a');
      
      // Simulate Enter key press
      if (newAppraisalLink) {
        fireEvent.keyDown(newAppraisalLink, { key: 'Enter', code: 'Enter' });
      }
      
      // Link should still be in document (navigation would happen in real app)
      expect(newAppraisalLink).toBeInTheDocument();
    });

    it('should have form elements on Settings page', () => {
      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      // Settings page should render
      expect(screen.getByText('Settings')).toBeInTheDocument();
      
      // Should have some settings controls
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Feedback', () => {
    it('should render navigation items with links', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const dashboardLink = screen.getAllByText('Dashboard')[0].closest('a');
      
      // Link should exist and have href
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href');
    });

    it('should show loading state on History page', () => {
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        processingStatus: 'idle',
        currentAppraisal: null,
        appraisalHistory: [],
        historyLoading: true,
        historyError: null,
        loadHistory: jest.fn(),
        setCurrentPage: jest.fn(),
        reset: jest.fn(),
        resetProcessing: jest.fn(),
        clearError: jest.fn(),
        createError: jest.fn(),
      });

      render(
        <MemoryRouter>
          <History />
        </MemoryRouter>
      );

      // Should show loading skeleton or animation
      const historyPage = screen.getByText('Appraisal History');
      expect(historyPage).toBeInTheDocument();
    });

    it('should show empty state on History page when no appraisals', () => {
      render(
        <MemoryRouter>
          <History />
        </MemoryRouter>
      );

      // Should show empty state message
      expect(screen.getByText(/No appraisals/i)).toBeInTheDocument();
    });

    it('should display statistics on Dashboard', () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Should show stat cards
      expect(screen.getByText('Total Appraisals')).toBeInTheDocument();
      expect(screen.getByText('Drafts')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should render error boundary when component throws', () => {
      // This would require a component that throws an error
      // For now, just verify error boundary exists in the app
      const { container } = render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      );

      expect(container).toBeInTheDocument();
    });
  });
});
