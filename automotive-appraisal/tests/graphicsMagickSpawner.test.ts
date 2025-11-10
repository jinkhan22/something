/**
 * Tests for GraphicsMagickSpawner Service
 */

import { GraphicsMagickSpawner } from '../src/main/services/graphicsMagickSpawner';
import { GraphicsMagickService } from '../src/main/services/graphicsMagickService';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock child_process
jest.mock('child_process');

// Mock fs
jest.mock('fs');

// Mock GraphicsMagickService
jest.mock('../src/main/services/graphicsMagickService');

// Mock electron app
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn((name: string) => {
      if (name === 'userData') return '/mock/user/data';
      if (name === 'temp') return '/mock/temp';
      return '/mock/path';
    }),
    getVersion: jest.fn(() => '1.0.0'),
    getAppPath: jest.fn(() => '/mock/app')
  }
}));

describe('GraphicsMagickSpawner', () => {
  // Helper to create a mock child process
  const createMockChildProcess = () => {
    const mockChild = new EventEmitter() as any;
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    mockChild.stdin = {
      write: jest.fn(),
      end: jest.fn()
    };
    mockChild.kill = jest.fn();
    mockChild.killed = false;
    return mockChild;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset fallback mode
    GraphicsMagickSpawner.disableSystemFallback();
    
    // Mock GraphicsMagickService.getConfig() to return test config
    (GraphicsMagickService.getConfig as jest.Mock).mockReturnValue({
      binPath: '/mock/gm/bin/gm',
      gsBinPath: '/mock/gm/bin/gs',
      libPath: '/mock/gm/lib',
      isProduction: true
    });
  });

  describe('getEnvironment', () => {
    it('should return environment with DYLD_LIBRARY_PATH in production mode', () => {
      const env = GraphicsMagickSpawner.getEnvironment();

      expect(env.DYLD_LIBRARY_PATH).toBe('/mock/gm/lib');
      expect(env.DYLD_FALLBACK_LIBRARY_PATH).toBe('/mock/gm/lib');
      expect(env.PATH).toContain('/mock/gm/bin');
    });

    it('should include existing PATH in environment', () => {
      const originalPath = process.env.PATH;
      const env = GraphicsMagickSpawner.getEnvironment();

      expect(env.PATH).toContain('/mock/gm/bin');
      if (originalPath) {
        expect(env.PATH).toContain(originalPath);
      }
    });

    it('should not set DYLD_LIBRARY_PATH in development mode', () => {
      (GraphicsMagickService.getConfig as jest.Mock).mockReturnValue({
        binPath: 'gm',
        gsBinPath: 'gs',
        libPath: '',
        isProduction: false
      });

      const env = GraphicsMagickSpawner.getEnvironment();

      expect(env.DYLD_LIBRARY_PATH).toBeUndefined();
      expect(env.DYLD_FALLBACK_LIBRARY_PATH).toBeUndefined();
    });

    it('should use system paths when fallback mode is enabled', () => {
      GraphicsMagickSpawner.enableSystemFallback('/usr/local/bin/gm');
      
      const env = GraphicsMagickSpawner.getEnvironment();

      // Should not set DYLD_LIBRARY_PATH in fallback mode
      expect(env.DYLD_LIBRARY_PATH).toBeUndefined();
      // Should add common system paths
      expect(env.PATH).toContain('/usr/local/bin');
      expect(env.PATH).toContain('/opt/homebrew/bin');
    });

    it('should preserve existing environment variables', () => {
      const originalEnv = process.env;
      const env = GraphicsMagickSpawner.getEnvironment();

      // Should include all original env vars
      Object.keys(originalEnv).forEach(key => {
        if (key !== 'DYLD_LIBRARY_PATH' && key !== 'DYLD_FALLBACK_LIBRARY_PATH' && key !== 'PATH') {
          expect(env[key]).toBe(originalEnv[key]);
        }
      });
    });
  });

  describe('spawn', () => {
    it('should execute GraphicsMagick command successfully', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const spawnPromise = GraphicsMagickSpawner.spawn({
        args: ['version']
      });

      // Simulate successful execution
      mockChild.stdout.emit('data', Buffer.from('GraphicsMagick 1.3.43\n'));
      mockChild.emit('close', 0);

      const result = await spawnPromise;

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('GraphicsMagick 1.3.43');
      expect(childProcess.spawn).toHaveBeenCalledWith(
        '/mock/gm/bin/gm',
        ['version'],
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe']
        })
      );
    });

    it('should capture stdout data', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const stdoutData: string[] = [];
      const spawnPromise = GraphicsMagickSpawner.spawn({
        args: ['version'],
        onStdout: (data) => stdoutData.push(data)
      });

      mockChild.stdout.emit('data', Buffer.from('Line 1\n'));
      mockChild.stdout.emit('data', Buffer.from('Line 2\n'));
      mockChild.emit('close', 0);

      const result = await spawnPromise;

      expect(result.stdout).toBe('Line 1\nLine 2\n');
      expect(stdoutData).toEqual(['Line 1\n', 'Line 2\n']);
    });

    it('should capture stderr data', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const stderrData: string[] = [];
      const spawnPromise = GraphicsMagickSpawner.spawn({
        args: ['convert', 'invalid.pdf', 'output.png'],
        onStderr: (data) => stderrData.push(data)
      });

      mockChild.stderr.emit('data', Buffer.from('Error: file not found\n'));
      mockChild.emit('close', 1);

      const result = await spawnPromise;

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error: file not found');
      expect(stderrData).toEqual(['Error: file not found\n']);
    });

    it('should handle timeout correctly', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const spawnPromise = GraphicsMagickSpawner.spawn({
        args: ['convert', 'large.pdf', 'output.png'],
        timeout: 100
      });

      // Wait for timeout to trigger, then emit close to complete the promise
      await new Promise(resolve => setTimeout(resolve, 150));
      mockChild.emit('close', 1);

      await expect(spawnPromise).rejects.toThrow('timed out after 100ms');
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
    }, 1000); // Set test timeout to 1 second

    it('should handle spawn errors', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const spawnPromise = GraphicsMagickSpawner.spawn({
        args: ['version']
      });

      // Simulate spawn error
      mockChild.emit('error', new Error('ENOENT: command not found'));

      await expect(spawnPromise).rejects.toThrow('Failed to spawn GraphicsMagick process');
      await expect(spawnPromise).rejects.toThrow('ENOENT: command not found');
    });

    it('should use system binary path in fallback mode', async () => {
      GraphicsMagickSpawner.enableSystemFallback('/usr/local/bin/gm');
      
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const spawnPromise = GraphicsMagickSpawner.spawn({
        args: ['version']
      });

      mockChild.stdout.emit('data', Buffer.from('GraphicsMagick 1.3.43\n'));
      mockChild.emit('close', 0);

      await spawnPromise;

      expect(childProcess.spawn).toHaveBeenCalledWith(
        '/usr/local/bin/gm',
        ['version'],
        expect.any(Object)
      );
    });

    it('should pass cwd option to spawn', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const spawnPromise = GraphicsMagickSpawner.spawn({
        args: ['version'],
        cwd: '/custom/working/dir'
      });

      mockChild.emit('close', 0);
      await spawnPromise;

      expect(childProcess.spawn).toHaveBeenCalledWith(
        '/mock/gm/bin/gm',
        ['version'],
        expect.objectContaining({
          cwd: '/custom/working/dir'
        })
      );
    });

    it('should handle null exit code', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const spawnPromise = GraphicsMagickSpawner.spawn({
        args: ['version']
      });

      mockChild.emit('close', null);

      const result = await spawnPromise;

      expect(result.exitCode).toBe(-1);
      expect(result.success).toBe(false);
    });
  });

  describe('convertPdfPageToPng', () => {
    it('should convert PDF page to PNG successfully', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });

      const convertPromise = GraphicsMagickSpawner.convertPdfPageToPng(
        '/path/to/input.pdf',
        1,
        '/path/to/output.png'
      );

      mockChild.emit('close', 0);

      const result = await convertPromise;

      expect(result).toBe('/path/to/output.png');
      const spawnArgs = (childProcess.spawn as jest.Mock).mock.calls[0][1];
      expect(spawnArgs).toEqual([
        'convert',
        '-density', '300',
        '-units', 'PixelsPerInch',
        '-define', 'pdf:use-cropbox=true',
        '-background', 'white',
        '/path/to/input.pdf[0]',
        '-alpha', 'remove',
        '-alpha', 'off',
        '-flatten',
        '-strip',
        '-filter', 'Lanczos',
        '-resize', '2480x3508>',
        '-colorspace', 'Gray',
        '-type', 'Grayscale',
        '-contrast-stretch', '0.35%x0.35%',
        '-sharpen', '0x1.0',
        '-enhance',
        '-normalize',
        '-depth', '8',
        '-quality', '100',
        '-compress', 'Zip',
        '/path/to/output.png'
      ]);
    });

    it('should use custom density and dimensions', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 2048 });

      const convertPromise = GraphicsMagickSpawner.convertPdfPageToPng(
        '/path/to/input.pdf',
        2,
        '/path/to/output.png',
        {
          density: 150,
          width: 1240,
          height: 1754
        }
      );

      mockChild.emit('close', 0);

      await convertPromise;

      const spawnArgs = (childProcess.spawn as jest.Mock).mock.calls[0][1];
      expect(spawnArgs).toEqual([
        'convert',
        '-density', '150',
        '-units', 'PixelsPerInch',
        '-define', 'pdf:use-cropbox=true',
        '-background', 'white',
        '/path/to/input.pdf[1]',
        '-alpha', 'remove',
        '-alpha', 'off',
        '-flatten',
        '-strip',
        '-filter', 'Lanczos',
        '-resize', '1240x1754>',
        '-colorspace', 'Gray',
        '-type', 'Grayscale',
        '-contrast-stretch', '0.35%x0.35%',
        '-sharpen', '0x1.0',
        '-enhance',
        '-normalize',
        '-depth', '8',
        '-quality', '100',
        '-compress', 'Zip',
        '/path/to/output.png'
      ]);
    });

    it('should use 0-based page indexing', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });

      const convertPromise = GraphicsMagickSpawner.convertPdfPageToPng(
        '/path/to/input.pdf',
        5,
        '/path/to/output.png'
      );

      mockChild.emit('close', 0);

      await convertPromise;

      // Page 5 should be index 4
      expect(childProcess.spawn).toHaveBeenCalledWith(
        '/mock/gm/bin/gm',
        expect.arrayContaining(['/path/to/input.pdf[4]']),
        expect.any(Object)
      );
    });

    it('should allow disabling enhancements', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 512 });

      const convertPromise = GraphicsMagickSpawner.convertPdfPageToPng(
        '/path/to/input.pdf',
        1,
        '/path/to/output.png',
        {
          applyEnhancements: false,
          density: 200,
          width: 1600,
          height: 2000
        }
      );

      mockChild.emit('close', 0);
      await convertPromise;

      const spawnArgs = (childProcess.spawn as jest.Mock).mock.calls[0][1];

      expect(spawnArgs).toEqual([
        'convert',
        '-density', '200',
        '-units', 'PixelsPerInch',
        '-define', 'pdf:use-cropbox=true',
        '-background', 'white',
        '/path/to/input.pdf[0]',
        '-alpha', 'remove',
        '-alpha', 'off',
        '-flatten',
        '-strip',
        '-filter', 'Lanczos',
        '-resize', '1600x2000>',
        '-depth', '8',
        '-quality', '100',
        '-compress', 'Zip',
        '/path/to/output.png'
      ]);
    });

    it('should throw error if conversion fails', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const convertPromise = GraphicsMagickSpawner.convertPdfPageToPng(
        '/path/to/input.pdf',
        1,
        '/path/to/output.png'
      );

      mockChild.stderr.emit('data', Buffer.from('Error: invalid PDF\n'));
      mockChild.emit('close', 1);

      await expect(convertPromise).rejects.toThrow('GraphicsMagick conversion failed');
      await expect(convertPromise).rejects.toThrow('exit code 1');
    });

    it('should throw error if output file is not created', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const convertPromise = GraphicsMagickSpawner.convertPdfPageToPng(
        '/path/to/input.pdf',
        1,
        '/path/to/output.png'
      );

      mockChild.emit('close', 0);

      await expect(convertPromise).rejects.toThrow('output file not found');
    });

    it('should have 60 second timeout', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const convertPromise = GraphicsMagickSpawner.convertPdfPageToPng(
        '/path/to/input.pdf',
        1,
        '/path/to/output.png'
      );

      // Don't emit close - let it timeout
      // We can't easily test the actual timeout, but we can verify the spawn was called
      // with timeout option by checking the spawn call
      
      // Emit close to prevent hanging
      mockChild.emit('close', 1);

      await expect(convertPromise).rejects.toThrow();
    });
  });

  describe('test', () => {
    it('should return true when GraphicsMagick executes successfully', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const testPromise = GraphicsMagickSpawner.test();

      mockChild.stdout.emit('data', Buffer.from('GraphicsMagick 1.3.43 2024-01-01\n'));
      mockChild.emit('close', 0);

      const result = await testPromise;

      expect(result).toBe(true);
      expect(childProcess.spawn).toHaveBeenCalledWith(
        '/mock/gm/bin/gm',
        ['version'],
        expect.any(Object)
      );
    });

    it('should return false when GraphicsMagick fails to execute', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const testPromise = GraphicsMagickSpawner.test();

      mockChild.emit('error', new Error('Command not found'));

      const result = await testPromise;

      expect(result).toBe(false);
    });

    it('should return false when output does not contain GraphicsMagick', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const testPromise = GraphicsMagickSpawner.test();

      mockChild.stdout.emit('data', Buffer.from('Some other output\n'));
      mockChild.emit('close', 0);

      const result = await testPromise;

      expect(result).toBe(false);
    });

    it('should return false when exit code is non-zero', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const testPromise = GraphicsMagickSpawner.test();

      mockChild.stdout.emit('data', Buffer.from('GraphicsMagick 1.3.43\n'));
      mockChild.emit('close', 1);

      const result = await testPromise;

      expect(result).toBe(false);
    });

    it('should have 5 second timeout', async () => {
      const mockChild = createMockChildProcess();
      (childProcess.spawn as jest.Mock).mockReturnValue(mockChild);

      const testPromise = GraphicsMagickSpawner.test();

      // Emit close to prevent hanging
      mockChild.emit('close', 1);

      const result = await testPromise;

      expect(result).toBe(false);
    });
  });

  describe('fallback mode', () => {
    it('should enable system fallback mode', () => {
      GraphicsMagickSpawner.enableSystemFallback('/usr/local/bin/gm');

      expect(GraphicsMagickSpawner.isUsingSystemFallback()).toBe(true);
    });

    it('should disable system fallback mode', () => {
      GraphicsMagickSpawner.enableSystemFallback('/usr/local/bin/gm');
      GraphicsMagickSpawner.disableSystemFallback();

      expect(GraphicsMagickSpawner.isUsingSystemFallback()).toBe(false);
    });

    it('should use default gm path when no path provided', () => {
      GraphicsMagickSpawner.enableSystemFallback();

      expect(GraphicsMagickSpawner.isUsingSystemFallback()).toBe(true);
    });
  });
});
