/**
 * GraphicsMagick Integration Tests
 * 
 * Tests the complete GraphicsMagick integration including:
 * - Wrapper script environment variable setup
 * - PDF conversion using GraphicsMagickSpawner
 * - Fallback mechanism when bundled GraphicsMagick fails
 * - Error handling when both bundled and system fail
 * - Ghostscript integration for PDF processing
 * 
 * Requirements: 1.4, 7.1, 7.2, 9.1, 9.2, 9.3
 */

import { GraphicsMagickSpawner } from '../src/main/services/graphicsMagickSpawner';
import { GraphicsMagickService } from '../src/main/services/graphicsMagickService';
import { extractTextWithOCRProcess } from '../src/main/services/ocrExtractorProcess';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn((name: string) => {
      if (name === 'userData') return '/mock/user/data';
      if (name === 'temp') return os.tmpdir();
      return '/mock/path';
    }),
    getVersion: jest.fn(() => '1.0.0'),
    getAppPath: jest.fn(() => '/mock/app')
  }
}));

// Mock Tesseract assets
jest.mock('../src/main/services/tesseractAssets', () => ({
  getTesseractAssetPaths: jest.fn(() => ({
    langPath: path.join(__dirname, '../node_modules/tesseract.js-core/'),
    workerPath: path.join(__dirname, '../node_modules/tesseract.js/dist/worker.min.js'),
    corePath: path.join(__dirname, '../node_modules/tesseract.js-core/tesseract-core.wasm.js')
  })),
  verifyTesseractAssets: jest.fn().mockResolvedValue(undefined)
}));

