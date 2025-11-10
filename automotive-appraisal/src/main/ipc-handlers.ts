import { ipcMain, IpcMainInvokeEvent, dialog, BrowserWindow, app } from 'electron';
import os from 'node:os';
import { extractVehicleData } from './services/pdfExtractor';
import { storage } from './services/storage';
import { ErrorType, SystemInfo, ExtractedVehicleData, ValidationResult } from '../types';
import { ErrorHandler, ErrorContext, ErrorCategory } from './services/errorHandler';

// Logging utility for debugging IPC communication
const logIPC = (method: string, data?: unknown, error?: unknown) => {
  const timestamp = new Date().toISOString();
  if (error) {
    console.error(`[${timestamp}] IPC Error in ${method}:`, error);
  } else {
    console.log(`[${timestamp}] IPC ${method}:`, data ? JSON.stringify(data).substring(0, 100) + '...' : 'no data');
  }
};

// Helper function to serialize data safely
const safeSerialize = (data: unknown): unknown => {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    logIPC('safeSerialize', null, error);
    return null;
  }
};

// Helper function to send progress updates
const sendProgress = (event: IpcMainInvokeEvent, progress: number, message: string) => {
  try {
    event.sender.send('processing-progress', { progress, message });
    // Only log progress at milestones to avoid flooding the console
    if (progress % 20 === 0 || progress >= 90) {
      logIPC('processing-progress', { progress, message });
    }
  } catch (error) {
    // Silently ignore EPIPE errors from excessive logging
    if (error instanceof Error && !error.message.includes('EPIPE')) {
      logIPC('sendProgress', null, error);
    }
  }
};

// Helper function to send error events
const sendError = (event: IpcMainInvokeEvent, error: unknown, type: ErrorType = ErrorType.UNKNOWN_ERROR) => {
  try {
    const errorData = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type
    };
    event.sender.send('processing-error', errorData);
    logIPC('processing-error', errorData);
  } catch (err) {
    logIPC('sendError', null, err);
  }
};

