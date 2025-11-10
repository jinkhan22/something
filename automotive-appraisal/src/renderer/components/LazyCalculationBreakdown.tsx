import React, { Suspense, lazy } from 'react';
import { MarketAnalysis } from '../../types';

// Lazy load the CalculationBreakdownView component
const CalculationBreakdownView = lazy(() => 
  import('./CalculationBreakdownView').then(module => ({
    default: module.default || module.CalculationBreakdownView
  }))
);

interface LazyCalculationBreakdownProps {
  marketAnalysis: MarketAnalysis;
  expandAll?: boolean;
}

/**
 * Lazy-loaded wrapper for CalculationBreakdownView
 * Only loads the component when it's actually rendered
 */
export const LazyCalculationBreakdown: React.FC<LazyCalculationBreakdownProps> = ({
  marketAnalysis,
  expandAll = false
}) => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading calculation details...</span>
        </div>
      }
    >
      <CalculationBreakdownView
        marketAnalysis={marketAnalysis}
        expandAll={expandAll}
      />
    </Suspense>
  );
};

export default LazyCalculationBreakdown;
