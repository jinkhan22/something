import { useAppStore } from '../store';

/**
 * State debugging utilities for development
 */

/**
 * Log current state to console
 */
export const logState = () => {
  const state = useAppStore.getState();
  console.group('🔍 Application State');
  console.log('Processing:', {
    status: state.processingStatus,
    progress: state.processingProgress,
    message: state.processingMessage,
    currentAppraisal: state.currentAppraisal
  });
  console.log('Error:', {
    error: state.error,
    errorMessage: state.errorMessage,
    errorDetails: state.errorDetails
  });
  console.log('History:', {
    count: state.appraisalHistory.length,
    loading: state.historyLoading,
    error: state.historyError
  });
  console.log('UI:', {
    sidebarCollapsed: state.sidebarCollapsed,
    currentPage: state.currentPage,
    theme: state.theme
  });
  console.groupEnd();
};

/**
 * Subscribe to state changes and log them
 */
export const subscribeToStateChanges = () => {
  return useAppStore.subscribe((state, prevState) => {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    
    // Check for changes in key properties
    const keysToWatch = [
      'processingStatus',
      'processingProgress',
      'errorMessage',
      'historyLoading',
      'sidebarCollapsed',
      'currentPage'
    ] as const;
    
    keysToWatch.forEach(key => {
      if (state[key] !== prevState[key]) {
        changes[key] = {
          from: prevState[key],
          to: state[key]
        };
      }
    });
    
    if (Object.keys(changes).length > 0) {
      console.group('📊 State Changed');
      Object.entries(changes).forEach(([key, { from, to }]) => {
        console.log(`${key}:`, from, '→', to);
      });
      console.groupEnd();
    }
  });
};

/**
 * Get state snapshot for debugging
 */
export const getStateSnapshot = () => {
  const state = useAppStore.getState();
  return {
    timestamp: new Date().toISOString(),
    processing: {
      status: state.processingStatus,
      progress: state.processingProgress,
      message: state.processingMessage,
      hasAppraisal: !!state.currentAppraisal
    },
    error: {
      hasError: !!state.error,
      type: state.error?.type,
      message: state.errorMessage,
      recoverable: state.error?.recoverable
    },
    history: {
      count: state.appraisalHistory.length,
      loading: state.historyLoading,
      hasError: !!state.historyError
    },
    ui: {
      sidebarCollapsed: state.sidebarCollapsed,
      currentPage: state.currentPage,
      theme: state.theme
    }
  };
};

/**
 * Export state to JSON for debugging
 */
export const exportStateToJSON = () => {
  const snapshot = getStateSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  
  // Copy to clipboard if available
  if (navigator.clipboard) {
    navigator.clipboard.writeText(json).then(() => {
      console.log('State exported to clipboard');
    });
  }
  
  return json;
};

/**
 * Clear persisted state (for testing)
 */
export const clearPersistedState = () => {
  localStorage.removeItem('automotive-appraisal-storage');
  console.log('Persisted state cleared. Reload the page to see changes.');
};

/**
 * Reset state to initial values
 */
export const resetState = () => {
  const store = useAppStore.getState();
  store.reset();
  console.log('State reset to initial values');
};

/**
 * Validate state consistency
 */
export const validateState = () => {
  const state = useAppStore.getState();
  const issues: string[] = [];
  
  // Check for inconsistencies
  if (state.processingStatus === 'processing' && state.processingProgress === 0) {
    issues.push('Processing status is "processing" but progress is 0');
  }
  
  if (state.processingStatus === 'complete' && !state.currentAppraisal) {
    issues.push('Processing status is "complete" but no appraisal data exists');
  }
  
  if (state.error && state.processingStatus === 'idle') {
    issues.push('Error exists but processing status is idle');
  }
  
  if (state.historyLoading && state.appraisalHistory.length > 0) {
    issues.push('History is loading but history data already exists');
  }
  
  if (issues.length > 0) {
    console.warn('⚠️ State validation issues found:');
    issues.forEach(issue => console.warn(`  - ${issue}`));
    return false;
  }
  
  console.log('✅ State validation passed');
  return true;
};

/**
 * Development tools object
 */
export const devTools = {
  logState,
  subscribeToStateChanges,
  getStateSnapshot,
  exportStateToJSON,
  clearPersistedState,
  resetState,
  validateState
};

// Expose to window in development mode
if (process.env.NODE_ENV === 'development') {
  (window as any).__APP_DEV_TOOLS__ = devTools;
  console.log('🛠️ Development tools available at window.__APP_DEV_TOOLS__');
  console.log('Available methods:', Object.keys(devTools).join(', '));
}

export default devTools;