export const setupIPCHandlers = () => {
  // PDF Processing with progress reporting
  ipcMain.handle('process-pdf', async (event: IpcMainInvokeEvent, buffer: Buffer) => {
    const startTime = Date.now();
    
    try {
      logIPC('process-pdf', { bufferSize: buffer.length });
      
      // Validate input
      if (!buffer || buffer.length === 0) {
        throw new Error('Invalid PDF buffer provided');
      }
      
      if (buffer.length > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('PDF file too large (maximum 50MB)');
      }
      
      sendProgress(event, 5, 'Starting PDF processing...');
      
      // Extract vehicle data with OCR progress updates
      const extractedData = await extractVehicleData(buffer, (progress, message) => {
        // Map OCR progress (0-100) to our range (5-85)
        const mappedProgress = 5 + (progress * 0.8);
        sendProgress(event, Math.round(mappedProgress), message || '');
      });
      
      sendProgress(event, 90, 'Validating extracted data...');
      
      // Validate extracted data (must have minimum required fields)
      // For Mitchell reports: Need VIN OR (Make + Year)
      // For CCC reports: Need VIN OR Make OR Year (more flexible)
      const hasVin = !!extractedData.vin && extractedData.vin.length === 17;
      const hasMake = !!extractedData.make;
      const hasYear = !!extractedData.year && extractedData.year > 1990;
      
      let isValid = false;
      if (extractedData.reportType === 'MITCHELL') {
        isValid = hasVin || (hasMake && hasYear);
      } else {
        // CCC One: Need at least one key field
        isValid = hasVin || hasMake || hasYear;
      }
      
      if (!isValid) {
        throw new Error('Could not extract required vehicle information from PDF. Please ensure this is a valid CCC One or Mitchell valuation report.');
      }
      
      sendProgress(event, 92, 'Saving appraisal...');
      
      // Auto-save as draft
      const id = storage.saveAppraisal(extractedData);
      
      sendProgress(event, 100, 'Processing complete');
      
      const result = {
        success: true,
        extractedData: safeSerialize(extractedData),
        appraisalId: id,
        processingTime: Date.now() - startTime,
        errors: [],
        warnings: []
      };
      
      // Send completion event
      event.sender.send('processing-complete', result);
      
      logIPC('process-pdf-success', { appraisalId: id, processingTime: result.processingTime });
      return result;
      
    } catch (error) {
      const errorType = error instanceof Error && error.message.includes('too large') 
        ? ErrorType.FILE_TOO_LARGE 
        : ErrorType.PROCESSING_FAILED;
      
      sendError(event, error, errorType);
      
      const result = {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        warnings: [],
        processingTime: Date.now() - startTime
      };
      
      logIPC('process-pdf-error', result, error);
      return result;
    }
  });

  // Storage Operations with enhanced error handling
  ipcMain.handle('get-appraisals', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('get-appraisals');
      const appraisals = storage.getAppraisals();
      const serializedAppraisals = safeSerialize(appraisals);
      
      logIPC('get-appraisals-success', { count: appraisals.length });
      return serializedAppraisals;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('get-appraisals', null, error);
      throw error;
    }
  });

  ipcMain.handle('get-appraisal', async (event: IpcMainInvokeEvent, id: string) => {
    try {
      logIPC('get-appraisal', { id });
      
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid appraisal ID provided');
      }
      
      const appraisal = storage.getAppraisal(id);
      const serializedAppraisal = safeSerialize(appraisal);
      
      logIPC('get-appraisal-success', { id, found: !!appraisal });
      return serializedAppraisal;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('get-appraisal', { id }, error);
      throw error;
    }
  });

  ipcMain.handle('update-appraisal-status', async (event: IpcMainInvokeEvent, id: string, status: 'draft' | 'complete') => {
    try {
      logIPC('update-appraisal-status', { id, status });
      
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid appraisal ID provided');
      }
      
      if (!['draft', 'complete'].includes(status)) {
        throw new Error('Invalid status provided. Must be "draft" or "complete"');
      }
      
      const success = storage.updateAppraisalStatus(id, status);
      
      if (!success) {
        throw new Error(`Appraisal with ID ${id} not found`);
      }
      
      logIPC('update-appraisal-status-success', { id, status });
      return success;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('update-appraisal-status', { id, status }, error);
      throw error;
    }
  });

  ipcMain.handle('delete-appraisal', async (event: IpcMainInvokeEvent, id: string) => {
    try {
      logIPC('delete-appraisal', { id });
      
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid appraisal ID provided');
      }
      
      const success = storage.deleteAppraisal(id);
      
      if (!success) {
        throw new Error(`Appraisal with ID ${id} not found`);
      }
      
      logIPC('delete-appraisal-success', { id });
      return success;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('delete-appraisal', { id }, error);
      throw error;
    }
  });

  // System Operations
  ipcMain.handle('show-error-dialog', async (event: IpcMainInvokeEvent, title: string, message: string) => {
    try {
      logIPC('show-error-dialog', { title, message });
      
      const browserWindow = BrowserWindow.fromWebContents(event.sender);
      if (!browserWindow) {
        throw new Error('Could not find browser window');
      }
      
      const result = await dialog.showMessageBox(browserWindow, {
        type: 'error',
        title,
        message,
        buttons: ['OK']
      });
      
      logIPC('show-error-dialog-success');
      return result;
      
    } catch (error) {
      logIPC('show-error-dialog', { title, message }, error);
      throw error;
    }
  });

  ipcMain.handle('show-save-dialog', async (event: IpcMainInvokeEvent, options: Electron.SaveDialogOptions) => {
    try {
      logIPC('show-save-dialog', options);
      
      const browserWindow = BrowserWindow.fromWebContents(event.sender);
      if (!browserWindow) {
        throw new Error('Could not find browser window');
      }
      
      const result = await dialog.showSaveDialog(browserWindow, options);
      
      logIPC('show-save-dialog-success', { canceled: (result as unknown as Electron.SaveDialogReturnValue).canceled });
      return result;
      
    } catch (error) {
      logIPC('show-save-dialog', options, error);
      throw error;
    }
  });

  ipcMain.handle('show-open-dialog', async (event: IpcMainInvokeEvent, options: Electron.OpenDialogOptions) => {
    try {
      logIPC('show-open-dialog', options);
      
      const browserWindow = BrowserWindow.fromWebContents(event.sender);
      if (!browserWindow) {
        throw new Error('Could not find browser window');
      }
      
      const result = await dialog.showOpenDialog(browserWindow, options);
      
      logIPC('show-open-dialog-success', { 
        canceled: (result as unknown as Electron.OpenDialogReturnValue).canceled, 
        fileCount: (result as unknown as Electron.OpenDialogReturnValue).filePaths?.length || 0 
      });
      return result;
      
    } catch (error) {
      logIPC('show-open-dialog', options, error);
      throw error;
    }
  });

  // Development and Debugging
  ipcMain.handle('get-app-version', async () => {
    try {
      const version = app.getVersion();
      logIPC('get-app-version', { version });
      return version;
    } catch (error) {
      logIPC('get-app-version', null, error);
      throw error;
    }
  });

  ipcMain.handle('get-system-info', async () => {
    try {
      const systemInfo: SystemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        version: os.release(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node
      };
      
      logIPC('get-system-info', systemInfo);
      return systemInfo;
      
    } catch (error) {
      logIPC('get-system-info', null, error);
      throw error;
    }
  });

  ipcMain.handle('open-dev-tools', async (event: IpcMainInvokeEvent) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.webContents.openDevTools();
        logIPC('open-dev-tools-success');
      } else {
        throw new Error('Could not find window for dev tools');
      }
    } catch (error) {
      logIPC('open-dev-tools', null, error);
      throw error;
    }
  });

  // Asset Availability Check
  ipcMain.handle('check-assets-available', async () => {
    try {
      // Import dynamically to avoid circular dependency
      const { getAssetsAvailable } = await import('../main');
      const available = getAssetsAvailable();
      logIPC('check-assets-available', { available });
      return available;
    } catch (error) {
      logIPC('check-assets-available', null, error);
      // If we can't check, assume unavailable for safety
      return false;
    }
  });

  // Settings Management
  ipcMain.handle('get-settings', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('get-settings');
      
      const { settingsService } = await import('./services/settingsService');
      const settings = settingsService.getSettings();
      const serializedSettings = safeSerialize(settings);
      
      logIPC('get-settings-success', settings);
      return serializedSettings;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('get-settings', null, error);
      throw error;
    }
  });

  ipcMain.handle('update-settings', async (event: IpcMainInvokeEvent, updates: any) => {
    try {
      logIPC('update-settings', updates);
      
      if (!updates || typeof updates !== 'object') {
        throw new Error('Invalid settings data provided');
      }
      
      const { settingsService } = await import('./services/settingsService');
      const success = settingsService.updateSettings(updates);
      
      if (!success) {
        throw new Error('Failed to update settings');
      }
      
      logIPC('update-settings-success', updates);
      return success;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('update-settings', updates, error);
      throw error;
    }
  });

  ipcMain.handle('reset-settings', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('reset-settings');
      
      const { settingsService } = await import('./services/settingsService');
      const success = settingsService.resetSettings();
      
      if (!success) {
        throw new Error('Failed to reset settings');
      }
      
      logIPC('reset-settings-success');
      return success;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('reset-settings', null, error);
      throw error;
    }
  });

  ipcMain.handle('validate-settings', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('validate-settings');
      
      const { settingsService } = await import('./services/settingsService');
      const result = settingsService.validateSettings();
      
      logIPC('validate-settings-success', { valid: result.valid, errorCount: result.errors.length });
      return result;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('validate-settings', null, error);
      return { valid: false, errors: ['Failed to validate settings'] };
    }
  });

  // Export Operations
  ipcMain.handle('export-to-csv', async (event: IpcMainInvokeEvent, appraisalIds: string[]) => {
    try {
      logIPC('export-to-csv', { count: appraisalIds.length });
      
      if (!appraisalIds || appraisalIds.length === 0) {
        return { success: false, error: 'No appraisals selected for export' };
      }
      
      const browserWindow = BrowserWindow.fromWebContents(event.sender);
      if (!browserWindow) {
        throw new Error('Could not find browser window');
      }
      
      // Get default save location from settings
      const { settingsService } = await import('./services/settingsService');
      const settings = settingsService.getSettings();
      const defaultPath = settings.defaultSaveLocation 
        ? `${settings.defaultSaveLocation}/appraisals-${new Date().toISOString().split('T')[0]}.csv`
        : `appraisals-${new Date().toISOString().split('T')[0]}.csv`;
      
      // Show save dialog
      const dialogResult = await dialog.showSaveDialog(browserWindow, {
        title: 'Export Appraisals to CSV',
        defaultPath,
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      }) as unknown as Electron.SaveDialogReturnValue;
      
      if (dialogResult.canceled || !dialogResult.filePath) {
        return { success: false, error: 'Export canceled by user' };
      }
      
      const filePath = dialogResult.filePath;
      
      // Import export service
      const { exportAppraisalsToCSV } = await import('./services/csvExporter');
      
      // Export to CSV
      const result = await exportAppraisalsToCSV(appraisalIds, filePath);
      
      if (result.success) {
        logIPC('export-to-csv-success', { filePath, count: appraisalIds.length });
        return { success: true, filePath, error: result.error };
      } else {
        logIPC('export-to-csv-error', { error: result.error });
        return result;
      }
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('export-to-csv', { count: appraisalIds.length }, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during export'
      };
    }
  });

  ipcMain.handle('export-to-json', async (event: IpcMainInvokeEvent, appraisalIds: string[]) => {
    try {
      logIPC('export-to-json', { count: appraisalIds.length });
      
      if (!appraisalIds || appraisalIds.length === 0) {
        return { success: false, error: 'No appraisals selected for export' };
      }
      
      const browserWindow = BrowserWindow.fromWebContents(event.sender);
      if (!browserWindow) {
        throw new Error('Could not find browser window');
      }
      
      // Get default save location from settings
      const { settingsService } = await import('./services/settingsService');
      const settings = settingsService.getSettings();
      const defaultPath = settings.defaultSaveLocation 
        ? `${settings.defaultSaveLocation}/appraisals-${new Date().toISOString().split('T')[0]}.json`
        : `appraisals-${new Date().toISOString().split('T')[0]}.json`;
      
      // Show save dialog
      const dialogResult = await dialog.showSaveDialog(browserWindow, {
        title: 'Export Appraisals to JSON',
        defaultPath,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      }) as unknown as Electron.SaveDialogReturnValue;
      
      if (dialogResult.canceled || !dialogResult.filePath) {
        return { success: false, error: 'Export canceled by user' };
      }
      
      const filePath = dialogResult.filePath;
      
      // Import export service
      const { exportAppraisalsToJSON } = await import('./services/csvExporter');
      
      // Export to JSON
      const result = await exportAppraisalsToJSON(appraisalIds, filePath);
      
      if (result.success) {
        logIPC('export-to-json-success', { filePath, count: appraisalIds.length });
        return { success: true, filePath, error: result.error };
      } else {
        logIPC('export-to-json-error', { error: result.error });
        return result;
      }
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('export-to-json', { count: appraisalIds.length }, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during export'
      };
    }
  });

  // Appraisal Management Operations
  ipcMain.handle('update-appraisal', async (event: IpcMainInvokeEvent, id: string, data: any) => {
    try {
      logIPC('update-appraisal', { id });
      
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid appraisal ID provided');
      }
      
      if (!data) {
        throw new Error('Appraisal data is required');
      }
      
      const success = storage.updateAppraisal(id, data);
      
      if (!success) {
        throw new Error(`Appraisal with ID ${id} not found`);
      }
      
      logIPC('update-appraisal-success', { id });
      return success;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('update-appraisal', { id }, error);
      throw error;
    }
  });

  ipcMain.handle('find-duplicates', async (event: IpcMainInvokeEvent, vin: string) => {
    try {
      logIPC('find-duplicates', { vin });
      
      if (!vin || typeof vin !== 'string') {
        return [];
      }
      
      const duplicates = storage.findDuplicates(vin);
      const serializedDuplicates = safeSerialize(duplicates);
      
      logIPC('find-duplicates-success', { vin, count: duplicates.length });
      return serializedDuplicates;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('find-duplicates', { vin }, error);
      return [];
    }
  });

  ipcMain.handle('has-duplicate', async (event: IpcMainInvokeEvent, vin: string, excludeId?: string) => {
    try {
      logIPC('has-duplicate', { vin, excludeId });
      
      if (!vin || typeof vin !== 'string') {
        return false;
      }
      
      const hasDuplicate = storage.hasDuplicate(vin, excludeId);
      
      logIPC('has-duplicate-success', { vin, hasDuplicate });
      return hasDuplicate;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('has-duplicate', { vin, excludeId }, error);
      return false;
    }
  });

  ipcMain.handle('backup-storage', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('backup-storage');
      
      const success = storage.backup();
      
      if (success) {
        logIPC('backup-storage-success');
      } else {
        logIPC('backup-storage-failed');
      }
      
      return success;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('backup-storage', null, error);
      return false;
    }
  });

  ipcMain.handle('restore-storage', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('restore-storage');
      
      const success = storage.restore();
      
      if (success) {
        logIPC('restore-storage-success');
      } else {
        logIPC('restore-storage-failed');
      }
      
      return success;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('restore-storage', null, error);
      return false;
    }
  });

  ipcMain.handle('verify-storage-integrity', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('verify-storage-integrity');
      
      const result = storage.verifyIntegrity();
      
      logIPC('verify-storage-integrity-success', { valid: result.valid, errorCount: result.errors.length });
      return result;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('verify-storage-integrity', null, error);
      return { valid: false, errors: ['Failed to verify integrity'] };
    }
  });

  // System Checker IPC Handlers
  ipcMain.handle('get-system-diagnostics', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('get-system-diagnostics');
      
      const { SystemChecker } = await import('./services/systemChecker');
      const diagnostics = await SystemChecker.getDiagnostics();
      
      logIPC('get-system-diagnostics-success');
      return diagnostics;
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('get-system-diagnostics', null, error);
      throw error;
    }
  });

  ipcMain.handle('get-system-recommendations', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('get-system-recommendations');
      
      const { SystemChecker } = await import('./services/systemChecker');
      const recommendations = await SystemChecker.getRecommendations();
      
      logIPC('get-system-recommendations-success', { count: recommendations.length });
      return recommendations;
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('get-system-recommendations', null, error);
      return [];
    }
  });

  ipcMain.handle('check-feature-availability', async (event: IpcMainInvokeEvent, featureName: string) => {
    try {
      logIPC('check-feature-availability', { featureName });
      
      const { SystemChecker } = await import('./services/systemChecker');
      const available = await SystemChecker.isFeatureAvailable(featureName);
      
      logIPC('check-feature-availability-success', { featureName, available });
      return available;
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('check-feature-availability', null, error);
      return false;
    }
  });

  ipcMain.handle('export-diagnostics', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('export-diagnostics');
      
      const { SystemChecker } = await import('./services/systemChecker');
      const diagnosticsJson = await SystemChecker.exportDiagnostics();
      
      // Show save dialog
      const dialogResult = await dialog.showSaveDialog({
        title: 'Export System Diagnostics',
        defaultPath: `system-diagnostics-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      }) as unknown as Electron.SaveDialogReturnValue;

      if (!dialogResult.canceled && dialogResult.filePath) {
        const fs = await import('fs/promises');
        await fs.writeFile(dialogResult.filePath, diagnosticsJson, 'utf-8');
        logIPC('export-diagnostics-success', { path: dialogResult.filePath });
        return { success: true, path: dialogResult.filePath };
      }

      return { success: false };
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('export-diagnostics', null, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Enhanced OCR Processing with detailed progress reporting
  ipcMain.handle('process-pdf-with-ocr', async (event: IpcMainInvokeEvent, buffer: Buffer, options?: any) => {
    const startTime = Date.now();
    const context: ErrorContext = {
      operation: 'process-pdf-with-ocr',
      timestamp: new Date(),
      userAction: 'User uploaded PDF for OCR processing'
    };
    
    try {
      logIPC('process-pdf-with-ocr', { bufferSize: buffer.length, options });
      
      // Validate input
      if (!buffer || buffer.length === 0) {
        throw new Error('Invalid PDF buffer provided');
      }
      
      if (buffer.length > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('PDF file too large (maximum 50MB)');
      }
      
      sendProgress(event, 5, 'Initializing OCR processing...');
      
      // Extract vehicle data with OCR and detailed progress updates
      const extractedData = await extractVehicleData(buffer, (progress, message) => {
        // Map OCR progress (0-100) to our range (5-90)
        const mappedProgress = 5 + (progress * 0.85);
        sendProgress(event, Math.round(mappedProgress), message || 'Processing...');
      });
      
      sendProgress(event, 92, 'Validating extracted data...');
      
      // Validate extracted data
      const hasVin = !!extractedData.vin && extractedData.vin.length === 17;
      const hasMake = !!extractedData.make;
      const hasYear = !!extractedData.year && extractedData.year > 1990;
      
      let isValid = false;
      if (extractedData.reportType === 'MITCHELL') {
        isValid = hasVin || (hasMake && hasYear);
      } else {
        isValid = hasVin || hasMake || hasYear;
      }
      
      if (!isValid) {
        throw new Error('Could not extract required vehicle information from PDF. Please ensure this is a valid CCC One or Mitchell valuation report.');
      }
      
      sendProgress(event, 95, 'Saving appraisal...');
      
      // Auto-save as draft
      const id = storage.saveAppraisal(extractedData);
      
      sendProgress(event, 100, 'Processing complete');
      
      const result = {
        success: true,
        extractedData: safeSerialize(extractedData),
        appraisalId: id,
        processingTime: Date.now() - startTime,
        errors: [],
        warnings: extractedData.extractionErrors || [],
        extractionMethod: extractedData.extractionMethod || 'ocr',
        ocrConfidence: extractedData.ocrConfidence
      };
      
      // Send completion event
      event.sender.send('processing-complete', result);
      
      logIPC('process-pdf-with-ocr-success', { appraisalId: id, processingTime: result.processingTime });
      return result;
      
    } catch (error) {
      const userFriendlyError = ErrorHandler.toUserFriendlyError(error as Error, context);
      sendError(event, error, ErrorType.PROCESSING_FAILED);
      
      const result = {
        success: false,
        errors: [userFriendlyError.message],
        warnings: [],
        processingTime: Date.now() - startTime,
        errorDetails: {
          category: userFriendlyError.category,
          severity: userFriendlyError.severity,
          actionableGuidance: userFriendlyError.actionableGuidance,
          canRetry: userFriendlyError.canRetry,
          suggestedRetryParams: userFriendlyError.suggestedRetryParams
        }
      };
      
      ErrorHandler.logError(error as Error, context);
      logIPC('process-pdf-with-ocr-error', result, error);
      return result;
    }
  });

  // Data Validation IPC Handler
  ipcMain.handle('validate-vehicle-data', async (event: IpcMainInvokeEvent, data: Partial<ExtractedVehicleData>) => {
    try {
      logIPC('validate-vehicle-data', { hasVin: !!data.vin, hasMake: !!data.make });
      
      if (!data) {
        throw new Error('No data provided for validation');
      }
      
      // Import validation service dynamically
      const { DataValidator } = await import('./services/dataValidator');
      
      const validationResults: Record<string, ValidationResult> = {};
      
      // Validate VIN if present
      if (data.vin) {
        validationResults.vin = DataValidator.validateVIN(data.vin);
      }
      
      // Validate year if present
      if (data.year) {
        validationResults.year = DataValidator.validateYear(data.year);
      }
      
      // Validate mileage if present
      if (data.mileage && data.year) {
        validationResults.mileage = DataValidator.validateMileage(data.mileage, data.year);
      }
      
      // Validate make/model combination if both present
      if (data.make && data.model) {
        validationResults.makeModel = DataValidator.validateMakeModel(data.make, data.model);
      }
      
      logIPC('validate-vehicle-data-success', { fieldCount: Object.keys(validationResults).length });
      return validationResults;
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('validate-vehicle-data', null, error);
      return {};
    }
  });

  // Error Log Management
  ipcMain.handle('get-error-log', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('get-error-log');
      const errorLog = ErrorHandler.getErrorLog();
      logIPC('get-error-log-success', { count: errorLog.length });
      return errorLog.map(entry => ({
        timestamp: entry.timestamp.toISOString(),
        operation: entry.context.operation,
        userAction: entry.context.userAction,
        errorMessage: entry.error.message,
        category: ErrorHandler.classifyError(entry.error, entry.context)
      }));
    } catch (error) {
      logIPC('get-error-log', null, error);
      return [];
    }
  });

  ipcMain.handle('clear-error-log', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('clear-error-log');
      ErrorHandler.clearErrorLog();
      logIPC('clear-error-log-success');
      return true;
    } catch (error) {
      logIPC('clear-error-log', null, error);
      return false;
    }
  });

  ipcMain.handle('export-error-log', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('export-error-log');
      
      const errorLogJson = ErrorHandler.exportErrorLog();
      
      // Show save dialog
      const dialogResult = await dialog.showSaveDialog({
        title: 'Export Error Log',
        defaultPath: `error-log-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      }) as unknown as Electron.SaveDialogReturnValue;

      if (!dialogResult.canceled && dialogResult.filePath) {
        const fs = await import('fs/promises');
        await fs.writeFile(dialogResult.filePath, errorLogJson, 'utf-8');
        logIPC('export-error-log-success', { path: dialogResult.filePath });
        return { success: true, path: dialogResult.filePath };
      }

      return { success: false };
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('export-error-log', null, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // OCR Status and Configuration
  ipcMain.handle('get-ocr-status', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('get-ocr-status');
      
      // Check if Tesseract assets are available
      const { verifyTesseractAssets } = await import('./services/tesseractAssets');
      
      try {
        await verifyTesseractAssets();
        logIPC('get-ocr-status-success', { available: true });
        return { available: true, error: null };
      } catch (error) {
        logIPC('get-ocr-status-success', { available: false });
        return { 
          available: false, 
          error: error instanceof Error ? error.message : 'OCR assets not available' 
        };
      }
    } catch (error) {
      logIPC('get-ocr-status', null, error);
      return { available: false, error: 'Failed to check OCR status' };
    }
  });

  // Performance Metrics
  ipcMain.handle('get-performance-metrics', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('get-performance-metrics');
      
      const { getPerformanceOptimizer } = await import('./services/performanceOptimizer');
      const optimizer = getPerformanceOptimizer();
      const metrics = optimizer.getMetrics();
      
      logIPC('get-performance-metrics-success');
      return metrics;
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('get-performance-metrics', null, error);
      return null;
    }
  });

  ipcMain.handle('reset-performance-metrics', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('reset-performance-metrics');
      
      const { getPerformanceOptimizer } = await import('./services/performanceOptimizer');
      const optimizer = getPerformanceOptimizer();
      optimizer.resetMetrics();
      
      logIPC('reset-performance-metrics-success');
      return true;
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('reset-performance-metrics', null, error);
      return false;
    }
  });

  // ============================================================================
  // Comparable Vehicles Operations
  // ============================================================================

  /**
   * Get all comparables for an appraisal
   */
  ipcMain.handle('get-comparables', async (event: IpcMainInvokeEvent, appraisalId: string) => {
    try {
      logIPC('get-comparables', { appraisalId });
      
      if (!appraisalId || typeof appraisalId !== 'string') {
        throw new Error('Invalid appraisal ID provided');
      }
      
      const { ComparableStorageService } = await import('./services/comparableStorage');
      const storageService = new ComparableStorageService();
      
      const comparables = await storageService.getComparables(appraisalId);
      const serializedComparables = safeSerialize(comparables);
      
      logIPC('get-comparables-success', { appraisalId, count: comparables.length });
      return serializedComparables;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('get-comparables', { appraisalId }, error);
      throw error;
    }
  });

  /**
   * Save a new comparable vehicle
   * Enriches the comparable with quality scores and adjustments before saving
   */
  ipcMain.handle('save-comparable', async (event: IpcMainInvokeEvent, comparable: any) => {
    try {
      logIPC('save-comparable', { 
        appraisalId: comparable?.appraisalId, 
        id: comparable?.id 
      });
      
      if (!comparable) {
        throw new Error('Comparable data is required');
      }
      
      if (!comparable.appraisalId || typeof comparable.appraisalId !== 'string') {
        throw new Error('Valid appraisal ID is required');
      }
      
      if (!comparable.id || typeof comparable.id !== 'string') {
        throw new Error('Valid comparable ID is required');
      }
      
      // Get the appraisal data for calculations
      const appraisal = storage.getAppraisal(comparable.appraisalId);
      if (!appraisal) {
        throw new Error(`Appraisal with ID ${comparable.appraisalId} not found`);
      }
      
      // Import calculation services
      const { QualityScoreCalculator } = await import('../renderer/services/qualityScoreCalculator');
      const { AdjustmentCalculator } = await import('../renderer/services/adjustmentCalculator');
      
      // Calculate quality score
      const qualityCalc = new QualityScoreCalculator();
      const qualityScoreBreakdown = qualityCalc.calculateScore(comparable, appraisal.data);
      
      // Calculate adjustments
      const adjustmentCalc = new AdjustmentCalculator();
      const adjustments = adjustmentCalc.calculateTotalAdjustments(comparable, appraisal.data);
      
      // Enrich comparable with calculations
      const enrichedComparable = {
        ...comparable,
        qualityScore: qualityScoreBreakdown.finalScore,
        qualityScoreBreakdown,
        adjustments,
        adjustedPrice: adjustments.adjustedPrice,
        updatedAt: new Date()
      };
      
      console.log('[save-comparable] Enriched comparable:', {
        id: enrichedComparable.id,
        qualityScore: enrichedComparable.qualityScore,
        adjustedPrice: enrichedComparable.adjustedPrice,
        listPrice: enrichedComparable.listPrice
      });
      
      const { ComparableStorageService } = await import('./services/comparableStorage');
      const storageService = new ComparableStorageService();
      
      const success = await storageService.saveComparable(enrichedComparable);
      
      if (!success) {
        throw new Error('Failed to save comparable');
      }
      
      logIPC('save-comparable-success', { 
        appraisalId: comparable.appraisalId, 
        id: comparable.id,
        qualityScore: enrichedComparable.qualityScore
      });
      
      // Return the enriched comparable so frontend can update state
      return { success: true, comparable: safeSerialize(enrichedComparable) };
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('save-comparable', { 
        appraisalId: comparable?.appraisalId, 
        id: comparable?.id 
      }, error);
      throw error;
    }
  });

  /**
   * Update an existing comparable vehicle
   * Recalculates quality scores and adjustments with the updated data
   */
  ipcMain.handle('update-comparable', async (event: IpcMainInvokeEvent, id: string, updates: any) => {
    try {
      logIPC('update-comparable', { id, appraisalId: updates?.appraisalId });
      
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid comparable ID provided');
      }
      
      if (!updates) {
        throw new Error('Update data is required');
      }
      
      if (!updates.appraisalId || typeof updates.appraisalId !== 'string') {
        throw new Error('Valid appraisal ID is required in updates');
      }
      
      // Get the appraisal data for calculations
      const appraisal = storage.getAppraisal(updates.appraisalId);
      if (!appraisal) {
        throw new Error(`Appraisal with ID ${updates.appraisalId} not found`);
      }
      
      // Get the existing comparable to merge with updates
      const { ComparableStorageService } = await import('./services/comparableStorage');
      const storageService = new ComparableStorageService();
      const comparables = await storageService.getComparables(updates.appraisalId);
      const existingComparable = comparables.find(c => c.id === id);
      
      if (!existingComparable) {
        throw new Error(`Comparable with ID ${id} not found`);
      }
      
      // Merge updates with existing data
      const mergedComparable = {
        ...existingComparable,
        ...updates,
        id, // Ensure ID doesn't change
        appraisalId: updates.appraisalId // Ensure appraisalId doesn't change
      };
      
      // Import calculation services
      const { QualityScoreCalculator } = await import('../renderer/services/qualityScoreCalculator');
      const { AdjustmentCalculator } = await import('../renderer/services/adjustmentCalculator');
      
      // Recalculate quality score
      const qualityCalc = new QualityScoreCalculator();
      const qualityScoreBreakdown = qualityCalc.calculateScore(mergedComparable, appraisal.data);
      
      // Recalculate adjustments
      const adjustmentCalc = new AdjustmentCalculator();
      const adjustments = adjustmentCalc.calculateTotalAdjustments(mergedComparable, appraisal.data);
      
      // Create enriched updates
      const enrichedUpdates = {
        ...updates,
        qualityScore: qualityScoreBreakdown.finalScore,
        qualityScoreBreakdown,
        adjustments,
        adjustedPrice: adjustments.adjustedPrice,
        updatedAt: new Date()
      };
      
      console.log('[update-comparable] Enriched updates:', {
        id,
        qualityScore: enrichedUpdates.qualityScore,
        adjustedPrice: enrichedUpdates.adjustedPrice
      });
      
      const success = await storageService.updateComparable(id, enrichedUpdates);
      
      if (!success) {
        throw new Error(`Failed to update comparable with ID ${id}`);
      }
      
      // Get the updated comparable to return
      const updatedComparable = await storageService.getComparable(id, updates.appraisalId);
      
      logIPC('update-comparable-success', { 
        id, 
        appraisalId: updates.appraisalId,
        qualityScore: enrichedUpdates.qualityScore
      });
      
      // Return the updated comparable so frontend can update state
      return { success: true, comparable: safeSerialize(updatedComparable) };
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('update-comparable', { id, appraisalId: updates?.appraisalId }, error);
      throw error;
    }
  });

  /**
   * Delete a comparable vehicle
   */
  ipcMain.handle('delete-comparable', async (event: IpcMainInvokeEvent, id: string) => {
    try {
      logIPC('delete-comparable', { id });
      
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid comparable ID provided');
      }
      
      // Extract appraisalId from the id if it follows the pattern appraisalId-timestamp
      // Otherwise, we need to search through all appraisals
      // For now, we'll require the caller to pass both id and appraisalId
      // Let's check if the id contains the appraisalId
      const parts = id.split('-');
      if (parts.length < 2) {
        throw new Error('Invalid comparable ID format. Expected format: appraisalId-timestamp');
      }
      
      // Extract appraisalId (everything except the last part which is timestamp)
      const appraisalId = parts.slice(0, -1).join('-');
      
      const { ComparableStorageService } = await import('./services/comparableStorage');
      const storageService = new ComparableStorageService();
      
      const success = await storageService.deleteComparable(id, appraisalId);
      
      if (!success) {
        throw new Error(`Comparable with ID ${id} not found`);
      }
      
      logIPC('delete-comparable-success', { id, appraisalId });
      return success;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('delete-comparable', { id }, error);
      throw error;
    }
  });

  /**
   * Calculate market value for an appraisal based on its comparables
   */
  ipcMain.handle('calculate-market-value', async (event: IpcMainInvokeEvent, appraisalId: string) => {
    try {
      logIPC('calculate-market-value', { appraisalId });
      
      if (!appraisalId || typeof appraisalId !== 'string') {
        throw new Error('Invalid appraisal ID provided');
      }
      
      // Get the appraisal data
      const appraisal = storage.getAppraisal(appraisalId);
      if (!appraisal) {
        throw new Error(`Appraisal with ID ${appraisalId} not found`);
      }
      
      // Get comparables
      const { ComparableStorageService } = await import('./services/comparableStorage');
      const storageService = new ComparableStorageService();
      const comparables = await storageService.getComparables(appraisalId);
      
      if (comparables.length === 0) {
        throw new Error('No comparables found for this appraisal');
      }
      
      // Import calculation services
      const { MarketValueCalculator } = await import('../renderer/services/marketValueCalculator');
      
      // Calculate market value
      const calculator = new MarketValueCalculator();
      const calculation = calculator.calculateMarketValue(comparables, appraisal.data);
      const confidence = calculator.calculateConfidenceLevel(comparables);
      
      // Build market analysis result
      const marketAnalysis = {
        appraisalId,
        lossVehicle: appraisal.data,
        comparablesCount: comparables.length,
        comparables,
        calculatedMarketValue: calculation.finalMarketValue,
        calculationMethod: 'quality-weighted-average' as const,
        confidenceLevel: confidence.level,
        confidenceFactors: confidence.factors,
        insuranceValue: appraisal.data.marketValue || 0,
        valueDifference: calculation.finalMarketValue - (appraisal.data.marketValue || 0),
        valueDifferencePercentage: appraisal.data.marketValue 
          ? ((calculation.finalMarketValue - appraisal.data.marketValue) / appraisal.data.marketValue) * 100
          : 0,
        isUndervalued: calculation.finalMarketValue > (appraisal.data.marketValue || 0),
        calculationBreakdown: calculation,
        calculatedAt: new Date(),
        lastUpdated: new Date()
      };
      
      const serializedAnalysis = safeSerialize(marketAnalysis);
      
      logIPC('calculate-market-value-success', { 
        appraisalId, 
        marketValue: calculation.finalMarketValue,
        comparableCount: comparables.length
      });
      
      // Return in the expected format: { success, marketAnalysis, error }
      return { success: true, marketAnalysis: serializedAnalysis };
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('calculate-market-value', { appraisalId }, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  });

  /**
   * Export market analysis report to PDF/HTML
   */
  ipcMain.handle('export-market-analysis', async (event: IpcMainInvokeEvent, appraisalId: string, options?: any) => {
    try {
      logIPC('export-market-analysis', { appraisalId, options });
      
      if (!appraisalId || typeof appraisalId !== 'string') {
        throw new Error('Invalid appraisal ID provided');
      }
      
      // Get the appraisal data
      const appraisal = storage.getAppraisal(appraisalId);
      if (!appraisal) {
        throw new Error(`Appraisal with ID ${appraisalId} not found`);
      }
      
      // Get comparables
      const { ComparableStorageService } = await import('./services/comparableStorage');
      const storageService = new ComparableStorageService();
      const comparables = await storageService.getComparables(appraisalId);
      
      if (comparables.length === 0) {
        throw new Error('No comparables found for this appraisal. Cannot generate report.');
      }
      
      // Calculate market value first
      const { MarketValueCalculator } = await import('../renderer/services/marketValueCalculator');
      const calculator = new MarketValueCalculator();
      const calculation = calculator.calculateMarketValue(comparables, appraisal.data);
      const confidence = calculator.calculateConfidenceLevel(comparables);
      
      // Build market analysis
      const marketAnalysis = {
        appraisalId,
        lossVehicle: appraisal.data,
        comparablesCount: comparables.length,
        comparables,
        calculatedMarketValue: calculation.finalMarketValue,
        calculationMethod: 'quality-weighted-average' as const,
        confidenceLevel: confidence.level,
        confidenceFactors: confidence.factors,
        insuranceValue: appraisal.data.marketValue || 0,
        valueDifference: calculation.finalMarketValue - (appraisal.data.marketValue || 0),
        valueDifferencePercentage: appraisal.data.marketValue 
          ? ((calculation.finalMarketValue - appraisal.data.marketValue) / appraisal.data.marketValue) * 100
          : 0,
        isUndervalued: calculation.finalMarketValue > (appraisal.data.marketValue || 0),
        calculationBreakdown: calculation,
        calculatedAt: new Date(),
        lastUpdated: new Date()
      };
      
      // Set default report options
      const reportOptions = {
        includeSummary: true,
        includeDetailedCalculations: true,
        includeComparablesList: true,
        includeMethodology: true,
        format: 'pdf' as const,
        ...options
      };
      
      // Generate report
      const { ReportGenerationService } = await import('./services/reportGeneration');
      const reportService = new ReportGenerationService();
      const result = await reportService.generateMarketAnalysisReport(marketAnalysis, reportOptions);
      
      if (result.success) {
        logIPC('export-market-analysis-success', { 
          appraisalId, 
          filePath: result.filePath 
        });
      } else {
        logIPC('export-market-analysis-error', { 
          appraisalId, 
          error: result.error 
        });
      }
      
      return result;
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('export-market-analysis', { appraisalId, options }, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during export'
      };
    }
  });

  /**
   * Generate professional appraisal report in DOCX format
   */
  ipcMain.handle('generate-appraisal-report', async (event: IpcMainInvokeEvent, appraisalData: any, options: any, filePath: string) => {
    try {
      logIPC('generate-appraisal-report', { 
        appraisalId: appraisalData?.marketAnalysis?.appraisalId,
        filePath,
        options 
      });
      
      // Validate inputs
      if (!appraisalData) {
        throw new Error('Appraisal data is required');
      }
      
      if (!options) {
        throw new Error('Report options are required');
      }
      
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Valid file path is required');
      }
      
      // Validate required appraisal data fields
      if (!appraisalData.lossVehicle) {
        throw new Error('Loss vehicle data is required');
      }
      
      if (!appraisalData.insuranceInfo) {
        throw new Error('Insurance information is required');
      }
      
      if (!appraisalData.comparables || !Array.isArray(appraisalData.comparables)) {
        throw new Error('Comparables array is required');
      }
      
      if (appraisalData.comparables.length === 0) {
        throw new Error('At least one comparable vehicle is required');
      }
      
      if (!appraisalData.marketAnalysis) {
        throw new Error('Market analysis data is required');
      }
      
      if (!appraisalData.metadata) {
        throw new Error('Report metadata is required');
      }
      
      // Validate required options fields
      if (!options.appraiserName || typeof options.appraiserName !== 'string') {
        throw new Error('Appraiser name is required');
      }
      
      // Import DOCX report generation service
      const { DOCXReportGenerationService } = await import('./services/docxReportGeneration');
      
      // Create service instance
      const reportService = new DOCXReportGenerationService();
      
      // Generate report
      const generatedFilePath = await reportService.generateAppraisalReport(
        appraisalData,
        options,
        filePath
      );
      
      logIPC('generate-appraisal-report-success', { 
        appraisalId: appraisalData.marketAnalysis.appraisalId,
        filePath: generatedFilePath 
      });
      
      return {
        success: true,
        filePath: generatedFilePath
      };
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('generate-appraisal-report', { 
        appraisalId: appraisalData?.marketAnalysis?.appraisalId,
        filePath 
      }, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during report generation'
      };
    }
  });

  // System path handler
  ipcMain.handle('get-path', async (_event, name: 'home' | 'documents' | 'downloads' | 'desktop') => {
    try {
      logIPC('get-path', { name });
      return app.getPath(name);
    } catch (error) {
      logIPC('get-path', { name }, error);
      throw error;
    }
  });

  // ============================================================================
  // Report History Operations
  // ============================================================================

  /**
   * Get all report history records
   */
  ipcMain.handle('get-report-history', async (event: IpcMainInvokeEvent) => {
    try {
      logIPC('get-report-history');
      
      const { getReportHistoryStorage } = await import('./services/reportHistoryStorage');
      const storage = getReportHistoryStorage();
      
      const history = await storage.getHistory();
      const serializedHistory = safeSerialize(history);
      
      logIPC('get-report-history-success', { count: history.length });
      return serializedHistory;
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('get-report-history', null, error);
      throw error;
    }
  });

  /**
   * Add a report to history
   */
  ipcMain.handle('add-report-to-history', async (event: IpcMainInvokeEvent, report: any) => {
    try {
      logIPC('add-report-to-history', { 
        id: report?.id, 
        appraisalId: report?.appraisalId 
      });
      
      if (!report) {
        throw new Error('Report data is required');
      }
      
      if (!report.id || typeof report.id !== 'string') {
        throw new Error('Valid report ID is required');
      }
      
      if (!report.appraisalId || typeof report.appraisalId !== 'string') {
        throw new Error('Valid appraisal ID is required');
      }
      
      const { getReportHistoryStorage } = await import('./services/reportHistoryStorage');
      const storage = getReportHistoryStorage();
      
      const success = await storage.addReport(report);
      
      if (!success) {
        throw new Error('Failed to add report to history');
      }
      
      logIPC('add-report-to-history-success', { 
        id: report.id, 
        appraisalId: report.appraisalId 
      });
      
      return { success: true };
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('add-report-to-history', { 
        id: report?.id, 
        appraisalId: report?.appraisalId 
      }, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Delete a report from history
   */
  ipcMain.handle('delete-report-from-history', async (event: IpcMainInvokeEvent, id: string) => {
    try {
      logIPC('delete-report-from-history', { id });
      
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid report ID provided');
      }
      
      const { getReportHistoryStorage } = await import('./services/reportHistoryStorage');
      const storage = getReportHistoryStorage();
      
      const success = await storage.deleteReport(id);
      
      if (!success) {
        throw new Error(`Report with ID ${id} not found`);
      }
      
      logIPC('delete-report-from-history-success', { id });
      
      return { success: true };
      
    } catch (error) {
      sendError(event, error, ErrorType.STORAGE_ERROR);
      logIPC('delete-report-from-history', { id }, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Open a report file in the default application
   */
  ipcMain.handle('open-report-file', async (event: IpcMainInvokeEvent, filePath: string) => {
    try {
      logIPC('open-report-file', { filePath });
      
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path provided');
      }
      
      const { shell } = await import('electron');
      const result = await shell.openPath(filePath);
      
      if (result) {
        // openPath returns a string with an error message if it fails
        throw new Error(result);
      }
      
      logIPC('open-report-file-success', { filePath });
      
      return { success: true };
      
    } catch (error) {
      sendError(event, error, ErrorType.UNKNOWN_ERROR);
      logIPC('open-report-file', { filePath }, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ============================================================================
  // Error Logging IPC Handlers
  // ============================================================================

  /**
   * Log an error with context
   */
  ipcMain.handle('log-error', async (
    event: IpcMainInvokeEvent,
    service: string,
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ) => {
    try {
      const { errorLogger } = await import('./services/errorLogger');
      const error = new Error(message);
      errorLogger.logError(service, operation, error, context);
      return { success: true };
    } catch (error) {
      console.error('Failed to log error:', error);
      return { success: false };
    }
  });

  /**
   * Log a warning with context
   */
  ipcMain.handle('log-warning', async (
    event: IpcMainInvokeEvent,
    service: string,
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ) => {
    try {
      const { errorLogger } = await import('./services/errorLogger');
      errorLogger.logWarning(service, operation, message, context);
      return { success: true };
    } catch (error) {
      console.error('Failed to log warning:', error);
      return { success: false };
    }
  });

  /**
   * Log informational message with context
   */
  ipcMain.handle('log-info', async (
    event: IpcMainInvokeEvent,
    service: string,
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ) => {
    try {
      const { errorLogger } = await import('./services/errorLogger');
      errorLogger.logInfo(service, operation, message, context);
      return { success: true };
    } catch (error) {
      console.error('Failed to log info:', error);
      return { success: false };
    }
  });

  /**
   * Get recent log entries
   */
  ipcMain.handle('get-recent-logs', async (event: IpcMainInvokeEvent, count?: number) => {
    try {
      const { errorLogger } = await import('./services/errorLogger');
      const logs = errorLogger.getRecentLogs(count || 100);
      return { success: true, logs };
    } catch (error) {
      console.error('Failed to get recent logs:', error);
      return { success: false, logs: [] };
    }
  });

  /**
   * Get log file path
   */
  ipcMain.handle('get-log-file-path', async (event: IpcMainInvokeEvent) => {
    try {
      const { errorLogger } = await import('./services/errorLogger');
      const filePath = errorLogger.getLogFilePath();
      return { success: true, filePath };
    } catch (error) {
      console.error('Failed to get log file path:', error);
      return { success: false, filePath: null };
    }
  });
};
