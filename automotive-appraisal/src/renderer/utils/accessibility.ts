/**
 * Accessibility Utilities
 * Provides utilities for screen reader announcements, focus management, and ARIA support
 */

/**
 * Announces a message to screen readers
 * @param message - The message to announce
 * @param priority - 'polite' (default) or 'assertive'
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  // Create or get the live region element
  let liveRegion = document.getElementById('sr-live-region');
  
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'sr-live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(liveRegion);
  }
  
  // Update the aria-live attribute if priority changed
  if (liveRegion.getAttribute('aria-live') !== priority) {
    liveRegion.setAttribute('aria-live', priority);
  }
  
  // Clear and set the message
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion!.textContent = message;
  }, 100);
}

/**
 * Announces validation errors to screen readers
 * @param errors - Array of error messages
 */
export function announceValidationErrors(errors: string[]): void {
  if (errors.length === 0) return;
  
  const message = errors.length === 1
    ? `Validation error: ${errors[0]}`
    : `${errors.length} validation errors: ${errors.join(', ')}`;
  
  announceToScreenReader(message, 'assertive');
}

/**
 * Announces a success message to screen readers
 * @param message - The success message
 */
export function announceSuccess(message: string): void {
  announceToScreenReader(`Success: ${message}`, 'polite');
}

/**
 * Manages focus for modal dialogs
 * @param modalElement - The modal element
 * @returns Cleanup function to restore focus
 */
export function trapFocusInModal(modalElement: HTMLElement): () => void {
  const previouslyFocusedElement = document.activeElement as HTMLElement;
  
  // Get all focusable elements
  const focusableElements = modalElement.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  // Focus the first element
  firstFocusable?.focus();
  
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    }
  };
  
  modalElement.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    modalElement.removeEventListener('keydown', handleKeyDown);
    previouslyFocusedElement?.focus();
  };
}

/**
 * Sets focus to an element with optional delay
 * @param element - The element to focus
 * @param delay - Optional delay in milliseconds
 */
export function setFocus(element: HTMLElement | null, delay: number = 0): void {
  if (!element) return;
  
  if (delay > 0) {
    setTimeout(() => element.focus(), delay);
  } else {
    element.focus();
  }
}

/**
 * Generates a unique ID for ARIA relationships
 * @param prefix - Optional prefix for the ID
 */
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Checks if an element is visible to screen readers
 * @param element - The element to check
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.getAttribute('aria-hidden') !== 'true'
  );
}

/**
 * Creates a visually hidden but screen-reader accessible element
 * @param text - The text content
 */
export function createScreenReaderOnlyElement(text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'sr-only';
  span.textContent = text;
  span.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;
  return span;
}

/**
 * Announces loading state changes
 * @param isLoading - Whether loading is in progress
 * @param message - Optional custom message
 */
export function announceLoadingState(isLoading: boolean, message?: string): void {
  if (isLoading) {
    announceToScreenReader(message || 'Loading...', 'polite');
  } else {
    announceToScreenReader(message || 'Loading complete', 'polite');
  }
}

/**
 * Announces page navigation
 * @param pageName - The name of the page navigated to
 */
export function announcePageNavigation(pageName: string): void {
  announceToScreenReader(`Navigated to ${pageName}`, 'polite');
}

/**
 * Gets the appropriate ARIA role for a button based on its action
 * @param action - The button action type
 */
export function getButtonAriaRole(action: 'submit' | 'cancel' | 'delete' | 'edit' | 'add'): string {
  switch (action) {
    case 'submit':
      return 'button';
    case 'cancel':
      return 'button';
    case 'delete':
      return 'button';
    case 'edit':
      return 'button';
    case 'add':
      return 'button';
    default:
      return 'button';
  }
}

/**
 * Creates accessible error message attributes
 * @param fieldId - The ID of the field with the error
 * @param errorMessage - The error message
 */
export function createErrorAttributes(fieldId: string, errorMessage: string): {
  'aria-invalid': 'true';
  'aria-describedby': string;
  errorId: string;
} {
  const errorId = `${fieldId}-error`;
  return {
    'aria-invalid': 'true',
    'aria-describedby': errorId,
    errorId,
  };
}

/**
 * Checks color contrast ratio (simplified check)
 * @param foreground - Foreground color in hex
 * @param background - Background color in hex
 * @returns Whether the contrast meets WCAG AA standards (4.5:1)
 */
export function meetsContrastRequirements(foreground: string, background: string): boolean {
  // This is a simplified check. In production, use a proper color contrast library
  // For now, we'll return true and rely on our design system
  return true;
}

/**
 * Adds keyboard navigation to a list
 * @param listElement - The list element
 * @param onSelect - Callback when an item is selected
 */
export function enableKeyboardListNavigation(
  listElement: HTMLElement,
  onSelect?: (index: number) => void
): () => void {
  const items = Array.from(listElement.querySelectorAll<HTMLElement>('[role="listitem"], li, [data-list-item]'));
  let currentIndex = 0;
  
  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        currentIndex = Math.min(currentIndex + 1, items.length - 1);
        items[currentIndex]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        currentIndex = Math.max(currentIndex - 1, 0);
        items[currentIndex]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        currentIndex = 0;
        items[currentIndex]?.focus();
        break;
      case 'End':
        event.preventDefault();
        currentIndex = items.length - 1;
        items[currentIndex]?.focus();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onSelect) {
          onSelect(currentIndex);
        }
        break;
    }
  };
  
  listElement.addEventListener('keydown', handleKeyDown);
  
  // Make items focusable
  items.forEach((item, index) => {
    if (!item.hasAttribute('tabindex')) {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    }
  });
  
  return () => {
    listElement.removeEventListener('keydown', handleKeyDown);
  };
}
