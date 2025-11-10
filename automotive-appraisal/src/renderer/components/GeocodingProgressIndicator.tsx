import React from 'react';
import { useAppStore } from '../store';

/**
 * Progress indicator for background geocoding operations
 * Shows when geocoding is in progress and displays completion percentage
 */
export const GeocodingProgressIndicator: React.FC = () => {
  const { geocodingProgress } = useAppStore();
  const { total, completed, inProgress } = geocodingProgress;

  if (!inProgress || total === 0) {
    return null;
  }

  const percentage = Math.round((completed / total) * 100);

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="animate-spin h-5 w-5 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            Geocoding locations...
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {completed} of {total} locations processed
          </p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">
              {percentage}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeocodingProgressIndicator;
