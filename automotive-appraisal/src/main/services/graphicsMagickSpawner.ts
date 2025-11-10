import { spawn, ChildProcess } from 'child_process';
import { GraphicsMagickService } from './graphicsMagickService';
import * as path from 'path';
import * as fs from 'fs';

export interface SpawnOptions {
  args: string[];
  cwd?: string;
  timeout?: number;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface PdfConversionOptions {
  density?: number;
  width?: number;
  height?: number;
  applyEnhancements?: boolean;
  contrastStretch?: string;
  sharpen?: string;
}

export class GraphicsMagickSpawner {
  private static useSystemFallback = false;
  private static systemBinaryPath: string | null = null;

  /**
   * Enable system GraphicsMagick fallback mode
   * This is used when the bundled GraphicsMagick fails
   */
  static enableSystemFallback(systemBinaryPath: string = 'gm'): void {
    console.log('🔄 Enabling system GraphicsMagick fallback mode');
    console.log('   System binary path:', systemBinaryPath);
    this.useSystemFallback = true;
    this.systemBinaryPath = systemBinaryPath;
  }

  /**
   * Disable system fallback and return to bundled GraphicsMagick
   */
  static disableSystemFallback(): void {
    console.log('🔄 Disabling system GraphicsMagick fallback mode');
    this.useSystemFallback = false;
    this.systemBinaryPath = null;
  }

  /**
   * Check if system fallback mode is enabled
   */
  static isUsingSystemFallback(): boolean {
    return this.useSystemFallback;
  }

  /**
   * Get the environment variables needed for GraphicsMagick execution
   * Sets up library paths and PATH for Ghostscript
   */
  static getEnvironment(): NodeJS.ProcessEnv {
    const config = GraphicsMagickService.getConfig();
    const env = { ...process.env };
    
    // If using system fallback, use system libraries
    if (this.useSystemFallback) {
      console.log('🔧 GraphicsMagick environment setup (SYSTEM FALLBACK MODE):');
      console.log('   Using system GraphicsMagick with system libraries');
      console.log('   Binary path:', this.systemBinaryPath || 'gm');
      
      // Add common system paths to ensure system GraphicsMagick can be found
      const commonGmPaths = [
        '/usr/local/bin',           // Homebrew on macOS (Intel)
        '/opt/homebrew/bin',        // Homebrew on macOS (Apple Silicon)
        '/usr/bin',                 // Linux system install
        'C:\\Program Files\\GraphicsMagick-1.3.43-Q16', // Windows common path
        'C:\\Program Files (x86)\\GraphicsMagick-1.3.43-Q16'
      ];
      
      const pathSeparator = process.platform === 'win32' ? ';' : ':';
      const additionalPaths = commonGmPaths.filter(p => !env.PATH?.includes(p)).join(pathSeparator);
      if (additionalPaths) {
        env.PATH = `${additionalPaths}${pathSeparator}${env.PATH || ''}`;
        console.log('   Added system paths to PATH');
      }
      
      // Don't set DYLD_LIBRARY_PATH for system fallback - use system libraries
      return env;
    }
    
    // Using bundled GraphicsMagick
    if (config.isProduction && config.libPath) {
      const binPath = path.dirname(config.binPath);
      
      // Set library paths for dynamic linker
      // Multiple strategies to ensure libraries are found
      env.DYLD_LIBRARY_PATH = config.libPath;
      env.DYLD_FALLBACK_LIBRARY_PATH = config.libPath;
      
      // Add bin directory to PATH for Ghostscript
      const pathSeparator = process.platform === 'win32' ? ';' : ':';
      env.PATH = `${binPath}${pathSeparator}${env.PATH || ''}`;
      
      console.log('🔧 GraphicsMagick environment setup (BUNDLED MODE):');
      console.log('   DYLD_LIBRARY_PATH:', env.DYLD_LIBRARY_PATH);
      console.log('   DYLD_FALLBACK_LIBRARY_PATH:', env.DYLD_FALLBACK_LIBRARY_PATH);
      console.log('   PATH (first entry):', binPath);
    }
    
    return env;
  }
  
  /**
   * Spawn GraphicsMagick with proper environment setup
   */
  static async spawn(options: SpawnOptions): Promise<SpawnResult> {
    const config = GraphicsMagickService.getConfig();
    const env = this.getEnvironment();
    
    // Use system binary path if fallback is enabled
    const binaryPath = this.useSystemFallback && this.systemBinaryPath 
      ? this.systemBinaryPath 
      : config.binPath;
    
    console.log(`🚀 Spawning GraphicsMagick process...`);
    console.log(`   Mode: ${this.useSystemFallback ? 'SYSTEM FALLBACK' : 'BUNDLED'}`);
    console.log(`   Binary: ${binaryPath}`);
    console.log(`   Args: ${options.args.join(' ')}`);
    
    return new Promise((resolve, reject) => {
      const child: ChildProcess = spawn(binaryPath, options.args, {
        cwd: options.cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      
      // Set up timeout if specified
      let timeoutHandle: NodeJS.Timeout | null = null;
      if (options.timeout) {
        timeoutHandle = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
          
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
        }, options.timeout);
      }
      
      // Collect stdout
      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        if (options.onStdout) {
          options.onStdout(text);
        }
      });
      
      // Collect stderr
      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        if (options.onStderr) {
          options.onStderr(text);
        }
        // Log stderr for debugging
        if (text.trim()) {
          console.log(`   GM stderr: ${text.trim()}`);
        }
      });
      
