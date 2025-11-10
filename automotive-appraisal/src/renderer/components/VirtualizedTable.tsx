/**
 * Virtualized Table Component for large datasets
 * Uses windowing technique to render only visible rows
 */

import { memo, useRef, useEffect, useState, useCallback } from 'react';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render: (item: T, index: number) => React.ReactNode;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  overscan?: number;
  onRowClick?: (item: T, index: number) => void;
  selectedRows?: Set<string>;
  onRowSelect?: (id: string) => void;
  getRowId?: (item: T) => string;
  className?: string;
}

/**
 * Virtualized table that only renders visible rows for performance
 */
function VirtualizedTableComponent<T>({
  data,
  columns,
  rowHeight = 60,
  overscan = 3,
  onRowClick,
  selectedRows,
  onRowSelect,
  getRowId,
  className = ''
}: VirtualizedTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    data.length,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );

  const visibleData = data.slice(startIndex, endIndex);
  const totalHeight = data.length * rowHeight;
  const offsetY = startIndex * rowHeight;

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b">
        <div className="flex">
          {selectedRows !== undefined && onRowSelect && (
            <div className="w-12 flex items-center justify-center py-3 border-r">
              <input
                type="checkbox"
                checked={data.length > 0 && selectedRows.size === data.length}
                onChange={() => {
                  // This would be handled by parent component
                }}
                className="rounded"
              />
            </div>
          )}
          {columns.map((column) => (
            <div
              key={column.key}
              className="px-4 py-3 text-left text-sm font-medium text-gray-700"
              style={{ width: column.width || 'auto', flex: column.width ? undefined : 1 }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-auto"
        style={{ height: '600px' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleData.map((item, index) => {
              const actualIndex = startIndex + index;
              const rowId = getRowId ? getRowId(item) : String(actualIndex);
              const isSelected = selectedRows?.has(rowId);

              return (
                <div
                  key={rowId}
                  className={`flex border-b hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                  style={{ height: rowHeight }}
                  onClick={() => onRowClick?.(item, actualIndex)}
                >
                  {selectedRows !== undefined && onRowSelect && (
                    <div className="w-12 flex items-center justify-center border-r">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onRowSelect(rowId);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </div>
                  )}
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className="px-4 py-3 text-sm text-gray-900 flex items-center"
                      style={{ width: column.width || 'auto', flex: column.width ? undefined : 1 }}
                    >
                      {column.render(item, actualIndex)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const VirtualizedTable = memo(VirtualizedTableComponent) as typeof VirtualizedTableComponent;
