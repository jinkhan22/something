import * as path from 'path';

// Mock electron app
const mockApp = {
  isPackaged: false,
};

// Mock fs/promises access function
const mockFsAccess = jest.fn();

// Mock electron module
jest.mock('electron', () => ({
  app: mockApp,
}));

// Mock fs/promises module
jest.mock('fs/promises', () => ({
  access: mockFsAccess,
}));

// Import the module after mocking
import { getTesseractAssetPaths, verifyTesseractAssets } from '../src/main/services/tesseractAssets';

describe('tesseractAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApp.isPackaged = false;
  });

  describe('getTesseractAssetPaths', () => {
    it('should return development paths when app is not packaged', () => {
      mockApp.isPackaged = false;
      const originalCwd = process.cwd();
      
      const paths = getTesseractAssetPaths();
      
      expect(paths.langPath).toBe(path.join(originalCwd, 'node_modules', 'tesseract.js-core'));
      expect(paths.corePath).toBe(path.join(originalCwd, 'node_modules', 'tesseract.js-core'));
      expect(paths.workerPath).toBe(path.join(originalCwd, 'node_modules', 'tesseract.js', 'src', 'worker-script'));
    });

    it('should return production paths when app is packaged', () => {
      mockApp.isPackaged = true;
      const mockResourcesPath = '/app/resources';
      Object.defineProperty(process, 'resourcesPath', {
        value: mockResourcesPath,
        writable: true,
        configurable: true,
      });
      
      const paths = getTesseractAssetPaths();
      
      const expectedPath = path.join(mockResourcesPath, 'tesseract-assets');
      expect(paths.langPath).toBe(expectedPath);
      expect(paths.corePath).toBe(expectedPath);
      expect(paths.workerPath).toBe(expectedPath);
    });

    it('should use correct path separators for the platform', () => {
      mockApp.isPackaged = false;
      
      const paths = getTesseractAssetPaths();
      
      // Verify paths use platform-specific separators
      expect(paths.langPath).toContain(path.sep);
      expect(paths.corePath).toContain(path.sep);
      expect(paths.workerPath).toContain(path.sep);
    });
  });

  describe('verifyTesseractAssets', () => {
    it('should return true when all assets exist in development', async () => {
      mockApp.isPackaged = false;
      mockFsAccess.mockResolvedValue(undefined);
      
      const result = await verifyTesseractAssets();
      
      expect(result).toBe(true);
      expect(mockFsAccess).toHaveBeenCalledTimes(1); // Only checks eng.traineddata in dev
    });

    it('should return true when all assets exist in production', async () => {
      mockApp.isPackaged = true;
      mockFsAccess.mockResolvedValue(undefined);
      
      const result = await verifyTesseractAssets();
      
      expect(result).toBe(true);
      expect(mockFsAccess).toHaveBeenCalledTimes(1); // Only checks eng.traineddata (core worker bundled with tesseract.js)
    });

    it('should throw error when eng.traineddata is missing', async () => {
      mockApp.isPackaged = false;
      mockFsAccess.mockRejectedValue(new Error('ENOENT'));
      
      await expect(verifyTesseractAssets()).rejects.toThrow('Missing Tesseract assets');
      await expect(verifyTesseractAssets()).rejects.toThrow('Language data');
    });

    it('should throw error listing missing language data', async () => {
      mockApp.isPackaged = true;
      mockFsAccess.mockRejectedValue(new Error('ENOENT')); // Language data missing
      
      try {
        await verifyTesseractAssets();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Missing Tesseract assets');
        expect(error.message).toContain('Language data');
      }
    });

    it('should check correct file paths', async () => {
      mockApp.isPackaged = false;
      mockFsAccess.mockResolvedValue(undefined);
      
      await verifyTesseractAssets();
      
      const callArgs = mockFsAccess.mock.calls[0][0] as string;
      expect(callArgs).toContain('eng.traineddata');
    });
  });
});
