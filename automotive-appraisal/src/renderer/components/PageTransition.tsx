import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingAnimation } from './LoadingAnimation';

interface PageTransitionProps {
  children: React.ReactNode;
  variant?: 'fade' | 'slide' | 'scale';
  duration?: number;
  showLoader?: boolean;
}

/**
 * Enhanced PageTransition component with multiple animation variants
 * and improved loading states
 */
export function PageTransition({ 
  children, 
  variant = 'fade',
  duration = 200,
  showLoader = false
}: PageTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'entering' | 'entered' | 'exiting' | 'exited'>('entered');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('exiting');
      if (showLoader) {
        setIsLoading(true);
      }
    }
  }, [location, displayLocation, showLoader]);

  const onTransitionEnd = () => {
    if (transitionStage === 'exiting') {
      setTransitionStage('entering');
      setDisplayLocation(location);
      
      // Simulate brief loading for smooth UX
      if (showLoader) {
        setTimeout(() => {
          setIsLoading(false);
          setTransitionStage('entered');
        }, 100);
      } else {
        setTransitionStage('entered');
      }
    }
  };

  const getTransitionClasses = () => {
    const baseClasses = `transition-all duration-${duration} ease-in-out`;
    
    switch (variant) {
      case 'slide':
        return `${baseClasses} ${
          transitionStage === 'exiting' 
            ? 'transform translate-x-full opacity-0' 
            : transitionStage === 'entering'
            ? 'transform -translate-x-full opacity-0'
            : 'transform translate-x-0 opacity-100'
        }`;
      
      case 'scale':
        return `${baseClasses} ${
          transitionStage === 'exiting' || transitionStage === 'entering'
            ? 'transform scale-95 opacity-0' 
            : 'transform scale-100 opacity-100'
        }`;
      
      default: // fade
        return `${baseClasses} ${
          transitionStage === 'exiting' || transitionStage === 'entering'
            ? 'opacity-0' 
            : 'opacity-100'
        }`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingAnimation 
          size="lg" 
          text="Loading page..." 
          variant="dots"
          color="blue"
        />
      </div>
    );
  }

  return (
    <div
      className={getTransitionClasses()}
      onTransitionEnd={onTransitionEnd}
      style={{ 
        transitionDuration: `${duration}ms`,
        minHeight: '200px' // Prevent layout shift
      }}
    >
      {children}
    </div>
  );
}
