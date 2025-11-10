/**
 * Optimized Data Display Component with memoization
 * Prevents unnecessary re-renders for expensive operations
 */

import { memo } from 'react';
import { ExtractedVehicleData } from '../../types';

interface OptimizedDataDisplayProps {
  data: ExtractedVehicleData;
  confidenceThresholds: {
    warning: number;
    error: number;
  };
  onEdit?: () => void;
}

/**
 * Memoized field display component
 */
const DataField = memo(({ 
  label, 
  value, 
  confidence 
}: { 
  label: string; 
  value: string | number; 
  confidence?: number;
}) => {
  const getConfidenceColor = (conf?: number) => {
    if (conf === undefined) return 'bg-gray-100';
    if (conf >= 80) return 'bg-green-100 border-green-300';
    if (conf >= 60) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  return (
    <div className={`border rounded-lg p-4 ${getConfidenceColor(confidence)}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
      {confidence !== undefined && (
        <p className="text-xs text-gray-600 mt-1">Confidence: {confidence}%</p>
      )}
    </div>
  );
});

DataField.displayName = 'DataField';

/**
 * Optimized data display with memoization
 */
function OptimizedDataDisplayComponent({
  data,
  confidenceThresholds,
  onEdit
}: OptimizedDataDisplayProps) {
  const fieldConfidences = data.fieldConfidences || {};

  return (
    <div className="space-y-6">
      {/* Vehicle Information */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Vehicle Information</h2>
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataField label="VIN" value={data.vin} confidence={fieldConfidences.vin} />
          <DataField label="Year" value={data.year} confidence={fieldConfidences.year} />
          <DataField label="Make" value={data.make} confidence={fieldConfidences.make} />
          <DataField label="Model" value={data.model} confidence={fieldConfidences.model} />
          {data.trim && (
            <DataField label="Trim" value={data.trim} confidence={fieldConfidences.trim} />
          )}
          <DataField 
            label="Mileage" 
            value={`${data.mileage.toLocaleString()} miles`} 
            confidence={fieldConfidences.mileage} 
          />
          <DataField label="Location" value={data.location} confidence={fieldConfidences.location} />
        </div>
      </div>

      {/* Valuation */}
      {(data.marketValue || data.settlementValue) && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Valuation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.marketValue && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <p className="text-sm text-gray-500 mb-1">Market Value</p>
                <p className="text-2xl font-bold text-blue-900">
                  ${data.marketValue.toLocaleString()}
                </p>
              </div>
            )}
            {data.settlementValue && (
              <div className="border rounded-lg p-4 bg-green-50">
                <p className="text-sm text-gray-500 mb-1">Settlement Value</p>
                <p className="text-2xl font-bold text-green-900">
                  ${data.settlementValue.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const OptimizedDataDisplay = memo(OptimizedDataDisplayComponent);
