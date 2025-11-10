// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Progress reporting callback type
export type ProgressCallback = (data: { progress: number; message: string }) => void;
export type ErrorCallback = (error: { message: string; stack?: string; type?: string }) => void;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // PDF Processing
  processPDF: (buffer: Uint8Array) => 
    ipcRenderer.invoke('process-pdf', Buffer.from(buffer)),
  
  // Storage Operations - Complete API surface
  getAppraisals: () => 
    ipcRenderer.invoke('get-appraisals'),
  
  getAppraisal: (id: string) => 
    ipcRenderer.invoke('get-appraisal', id),
  
  updateAppraisalStatus: (id: string, status: 'draft' | 'complete') => 
    ipcRenderer.invoke('update-appraisal-status', id, status),
  
  deleteAppraisal: (id: string) => 
    ipcRenderer.invoke('delete-appraisal', id),
  
  // Progress Reporting Event Listeners
  onProcessingProgress: (callback: ProgressCallback) => {
    const wrappedCallback = (_event: Electron.IpcRendererEvent, data: { progress: number; message: string }) => {
      callback(data);
    };
    ipcRenderer.on('processing-progress', wrappedCallback);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('processing-progress', wrappedCallback);
    };
  },
  
    onProcessingComplete: (callback: (data: { success: boolean; data?: unknown; error?: string }) => void) => {
    const wrappedCallback = (_event: Electron.IpcRendererEvent, data: { success: boolean; data?: unknown; error?: string }) => {
      callback(data);
    };
    ipcRenderer.on('processing-complete', wrappedCallback);
    
    return () => {
      ipcRenderer.removeListener('processing-complete', wrappedCallback);
    };
  },
  
  // Error Handling Event Listeners
  onProcessingError: (callback: ErrorCallback) => {
    const wrappedCallback = (_event: Electron.IpcRendererEvent, error: { message: string; stack?: string; type?: string }) => {
      callback(error);
    };
    ipcRenderer.on('processing-error', wrappedCallback);
    
    return () => {
      ipcRenderer.removeListener('processing-error', wrappedCallback);
    };
  },
  
  onStorageError: (callback: ErrorCallback) => {
    const wrappedCallback = (_event: Electron.IpcRendererEvent, error: { message: string; stack?: string; type?: string }) => {
      callback(error);
    };
    ipcRenderer.on('storage-error', wrappedCallback);
    
    return () => {
      ipcRenderer.removeListener('storage-error', wrappedCallback);
    };
  },
  
  // System Operations
  showErrorDialog: (title: string, message: string) => 
    ipcRenderer.invoke('show-error-dialog', title, message),
  
    showSaveDialog: (options: Electron.SaveDialogOptions) => 
    ipcRenderer.invoke('show-save-dialog', options),
  
  showOpenDialog: (options: Electron.OpenDialogOptions) => 
    ipcRenderer.invoke('show-open-dialog', options),
  
  // Utility Methods
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('processing-progress');
    ipcRenderer.removeAllListeners('processing-complete');
    ipcRenderer.removeAllListeners('processing-error');
    ipcRenderer.removeAllListeners('storage-error');
  },
  
  // Development and Debugging
  getAppVersion: () => 
    ipcRenderer.invoke('get-app-version'),
  
  getSystemInfo: () => 
    ipcRenderer.invoke('get-system-info'),
  
  openDevTools: () => 
    ipcRenderer.invoke('open-dev-tools'),
  
  // Asset Availability
  checkAssetsAvailable: () => 
    ipcRenderer.invoke('check-assets-available'),
  
  // Settings Management
  getSettings: () => 
    ipcRenderer.invoke('get-settings'),
  
  updateSettings: (settings: any) => 
    ipcRenderer.invoke('update-settings', settings),
  
  resetSettings: () => 
    ipcRenderer.invoke('reset-settings'),
  
  validateSettings: () => 
    ipcRenderer.invoke('validate-settings'),
  
  // Enhanced OCR Processing
  processPDFWithOCR: (buffer: Uint8Array, options?: any) => 
    ipcRenderer.invoke('process-pdf-with-ocr', Buffer.from(buffer), options),
  
  // Data Validation
  validateVehicleData: (data: any) => 
    ipcRenderer.invoke('validate-vehicle-data', data),
  
  // Export Operations
  exportToCSV: (appraisalIds: string[]) => 
    ipcRenderer.invoke('export-to-csv', appraisalIds),
  
  exportToJSON: (appraisalIds: string[]) => 
    ipcRenderer.invoke('export-to-json', appraisalIds),
  
  // Error Log Management
  getErrorLog: () => 
    ipcRenderer.invoke('get-error-log'),
  
  clearErrorLog: () => 
    ipcRenderer.invoke('clear-error-log'),
  
  exportErrorLog: () => 
    ipcRenderer.invoke('export-error-log'),
  
  // OCR Status and Configuration
  getOCRStatus: () => 
    ipcRenderer.invoke('get-ocr-status'),
  
  // Performance Metrics
  getPerformanceMetrics: () => 
    ipcRenderer.invoke('get-performance-metrics'),
  
  resetPerformanceMetrics: () => 
    ipcRenderer.invoke('reset-performance-metrics'),
  
  // Appraisal Management Operations
  updateAppraisal: (id: string, data: any) => 
    ipcRenderer.invoke('update-appraisal', id, data),
  
  findDuplicates: (vin: string) => 
    ipcRenderer.invoke('find-duplicates', vin),
  
  hasDuplicate: (vin: string, excludeId?: string) => 
    ipcRenderer.invoke('has-duplicate', vin, excludeId),
  
  backupStorage: () => 
    ipcRenderer.invoke('backup-storage'),
  
  restoreStorage: () => 
    ipcRenderer.invoke('restore-storage'),
  
  verifyStorageIntegrity: () => 
    ipcRenderer.invoke('verify-storage-integrity'),
  
  // System Checker Operations
  getSystemDiagnostics: () => 
    ipcRenderer.invoke('get-system-diagnostics'),
  
  getSystemRecommendations: () => 
    ipcRenderer.invoke('get-system-recommendations'),
  
  checkFeatureAvailability: (featureName: string) => 
    ipcRenderer.invoke('check-feature-availability', featureName),
  
  exportDiagnostics: () => 
    ipcRenderer.invoke('export-diagnostics'),
  
  // Comparable Vehicles Operations
  getComparables: (appraisalId: string) => 
    ipcRenderer.invoke('get-comparables', appraisalId),
  
  saveComparable: (comparable: any) => 
    ipcRenderer.invoke('save-comparable', comparable),
  
  updateComparable: (id: string, updates: any) => 
    ipcRenderer.invoke('update-comparable', id, updates),
  
  deleteComparable: (id: string) => 
    ipcRenderer.invoke('delete-comparable', id),
  
  // Market Analysis Operations
  calculateMarketValue: (appraisalId: string) => 
    ipcRenderer.invoke('calculate-market-value', appraisalId),
  
  exportMarketAnalysis: (appraisalId: string, options?: any) => 
    ipcRenderer.invoke('export-market-analysis', appraisalId, options),
  
  // Report Generation Operations
  generateAppraisalReport: (appraisalData: any, options: any, filePath: string) => 
    ipcRenderer.invoke('generate-appraisal-report', appraisalData, options, filePath),
  
  // System Operations
  getPath: (name: 'home' | 'documents' | 'downloads' | 'desktop') => 
    ipcRenderer.invoke('get-path', name),
  
  // Report History Operations
  getReportHistory: () => 
    ipcRenderer.invoke('get-report-history'),
  
  addReportToHistory: (report: any) => 
    ipcRenderer.invoke('add-report-to-history', report),
  
  deleteReportFromHistory: (id: string) => 
    ipcRenderer.invoke('delete-report-from-history', id),
  
  openReportFile: (filePath: string) => 
    ipcRenderer.invoke('open-report-file', filePath),
  
  // Error Logging Operations
  logError: (service: string, operation: string, message: string, context?: Record<string, unknown>) => 
    ipcRenderer.invoke('log-error', service, operation, message, context),
  
  logWarning: (service: string, operation: string, message: string, context?: Record<string, unknown>) => 
    ipcRenderer.invoke('log-warning', service, operation, message, context),
  
  logInfo: (service: string, operation: string, message: string, context?: Record<string, unknown>) => 
    ipcRenderer.invoke('log-info', service, operation, message, context),
  
  getRecentLogs: (count?: number) => 
    ipcRenderer.invoke('get-recent-logs', count),
  
  getLogFilePath: () => 
    ipcRenderer.invoke('get-log-file-path')
});