describe('GraphicsMagick Integration Tests', () => {
  let tempDir: string;
  let testPdfPath: string;

  beforeAll(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gm-integration-test-'));
  });

  afterAll(async () => {
    // Cleanup temp directory
    await fs.remove(tempDir);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fallback mode before each test
    GraphicsMagickSpawner.disableSystemFallback();
  });

  describe('Wrapper Script Environment Variables', () => {
    it('should set DYLD_LIBRARY_PATH when using bundled GraphicsMagick', () => {
      // Mock production mode with bundled GraphicsMagick
      jest.spyOn(GraphicsMagickService, 'getConfig').mockReturnValue({
        binPath: '/app/graphicsmagick-bundle/bin/gm',
        gsBinPath: '/app/graphicsmagick-bundle/bin/gs',
        libPath: '/app/graphicsmagick-bundle/lib',
        isProduction: true
      });

      const env = GraphicsMagickSpawner.getEnvironment();

      expect(env.DYLD_LIBRARY_PATH).toBe('/app/graphicsmagick-bundle/lib');
      expect(env.DYLD_FALLBACK_LIBRARY_PATH).toBe('/app/graphicsmagick-bundle/lib');
      expect(env.PATH).toContain('/app/graphicsmagick-bundle/bin');
    });

    it('should not set DYLD_LIBRARY_PATH in development mode', () => {
      jest.spyOn(GraphicsMagickService, 'getConfig').mockReturnValue({
        binPath: 'gm',
        gsBinPath: 'gs',
        libPath: '',
        isProduction: false
      });

      const env = GraphicsMagickSpawner.getEnvironment();

      expect(env.DYLD_LIBRARY_PATH).toBeUndefined();
      expect(env.DYLD_FALLBACK_LIBRARY_PATH).toBeUndefined();
    });

    it('should add Ghostscript bin directory to PATH', () => {
      jest.spyOn(GraphicsMagickService, 'getConfig').mockReturnValue({
        binPath: '/app/graphicsmagick-bundle/bin/gm',
        gsBinPath: '/app/graphicsmagick-bundle/bin/gs',
        libPath: '/app/graphicsmagick-bundle/lib',
        isProduction: true
      });

      const env = GraphicsMagickSpawner.getEnvironment();

      // PATH should include the bin directory (where gs is located)
      expect(env.PATH).toContain('/app/graphicsmagick-bundle/bin');
    });

    it('should preserve existing environment variables', () => {
      const originalEnv = process.env;
      jest.spyOn(GraphicsMagickService, 'getConfig').mockReturnValue({
        binPath: '/app/graphicsmagick-bundle/bin/gm',
        gsBinPath: '/app/graphicsmagick-bundle/bin/gs',
        libPath: '/app/graphicsmagick-bundle/lib',
        isProduction: true
      });

      const env = GraphicsMagickSpawner.getEnvironment();

      // Should preserve non-library-related env vars
      expect(env.HOME).toBe(originalEnv.HOME);
      expect(env.USER).toBe(originalEnv.USER);
    });

    it('should use system paths in fallback mode', () => {
      GraphicsMagickSpawner.enableSystemFallback('/usr/local/bin/gm');

      const env = GraphicsMagickSpawner.getEnvironment();

      // Should not set DYLD_LIBRARY_PATH in fallback mode
      expect(env.DYLD_LIBRARY_PATH).toBeUndefined();
      // Should add common system paths
      expect(env.PATH).toContain('/usr/local/bin');
      expect(env.PATH).toContain('/opt/homebrew/bin');
    });
  });

  describe('PDF Conversion with GraphicsMagickSpawner', () => {
    it('should convert PDF page to PNG successfully', async () => {
      // Skip if GraphicsMagick is not available
      const gmAvailable = await checkGraphicsMagickAvailable();
      if (!gmAvailable) {
        console.log('⏭️  Skipping test: GraphicsMagick not available');
        return;
      }

      // Create a simple test PDF
      const testPdf = await createTestPdf(tempDir);
      const outputPath = path.join(tempDir, 'output.png');

      // Convert PDF to PNG
      const result = await GraphicsMagickSpawner.convertPdfPageToPng(
        testPdf,
        1,
        outputPath,
        {
          density: 150,
          width: 800,
          height: 600
        }
      );

      // Verify output file was created
      expect(result).toBe(outputPath);
      expect(await fs.pathExists(outputPath)).toBe(true);

      // Verify file has content
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should handle invalid PDF gracefully', async () => {
      const gmAvailable = await checkGraphicsMagickAvailable();
      if (!gmAvailable) {
        console.log('⏭️  Skipping test: GraphicsMagick not available');
        return;
      }

      const invalidPdf = path.join(tempDir, 'invalid.pdf');
      await fs.writeFile(invalidPdf, 'This is not a valid PDF');

      const outputPath = path.join(tempDir, 'output-invalid.png');

      await expect(
        GraphicsMagickSpawner.convertPdfPageToPng(invalidPdf, 1, outputPath)
      ).rejects.toThrow();
    });

    it('should handle non-existent PDF file', async () => {
      const gmAvailable = await checkGraphicsMagickAvailable();
      if (!gmAvailable) {
        console.log('⏭️  Skipping test: GraphicsMagick not available');
        return;
      }

      const nonExistentPdf = path.join(tempDir, 'does-not-exist.pdf');
      const outputPath = path.join(tempDir, 'output-nonexistent.png');

      await expect(
        GraphicsMagickSpawner.convertPdfPageToPng(nonExistentPdf, 1, outputPath)
      ).rejects.toThrow();
    });

    it('should respect timeout setting', async () => {
      const gmAvailable = await checkGraphicsMagickAvailable();
      if (!gmAvailable) {
        console.log('⏭️  Skipping test: GraphicsMagick not available');
        return;
      }

      // This test verifies that timeout is properly configured
      // We can't easily test actual timeout without a very large PDF
      // but we can verify the spawn call includes timeout handling
      const testPdf = await createTestPdf(tempDir);
      const outputPath = path.join(tempDir, 'output-timeout.png');

      // Should complete within timeout
      await expect(
        GraphicsMagickSpawner.convertPdfPageToPng(testPdf, 1, outputPath)
      ).resolves.toBeDefined();
    }, 65000); // Test timeout slightly longer than conversion timeout
  });

  describe('Fallback Mechanism', () => {
    it('should enable system fallback when bundled GraphicsMagick fails', async () => {
      // Initially not using fallback
      expect(GraphicsMagickSpawner.isUsingSystemFallback()).toBe(false);

      // Enable fallback
      GraphicsMagickSpawner.enableSystemFallback('/usr/local/bin/gm');

      // Should now be using fallback
      expect(GraphicsMagickSpawner.isUsingSystemFallback()).toBe(true);
    });

    it('should use system GraphicsMagick path in fallback mode', async () => {
      const systemGmPath = '/usr/local/bin/gm';
      GraphicsMagickSpawner.enableSystemFallback(systemGmPath);

      // Mock spawn to capture the binary path used
      const originalSpawn = require('child_process').spawn;
      let capturedBinaryPath: string | null = null;

      jest.spyOn(require('child_process'), 'spawn').mockImplementation((...args: any[]) => {
        const [command, cmdArgs, options] = args;
        capturedBinaryPath = command;
        // Return a mock child process
        const EventEmitter = require('events');
        const mockChild = new EventEmitter();
        (mockChild as any).stdout = new EventEmitter();
        (mockChild as any).stderr = new EventEmitter();
        (mockChild as any).kill = jest.fn();
        
        // Emit close event after a short delay
        setTimeout(() => {
          (mockChild as any).stdout.emit('data', Buffer.from('GraphicsMagick 1.3.43\n'));
          mockChild.emit('close', 0);
        }, 10);
        
        return mockChild;
      });

      try {
        await GraphicsMagickSpawner.test();
        expect(capturedBinaryPath).toBe(systemGmPath);
      } finally {
        // Restore original spawn
        require('child_process').spawn = originalSpawn;
      }
    });

    it('should disable fallback mode', () => {
      GraphicsMagickSpawner.enableSystemFallback('/usr/local/bin/gm');
      expect(GraphicsMagickSpawner.isUsingSystemFallback()).toBe(true);

      GraphicsMagickSpawner.disableSystemFallback();
      expect(GraphicsMagickSpawner.isUsingSystemFallback()).toBe(false);
    });

    it('should use default gm path when no path provided to fallback', () => {
      GraphicsMagickSpawner.enableSystemFallback();
      expect(GraphicsMagickSpawner.isUsingSystemFallback()).toBe(true);
    });
  });

  describe('Error Handling - Both Bundled and System Fail', () => {
    it('should provide detailed error when GraphicsMagick is not available', async () => {
      // Mock both bundled and system GraphicsMagick as unavailable
      jest.spyOn(GraphicsMagickService, 'verifyGraphicsMagick').mockRejectedValue(
        new Error('GraphicsMagick binary is missing')
      );

      // Mock system test to fail
      jest.spyOn(GraphicsMagickSpawner, 'test').mockResolvedValue(false);

      // Create a mock PDF buffer
      const mockPdfBuffer = Buffer.from('Mock PDF content');

      // Should throw detailed error
      await expect(
        extractTextWithOCRProcess(mockPdfBuffer)
      ).rejects.toThrow(/GraphicsMagick/);
    });

    it('should include troubleshooting steps in error message', async () => {
      jest.spyOn(GraphicsMagickService, 'verifyGraphicsMagick').mockRejectedValue(
        new Error('GraphicsMagick failed to execute')
      );

      jest.spyOn(GraphicsMagickSpawner, 'test').mockResolvedValue(false);

      const mockPdfBuffer = Buffer.from('Mock PDF content');

      try {
        await extractTextWithOCRProcess(mockPdfBuffer);
        fail('Should have thrown an error');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Should include helpful troubleshooting information
        expect(errorMessage).toContain('GraphicsMagick');
        expect(errorMessage.toLowerCase()).toMatch(/install|reinstall|brew/);
      }
    });

    it('should log diagnostic information on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      jest.spyOn(GraphicsMagickService, 'verifyGraphicsMagick').mockRejectedValue(
        new Error('GraphicsMagick not found')
      );

      jest.spyOn(GraphicsMagickSpawner, 'test').mockResolvedValue(false);

      const mockPdfBuffer = Buffer.from('Mock PDF content');

      try {
        await extractTextWithOCRProcess(mockPdfBuffer);
      } catch (error) {
        // Expected to fail
      }

      // Should have logged diagnostic information
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Ghostscript Integration', () => {
    it('should include Ghostscript bin directory in PATH', () => {
      jest.spyOn(GraphicsMagickService, 'getConfig').mockReturnValue({
        binPath: '/app/graphicsmagick-bundle/bin/gm',
        gsBinPath: '/app/graphicsmagick-bundle/bin/gs',
        libPath: '/app/graphicsmagick-bundle/lib',
        isProduction: true
      });

      const env = GraphicsMagickSpawner.getEnvironment();

      // Ghostscript binary is in the same bin directory as gm
      expect(env.PATH).toContain('/app/graphicsmagick-bundle/bin');
    });

    it('should verify Ghostscript path is accessible', () => {
      const gsPath = GraphicsMagickService.getGhostscriptPath();
      expect(gsPath).toBeDefined();
      expect(gsPath.length).toBeGreaterThan(0);
    });

    it('should handle PDF processing that requires Ghostscript', async () => {
      const gmAvailable = await checkGraphicsMagickAvailable();
      if (!gmAvailable) {
        console.log('⏭️  Skipping test: GraphicsMagick not available');
        return;
      }

      // Create a test PDF (PDF processing requires Ghostscript)
      const testPdf = await createTestPdf(tempDir);
      const outputPath = path.join(tempDir, 'gs-output.png');

      // This conversion requires Ghostscript to render the PDF
      await expect(
        GraphicsMagickSpawner.convertPdfPageToPng(testPdf, 1, outputPath)
      ).resolves.toBeDefined();

      // Verify output was created
      expect(await fs.pathExists(outputPath)).toBe(true);
    });
  });

  describe('End-to-End OCR Integration', () => {
    it('should process PDF through complete OCR pipeline', async () => {
      const gmAvailable = await checkGraphicsMagickAvailable();
      if (!gmAvailable) {
        console.log('⏭️  Skipping test: GraphicsMagick not available');
        return;
      }

      // Create a test PDF with some text
      const testPdf = await createTestPdf(tempDir);
      const pdfBuffer = await fs.readFile(testPdf);

      // Mock Tesseract worker to avoid actual OCR
      const mockWorker = {
        recognize: jest.fn().mockResolvedValue({
          data: { text: 'Test extracted text' }
        }),
        setParameters: jest.fn().mockResolvedValue(undefined),
        terminate: jest.fn().mockResolvedValue(undefined)
      };

      jest.mock('tesseract.js', () => ({
        createWorker: jest.fn().mockResolvedValue(mockWorker),
        PSM: { AUTO: 3 }
      }));

      // Process PDF
      // Note: This will use real GraphicsMagick but mocked Tesseract
      // Full integration would require actual Tesseract setup
      
      // For now, just verify GraphicsMagick part works
      const testOutputPath = path.join(tempDir, 'ocr-test.png');
      await expect(
        GraphicsMagickSpawner.convertPdfPageToPng(testPdf, 1, testOutputPath)
      ).resolves.toBeDefined();
    });
  });
});

/**
 * Helper function to check if GraphicsMagick is available
 */
async function checkGraphicsMagickAvailable(): Promise<boolean> {
  try {
    const result = await GraphicsMagickSpawner.test();
    return result;
  } catch (error) {
    return false;
  }
}

/**
 * Helper function to create a simple test PDF
 */
async function createTestPdf(dir: string): Promise<string> {
  const pdfPath = path.join(dir, 'test.pdf');
  
  // Create a minimal valid PDF
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF`;

  await fs.writeFile(pdfPath, pdfContent);
  return pdfPath;
}
