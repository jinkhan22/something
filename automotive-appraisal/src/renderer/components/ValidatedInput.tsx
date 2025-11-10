import React, { useEffect, useRef } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { ValidationResult } from '../utils/formValidation';
import { Tooltip } from './Tooltip';

export interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  validation?: ValidationResult;
  helpText?: string;
  tooltip?: string;
  required?: boolean;
  showValidIcon?: boolean;
  autoFocusOnError?: boolean;
  contextInfo?: string;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  validation,
  helpText,
  tooltip,
  required = false,
  showValidIcon = false,
  autoFocusOnError = false,
  contextInfo,
  className = '',
  ...inputProps
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${inputProps.id}-error`;
  const helpId = `${inputProps.id}-help`;
  const contextId = `${inputProps.id}-context`;

  // Auto-focus on error if requested
  useEffect(() => {
    if (autoFocusOnError && validation && !validation.valid && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocusOnError, validation]);

  const hasError = validation && !validation.valid;
  const hasWarning = validation && validation.valid && validation.severity === 'warning';
  const isValid = validation && validation.valid && !hasWarning;

  const getInputClassName = () => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors';
    
    if (hasError) {
      return `${baseClasses} border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50`;
    }
    
    if (hasWarning) {
      return `${baseClasses} border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500 bg-yellow-50`;
    }
    
    if (isValid && showValidIcon) {
      return `${baseClasses} border-green-500 focus:ring-green-500 focus:border-green-500`;
    }
    
    return `${baseClasses} border-gray-300 focus:ring-blue-500 focus:border-blue-500`;
  };

  const describedBy = [
    hasError ? errorId : null,
    helpText ? helpId : null,
    contextInfo ? contextId : null
  ].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-1">
        <label 
          htmlFor={inputProps.id} 
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          )}
        </label>
        {tooltip && (
          <Tooltip content={tooltip}>
            <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
          </Tooltip>
        )}
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={required}
          aria-required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={describedBy || undefined}
          className={getInputClassName()}
          {...inputProps}
        />
        
        {/* Validation icon */}
        {(hasError || hasWarning || (isValid && showValidIcon)) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {hasError && (
              <ExclamationCircleIcon 
                className="w-5 h-5 text-red-500" 
                aria-hidden="true"
              />
            )}
            {hasWarning && (
              <ExclamationCircleIcon 
                className="w-5 h-5 text-yellow-500" 
                aria-hidden="true"
              />
            )}
            {isValid && showValidIcon && (
              <CheckCircleIcon 
                className="w-5 h-5 text-green-500" 
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {hasError && validation.error && (
        <div 
          id={errorId}
          className="mt-1 flex items-start gap-1.5"
          role="alert"
          aria-live="polite"
        >
          <ExclamationCircleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-600 font-medium">
              {validation.error}
            </p>
            {validation.suggestion && (
              <p className="text-xs text-red-500 mt-0.5">
                {validation.suggestion}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Warning message */}
      {hasWarning && validation.error && (
        <div 
          id={errorId}
          className="mt-1 flex items-start gap-1.5"
          role="alert"
          aria-live="polite"
        >
          <ExclamationCircleIcon className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-yellow-700 font-medium">
              {validation.error}
            </p>
            {validation.suggestion && (
              <p className="text-xs text-yellow-600 mt-0.5">
                {validation.suggestion}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Help text */}
      {!hasError && !hasWarning && helpText && (
        <p id={helpId} className="mt-1 text-xs text-gray-500">
          {helpText}
        </p>
      )}

      {/* Context info */}
      {contextInfo && (
        <p id={contextId} className="mt-1 text-xs text-gray-600 font-medium">
          {contextInfo}
        </p>
      )}
    </div>
  );
};

export interface ValidatedSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  validation?: ValidationResult;
  helpText?: string;
  tooltip?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  autoFocusOnError?: boolean;
}

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  label,
  value,
  onChange,
  onBlur,
  validation,
  helpText,
  tooltip,
  required = false,
  options,
  placeholder,
  autoFocusOnError = false,
  className = '',
  ...selectProps
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);
  const errorId = `${selectProps.id}-error`;
  const helpId = `${selectProps.id}-help`;

  // Auto-focus on error if requested
  useEffect(() => {
    if (autoFocusOnError && validation && !validation.valid && selectRef.current) {
      selectRef.current.focus();
    }
  }, [autoFocusOnError, validation]);

  const hasError = validation && !validation.valid;
  const hasWarning = validation && validation.valid && validation.severity === 'warning';

  const getSelectClassName = () => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors bg-white';
    
    if (hasError) {
      return `${baseClasses} border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50`;
    }
    
    if (hasWarning) {
      return `${baseClasses} border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500 bg-yellow-50`;
    }
    
    return `${baseClasses} border-gray-300 focus:ring-blue-500 focus:border-blue-500`;
  };

  const describedBy = [
    hasError ? errorId : null,
    helpText ? helpId : null
  ].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-1">
        <label 
          htmlFor={selectProps.id} 
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          )}
        </label>
        {tooltip && (
          <Tooltip content={tooltip}>
            <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
          </Tooltip>
        )}
      </div>

      <select
        ref={selectRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        required={required}
        aria-required={required}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={describedBy || undefined}
        className={getSelectClassName()}
        {...selectProps}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Error message */}
      {hasError && validation.error && (
        <div 
          id={errorId}
          className="mt-1 flex items-start gap-1.5"
          role="alert"
          aria-live="polite"
        >
          <ExclamationCircleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-600 font-medium">
              {validation.error}
            </p>
            {validation.suggestion && (
              <p className="text-xs text-red-500 mt-0.5">
                {validation.suggestion}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Warning message */}
      {hasWarning && validation.error && (
        <div 
          id={errorId}
          className="mt-1 flex items-start gap-1.5"
          role="alert"
          aria-live="polite"
        >
          <ExclamationCircleIcon className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-yellow-700 font-medium">
              {validation.error}
            </p>
            {validation.suggestion && (
              <p className="text-xs text-yellow-600 mt-0.5">
                {validation.suggestion}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Help text */}
      {!hasError && !hasWarning && helpText && (
        <p id={helpId} className="mt-1 text-xs text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};
