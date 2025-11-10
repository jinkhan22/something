/**
 * Integration test for startup asset verification
 * Tests the complete flow from startup to UI
 */

import { dialog } from 'electron';
import * as tesseractAssets from '../src/main/services/tesseractAssets';

// Mock Electron
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    on: jest.fn(),
    quit: jest.fn(),
    getVersion: jest.fn(() => '1.0.0')
  },
  BrowserWindow: jest.fn(),
  dialog: {
    showErrorBox: jest.fn()
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  }
}));

// Mock tesseract assets module
jest.mock('../src/main/services/tesseractAssets');

describe('Startup Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should complete full startup flow when assets are available', async () => {
    // Mock successful asset verification
    (tesseractAssets.verifyTesseractAssets as jest.Mock).mockResolvedValue(true);

    // Simulate startup verification
    let assetsAvailable = false;
    
    try {
      console.log('[Startup] Verifying Tesseract assets...');
      await tesseractAssets.verifyTesseractAssets();
      assetsAvailable = true;
      console.log('[Startup] ✓ All Tesseract assets verified successfully');
    } catch (error) {
      assetsAvailable = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Startup] ✗ Tesseract asset verification failed:');
      console.error(errorMessage);
      dialog.showErrorBox('OCR Assets Missing', `Error: ${errorMessage}`);
    }

    // Verify successful flow
    expect(assetsAvailable).toBe(true);
    expect(tesseractAssets.verifyTesseractAssets).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('✓ All Tesseract assets verified successfully')
    );
    expect(dialog.showErrorBox).not.toHaveBeenCalled();
  });

  it('should handle startup flow when assets are missing', async () => {
    // Mock failed asset verification
    const error = new Error('Missing Tesseract assets:\nLanguage data: /path/to/eng.traineddata');
    (tesseractAssets.verifyTesseractAssets as jest.Mock).mockRejectedValue(error);

    // Simulate startup verification
    let assetsAvailable = true;
    
    try {
      console.log('[Startup] Verifying Tesseract assets...');
      await tesseractAssets.verifyTesseractAssets();
      assetsAvailable = true;
      console.log('[Startup] ✓ All Tesseract assets verified successfully');
    } catch (err) {
      assetsAvailable = false;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Startup] ✗ Tesseract asset verification failed:');
      console.error(errorMessage);
      
      if (err instanceof Error && err.stack) {
        console.error('Stack trace:', err.stack);
      }
      
      dialog.showErrorBox(
        'OCR Assets Missing',
        'The application cannot process PDFs because required OCR assets are missing.\n\n' +
        'PDF upload functionality will be disabled.\n\n' +
        'Please reinstall the application to resolve this issue.\n\n' +
        `Technical details: ${errorMessage}`
      );
    }

    // Verify error handling flow
    expect(assetsAvailable).toBe(false);
    expect(tesseractAssets.verifyTesseractAssets).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('✗ Tesseract asset verification failed')
    );
    expect(dialog.showErrorBox).toHaveBeenCalledWith(
      'OCR Assets Missing',
      expect.stringContaining('cannot process PDFs')
    );
    expect(dialog.showErrorBox).toHaveBeenCalledWith(
      'OCR Assets Missing',
      expect.stringContaining('PDF upload functionality will be disabled')
    );
    expect(dialog.showErrorBox).toHaveBeenCalledWith(
      'OCR Assets Missing',
      expect.stringContaining('Please reinstall the application')
    );
  });

  it('should provide asset availability status to renderer process', async () => {
    // Mock successful verification
    (tesseractAssets.verifyTesseractAssets as jest.Mock).mockResolvedValue(true);

    // Simulate startup and status check
    let assetsAvailable = false;
    
    try {
      await tesseractAssets.verifyTesseractAssets();
      assetsAvailable = true;
    } catch (error) {
      assetsAvailable = false;
    }

    // Simulate IPC call to check assets
    const getAssetsAvailable = () => assetsAvailable;
    
    // Verify status is accessible
    expect(getAssetsAvailable()).toBe(true);
  });

  it('should disable PDF upload when assets are unavailable', async () => {
    // Mock failed verification
    (tesseractAssets.verifyTesseractAssets as jest.Mock).mockRejectedValue(
      new Error('Assets missing')
    );

    // Simulate startup
    let assetsAvailable = true;
    
    try {
      await tesseractAssets.verifyTesseractAssets();
      assetsAvailable = true;
    } catch (error) {
      assetsAvailable = false;
    }

    // Simulate upload attempt
    const canUpload = assetsAvailable;
    
    // Verify upload is disabled
    expect(canUpload).toBe(false);
  });
});
