/**
 * Keyboard Shortcuts Help Modal
 * Displays available keyboard shortcuts to users
 */

import { useState, useEffect } from 'react';
import { Modal } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

export function KeyboardShortcutsHelp() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Show help with Cmd+/ or Ctrl+/ or Cmd+K
      if ((event.metaKey || event.ctrlKey) && (event.key === '/' || event.key === 'k')) {
        event.preventDefault();
        setIsVisible(true);
      }
      
      // Close with Escape
      if (event.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };

    const handleCustomEvent = () => {
      setIsVisible(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('show-keyboard-shortcuts', handleCustomEvent);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('show-keyboard-shortcuts', handleCustomEvent);
    };
  }, [isVisible]);

  const shortcuts = [
    { category: 'Navigation', items: [
      { keys: ['⌘', 'D'], description: 'Go to Dashboard' },
      { keys: ['⌘', 'N'], description: 'New Appraisal' },
      { keys: ['⌘', 'H'], description: 'View History' },
      { keys: ['⌘', ','], description: 'Open Settings' },
    ]},
    { category: 'Comparable Vehicles', items: [
      { keys: ['⌘', 'Shift', 'A'], description: 'Add Comparable Vehicle' },
      { keys: ['⌘', 'E'], description: 'Edit Selected Comparable' },
      { keys: ['⌘', 'Delete'], description: 'Delete Selected Comparable' },
      { keys: ['Tab'], description: 'Navigate Between Form Fields' },
    ]},
    { category: 'Forms & Actions', items: [
      { keys: ['⌘', 'S'], description: 'Save Current Form' },
      { keys: ['Esc'], description: 'Cancel/Close' },
      { keys: ['⌘', 'F'], description: 'Focus Search' },
      { keys: ['Enter'], description: 'Submit Form (when focused)' },
    ]},
    { category: 'General', items: [
      { keys: ['⌘', 'K'], description: 'Show Keyboard Shortcuts' },
      { keys: ['⌘', '/'], description: 'Show Keyboard Shortcuts' },
      { keys: ['Tab'], description: 'Navigate Forward' },
      { keys: ['Shift', 'Tab'], description: 'Navigate Backward' },
    ]},
  ];

  return (
    <>
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-40"
        title="Keyboard Shortcuts (⌘/)"
      >
        <QuestionCircleOutlined className="text-xl" />
      </button>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <QuestionCircleOutlined className="text-blue-600" />
            <span>Keyboard Shortcuts</span>
          </div>
        }
        open={isVisible}
        onCancel={() => setIsVisible(false)}
        footer={null}
        width={600}
      >
        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-gray-700">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-gray-400">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <strong>Tip:</strong> Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded">⌘</kbd> + <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded">/</kbd> anytime to view this help.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
