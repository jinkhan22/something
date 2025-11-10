import React, { useEffect, useRef } from 'react';

export interface ValidationErrorProps {
  message: string;
  fieldId?: string;
  scrollToError?: boolean;
  className?: string;
}

/**
 * ValidationError Component
 * 
 * Displays validation error messages with red highlighting.
 * Optionally scrolls to the error when displayed.
 */
export const ValidationError: React.FC<ValidationErrorProps> = ({
  message,
  fieldId,
  scrollToError = false,
  className = ''
}) => {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToError && errorRef.current) {
      // Scroll to error with smooth behavior
      errorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      // Also try to focus the associated field if fieldId is provided
      if (fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
          // Small delay to ensure scroll completes first
          setTimeout(() => {
            field.focus();
            // Add red border to field
            field.classList.add('border-red-500', 'ring-2', 'ring-red-200');
          }, 300);
        }
      }
    }
  }, [scrollToError, fieldId]);

  return (
    <div
      ref={errorRef}
      className={`flex items-start gap-2 p-3 bg-red-50 border border-red-300 rounded-md text-red-800 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <svg
        className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

export interface ValidationErrorListProps {
  errors: Array<{ field?: string; message: string; fieldId?: string }>;
  scrollToFirst?: boolean;
  className?: string;
}

/**
 * ValidationErrorList Component
 * 
 * Displays a list of validation errors.
 * Scrolls to the first error when displayed.
 */
export const ValidationErrorList: React.FC<ValidationErrorListProps> = ({
  errors,
  scrollToFirst = true,
  className = ''
}) => {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {errors.map((error, index) => (
        <ValidationError
          key={index}
          message={error.message}
          fieldId={error.fieldId}
          scrollToError={scrollToFirst && index === 0}
        />
      ))}
    </div>
  );
};

/**
 * Hook to manage field validation errors
 */
export const useFieldValidation = () => {
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const setFieldError = (fieldId: string, message: string) => {
    setFieldErrors(prev => ({ ...prev, [fieldId]: message }));
    
    // Add error styling to field
    const field = document.getElementById(fieldId);
    if (field) {
      field.classList.add('border-red-500', 'ring-2', 'ring-red-200');
    }
  };

  const clearFieldError = (fieldId: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
    
    // Remove error styling from field
    const field = document.getElementById(fieldId);
    if (field) {
      field.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
    }
  };

  const clearAllErrors = () => {
    // Remove error styling from all fields
    Object.keys(fieldErrors).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
      }
    });
    
    setFieldErrors({});
  };

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return {
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    hasErrors
  };
};

/**
 * Inline validation error for form fields
 */
export interface InlineValidationErrorProps {
  message?: string;
  show?: boolean;
}

export const InlineValidationError: React.FC<InlineValidationErrorProps> = ({
  message,
  show = true
}) => {
  if (!show || !message) {
    return null;
  }

  return (
    <p className="mt-1 text-sm text-red-600" role="alert">
      {message}
    </p>
  );
};
