import React, { useMemo } from 'react';
import { CheckIcon, DocumentTextIcon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface ProgressStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

interface ProgressIndicatorProps {
  currentStep: 1 | 2 | 3;
  pdfProcessed: boolean;
  comparablesCount: number;
  appraisalCompleted: boolean;
  className?: string;
}

// Memoized step classes to avoid recalculation
const STEP_CLASSES = {
  completed: {
    circle: 'bg-success-600 border-success-600',
    text: 'text-success-600',
    icon: 'text-white'
  },
  active: {
    circle: 'bg-primary-600 border-primary-600',
    text: 'text-primary-600',
    icon: 'text-white'
  },
  pending: {
    circle: 'bg-gray-300 border-gray-300',
    text: 'text-gray-400',
    icon: 'text-gray-500'
  }
} as const;

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = React.memo(({
  currentStep,
  pdfProcessed,
  comparablesCount,
  appraisalCompleted,
  className = ''
}) => {
  const steps: ProgressStep[] = useMemo(() => [
    {
      id: 1,
      title: 'Upload and process PDF report',
      description: 'Extract vehicle data from valuation report',
      completed: pdfProcessed,
      active: currentStep === 1,
      icon: DocumentTextIcon
    },
    {
      id: 2,
      title: `Add comparable vehicles (${comparablesCount} added)`,
      description: 'Build market analysis with comparable sales',
      completed: comparablesCount > 0,
      active: currentStep === 2,
      icon: PlusIcon
    },
    {
      id: 3,
      title: 'Complete and save appraisal',
      description: 'Finalize your market value analysis',
      completed: appraisalCompleted,
      active: currentStep === 3,
      icon: CheckCircleIcon
    }
  ], [currentStep, pdfProcessed, comparablesCount, appraisalCompleted]);

  const completedCount = useMemo(() => 
    steps.filter(s => s.completed).length,
    [steps]
  );

  const progressPercentage = useMemo(() => 
    Math.round((completedCount / steps.length) * 100),
    [completedCount, steps.length]
  );

  const getStepStatus = (step: ProgressStep): keyof typeof STEP_CLASSES => {
    if (step.completed) return 'completed';
    if (step.active) return 'active';
    return 'pending';
  };

  return (
    <div className={`bg-gradient-subtle border border-primary-200 rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-primary-900">Appraisal Progress</h3>
        <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded-full">
          Step {currentStep} of 3
        </span>
      </div>
      
      <div className="space-y-3">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const classes = STEP_CLASSES[status];
          const IconComponent = step.icon;
          
          return (
            <div key={step.id} className="flex items-start">
              {/* Step indicator */}
              <div className="flex-shrink-0 relative">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-base ${classes.circle}`}>
                  {step.completed ? (
                    <CheckIcon className="w-4 h-4 text-white" aria-hidden="true" />
                  ) : (
                    <IconComponent className={`w-4 h-4 ${classes.icon}`} aria-hidden="true" />
                  )}
                </div>
                
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute top-8 left-4 w-0.5 h-6 bg-gray-300 transform -translate-x-0.5" aria-hidden="true" />
                )}
              </div>
              
              {/* Step content */}
              <div className="ml-4 flex-1 min-w-0">
                <div className={`text-sm font-medium transition-base ${classes.text}`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {step.description}
                </div>
                
                {/* Additional status indicators */}
                {step.id === 2 && comparablesCount > 0 && (
                  <div className="mt-1.5">
                    <span className={`badge ${
                      comparablesCount >= 3 
                        ? 'badge-success' 
                        : 'badge-warning'
                    }`}>
                      {comparablesCount >= 3 
                        ? '✓ Sufficient data' 
                        : `Add ${3 - comparablesCount} more`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Overall progress bar */}
      <div className="mt-4 pt-3 border-t border-primary-200">
        <div className="flex items-center justify-between text-xs font-medium text-primary-700 mb-2">
          <span>Overall Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="progress-bar bg-primary-200">
          <div 
            className="progress-bar-fill bg-gradient-primary"
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall appraisal progress"
          />
        </div>
      </div>
    </div>
  );
});