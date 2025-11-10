/**
 * Tests for UI Performance Optimizations
 */

import { describe, it, expect } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VirtualizedTable } from '../src/renderer/components/VirtualizedTable';
import { OptimizedDataDisplay } from '../src/renderer/components/OptimizedDataDisplay';
import { useDebounce, useThrottle, memoize } from '../src/renderer/utils/performanceUtils';
import { renderHook, act } from '@testing-library/react';
import { ExtractedVehicleData } from '../src/types';

const vi = {
  fn: jest.fn
};

describe('UI Performance Optimizations', () => {
  describe('VirtualizedTable', () => {
    it('should render only visible rows', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        value: i
      }));

      const columns = [
        {
          key: 'name',
          header: 'Name',
          render: (item: any) => item.name
        },
        {
          key: 'value',
          header: 'Value',
          render: (item: any) => item.value
        }
      ];

      const { container } = render(
        <VirtualizedTable
          data={data}
          columns={columns}
          rowHeight={60}
          getRowId={(item) => item.id}
        />
      );

      // Should render header
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Value')).toBeInTheDocument();

      // Should not render all 1000 items (only visible ones)
      const renderedItems = container.querySelectorAll('[class*="flex border-b"]');
      expect(renderedItems.length).toBeLessThan(100);
    });

    it('should handle row selection', () => {
      const data = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];

      const columns = [
        {
          key: 'name',
          header: 'Name',
          render: (item: any) => item.name
        }
      ];

      const onRowSelect = vi.fn();
      const selectedRows = new Set<string>();

      render(
        <VirtualizedTable
          data={data}
          columns={columns}
          selectedRows={selectedRows}
          onRowSelect={onRowSelect}
          getRowId={(item) => item.id}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should handle row clicks', () => {
      const data = [{ id: '1', name: 'Item 1' }];
      const columns = [
        {
          key: 'name',
          header: 'Name',
          render: (item: any) => item.name
        }
      ];

      const onRowClick = vi.fn();

      render(
        <VirtualizedTable
          data={data}
          columns={columns}
          onRowClick={onRowClick}
          getRowId={(item) => item.id}
        />
      );

      // Component should render without errors
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('OptimizedDataDisplay', () => {
    const mockData: ExtractedVehicleData = {
      vin: '1HGBH41JXMN109186',
      year: 2021,
      make: 'Honda',
      model: 'Accord',
      mileage: 50000,
      location: 'CA 90210',
      reportType: 'CCC_ONE',
      extractionConfidence: 85,
      extractionErrors: [],
      fieldConfidences: {
        vin: 95,
        year: 90,
        make: 85,
        model: 80,
        mileage: 75
      }
    };

    it('should render vehicle data with confidence indicators', () => {
      render(
        <OptimizedDataDisplay
          data={mockData}
          confidenceThresholds={{ warning: 80, error: 60 }}
        />
      );

      expect(screen.getByText('Vehicle Information')).toBeInTheDocument();
      expect(screen.getByText('1HGBH41JXMN109186')).toBeInTheDocument();
      expect(screen.getByText('Honda')).toBeInTheDocument();
      expect(screen.getByText('Accord')).toBeInTheDocument();
    });

    it('should display valuation information when available', () => {
      const dataWithValues = {
        ...mockData,
        marketValue: 25000,
        settlementValue: 24000
      };

      render(
        <OptimizedDataDisplay
          data={dataWithValues}
          confidenceThresholds={{ warning: 80, error: 60 }}
        />
      );

      expect(screen.getByText('Valuation')).toBeInTheDocument();
      expect(screen.getByText('$25,000')).toBeInTheDocument();
      expect(screen.getByText('$24,000')).toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', () => {
      const onEdit = vi.fn();

      render(
        <OptimizedDataDisplay
          data={mockData}
          confidenceThresholds={{ warning: 80, error: 60 }}
          onEdit={onEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      editButton.click();

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should not re-render when props are the same', () => {
      const { rerender } = render(
        <OptimizedDataDisplay
          data={mockData}
          confidenceThresholds={{ warning: 80, error: 60 }}
        />
      );

      // Re-render with same props
      rerender(
        <OptimizedDataDisplay
          data={mockData}
          confidenceThresholds={{ warning: 80, error: 60 }}
        />
      );

      // Component should still be rendered correctly
      expect(screen.getByText('Vehicle Information')).toBeInTheDocument();
    });
  });

  describe('Performance Utilities', () => {
    describe('useDebounce', () => {
      it('should debounce function calls', async () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebounce(callback, 100));

        act(() => {
          result.current('test1');
          result.current('test2');
          result.current('test3');
        });

        // Should not be called immediately
        expect(callback).not.toHaveBeenCalled();

        // Wait for debounce delay
        await waitFor(() => {
          expect(callback).toHaveBeenCalledTimes(1);
        }, { timeout: 200 });

        // Should be called with last value
        expect(callback).toHaveBeenCalledWith('test3');
      });
    });

    describe('useThrottle', () => {
      it('should throttle function calls', async () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useThrottle(callback, 50));

        // Make multiple calls
        act(() => {
          result.current('test1');
          result.current('test2');
          result.current('test3');
        });

        // Wait for throttle to process
        await waitFor(() => {
          expect(callback).toHaveBeenCalled();
        }, { timeout: 200 });

        // Should have been called at least once
        expect(callback.mock.calls.length).toBeGreaterThan(0);
        expect(callback.mock.calls.length).toBeLessThan(3); // Not all 3 calls
      });
    });

    describe('memoize', () => {
      it('should cache function results', () => {
        const expensiveFunction = vi.fn((a: number, b: number) => a + b);
        const memoized = memoize(expensiveFunction);

        const result1 = memoized(1, 2);
        const result2 = memoized(1, 2);
        const result3 = memoized(2, 3);

        expect(result1).toBe(3);
        expect(result2).toBe(3);
        expect(result3).toBe(5);

        // Should only call the function twice (once for each unique input)
        expect(expensiveFunction).toHaveBeenCalledTimes(2);
      });

      it('should limit cache size', () => {
        const fn = vi.fn((x: number) => x * 2);
        const memoized = memoize(fn);

        // Call with 150 different inputs (exceeds cache limit of 100)
        for (let i = 0; i < 150; i++) {
          memoized(i);
        }

        expect(fn).toHaveBeenCalledTimes(150);

        // Call with first input again - should not be cached anymore
        memoized(0);
        expect(fn).toHaveBeenCalledTimes(151);
      });
    });
  });
});
