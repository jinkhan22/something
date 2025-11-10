import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface GraphicsMagickConfig {
  binPath: string;
  gsBinPath: string;
  libPath: string;
  isProduction: boolean;
}

export class GraphicsMagickService {
  private static config: GraphicsMagickConfig | null = null;

  /**
   * Get full configuration for GraphicsMagick
   * Detects production vs development mode and returns appropriate paths
   */
  static getConfig(): GraphicsMagickConfig {
    if (this.config) return this.config;

    const isProduction = app.isPackaged;

    if (isProduction) {
      // Use bundled GraphicsMagick
      const resourcesPath = process.resourcesPath;
      const gmPath = path.join(resourcesPath, 'graphicsmagick-bundle');

      this.config = {
        binPath: path.join(gmPath, 'bin', 'gm'),
        gsBinPath: path.join(gmPath, 'bin', 'gs'),
        libPath: path.join(gmPath, 'lib'),
        isProduction: true
      };
    } else {
      // Use system GraphicsMagick in development
      this.config = {
        binPath: 'gm', // Rely on PATH
        gsBinPath: 'gs', // Rely on PATH
        libPath: '', // System libraries
        isProduction: false
      };
    }

    return this.config;
  }

  /**
   * Get the path to the GraphicsMagick binary
   * Returns bundled path in production, system path in development
   */
  static getGraphicsMagickPath(): string {
    return this.getConfig().binPath;
  }

  /**
   * Get the path to the Ghostscript binary
   * Returns bundled path in production, system path in development
   */
  static getGhostscriptPath(): string {
    return this.getConfig().gsBinPath;
  }

  /**
   * Get the library path for GraphicsMagick dependencies
   */
  static getLibraryPath(): string {
    return this.getConfig().libPath;
  }

  /**
   * Verify GraphicsMagick is available and executable
   * Throws error with helpful message if not found
   */
  static async verifyGraphicsMagick(): Promise<void> {
    const config = this.getConfig();

    if (config.isProduction) {
      // Verify bundled binary exists
      if (!fs.existsSync(config.binPath)) {
        throw new Error(
          'GraphicsMagick binary is missing from the application bundle. ' +
          'Please reinstall the application.'
        );
      }

      // Verify libraries exist
      const requiredLibs = [
        'libGraphicsMagick.3.dylib',
        'liblcms2.2.dylib',
        'libfreetype.6.dylib',
        'libltdl.7.dylib',
        'libpng16.16.dylib'
      ];

      for (const lib of requiredLibs) {
        const libPath = path.join(config.libPath, lib);
        if (!fs.existsSync(libPath)) {
          throw new Error(
            `GraphicsMagick library ${lib} is missing from the application bundle. ` +
            'Please reinstall the application.'
          );
        }
      }
    }

    // Test execution to ensure binary works
    try {
      await this.execute(['version']);
    } catch (error) {
      if (config.isProduction) {
        throw new Error(
          'GraphicsMagick failed to execute. The application bundle may be corrupted. ' +
          'Please reinstall the application.\n\n' +
          `Technical details: ${error instanceof Error ? error.message : String(error)}`
        );
      } else {
        throw new Error(
          'GraphicsMagick is not installed on your system.\n\n' +
          'Please install GraphicsMagick:\n' +
          '• macOS: brew install graphicsmagick\n' +
          '• Windows: Download from http://www.graphicsmagick.org/download.html\n' +
          '• Linux: sudo apt-get install graphicsmagick\n\n' +
          `Technical details: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Execute GraphicsMagick command with proper environment
   * Note: DYLD_LIBRARY_PATH is not needed because the binary uses @loader_path/../lib rpath
   */
  static async execute(args: string[]): Promise<string> {
    const config = this.getConfig();

    try {
      const { stdout } = await execFileAsync(config.binPath, args);
      return stdout;
    } catch (error) {
      // Re-throw with more context
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `GraphicsMagick execution failed: ${errorMessage}\n` +
        `Command: gm ${args.join(' ')}\n` +
        `Binary path: ${config.binPath}`
      );
    }
  }
}
