/**
 * Calculation Loading Overlay Component
 * Shows a spinner overlay during market value calculations with progress indication
 */

import React, { useState, useEffect } from 'react';
import { LoadingAnimation } from './LoadingAnimation';

interface CalculationLoadingOverlayProps {
  isCalculating: boolean;
  message?: string;
  showProgress?: boolean;
  className?: string;
}

export function CalculationLoadingOverlay({
  isCalculating,
  message = 'Calculating market value...',
  showProgress = true,
  className = ''
}: CalculationLoadingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(false);

  // Show progress bar if calculation takes more than 1 second
  useEffect(() => {
    if (!isCalculating) {
      setProgress(0);
      setShowProgressBar(false);
      return;
    }

    const progressTimer = setTimeout(() => {
      setShowProgressBar(true);
    }, 1000);

    return () => clearTimeout(progressTimer);
  }, [isCalculating]);

  // Simulate progress for better UX
  useEffect(() => {
    if (!isCalculating || !showProgressBar) {
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        // Progress slows down as it approaches 90%
        if (prev < 60) return prev + 10;
        if (prev < 80) return prev + 5;
        if (prev < 90) return prev + 2;
        return prev;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isCalculating, showProgressBar]);

  if (!isCalculating) {
    return null;
  }

  return (
    <div 
      className={`absolute inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-20 rounded-lg transition-opacity duration-200 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="text-center space-y-4 max-w-xs">
        <LoadingAnimation size="lg" variant="spinner" color="blue" />
        
        <div className="space-y-2">
          <p className="text-base font-medium text-gray-700">{message}</p>
          
          {showProgress && showProgressBar && (
            <div className="space-y-1">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                Analyzing {progress < 30 ? 'comparables' : progress < 60 ? 'adjustments' : progress < 90 ? 'market data' : 'final calculations'}...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline calculation indicator for smaller spaces
 */
export function InlineCalculationIndicator({ 
  message = 'Calculating...',
  size = 'sm' 
}: { 
  message?: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <LoadingAnimation size={size} variant="spinner" color="blue" />
      <span className={`${size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-sm' : 'text-base'}`}>
        {message}
      </span>
    </div>
  );
}

/**
 * Card-level calculation overlay
 */
export function CardCalculationOverlay({ 
  isCalculating,
  message = 'Recalculating...'
}: {
  isCalculating: boolean;
  message?: string;
}) {
  if (!isCalculating) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
      <InlineCalculationIndicator message={message} size="sm" />
    </div>
  );
}
