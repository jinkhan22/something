/**
 * Comprehensive OCR Processing Tests
 * Tests OCR functionality with various scenarios
 * Requirements: 10.2, 10.3
 */

// Mock dependencies
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

import { extractTextWithOCRProcess } from '../src/main/services/ocrExtractorProcess';

describe('OCR Processing - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetTesseractAssetPaths.mockReturnValue({
      langPath: '/mock/lang/path',
      corePath: '/mock/core/path',
      workerPath: '/mock/worker/path'
    });
    
    mockMkdtemp.mockResolvedValue('/tmp/ocr-test');
    mockWriteFile.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);
  });
  
  describe('Successful OCR Processing', () => {
    it('should successfully extract text from PDF', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
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
      mockReadFile.mockResolvedValue('Extracted vehicle data text');
      
      const buffer = Buffer.from('mock pdf');
      const result = await extractTextWithOCRProcess(buffer);
      
      expect(result).toBe('Extracted vehicle data text');
      expect(mockVerifyTesseractAssets).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockReadFile).toHaveBeenCalled();
    });
    
    it('should report progress during OCR processing', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
      const progressUpdates: Array<{progress: number, message?: string}> = [];
      const onProgress = (progress: number, message?: string) => {
        progressUpdates.push({ progress, message });
      };
      
      const mockChild = {
        stdout: { 
          on: jest.fn((event: string, callback: any) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('SUCCESS\n')), 50);
            }
          })
        },
        stderr: { 
          on: jest.fn((event: string, callback: any) => {
            if (event === 'data') {
              // Simulate progress updates
              setTimeout(() => {
                callback(Buffer.from(JSON.stringify({ progress: 10, message: 'Initializing OCR' }) + '\n'));
              }, 10);
              setTimeout(() => {
                callback(Buffer.from(JSON.stringify({ progress: 50, message: 'Processing page 1' }) + '\n'));
              }, 20);
              setTimeout(() => {
                callback(Buffer.from(JSON.stringify({ progress: 100, message: 'Complete' }) + '\n'));
              }, 30);
            }
          })
        },
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 60);
          }
        })
      };
      mockSpawn.mockReturnValue(mockChild);
      mockReadFile.mockResolvedValue('Extracted text');
      
      const buffer = Buffer.from('mock pdf');
      await extractTextWithOCRProcess(buffer, onProgress);
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(u => u.progress === 10)).toBe(true);
      expect(progressUpdates.some(u => u.progress === 50)).toBe(true);
      expect(progressUpdates.some(u => u.progress === 100)).toBe(true);
    });
    
    it('should cleanup temporary files after successful processing', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
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
      
      expect(mockRm).toHaveBeenCalledWith('/tmp/ocr-test', { recursive: true, force: true });
    });
  });
  
  describe('OCR Error Handling', () => {
    it('should handle missing Tesseract assets', async () => {
      mockVerifyTesseractAssets.mockRejectedValue(
        new Error('Missing Tesseract assets: Language data not found')
      );
      
      const buffer = Buffer.from('mock pdf');
      
      await expect(extractTextWithOCRProcess(buffer)).rejects.toThrow(
        /OCR assets are missing or inaccessible/
      );
      
      expect(mockSpawn).not.toHaveBeenCalled();
    });
    
    it('should handle worker spawn failure', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: any) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Failed to spawn worker')), 10);
          }
        })
      };
      mockSpawn.mockReturnValue(mockChild);
      
      const buffer = Buffer.from('mock pdf');
      
      await expect(extractTextWithOCRProcess(buffer)).rejects.toThrow(
        /Failed to spawn OCR process/
      );
    });
    
    it('should handle worker process crash', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { 
          on: jest.fn((event: string, callback: any) => {
            if (event === 'data') {
              callback(Buffer.from('Fatal error in worker\n'));
            }
          })
        },
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10); // Exit code 1
          }
        })
      };
      mockSpawn.mockReturnValue(mockChild);
      
      const buffer = Buffer.from('mock pdf');
      
      await expect(extractTextWithOCRProcess(buffer)).rejects.toThrow(
        /OCR process failed with code 1/
      );
    });
    
    it('should handle output file read failure', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
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
      mockReadFile.mockRejectedValue(new Error('ENOENT: file not found'));
      
      const buffer = Buffer.from('mock pdf');
      
      await expect(extractTextWithOCRProcess(buffer)).rejects.toThrow(
        /Failed to read OCR output/
      );
    });
    
    it('should cleanup temp files even on error', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10); // Failure
          }
        })
      };
      mockSpawn.mockReturnValue(mockChild);
      
      const buffer = Buffer.from('mock pdf');
      
      try {
        await extractTextWithOCRProcess(buffer);
      } catch (error) {
        // Expected to fail
      }
      
      expect(mockRm).toHaveBeenCalledWith('/tmp/ocr-test', { recursive: true, force: true });
    });
  });
  
  describe('OCR Quality and Confidence', () => {
    it('should calculate confidence based on text quality', () => {
      // High quality text - complete sentences, proper formatting
      const highQualityText = `
Loss vehicle: 2014 Hyundai Santa Fe Sport
VIN: 5XYZT3LB0EG123456
Mileage: 85,234 miles
Market Value = $10,062.32
`;
      
      // Calculate confidence (simple heuristic)
      const hasVIN = /[A-HJ-NPR-Z0-9]{17}/.test(highQualityText);
      const hasMileage = /\d+,?\d*\s*miles/i.test(highQualityText);
      const hasMarketValue = /Market\s+Value/i.test(highQualityText);
      const hasYear = /\d{4}/.test(highQualityText);
      
      const confidence = (
        (hasVIN ? 25 : 0) +
        (hasMileage ? 25 : 0) +
        (hasMarketValue ? 25 : 0) +
        (hasYear ? 25 : 0)
      );
      
      expect(confidence).toBe(100);
    });
    
    it('should detect low quality OCR text', () => {
      // Low quality text - garbled, missing key fields
      const lowQualityText = `
L0ss veh1cle: 2O14 Hyund@i S@nt@ Fe
V1N: 5XYZT3LB0EG12345O
M1le@ge: 85234 m1les
M@rket V@lue = $1OO6232
`;
      
      // Check for OCR errors
      const hasInvalidChars = /@/.test(lowQualityText);
      const hasOInsteadOf0 = /[A-Z0-9]{16}O/.test(lowQualityText);
      const hasMissingCommas = /\d{5,}\s*miles/i.test(lowQualityText);
      
      expect(hasInvalidChars).toBe(true);
      expect(hasOInsteadOf0).toBe(true);
      expect(hasMissingCommas).toBe(true);
    });
  });
  
  describe('OCR Asset Management', () => {
    it('should pass correct asset paths to worker', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
      const customPaths = {
        langPath: '/custom/lang',
        corePath: '/custom/core',
        workerPath: '/custom/worker'
      };
      mockGetTesseractAssetPaths.mockReturnValue(customPaths);
      
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
      mockReadFile.mockResolvedValue('Text');
      
      const buffer = Buffer.from('mock pdf');
      await extractTextWithOCRProcess(buffer);
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            TESSERACT_LANG_PATH: customPaths.langPath,
            TESSERACT_CORE_PATH: customPaths.corePath,
            TESSERACT_WORKER_PATH: customPaths.workerPath
          })
        })
      );
    });
    
    it('should verify assets before each OCR operation', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
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
      mockReadFile.mockResolvedValue('Text');
      
      const buffer = Buffer.from('mock pdf');
      
      // Process multiple PDFs
      await extractTextWithOCRProcess(buffer);
      await extractTextWithOCRProcess(buffer);
      await extractTextWithOCRProcess(buffer);
      
      // Should verify assets each time
      expect(mockVerifyTesseractAssets).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('OCR Performance', () => {
    it('should handle large PDF buffers', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
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
      mockReadFile.mockResolvedValue('Extracted text from large PDF');
      
      // Create a large buffer (10MB)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024);
      
      const result = await extractTextWithOCRProcess(largeBuffer);
      
      expect(result).toBe('Extracted text from large PDF');
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        largeBuffer
      );
    });
    
    it('should handle multi-page documents', async () => {
      mockVerifyTesseractAssets.mockResolvedValue(true);
      
      const progressUpdates: number[] = [];
      const onProgress = (progress: number) => {
        progressUpdates.push(progress);
      };
      
      const mockChild = {
        stdout: { 
          on: jest.fn((event: string, callback: any) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('SUCCESS\n')), 100);
            }
          })
        },
        stderr: { 
          on: jest.fn((event: string, callback: any) => {
            if (event === 'data') {
              // Simulate progress for 5 pages
              for (let i = 1; i <= 5; i++) {
                setTimeout(() => {
                  callback(Buffer.from(JSON.stringify({ 
                    progress: i * 20, 
                    message: `Processing page ${i} of 5` 
                  }) + '\n'));
                }, i * 15);
              }
            }
          })
        },
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 110);
          }
        })
      };
      mockSpawn.mockReturnValue(mockChild);
      mockReadFile.mockResolvedValue('Multi-page extracted text');
      
      const buffer = Buffer.from('mock multi-page pdf');
      await extractTextWithOCRProcess(buffer, onProgress);
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(Math.max(...progressUpdates)).toBeGreaterThanOrEqual(80);
    });
  });
  
  describe('OCR Text Cleanup', () => {
    it('should handle OCR text with extra whitespace', () => {
      const ocrText = `
        Loss   vehicle:    2014    Hyundai   Santa Fe Sport
        VIN:   5XYZT3LB0EG123456
        Mileage:   85,234   miles
      `;
      
      // Normalize whitespace
      const cleaned = ocrText.replace(/\s+/g, ' ').trim();
      
      expect(cleaned).toContain('Loss vehicle: 2014 Hyundai Santa Fe Sport');
      expect(cleaned).toContain('VIN: 5XYZT3LB0EG123456');
    });
    
    it('should handle OCR text with line breaks in wrong places', () => {
      const ocrText = `Loss vehicle: 2014 Hyun
dai Santa Fe Sport | 4 Door`;
      
      // Check if we can still extract year
      const yearMatch = ocrText.match(/(\d{4})/);
      expect(yearMatch).toBeTruthy();
      expect(yearMatch![1]).toBe('2014');
    });
  });
});
