import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import { NotFound } from '../src/renderer/pages/NotFound';
import { RouteGuard } from '../src/renderer/components/RouteGuard';
import { useAppStore } from '../src/renderer/store';

// Mock the store
jest.mock('../src/renderer/store');

describe('Navigation and Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      setCurrentPage: jest.fn(),
      processingStatus: 'idle',
    });
  });

  describe('NotFound Component', () => {
    it('should render 404 page', () => {
      render(
        <MemoryRouter>
          <NotFound />
        </MemoryRouter>
      );

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Sorry, the page you visited does not exist.')).toBeInTheDocument();
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });

    it('should navigate to dashboard when button is clicked', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/invalid-route']}>
          <Routes>
            <Route path="/" element={<div>Dashboard</div>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MemoryRouter>
      );

      const button = screen.getByText('Back to Dashboard');
      button.click();

      waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('RouteGuard Component', () => {
    it('should update current page in store on route change', () => {
      const mockSetCurrentPage = jest.fn();
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        setCurrentPage: mockSetCurrentPage,
        processingStatus: 'idle',
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <RouteGuard>
            <div>Test Content</div>
          </RouteGuard>
        </MemoryRouter>
      );

      expect(mockSetCurrentPage).toHaveBeenCalledWith('Dashboard');
    });

    it('should update document title based on route', () => {
      render(
        <MemoryRouter initialEntries={['/new']}>
          <RouteGuard>
            <div>Test Content</div>
          </RouteGuard>
        </MemoryRouter>
      );

      expect(document.title).toBe('New Appraisal - Automotive Appraisal');
    });

    it('should render children', () => {
      render(
        <MemoryRouter>
          <RouteGuard>
            <div>Test Content</div>
          </RouteGuard>
        </MemoryRouter>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should add beforeunload listener when processing', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        setCurrentPage: jest.fn(),
        processingStatus: 'processing',
      });

      render(
        <MemoryRouter>
          <RouteGuard>
            <div>Test Content</div>
          </RouteGuard>
        </MemoryRouter>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('Route Navigation', () => {
    it('should handle valid routes', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<div>Dashboard</div>} />
            <Route path="/new" element={<div>New Appraisal</div>} />
            <Route path="/history" element={<div>History</div>} />
            <Route path="/settings" element={<div>Settings</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should redirect invalid routes to 404', () => {
      render(
        <MemoryRouter initialEntries={['/invalid-route']}>
          <Routes>
            <Route path="/" element={<div>Dashboard</div>} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('404')).toBeInTheDocument();
    });
  });

  describe('Navigation State Management', () => {
    it('should track current page in store for dashboard', () => {
      const mockSetCurrentPage = jest.fn();
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        setCurrentPage: mockSetCurrentPage,
        processingStatus: 'idle',
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <RouteGuard>
            <div>Content</div>
          </RouteGuard>
        </MemoryRouter>
      );

      expect(mockSetCurrentPage).toHaveBeenCalledWith('Dashboard');
    });

    it('should track current page in store for settings', () => {
      const mockSetCurrentPage = jest.fn();
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        setCurrentPage: mockSetCurrentPage,
        processingStatus: 'idle',
      });

      render(
        <MemoryRouter initialEntries={['/settings']}>
          <RouteGuard>
            <div>Content</div>
          </RouteGuard>
        </MemoryRouter>
      );

      expect(mockSetCurrentPage).toHaveBeenCalledWith('Settings');
    });
  });
});
