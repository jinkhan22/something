import React, { useMemo } from 'react';
import { ComparableVehicle } from '../../types';
import { useAppStore } from '../store';

interface PaginatedComparableListProps {
  comparables: ComparableVehicle[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSort?: (field: keyof ComparableVehicle, direction: 'asc' | 'desc') => void;
  sortField?: keyof ComparableVehicle;
  sortDirection?: 'asc' | 'desc';
  renderComparable: (comparable: ComparableVehicle) => React.ReactNode;
}

/**
 * Paginated list component for displaying comparables
 * Automatically paginates when there are more than 20 items
 */
export const PaginatedComparableList: React.FC<PaginatedComparableListProps> = ({
  comparables,
  onEdit,
  onDelete,
  onSort,
  sortField,
  sortDirection,
  renderComparable
}) => {
  const { comparablesPagination, setComparablesPagination } = useAppStore();
  const { currentPage, pageSize, totalPages } = comparablesPagination;

  // Calculate paginated comparables
  const paginatedComparables = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return comparables.slice(startIndex, endIndex);
  }, [comparables, currentPage, pageSize]);

  // Update pagination when comparables change
  React.useEffect(() => {
    const newTotalPages = Math.ceil(comparables.length / pageSize);
    if (newTotalPages !== totalPages) {
      setComparablesPagination(
        Math.min(currentPage, newTotalPages || 1),
        pageSize
      );
    }
  }, [comparables.length, pageSize, currentPage, totalPages, setComparablesPagination]);

  const handlePageChange = (newPage: number) => {
    setComparablesPagination(newPage, pageSize);
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setComparablesPagination(1, newPageSize);
  };

  // Don't show pagination for small lists
  const showPagination = comparables.length > 20;

  return (
    <div className="space-y-4">
      {/* Pagination controls - top */}
      {showPagination && (
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, comparables.length)} of{' '}
              {comparables.length} comparables
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="pageSize" className="text-sm text-gray-600">
              Per page:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Comparable list */}
      <div className="space-y-2">
        {paginatedComparables.map((comparable) => (
          <div key={comparable.id}>{renderComparable(comparable)}</div>
        ))}
      </div>

      {/* Empty state */}
      {comparables.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No comparables found. Add some to get started.
        </div>
      )}

      {/* Pagination controls - bottom */}
      {showPagination && (
        <div className="flex items-center justify-center space-x-2 border-t pt-4">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            aria-label="First page"
          >
            «
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            aria-label="Previous page"
          >
            ‹
          </button>

          {/* Page numbers */}
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 border rounded ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-50'
                  }`}
                  aria-label={`Page ${pageNum}`}
                  aria-current={currentPage === pageNum ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            aria-label="Next page"
          >
            ›
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            aria-label="Last page"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
};

export default PaginatedComparableList;