      // Handle process completion
      child.on('close', (code: number | null) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        
        if (timedOut) {
          reject(new Error(
            `GraphicsMagick process timed out after ${options.timeout}ms\n` +
            `Command: gm ${options.args.join(' ')}\n` +
            `Stdout: ${stdout}\n` +
            `Stderr: ${stderr}`
          ));
          return;
        }
        
        const exitCode = code ?? -1;
        const success = exitCode === 0;
        
        console.log(`${success ? '✅' : '❌'} GraphicsMagick process completed with exit code ${exitCode}`);
        
        resolve({
          stdout,
          stderr,
          exitCode,
          success
        });
      });
      
      // Handle spawn errors
      child.on('error', (error: Error) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        
        console.error('❌ Failed to spawn GraphicsMagick process:', error.message);
        
        const binaryPath = this.useSystemFallback && this.systemBinaryPath 
          ? this.systemBinaryPath 
          : config.binPath;
        
        reject(new Error(
          `Failed to spawn GraphicsMagick process: ${error.message}\n` +
          `Command: gm ${options.args.join(' ')}\n` +
          `Binary path: ${binaryPath}\n` +
          `Mode: ${this.useSystemFallback ? 'SYSTEM FALLBACK' : 'BUNDLED'}`
        ));
      });
    });
  }
  
  /**
   * Convert a single PDF page to PNG using direct spawning
   * Returns the path to the generated PNG file
   */
  static async convertPdfPageToPng(
    pdfPath: string,
    pageNumber: number,
    outputPath: string,
    options?: PdfConversionOptions
  ): Promise<string> {
    const density = options?.density ?? 300;
    const width = options?.width ?? 2480;
    const height = options?.height ?? 3508;
    const applyEnhancements = options?.applyEnhancements ?? true;
    const contrastStretch = options?.contrastStretch ?? '0.35%x0.35%';
    const sharpen = options?.sharpen ?? '0x1.0';
    const resizeArg = `${width}x${height}>`;

    const pageSpecifier = `${pdfPath}[${pageNumber - 1}]`;

    const args: string[] = [
      'convert',
      '-density', density.toString(),
      '-units', 'PixelsPerInch',
      '-define', 'pdf:use-cropbox=true',
      '-background', 'white',
      pageSpecifier,
      '-alpha', 'remove',
      '-alpha', 'off',
      '-flatten',
      '-strip'
    ];

    if (width && height) {
      args.push('-filter', 'Lanczos', '-resize', resizeArg);
    }

    if (applyEnhancements) {
      args.push(
        '-colorspace', 'Gray',
        '-type', 'Grayscale',
        '-contrast-stretch', contrastStretch,
        '-sharpen', sharpen,
        '-enhance',
        '-normalize'
      );
    }

    args.push(
      '-depth', '8',
      '-quality', '100',
      '-compress', 'Zip',
      outputPath
    );

    console.log(`🔄 Converting PDF page ${pageNumber} to PNG...`);
    console.log(`   Input: ${pdfPath}`);
    console.log(`   Output: ${outputPath}`);
    console.log(`   Command: gm ${args.join(' ')}`);
    
    const result = await this.spawn({
      args,
      timeout: 60000 // 60 second timeout
      // stderr logging is already handled in spawn() method
    });
    
    if (!result.success) {
      throw new Error(
        `GraphicsMagick conversion failed (exit code ${result.exitCode})\n` +
        `Command: gm ${args.join(' ')}\n` +
        `Stderr: ${result.stderr}\n` +
        `Stdout: ${result.stdout}`
      );
    }
    
    // Verify output file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error(
        `GraphicsMagick conversion appeared to succeed but output file not found: ${outputPath}\n` +
        `Stderr: ${result.stderr}\n` +
        `Stdout: ${result.stdout}`
      );
    }
    
    const stats = fs.statSync(outputPath);
    console.log(`✅ Successfully converted page ${pageNumber} to PNG (${stats.size} bytes)`);
    return outputPath;
  }
  
  /**
   * Test if GraphicsMagick can execute successfully
   * Returns true if GraphicsMagick is working, false otherwise
   */
  static async test(): Promise<boolean> {
    console.log('🧪 Testing GraphicsMagick execution...');
    
    try {
      const result = await this.spawn({
        args: ['version'],
        timeout: 5000
      });
      
      if (result.success && result.stdout.includes('GraphicsMagick')) {
        console.log('✅ GraphicsMagick test successful');
        console.log(`   Version info: ${result.stdout.split('\n')[0]}`);
        return true;
      }
      
      console.error('❌ GraphicsMagick test failed: unexpected output');
      console.error('   Stdout:', result.stdout);
      console.error('   Stderr:', result.stderr);
      return false;
    } catch (error) {
      console.error('❌ GraphicsMagick test failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}
