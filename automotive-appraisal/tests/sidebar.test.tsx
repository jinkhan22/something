import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { Sidebar } from '../src/renderer/components/Layout/Sidebar';
import { useAppStore } from '../src/renderer/store';

// Mock the store
jest.mock('../src/renderer/store');

describe('Sidebar Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      processingStatus: 'idle',
    });
  });

  describe('Navigation Items', () => {
    it('should render all navigation items', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('New Appraisal')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should highlight active route', () => {
      render(
        <MemoryRouter initialEntries={['/new']}>
          <Sidebar />
        </MemoryRouter>
      );

      const newAppraisalLink = screen.getByText('New Appraisal').closest('a');
      expect(newAppraisalLink).toHaveClass('bg-blue-50', 'text-blue-600');
    });

    it('should show check icon for active route', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      );

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      const checkIcon = dashboardLink?.querySelector('svg[class*="w-4"]');
      expect(checkIcon).toBeInTheDocument();
    });

    it('should apply hover styles to inactive items', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      );

      const historyLink = screen.getByText('History').closest('a');
      expect(historyLink).toHaveClass('hover:bg-gray-100');
    });

    it('should set aria-current for active page', () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <Sidebar />
        </MemoryRouter>
      );

      const settingsLink = screen.getByText('Settings').closest('a');
      expect(settingsLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Nested Route Highlighting', () => {
    it('should highlight parent route for nested paths', () => {
      render(
        <MemoryRouter initialEntries={['/history/123']}>
          <Sidebar />
        </MemoryRouter>
      );

      const historyLink = screen.getByText('History').closest('a');
      expect(historyLink).toHaveClass('bg-blue-50', 'text-blue-600');
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should show breadcrumb for nested routes', () => {
      render(
        <MemoryRouter initialEntries={['/history/123']}>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Appraisal Details')).toBeInTheDocument();
    });

    it('should not show breadcrumb for top-level routes', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('should not show breadcrumb for history list page', () => {
      render(
        <MemoryRouter initialEntries={['/history']}>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });
  });

  describe('Status Indicator', () => {
    it('should show ready status when idle', () => {
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        processingStatus: 'idle',
      });

      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('System Ready')).toBeInTheDocument();
      expect(screen.getByText('Ready to process PDF reports')).toBeInTheDocument();
    });

    it('should show processing status when processing', () => {
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        processingStatus: 'processing',
      });

      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Processing PDF report')).toBeInTheDocument();
    });

    it('should show processing status when uploading', () => {
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        processingStatus: 'uploading',
      });

      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should apply different styles for processing state', () => {
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        processingStatus: 'processing',
      });

      const { container } = render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const statusBox = container.querySelector('.bg-yellow-50');
      expect(statusBox).toBeInTheDocument();
    });
  });

  describe('Navigation Transitions', () => {
    it('should apply transition classes to navigation items', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveClass('transition-all', 'duration-200');
    });

    it('should apply scale transform to active item icon', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      );

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      const icon = dashboardLink?.querySelector('svg.scale-110');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Logo and Branding', () => {
    it('should display application name', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('Automotive Appraisal')).toBeInTheDocument();
      expect(screen.getByText('PDF Report Processor')).toBeInTheDocument();
    });
  });
});
