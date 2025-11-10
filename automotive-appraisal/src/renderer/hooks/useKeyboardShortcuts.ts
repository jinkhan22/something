/**
 * Keyboard Shortcuts Hook
 * Provides keyboard shortcuts for common operations
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: (event?: KeyboardEvent) => void;
  description: string;
  context?: string; // Optional context for context-specific shortcuts
}

interface UseKeyboardShortcutsOptions {
  onAddComparable?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  context?: string;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const navigate = useNavigate();
  const { onAddComparable, onSave, onCancel, onDelete, onEdit, context } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs (except for specific cases)
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    // Allow Escape and some shortcuts even in inputs
    const allowedInInputs = ['Escape', 'Enter'];
    if (isInput && !allowedInInputs.includes(event.key) && !event.metaKey && !event.ctrlKey) {
      return;
    }

    const shortcuts: KeyboardShortcut[] = [
      // Global navigation shortcuts
      {
        key: 'n',
        metaKey: true,
        action: () => navigate('/new'),
        description: 'New Appraisal',
      },
      {
        key: 'h',
        metaKey: true,
        action: () => navigate('/history'),
        description: 'View History',
      },
      {
        key: 'd',
        metaKey: true,
        action: () => navigate('/'),
        description: 'Dashboard',
      },
      {
        key: ',',
        metaKey: true,
        action: () => navigate('/settings'),
        description: 'Settings',
      },
      {
        key: 'k',
        metaKey: true,
        action: () => {
          const event = new CustomEvent('show-keyboard-shortcuts');
          window.dispatchEvent(event);
        },
        description: 'Show Keyboard Shortcuts',
      },
      {
        key: 'f',
        metaKey: true,
        action: (event) => {
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
          if (searchInput) {
            event?.preventDefault();
            searchInput.focus();
          }
        },
        description: 'Focus Search',
      },
      // Context-specific shortcuts
      {
        key: 'a',
        metaKey: true,
        shiftKey: true,
        action: () => {
          if (onAddComparable) {
            onAddComparable();
          }
        },
        description: 'Add Comparable',
        context: 'comparable',
      },
      {
        key: 's',
        metaKey: true,
        action: (event) => {
          if (onSave) {
            event?.preventDefault();
            onSave();
          }
        },
        description: 'Save',
        context: 'form',
      },
      {
        key: 'Escape',
        action: () => {
          if (onCancel) {
            onCancel();
          }
        },
        description: 'Cancel',
        context: 'form',
      },
      {
        key: 'Delete',
        metaKey: true,
        action: () => {
          if (onDelete) {
            onDelete();
          }
        },
        description: 'Delete',
        context: 'comparable',
      },
      {
        key: 'e',
        metaKey: true,
        action: () => {
          if (onEdit) {
            onEdit();
          }
        },
        description: 'Edit',
        context: 'comparable',
      },
    ];

    const matchingShortcut = shortcuts.find(shortcut => {
      // Check if shortcut matches current context
      if (shortcut.context && context !== shortcut.context) {
        return false;
      }

      const keyMatches = event.key === shortcut.key;
      const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
      const metaMatches = shortcut.metaKey ? event.metaKey : !event.metaKey;
      const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatches = shortcut.altKey ? event.altKey : !event.altKey;

      return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
    });

    if (matchingShortcut) {
      event.preventDefault();
      matchingShortcut.action(event);
    }
  }, [navigate, onAddComparable, onSave, onCancel, onDelete, onEdit, context]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: [
      { key: '⌘N', description: 'New Appraisal' },
      { key: '⌘H', description: 'View History' },
      { key: '⌘D', description: 'Dashboard' },
      { key: '⌘,', description: 'Settings' },
      { key: '⌘K', description: 'Show Keyboard Shortcuts' },
      { key: '⌘F', description: 'Focus Search' },
      { key: '⌘⇧A', description: 'Add Comparable' },
      { key: '⌘S', description: 'Save' },
      { key: 'Esc', description: 'Cancel' },
      { key: '⌘⌫', description: 'Delete' },
      { key: '⌘E', description: 'Edit' },
    ],
  };
}
