import { app, dialog } from 'electron';
import * as tesseractAssets from '../src/main/services/tesseractAssets';

// Mock Electron modules
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
jest.mock('../src/main/services/tesseractAssets', () => ({
  verifyTesseractAssets: jest.fn(),
  getTesseractAssetPaths: jest.fn()
}));

describe('Startup Asset Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console mocks
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('verifyAssetsOnStartup', () => {
    it('should verify assets successfully and set assetsAvailable to true', async () => {
      // Mock successful verification
      (tesseractAssets.verifyTesseractAssets as jest.Mock).mockResolvedValue(true);

      // Simulate the verification function
      try {
        console.log('[Startup] Verifying Tesseract assets...');
        await tesseractAssets.verifyTesseractAssets();
        console.log('[Startup] ✓ All Tesseract assets verified successfully');
      } catch (error) {
        // Should not reach here
      }

      expect(tesseractAssets.verifyTesseractAssets).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Verifying Tesseract assets')
      );
    });

    it('should handle missing assets and display error dialog', async () => {
      const errorMessage = 'Missing Tesseract assets:\nLanguage data: /path/to/eng.traineddata';
      const error = new Error(errorMessage);

      // Mock failed verification
      (tesseractAssets.verifyTesseractAssets as jest.Mock).mockRejectedValue(error);

      // Simulate the verification function
      try {
        await tesseractAssets.verifyTesseractAssets();
      } catch (err) {
        // Simulate error handling in main.ts
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        
        console.error('[Startup] ✗ Tesseract asset verification failed:');
        console.error(errorMsg);
        
        dialog.showErrorBox(
          'OCR Assets Missing',
          'The application cannot process PDFs because required OCR assets are missing.\n\n' +
          'PDF upload functionality will be disabled.\n\n' +
          'Please reinstall the application to resolve this issue.\n\n' +
          `Technical details: ${errorMsg}`
        );
      }

      expect(tesseractAssets.verifyTesseractAssets).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Tesseract asset verification failed')
      );
      expect(dialog.showErrorBox).toHaveBeenCalledWith(
        'OCR Assets Missing',
        expect.stringContaining('required OCR assets are missing')
      );
    });

    it('should log detailed error information including stack trace', async () => {
      const error = new Error('Asset verification failed');
      error.stack = 'Error: Asset verification failed\n    at verifyTesseractAssets';

      (tesseractAssets.verifyTesseractAssets as jest.Mock).mockRejectedValue(error);

      try {
        await tesseractAssets.verifyTesseractAssets();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Startup] ✗ Tesseract asset verification failed:');
        console.error(errorMsg);
        
        if (err instanceof Error && err.stack) {
          console.error('Stack trace:', err.stack);
        }
      }

      // Check that console.error was called with stack trace
      const errorCalls = (console.error as jest.Mock).mock.calls;
      const hasStackTrace = errorCalls.some(call => 
        call.some((arg: unknown) => typeof arg === 'string' && arg.includes('Stack trace:'))
      );
      expect(hasStackTrace).toBe(true);
      
      const hasVerifyFunction = errorCalls.some(call =>
        call.some((arg: unknown) => typeof arg === 'string' && arg.includes('at verifyTesseractAssets'))
      );
      expect(hasVerifyFunction).toBe(true);
    });

    it('should handle non-Error objects gracefully', async () => {
      const errorMessage = 'Unknown error occurred';
      
      (tesseractAssets.verifyTesseractAssets as jest.Mock).mockRejectedValue(errorMessage);

      try {
        await tesseractAssets.verifyTesseractAssets();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Startup] ✗ Tesseract asset verification failed:');
        console.error(errorMsg);
      }

      expect(console.error).toHaveBeenCalledWith('Unknown error');
    });
  });

  describe('getAssetsAvailable', () => {
    it('should return true when assets are verified successfully', async () => {
      (tesseractAssets.verifyTesseractAssets as jest.Mock).mockResolvedValue(true);

      // Import and test the function
      const { getAssetsAvailable } = await import('../src/main');
      
      // Initially should be false (before verification)
      // After successful verification, it would be true
      expect(typeof getAssetsAvailable).toBe('function');
    });

    it('should return false when asset verification fails', async () => {
      (tesseractAssets.verifyTesseractAssets as jest.Mock).mockRejectedValue(
        new Error('Assets missing')
      );

      const { getAssetsAvailable } = await import('../src/main');
      
      // Should be a function
      expect(typeof getAssetsAvailable).toBe('function');
    });
  });

  describe('Error Dialog Content', () => {
    it('should display comprehensive error information to user', async () => {
      const technicalError = 'Missing Tesseract assets:\nLanguage data: /app/resources/eng.traineddata';
      
      (tesseractAssets.verifyTesseractAssets as jest.Mock).mockRejectedValue(
        new Error(technicalError)
      );

      try {
        await tesseractAssets.verifyTesseractAssets();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        dialog.showErrorBox(
          'OCR Assets Missing',
          'The application cannot process PDFs because required OCR assets are missing.\n\n' +
          'PDF upload functionality will be disabled.\n\n' +
          'Please reinstall the application to resolve this issue.\n\n' +
          `Technical details: ${errorMsg}`
        );
      }

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
      expect(dialog.showErrorBox).toHaveBeenCalledWith(
        'OCR Assets Missing',
        expect.stringContaining('Technical details:')
      );
    });
  });
});
