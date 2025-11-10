/**
 * Integration Enhancements Component
 * Provides smooth transitions, loading states, and success notifications
 * for the comparable vehicles analysis workflow
 */

import React, { useState, useEffect } from 'react';
import { LoadingAnimation, ProgressLoader } from './LoadingAnimation';
import { notifications } from '../utils/notifications';

interface IntegrationEnhancementsProps {
  children: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  progress?: number;
  onComplete?: () => void;
}

export function IntegrationEnhancements({
  children,
  isLoading = false,
  loadingText = 'Processing...',
  progress,
  onComplete
}: IntegrationEnhancementsProps) {
  const [showContent, setShowContent] = useState(!isLoading);

  useEffect(() => {
    if (!isLoading && !showContent) {
      // Smooth transition when loading completes
      const timer = setTimeout(() => {
        setShowContent(true);
        onComplete?.();
      }, 150);
      return () => clearTimeout(timer);
    } else if (isLoading && showContent) {
      setShowContent(false);
    }
  }, [isLoading, showContent, onComplete]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-8">
        {progress !== undefined ? (
          <ProgressLoader 
            progress={progress} 
            text={loadingText}
            color="blue"
          />
        ) : (
          <LoadingAnimation 
            size="lg" 
            text={loadingText} 
            variant="dots"
            color="blue"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 ease-in-out ${
      showContent ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
    }`}>
      {children}
    </div>
  );
}

/**
 * Success State Component
 * Shows success animations and messages
 */
interface SuccessStateProps {
  title: string;
  description?: string;
  onContinue?: () => void;
  onStartNew?: () => void;
  continueText?: string;
  startNewText?: string;
  icon?: React.ReactNode;
}

export function SuccessState({
  title,
  description,
  onContinue,
  onStartNew,
  continueText = 'Continue',
  startNewText = 'Start New',
  icon
}: SuccessStateProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in after mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`transition-all duration-500 ease-out ${
      isVisible ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-95'
    }`}>
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            {icon || (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-green-900">{title}</h3>
            {description && (
              <p className="text-green-700 max-w-md">{description}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {onContinue && (
              <button
                onClick={onContinue}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {continueText}
              </button>
            )}
            {onStartNew && (
              <button
                onClick={onStartNew}
                className="px-6 py-2 bg-white text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {startNewText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Smooth Section Transition Component
 * Provides smooth transitions between different sections
 */
interface SectionTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function SectionTransition({
  children,
  isVisible,
  delay = 0,
  direction = 'up'
}: SectionTransitionProps) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible && !shouldRender) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsAnimating(true), delay);
      return () => clearTimeout(timer);
    } else if (!isVisible && shouldRender) {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender, delay]);

  const getTransformClasses = () => {
    const transforms = {
      up: isAnimating ? 'translate-y-0' : 'translate-y-4',
      down: isAnimating ? 'translate-y-0' : '-translate-y-4',
      left: isAnimating ? 'translate-x-0' : 'translate-x-4',
      right: isAnimating ? 'translate-x-0' : '-translate-x-4'
    };
    return transforms[direction];
  };

  if (!shouldRender) return null;

  return (
    <div className={`transition-all duration-300 ease-out ${
      isAnimating ? 'opacity-100' : 'opacity-0'
    } transform ${getTransformClasses()}`}>
      {children}
    </div>
  );
}

/**
 * Action Feedback Component
 * Provides immediate visual feedback for user actions
 */
interface ActionFeedbackProps {
  action: 'save' | 'delete' | 'update' | 'calculate' | 'export';
  isLoading: boolean;
  onComplete?: () => void;
  children: React.ReactNode;
}

export function ActionFeedback({
  action,
  isLoading,
  onComplete,
  children
}: ActionFeedbackProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && showSuccess) {
      // Show success notification
      notifications.actionSuccess(action);
      onComplete?.();
      
      // Reset success state
      const timer = setTimeout(() => setShowSuccess(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, showSuccess, action, onComplete]);

  useEffect(() => {
    if (isLoading) {
      setShowSuccess(false);
    } else if (!isLoading && !showSuccess) {
      setShowSuccess(true);
    }
  }, [isLoading, showSuccess]);

  return (
    <div className={`transition-all duration-200 ${
      isLoading ? 'opacity-75 pointer-events-none' : 'opacity-100'
    }`}>
      {children}
    </div>
  );
}

/**
 * Staggered Animation Container
 * Animates children with staggered delays
 */
interface StaggeredAnimationProps {
  children: React.ReactNode[];
  delay?: number;
  isVisible?: boolean;
}

export function StaggeredAnimation({
  children,
  delay = 100,
  isVisible = true
}: StaggeredAnimationProps) {
  const [visibleItems, setVisibleItems] = useState<boolean[]>([]);

  useEffect(() => {
    if (isVisible) {
      children.forEach((_, index) => {
        setTimeout(() => {
          setVisibleItems(prev => {
            const newVisible = [...prev];
            newVisible[index] = true;
            return newVisible;
          });
        }, index * delay);
      });
    } else {
      setVisibleItems([]);
    }
  }, [children, delay, isVisible]);

  return (
    <>
      {children.map((child, index) => (
        <div
          key={index}
          className={`transition-all duration-300 ease-out ${
            visibleItems[index] 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-2'
          }`}
        >
          {child}
        </div>
      ))}
    </>
  );
}