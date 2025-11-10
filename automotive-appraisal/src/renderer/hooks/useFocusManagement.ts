/**
 * Focus Management Hook
 * Provides utilities for managing focus in forms and components
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { setFocus, trapFocusInModal } from '../utils/accessibility';

interface UseFocusManagementOptions {
  autoFocus?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
}

export function useFocusManagement(options: UseFocusManagementOptions = {}) {
  const { autoFocus = false, trapFocus = false, restoreFocus = true } = options;
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Auto-focus first focusable element on mount
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      const firstFocusable = containerRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      setFocus(firstFocusable, 100);
    }
  }, [autoFocus]);

  // Trap focus within container (for modals)
  useEffect(() => {
    if (trapFocus && containerRef.current) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const cleanup = trapFocusInModal(containerRef.current);
      return cleanup;
    }
  }, [trapFocus]);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (restoreFocus && previousFocusRef.current) {
        setFocus(previousFocusRef.current, 0);
      }
    };
  }, [restoreFocus]);

  const focusFirstError = useCallback(() => {
    if (!containerRef.current) return;
    
    const firstError = containerRef.current.querySelector<HTMLElement>(
      '[aria-invalid="true"], .error input, .error select, .error textarea'
    );
    
    if (firstError) {
      setFocus(firstError, 100);
    }
  }, []);

  const focusElement = useCallback((selector: string) => {
    if (!containerRef.current) return;
    
    const element = containerRef.current.querySelector<HTMLElement>(selector);
    setFocus(element, 0);
  }, []);

  return {
    containerRef,
    focusFirstError,
    focusElement,
  };
}

/**
 * Hook for managing focus in forms with validation
 */
export function useFormFocusManagement() {
  const firstErrorRef = useRef<HTMLElement>(null);

  const setFirstErrorRef = useCallback((element: HTMLElement | null) => {
    if (element && !firstErrorRef.current) {
      firstErrorRef.current = element;
    }
  }, []);

  const focusFirstError = useCallback(() => {
    if (firstErrorRef.current) {
      firstErrorRef.current.focus();
      firstErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const clearFirstError = useCallback(() => {
    firstErrorRef.current = null;
  }, []);

  return {
    setFirstErrorRef,
    focusFirstError,
    clearFirstError,
  };
}

/**
 * Hook for managing focus in lists with keyboard navigation
 */
export function useListFocusManagement<T>(items: T[]) {
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const listRef = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
    }
  }, [items.length]);

  useEffect(() => {
    if (listRef.current) {
      const focusableItems = listRef.current.querySelectorAll<HTMLElement>('[data-list-item]');
      const itemToFocus = focusableItems[focusedIndex];
      if (itemToFocus) {
        itemToFocus.focus();
      }
    }
  }, [focusedIndex]);

  return {
    listRef,
    focusedIndex,
    handleKeyDown,
    setFocusedIndex,
  };
}
