/**
 * Tests for OCR Extractor Process
 * Verifies asset verification and error handling
 */

// Mock dependencies before imports
const mockVerifyTesseractAssets = jest.fn();
const mockGetTesseractAssetPaths = jest.fn();
const mockSpawn = jest.fn();
const mockWriteFile = jest.fn();
const mockReadFile = jest.fn();
const mockMkdtemp = jest.fn();
const mockRm = jest.fn();

jest.mock('child_process', () => ({
  spawn: mockSpawn
}));

jest.mock('fs', () => ({
  promises: {
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    mkdtemp: mockMkdtemp,
    rm: mockRm
  }
}));

jest.mock('electron', () => ({
  app: {
    getAppPath: () => '/mock/app/path',
    isPackaged: false
  }
}));

jest.mock('../src/main/services/tesseractAssets', () => ({
  verifyTesseractAssets: mockVerifyTesseractAssets,
  getTesseractAssetPaths: mockGetTesseractAssetPaths
}));

// Import after mocks
import { extractTextWithOCRProcess } from '../src/main/services/ocrExtractorProcess';

describe('OCR Extractor Process', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockGetTesseractAssetPaths.mockReturnValue({
      langPath: '/mock/lang/path',
      corePath: '/mock/core/path',
      workerPath: '/mock/worker/path'
    });
    
    mockMkdtemp.mockResolvedValue('/tmp/ocr-test');
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue('Extracted text');
    mockRm.mockResolvedValue(undefined);
  });
  
  describe('Asset Verification', () => {
    it('should verify Tesseract assets before spawning worker', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
      // Mock successful spawn
      const mockChild = {
        stdout: { 
          on: jest.fn((event: string, callback: any) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('SUCCESS\n')), 5);
            }
          })
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            // Simulate successful completion
            setTimeout(() => callback(0), 10);
          }
        })
      };
      mockSpawn.mockReturnValue(mockChild);
      mockReadFile.mockResolvedValue('Extracted text');
      
      const buffer = Buffer.from('mock pdf');
      await extractTextWithOCRProcess(buffer);
      
      expect(mockVerifyTesseractAssets).toHaveBeenCalledTimes(1);
    });
    
    it('should throw user-friendly error when assets are missing', async () => {
      mockVerifyTesseractAssets.mockRejectedValue(
        new Error('Missing Tesseract assets:\nLanguage data: /path/to/eng.traineddata')
      );
      
      const buffer = Buffer.from('mock pdf');
      
      await expect(extractTextWithOCRProcess(buffer)).rejects.toThrow(
        /OCR assets are missing or inaccessible/
      );
      
      await expect(extractTextWithOCRProcess(buffer)).rejects.toThrow(
        /Please reinstall the application/
      );
    });
    
    it('should include details about missing assets in error message', async () => {
      const assetError = 'Missing Tesseract assets:\nLanguage data: /path/to/eng.traineddata';
      mockVerifyTesseractAssets.mockRejectedValue(new Error(assetError));
      
      const buffer = Buffer.from('mock pdf');
      
      await expect(extractTextWithOCRProcess(buffer)).rejects.toThrow(assetError);
    });
  });
  
  describe('Asset Path Passing', () => {
    it('should pass asset paths to worker via environment variables', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
      const mockAssetPaths = {
        langPath: '/custom/lang/path',
        corePath: '/custom/core/path',
        workerPath: '/custom/worker/path'
      };
      mockGetTesseractAssetPaths.mockReturnValue(mockAssetPaths);
      
      // Mock successful spawn
      const mockChild = {
        stdout: { 
          on: jest.fn((event: string, callback: any) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('SUCCESS\n')), 5);
            }
          })
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        })
      };
      mockSpawn.mockReturnValue(mockChild);
      mockReadFile.mockResolvedValue('Extracted text');
      
      const buffer = Buffer.from('mock pdf');
      await extractTextWithOCRProcess(buffer);
      
      expect(mockGetTesseractAssetPaths).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            TESSERACT_LANG_PATH: mockAssetPaths.langPath,
            TESSERACT_CORE_PATH: mockAssetPaths.corePath,
            TESSERACT_WORKER_PATH: mockAssetPaths.workerPath
          })
        })
      );
    });
  });
  
  describe('Error Handling', () => {
    it('should handle worker spawn errors gracefully', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: any) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Spawn failed')), 10);
          }
        })
      };
      mockSpawn.mockReturnValue(mockChild);
      
      const buffer = Buffer.from('mock pdf');
      
      await expect(extractTextWithOCRProcess(buffer)).rejects.toThrow(
        /Failed to spawn OCR process/
      );
    });
    
    it('should handle worker process failures', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn((event: string, callback: any) => {
          if (event === 'data') {
            callback(Buffer.from('Error: Asset loading failed'));
          }
        }) },
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10); // Exit code 1 = failure
          }
        })
      };
      mockSpawn.mockReturnValue(mockChild);
      
      const buffer = Buffer.from('mock pdf');
      
      await expect(extractTextWithOCRProcess(buffer)).rejects.toThrow(
        /OCR process failed with code 1/
      );
    });
  });
});
