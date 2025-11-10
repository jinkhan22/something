/**
 * Success Feedback Components
 * Provides visual confirmation of successful actions with animations
 */

import React, { useState, useEffect } from 'react';

interface HighlightedValueProps {
  value: string | number;
  label?: string;
  highlight?: boolean;
  duration?: number;
  className?: string;
}

/**
 * Highlighted value component with fade-in animation
 * Used to draw attention to newly calculated values
 */
export function HighlightedValue({
  value,
  label,
  highlight = false,
  duration = 2000,
  className = ''
}: HighlightedValueProps) {
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    if (highlight) {
      setIsHighlighted(true);
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [highlight, duration, value]);

  return (
    <div className={`transition-all duration-500 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-500 block mb-1">
          {label}
        </label>
      )}
      <div
        className={`
          inline-block px-4 py-2 rounded-lg transition-all duration-500
          ${isHighlighted 
            ? 'bg-green-100 border-2 border-green-400 shadow-lg scale-105' 
            : 'bg-transparent border-2 border-transparent'
          }
        `}
      >
        <span className={`
          text-2xl font-bold transition-colors duration-500
          ${isHighlighted ? 'text-green-700' : 'text-gray-900'}
        `}>
          {value}
        </span>
      </div>
    </div>
  );
}

interface SuccessBadgeProps {
  show: boolean;
  message?: string;
  duration?: number;
  onComplete?: () => void;
}

/**
 * Success badge that appears temporarily
 */
export function SuccessBadge({
  show,
  message = 'Updated',
  duration = 3000,
  onComplete
}: SuccessBadgeProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}

interface AnimatedCardProps {
  children: React.ReactNode;
  highlight?: boolean;
  className?: string;
}

/**
 * Card wrapper with highlight animation
 */
export function AnimatedCard({
  children,
  highlight = false,
  className = ''
}: AnimatedCardProps) {
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    if (highlight) {
      setIsHighlighted(true);
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlight]);

  return (
    <div
      className={`
        transition-all duration-500
        ${isHighlighted 
          ? 'ring-2 ring-green-400 shadow-xl scale-[1.02]' 
          : 'ring-0 ring-transparent'
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface PulseIndicatorProps {
  show: boolean;
  color?: 'green' | 'blue' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Pulse indicator for drawing attention
 */
export function PulseIndicator({
  show,
  color = 'green',
  size = 'md'
}: PulseIndicatorProps) {
  if (!show) {
    return null;
  }

  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500'
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <span className="relative inline-flex">
      <span className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}></span>
      <span className={`absolute inline-flex h-full w-full rounded-full ${colorClasses[color]} opacity-75 animate-ping`}></span>
    </span>
  );
}

interface SuccessCheckmarkProps {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Animated checkmark for success confirmation
 */
export function SuccessCheckmark({
  show,
  size = 'md',
  className = ''
}: SuccessCheckmarkProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  if (!show) {
    return null;
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-50 duration-300`}>
        <svg className="w-2/3 h-2/3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}
