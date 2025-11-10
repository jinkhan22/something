/**
 * Enhanced Loading Animation Component
 * Provides smooth loading animations for various states with improved UX
 */

import React from 'react';

interface LoadingAnimationProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress';
  progress?: number; // For progress variant (0-100)
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'gray' | 'white';
}

export function LoadingAnimation({ 
  size = 'md', 
  text,
  variant = 'spinner',
  progress = 0,
  className = '',
  color = 'blue'
}: LoadingAnimationProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const colorClasses = {
    blue: 'text-blue-500 border-blue-500 bg-blue-500',
    green: 'text-green-500 border-green-500 bg-green-500',
    purple: 'text-purple-500 border-purple-500 bg-purple-500',
    gray: 'text-gray-500 border-gray-500 bg-gray-500',
    white: 'text-white border-white bg-white',
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  if (variant === 'skeleton') {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (variant === 'progress') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 ${colorClasses[color]} rounded-full transition-all duration-300 ease-out`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          ></div>
        </div>
        {text && (
          <p className={`${textSizeClasses[size]} text-gray-600 text-center`}>
            {text} {progress > 0 && `(${Math.round(progress)}%)`}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <div className="flex gap-2">
          <div 
            className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} 
            style={{ animationDelay: '0ms' }}
          ></div>
          <div 
            className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} 
            style={{ animationDelay: '150ms' }}
          ></div>
          <div 
            className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} 
            style={{ animationDelay: '300ms' }}
          ></div>
        </div>
        {text && <p className={`${textSizeClasses[size]} text-gray-600 animate-pulse text-center`}>{text}</p>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse`}></div>
        {text && <p className={`${textSizeClasses[size]} text-gray-600 animate-pulse text-center`}>{text}</p>}
      </div>
    );
  }

  // Default spinner variant with enhanced styling
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-current ${colorClasses[color]} rounded-full animate-spin`}></div>
      {text && <p className={`${textSizeClasses[size]} text-gray-600 text-center`}>{text}</p>}
    </div>
  );
}

// Specialized loading components for common use cases
export function InlineLoader({ size = 'sm', color = 'blue' }: Pick<LoadingAnimationProps, 'size' | 'color'>) {
  return <LoadingAnimation size={size} variant="spinner" color={color} className="inline-flex" />;
}

export function SkeletonLoader({ className = '' }: { className?: string }) {
  return <LoadingAnimation variant="skeleton" className={className} />;
}

export function ProgressLoader({ progress, text, color = 'blue' }: { progress: number; text?: string; color?: LoadingAnimationProps['color'] }) {
  return <LoadingAnimation variant="progress" progress={progress} text={text} color={color} />;
}
