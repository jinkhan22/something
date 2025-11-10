import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import { Sidebar } from '../src/renderer/components/Layout/Sidebar';
import { Dashboard } from '../src/renderer/pages/Dashboard';
import { NewAppraisal } from '../src/renderer/pages/NewAppraisal';
import { History } from '../src/renderer/pages/History';
import { Settings } from '../src/renderer/pages/Settings';
import { NotFound } from '../src/renderer/pages/NotFound';
import { useAppStore } from '../src/renderer/store';

// Mock the store
jest.mock('../src/renderer/store');

// Mock electron API
const mockElectron = {
  getAppraisals: jest.fn().mockResolvedValue([]),
  processPDF: jest.fn(),
  onProcessingProgress: jest.fn(),
  onProcessingError: jest.fn(),
  onProcessingComplete: jest.fn(),
  removeProcessingProgressListener: jest.fn(),
  removeProcessingErrorListener: jest.fn(),
  removeProcessingCompleteListener: jest.fn(),
};

(global as any).window.electron = mockElectron;

describe('Navigation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      processingStatus: 'idle',
      currentAppraisal: null,
      appraisalHistory: [],
      historyLoading: false,
      loadHistory: jest.fn(),
      setCurrentPage: jest.fn(),
      reset: jest.fn(),
      resetProcessing: jest.fn(),
    });
  });

  const renderApp = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new" element={<NewAppraisal />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </MemoryRouter>
    );
  };

  describe('Complete Navigation Flow', () => {
    it('should navigate between all pages', async () => {
      renderApp('/');

      // Get sidebar navigation links
      const sidebar = screen.getByText('Automotive Appraisal').closest('aside');
      expect(sidebar).toBeInTheDocument();

      // Verify all navigation items are present
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('New Appraisal').length).toBeGreaterThan(0);
      expect(screen.getAllByText('History').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
    });

    it('should maintain active state during navigation', () => {
      const { unmount } = renderApp('/new');

      // Find the sidebar navigation link (first occurrence)
      const navLinks = screen.getAllByText('New Appraisal');
      const newAppraisalLink = navLinks[0].closest('a');
      expect(newAppraisalLink).toHaveClass('bg-blue-50', 'text-blue-600');

      unmount();

      // Render with different route
      renderApp('/history');
      
      const historyLinks = screen.getAllByText('History');
      const historyLink = historyLinks[0].closest('a');
      expect(historyLink).toHaveClass('bg-blue-50', 'text-blue-600');
    });
  });

  describe('404 Handling', () => {
    it('should show 404 page for invalid routes', () => {
      renderApp('/invalid-route');

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Sorry, the page you visited does not exist.')).toBeInTheDocument();
    });
  });

  describe('Sidebar Active States', () => {
    it('should highlight correct item for each route', () => {
      const routes = [
        { path: '/', text: 'Dashboard' },
        { path: '/new', text: 'New Appraisal' },
        { path: '/history', text: 'History' },
        { path: '/settings', text: 'Settings' },
      ];

      routes.forEach(({ path, text }) => {
        const { unmount } = renderApp(path);
        
        // Get the first occurrence (sidebar link)
        const links = screen.getAllByText(text);
        const activeLink = links[0].closest('a');
        expect(activeLink).toHaveClass('bg-blue-50', 'text-blue-600');
        expect(activeLink).toHaveAttribute('aria-current', 'page');
        
        unmount();
      });
    });
  });

  describe('Navigation Feedback', () => {
    it('should show check icon for active route', () => {
      renderApp('/settings');

      const settingsLinks = screen.getAllByText('Settings');
      const settingsLink = settingsLinks[0].closest('a');
      const checkIcon = settingsLink?.querySelector('svg[class*="w-4"]');
      expect(checkIcon).toBeInTheDocument();
    });

    it('should apply hover styles to inactive items', () => {
      renderApp('/');

      const historyLink = screen.getByText('History').closest('a');
      expect(historyLink).toHaveClass('hover:bg-gray-100');
    });
  });

  describe('Processing Status Integration', () => {
    it('should update sidebar status during processing', () => {
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        processingStatus: 'processing',
        currentAppraisal: null,
        appraisalHistory: [],
        historyLoading: false,
        loadHistory: jest.fn(),
        setCurrentPage: jest.fn(),
        reset: jest.fn(),
        resetProcessing: jest.fn(),
      });

      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Processing PDF report')).toBeInTheDocument();
    });

    it('should show ready status when idle', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('System Ready')).toBeInTheDocument();
      expect(screen.getByText('Ready to process PDF reports')).toBeInTheDocument();
    });
  });
});
