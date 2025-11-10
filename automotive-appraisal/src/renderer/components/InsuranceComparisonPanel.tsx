import React from 'react';

interface InsuranceComparisonPanelProps {
  insuranceValue: number;
  calculatedValue: number;
  difference: number;
  differencePercentage: number;
}

export const InsuranceComparisonPanel: React.FC<InsuranceComparisonPanelProps> = ({
  insuranceValue,
  calculatedValue,
  difference,
  differencePercentage,
}) => {
  const isUndervalued = difference > 0 && differencePercentage > 20;
  const isSignificant = Math.abs(differencePercentage) > 5;
  
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getDifferenceColor = (): string => {
    if (Math.abs(differencePercentage) < 5) return 'text-gray-600';
    if (difference > 0) return 'text-red-600';
    return 'text-green-600';
  };

  const getBarColor = (): string => {
    if (Math.abs(differencePercentage) < 5) return 'bg-gray-400';
    if (difference > 0) return 'bg-red-500';
    return 'bg-green-500';
  };

  const getBarWidth = (): number => {
    const maxValue = Math.max(insuranceValue, calculatedValue);
    return Math.min((Math.abs(difference) / maxValue) * 100, 100);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Insurance vs Market Value Comparison
        </h3>
        {isUndervalued && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            ⚠️ Potential Undervaluation
          </span>
        )}
      </div>

      {/* Side-by-side value comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600 mb-1">
            Insurance Value
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(insuranceValue)}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600 mb-1">
            Calculated Market Value
          </div>
          <div className="text-2xl font-bold text-green-900">
            {formatCurrency(calculatedValue)}
          </div>
        </div>
      </div>

      {/* Visual difference indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Value Difference
          </span>
          <div className="text-right">
            <div className={`text-lg font-bold ${getDifferenceColor()}`}>
              {formatCurrency(Math.abs(difference))}
            </div>
            <div className={`text-sm ${getDifferenceColor()}`}>
              {formatPercentage(differencePercentage)}
            </div>
          </div>
        </div>

        {/* Bar chart visualization */}
        <div className="relative">
          <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor()} transition-all duration-500 ease-out flex items-center justify-end pr-2`}
              style={{ width: `${getBarWidth()}%` }}
            >
              {getBarWidth() > 15 && (
                <span className="text-xs font-medium text-white">
                  {formatPercentage(Math.abs(differencePercentage))}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interpretation message */}
      <div className="border-t pt-4">
        {isUndervalued ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">
                  Significant Undervaluation Detected
                </h4>
                <p className="mt-1 text-sm text-red-700">
                  The insurance valuation is {formatPercentage(differencePercentage)} lower
                  than the calculated market value based on comparable vehicles. This
                  represents a difference of {formatCurrency(difference)}.
                </p>
              </div>
            </div>
          </div>
        ) : isSignificant ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Notable Difference
                </h4>
                <p className="mt-1 text-sm text-yellow-700">
                  There is a {formatPercentage(Math.abs(differencePercentage))} difference
                  between the insurance value and calculated market value. This may warrant
                  further review.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">
                  Values Closely Aligned
                </h4>
                <p className="mt-1 text-sm text-green-700">
                  The insurance valuation and calculated market value are within{' '}
                  {formatPercentage(Math.abs(differencePercentage))} of each other,
                  indicating good alignment.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick facts */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Facts</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Absolute Difference:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatCurrency(Math.abs(difference))}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Percentage Difference:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatPercentage(Math.abs(differencePercentage))}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Higher Value:</span>
            <span className="ml-2 font-medium text-gray-900">
              {difference > 0 ? 'Market Analysis' : difference < 0 ? 'Insurance' : 'Equal'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Status:</span>
            <span className="ml-2 font-medium text-gray-900">
              {isUndervalued
                ? 'Undervalued'
                : isSignificant
                ? 'Review Needed'
                : 'Aligned'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
