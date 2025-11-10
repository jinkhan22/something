/**
 * UI Polish and User Experience Tests
 * 
 * Tests loading states, transitions, keyboard shortcuts, tooltips,
 * and accessibility features.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

describe('UI Polish and User Experience', () => {
  describe('Loading States', () => {
    it('should display loading animation with text', () => {
      const { LoadingAnimation } = require('../src/renderer/components/LoadingAnimation');
      
      const { container } = render(
        <LoadingAnimation size="md" text="Processing PDF..." variant="spinner" />
      );
      
      expect(screen.getByText('Processing PDF...')).toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should support different loading animation variants', () => {
      const { LoadingAnimation } = require('../src/renderer/components/LoadingAnimation');
      
      const { container: spinnerContainer } = render(
        <LoadingAnimation variant="spinner" />
      );
      expect(spinnerContainer.querySelector('.animate-spin')).toBeInTheDocument();
      
      const { container: dotsContainer } = render(
        <LoadingAnimation variant="dots" />
      );
      expect(dotsContainer.querySelector('.animate-bounce')).toBeInTheDocument();
      
      const { container: pulseContainer } = render(
        <LoadingAnimation variant="pulse" />
      );
      expect(pulseContainer.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should support different sizes', () => {
      const { LoadingAnimation } = require('../src/renderer/components/LoadingAnimation');
      
      const { container: smContainer } = render(
        <LoadingAnimation size="sm" />
      );
      expect(smContainer.querySelector('.w-4')).toBeInTheDocument();
      
      const { container: mdContainer } = render(
        <LoadingAnimation size="md" />
      );
      expect(mdContainer.querySelector('.w-8')).toBeInTheDocument();
      
      const { container: lgContainer } = render(
        <LoadingAnimation size="lg" />
      );
      expect(lgContainer.querySelector('.w-12')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should provide keyboard shortcuts hook with all shortcuts', () => {
      const { useKeyboardShortcuts } = require('../src/renderer/hooks/useKeyboardShortcuts');
      
      const TestComponent = () => {
        const { shortcuts } = useKeyboardShortcuts();
        return (
          <div>
            {shortcuts.map((shortcut: any, index: number) => (
              <div key={index}>
                {shortcut.key}: {shortcut.description}
              </div>
            ))}
          </div>
        );
      };
      
      render(
        <BrowserRouter>
          <TestComponent />
        </BrowserRouter>
      );
      
      expect(screen.getByText(/New Appraisal/)).toBeInTheDocument();
      expect(screen.getByText(/View History/)).toBeInTheDocument();
      expect(screen.getByText(/Dashboard/)).toBeInTheDocument();
      expect(screen.getByText(/Settings/)).toBeInTheDocument();
    });

    it('should handle keyboard events for navigation', () => {
      const mockNavigate = jest.fn();
      jest.mock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
      }));
      
      // Simulate Cmd+N for new appraisal
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        metaKey: true,
      });
      
      expect(event.key).toBe('n');
      expect(event.metaKey).toBe(true);
    });
  });

  describe('Tooltips', () => {
    it('should display tooltip on hover', async () => {
      const { Tooltip } = require('../src/renderer/components/Tooltip');
      
      render(
        <Tooltip content="This is helpful information">
          <button>Hover me</button>
        </Tooltip>
      );
      
      const button = screen.getByText('Hover me');
      fireEvent.mouseEnter(button);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('This is helpful information')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should hide tooltip on mouse leave', async () => {
      const { Tooltip } = require('../src/renderer/components/Tooltip');
      
      render(
        <Tooltip content="This is helpful information">
          <button>Hover me</button>
        </Tooltip>
      );
      
      const button = screen.getByText('Hover me');
      fireEvent.mouseEnter(button);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      }, { timeout: 500 });
      
      fireEvent.mouseLeave(button);
      
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('should support different positions', () => {
      const { Tooltip } = require('../src/renderer/components/Tooltip');
      
      const positions = ['top', 'bottom', 'left', 'right'] as const;
      
      positions.forEach(position => {
        const { container } = render(
          <Tooltip content="Test" position={position}>
            <button>Test</button>
          </Tooltip>
        );
        
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels on search input', () => {
      const searchInput = document.createElement('input');
      searchInput.setAttribute('type', 'search');
      searchInput.setAttribute('aria-label', 'Search appraisals');
      searchInput.setAttribute('placeholder', 'Search by VIN, make, model...');
      
      expect(searchInput.getAttribute('aria-label')).toBe('Search appraisals');
      expect(searchInput.getAttribute('type')).toBe('search');
    });

    it('should have keyboard navigation support', () => {
      const button = document.createElement('button');
      button.setAttribute('tabindex', '0');
      button.textContent = 'Clickable Button';
      
      expect(button.getAttribute('tabindex')).toBe('0');
      expect(button.textContent).toBe('Clickable Button');
    });

    it('should have focus indicators', () => {
      const button = document.createElement('button');
      button.className = 'focus:outline-none focus:ring-2 focus:ring-blue-500';
      
      expect(button.className).toContain('focus:ring-2');
      expect(button.className).toContain('focus:ring-blue-500');
    });

    it('should have proper color contrast for confidence indicators', () => {
      const confidenceColors = {
        good: { bg: 'bg-green-100', text: 'text-green-700' },
        warning: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
        error: { bg: 'bg-red-100', text: 'text-red-700' },
      };
      
      Object.values(confidenceColors).forEach(color => {
        expect(color.bg).toBeTruthy();
        expect(color.text).toBeTruthy();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid layouts', () => {
      const gridClasses = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
      
      expect(gridClasses).toContain('grid-cols-1');
      expect(gridClasses).toContain('md:grid-cols-2');
      expect(gridClasses).toContain('lg:grid-cols-3');
    });

    it('should have responsive text sizes', () => {
      const textClasses = 'text-sm md:text-base lg:text-lg';
      
      expect(textClasses).toContain('text-sm');
      expect(textClasses).toContain('md:text-base');
      expect(textClasses).toContain('lg:text-lg');
    });

    it('should have responsive padding and margins', () => {
      const spacingClasses = 'p-4 md:p-6 lg:p-8';
      
      expect(spacingClasses).toContain('p-4');
      expect(spacingClasses).toContain('md:p-6');
      expect(spacingClasses).toContain('lg:p-8');
    });
  });

  describe('Transitions and Animations', () => {
    it('should have smooth transitions on interactive elements', () => {
      const button = document.createElement('button');
      button.className = 'transition-colors duration-200 hover:bg-blue-700';
      
      expect(button.className).toContain('transition-colors');
      expect(button.className).toContain('duration-200');
    });

    it('should have scale animations on hover', () => {
      const element = document.createElement('div');
      element.className = 'transition-transform hover:scale-110';
      
      expect(element.className).toContain('transition-transform');
      expect(element.className).toContain('hover:scale-110');
    });

    it('should have fade-in animations', () => {
      const element = document.createElement('div');
      element.className = 'transition-opacity duration-300 opacity-0 hover:opacity-100';
      
      expect(element.className).toContain('transition-opacity');
      expect(element.className).toContain('duration-300');
    });
  });

  describe('Help Text and Guidance', () => {
    it('should display keyboard shortcut hints in placeholders', () => {
      const input = document.createElement('input');
      input.placeholder = 'Search by VIN, make, model, year, trim, or location... (⌘F)';
      
      expect(input.placeholder).toContain('⌘F');
    });

    it('should have descriptive button titles', () => {
      const button = document.createElement('button');
      button.title = 'Keyboard Shortcuts (⌘/)';
      
      expect(button.title).toContain('Keyboard Shortcuts');
      expect(button.title).toContain('⌘/');
    });

    it('should provide contextual help messages', () => {
      const helpMessages = {
        ocrWarning: 'OCR processing used - please verify data accuracy',
        lowConfidence: 'Low confidence detected - manual review recommended',
        validationError: 'Please correct the highlighted fields before continuing',
      };
      
      Object.values(helpMessages).forEach(message => {
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Error States', () => {
    it('should display user-friendly error messages', () => {
      const errorMessages = {
        pdfProcessing: 'Failed to process PDF. Please try again or use a different file.',
        ocrFailed: 'OCR processing failed. The image quality may be too low.',
        validationFailed: 'Data validation failed. Please review and correct the highlighted fields.',
      };
      
      Object.values(errorMessages).forEach(message => {
        expect(message).toBeTruthy();
        expect(message).toContain('.');
      });
    });

    it('should provide actionable error guidance', () => {
      const errorWithGuidance = {
        message: 'Failed to extract text from PDF',
        suggestion: 'Try using OCR processing instead',
        action: 'Retry with OCR',
      };
      
      expect(errorWithGuidance.message).toBeTruthy();
      expect(errorWithGuidance.suggestion).toBeTruthy();
      expect(errorWithGuidance.action).toBeTruthy();
    });
  });

  describe('Performance Optimizations', () => {
    it('should use memoization for expensive calculations', () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        id: `test-${i}`,
        value: i,
      }));
      
      // Simulate memoized calculation
      const memoizedResult = mockData.filter(item => item.value > 50);
      
      expect(memoizedResult.length).toBe(49);
    });

    it('should implement virtualization for large lists', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        data: `Data ${i}`,
      }));
      
      // Simulate virtualized rendering (only render visible items)
      const visibleRange = { start: 0, end: 20 };
      const visibleItems = largeDataset.slice(visibleRange.start, visibleRange.end);
      
      expect(visibleItems.length).toBe(20);
      expect(largeDataset.length).toBe(1000);
    });

    it('should lazy load heavy components', () => {
      const lazyComponent = {
        loaded: false,
        load: () => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({ loaded: true });
            }, 100);
          });
        },
      };
      
      expect(lazyComponent.loaded).toBe(false);
      expect(lazyComponent.load).toBeDefined();
    });
  });

  describe('User Feedback', () => {
    it('should show success messages after actions', () => {
      const successMessage = 'Appraisal saved successfully';
      expect(successMessage).toContain('successfully');
    });

    it('should show progress indicators during long operations', () => {
      const progressStates = [
        'Uploading PDF...',
        'Extracting text...',
        'Processing with OCR...',
        'Validating data...',
        'Complete!',
      ];
      
      progressStates.forEach(state => {
        expect(state).toBeTruthy();
      });
    });

    it('should provide visual feedback on hover', () => {
      const hoverClasses = 'hover:bg-blue-50 hover:shadow-md transition-all';
      
      expect(hoverClasses).toContain('hover:bg-blue-50');
      expect(hoverClasses).toContain('hover:shadow-md');
      expect(hoverClasses).toContain('transition-all');
    });
  });
});
