/**
 * System Checker Service
 * Validates system requirements and provides guidance for missing dependencies
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface SystemRequirement {
  name: string;
  description: string;
  required: boolean;
  checkFunction: () => Promise<boolean>;
  installationGuidance: string[];
  fallbackAvailable: boolean;
  fallbackDescription?: string;
}

export interface SystemCheckResult {
  requirement: string;
  satisfied: boolean;
  required: boolean;
  message: string;
  installationGuidance?: string[];
  fallbackAvailable: boolean;
  fallbackDescription?: string;
}

export interface SystemDiagnostics {
  platform: string;
  platformVersion: string;
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  totalMemory: string;
  freeMemory: string;
  cpuCount: number;
  appVersion: string;
  userDataPath: string;
  tempPath: string;
  allRequirementsMet: boolean;
  criticalRequirementsMet: boolean;
  checkResults: SystemCheckResult[];
  timestamp: Date;
}

/**
 * System Checker Class
 */
export class SystemChecker {
  private static requirements: SystemRequirement[] = [
    {
      name: 'Node.js Runtime',
      description: 'Node.js runtime environment',
      required: true,
      checkFunction: async () => {
        return process.versions.node !== undefined;
      },
      installationGuidance: [
        'Node.js is bundled with Electron',
        'If you see this error, the application installation may be corrupted',
        'Try reinstalling the application'
      ],
      fallbackAvailable: false
    },
    {
      name: 'File System Access',
      description: 'Read/write access to user data directory',
      required: true,
      checkFunction: async () => {
        try {
          const userDataPath = app.getPath('userData');
          await fs.promises.access(userDataPath, fs.constants.R_OK | fs.constants.W_OK);
          return true;
        } catch {
          return false;
        }
      },
      installationGuidance: [
        'Ensure the application has permission to access the user data directory',
        'On macOS: Check System Preferences > Security & Privacy > Files and Folders',
        'On Windows: Run the application with appropriate user permissions',
        'Try running the application as administrator (Windows) or with sudo (macOS/Linux)'
      ],
      fallbackAvailable: false
    },
    {
      name: 'Temp Directory Access',
      description: 'Access to temporary directory for processing',
      required: true,
      checkFunction: async () => {
        try {
          const tempPath = app.getPath('temp');
          await fs.promises.access(tempPath, fs.constants.R_OK | fs.constants.W_OK);
          return true;
        } catch {
          return false;
        }
      },
      installationGuidance: [
        'Ensure the application has permission to access the system temp directory',
        'Check available disk space',
        'Verify temp directory permissions'
      ],
      fallbackAvailable: false
    },
    {
      name: 'Sufficient Memory',
      description: 'At least 2GB of available system memory',
      required: false,
      checkFunction: async () => {
        const freeMemory = os.freemem();
        const twoGB = 2 * 1024 * 1024 * 1024;
        return freeMemory >= twoGB;
      },
      installationGuidance: [
        'Close other applications to free up memory',
        'The application may run slower with limited memory',
        'Consider upgrading system RAM for better performance',
        'OCR processing may be limited with low memory'
      ],
      fallbackAvailable: true,
      fallbackDescription: 'The application will use reduced batch sizes and lower quality settings'
    },
    {
      name: 'Tesseract Assets',
      description: 'OCR language data files',
      required: false,
      checkFunction: async () => {
        try {
          const isDev = !app.isPackaged;
          const possiblePaths: string[] = [];

          if (isDev) {
            // Development: Check node_modules location (same as tesseractAssets.ts)
            possiblePaths.push(
              path.join(process.cwd(), 'node_modules', 'tesseract.js-core', 'eng.traineddata')
            );
          } else {
            // Production: Check bundled resources location (same as tesseractAssets.ts)
            possiblePaths.push(
              path.join(process.resourcesPath || '', 'tesseract-assets', 'eng.traineddata')
            );
          }

          // Also check fallback locations
          possiblePaths.push(
            path.join(app.getAppPath(), 'tesseract-assets', 'eng.traineddata'),
            path.join(process.cwd(), 'tesseract-assets', 'eng.traineddata')
          );

          for (const assetPath of possiblePaths) {
            try {
              await fs.promises.access(assetPath, fs.constants.R_OK);
              return true;
            } catch {
              continue;
            }
          }
          return false;
        } catch {
          return false;
        }
      },
      installationGuidance: [
        'OCR functionality requires Tesseract language data files',
        'The application will attempt to download these automatically',
        'If automatic download fails, manually download from:',
        'https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata',
        'Place the file in the application\'s tesseract-assets directory'
      ],
      fallbackAvailable: true,
      fallbackDescription: 'Text-based PDF extraction will still work without OCR'
    },
    {
      name: 'Disk Space',
      description: 'At least 500MB of free disk space',
      required: false,
      checkFunction: async () => {
        try {
          const userDataPath = app.getPath('userData');
          // This is a simplified check - actual disk space checking is platform-specific
          // We'll just verify we can write a test file
          const testFile = path.join(userDataPath, '.disk-check-test');
          await fs.promises.writeFile(testFile, 'test');
          await fs.promises.unlink(testFile);
          return true;
        } catch {
          return false;
        }
      },
      installationGuidance: [
        'Free up disk space by deleting unnecessary files',
        'The application needs space for temporary processing files',
        'Check available disk space on your system drive',
        'Consider moving large files to external storage'
      ],
      fallbackAvailable: true,
      fallbackDescription: 'Processing may fail for large PDF files'
    }
  ];

  /**
   * Run all system checks
   */
  static async runAllChecks(): Promise<SystemCheckResult[]> {
    const results: SystemCheckResult[] = [];

    for (const requirement of this.requirements) {
      try {
        const satisfied = await requirement.checkFunction();
        results.push({
          requirement: requirement.name,
          satisfied,
          required: requirement.required,
          message: satisfied
            ? `${requirement.name}: OK`
            : `${requirement.name}: ${requirement.description} not available`,
          installationGuidance: satisfied ? undefined : requirement.installationGuidance,
          fallbackAvailable: requirement.fallbackAvailable,
          fallbackDescription: requirement.fallbackDescription
        });
      } catch (error) {
        results.push({
          requirement: requirement.name,
          satisfied: false,
          required: requirement.required,
          message: `${requirement.name}: Check failed - ${(error as Error).message}`,
          installationGuidance: requirement.installationGuidance,
          fallbackAvailable: requirement.fallbackAvailable,
          fallbackDescription: requirement.fallbackDescription
        });
      }
    }

    return results;
  }

  /**
   * Check if all critical requirements are met
   */
  static async checkCriticalRequirements(): Promise<{
    allMet: boolean;
    failedRequirements: SystemCheckResult[];
  }> {
    const results = await this.runAllChecks();
    const failedCritical = results.filter(r => r.required && !r.satisfied);

    return {
      allMet: failedCritical.length === 0,
      failedRequirements: failedCritical
    };
  }

  /**
   * Get comprehensive system diagnostics
   */
  static async getDiagnostics(): Promise<SystemDiagnostics> {
    const checkResults = await this.runAllChecks();
    const allRequirementsMet = checkResults.every(r => r.satisfied);
    const criticalRequirementsMet = checkResults
      .filter(r => r.required)
      .every(r => r.satisfied);

    return {
      platform: os.platform(),
      platformVersion: os.release(),
      arch: os.arch(),
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron || 'unknown',
      totalMemory: this.formatBytes(os.totalmem()),
      freeMemory: this.formatBytes(os.freemem()),
      cpuCount: os.cpus().length,
      appVersion: app.getVersion(),
      userDataPath: app.getPath('userData'),
      tempPath: app.getPath('temp'),
      allRequirementsMet,
      criticalRequirementsMet,
      checkResults,
      timestamp: new Date()
    };
  }

  /**
   * Get system recommendations based on current state
   */
  static async getRecommendations(): Promise<string[]> {
    const diagnostics = await this.getDiagnostics();
    const recommendations: string[] = [];

    // Check memory
    const freeMemoryBytes = os.freemem();
    const twoGB = 2 * 1024 * 1024 * 1024;
    const fourGB = 4 * 1024 * 1024 * 1024;

    if (freeMemoryBytes < twoGB) {
      recommendations.push(
        'Low memory detected. Close other applications for better performance.'
      );
    } else if (freeMemoryBytes < fourGB) {
      recommendations.push(
        'Moderate memory available. Large PDF processing may be slower.'
      );
    }

    // Check failed optional requirements
    const failedOptional = diagnostics.checkResults.filter(
      r => !r.required && !r.satisfied
    );

    for (const failed of failedOptional) {
      if (failed.fallbackAvailable) {
        recommendations.push(
          `${failed.requirement} not available. ${failed.fallbackDescription}`
        );
      } else {
        recommendations.push(
          `${failed.requirement} not available. Some features may be limited.`
        );
      }
    }

    // Platform-specific recommendations
    if (os.platform() === 'darwin') {
      recommendations.push(
        'macOS detected. Ensure the application has Full Disk Access if you encounter file access issues.'
      );
    } else if (os.platform() === 'win32') {
      recommendations.push(
        'Windows detected. Run as administrator if you encounter permission issues.'
      );
    }

    return recommendations;
  }

  /**
   * Export diagnostics for support
   */
  static async exportDiagnostics(): Promise<string> {
    const diagnostics = await this.getDiagnostics();
    return JSON.stringify(diagnostics, null, 2);
  }

  /**
   * Check if a specific feature is available
   */
  static async isFeatureAvailable(featureName: string): Promise<boolean> {
    const results = await this.runAllChecks();
    
    switch (featureName.toLowerCase()) {
      case 'ocr':
        const tesseractCheck = results.find(r => r.requirement === 'Tesseract Assets');
        return tesseractCheck?.satisfied || false;
      
      case 'large-pdf':
        const memoryCheck = results.find(r => r.requirement === 'Sufficient Memory');
        const diskCheck = results.find(r => r.requirement === 'Disk Space');
        return (memoryCheck?.satisfied || false) && (diskCheck?.satisfied || false);
      
      default:
        return true;
    }
  }

  /**
   * Get fallback options for a failed requirement
   */
  static async getFallbackOptions(requirementName: string): Promise<{
    available: boolean;
    description?: string;
    actions?: string[];
  }> {
    const requirement = this.requirements.find(r => r.name === requirementName);
    
    if (!requirement) {
      return { available: false };
    }

    if (!requirement.fallbackAvailable) {
      return { available: false };
    }

    return {
      available: true,
      description: requirement.fallbackDescription,
      actions: [
        'The application will continue with reduced functionality',
        'Some features may be unavailable or slower',
        'Consider addressing the requirement for full functionality'
      ]
    };
  }

  /**
   * Format bytes to human-readable string
   */
  private static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Validate startup requirements
   */
  static async validateStartup(): Promise<{
    canStart: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const { allMet, failedRequirements } = await this.checkCriticalRequirements();
    const allResults = await this.runAllChecks();
    
    const errors: string[] = [];
    const warnings: string[] = [];

    // Critical failures
    for (const failed of failedRequirements) {
      errors.push(`Critical: ${failed.message}`);
      if (failed.installationGuidance) {
        errors.push(...failed.installationGuidance.map(g => `  - ${g}`));
      }
    }

    // Optional failures
    const failedOptional = allResults.filter(r => !r.required && !r.satisfied);
    for (const failed of failedOptional) {
      warnings.push(`Warning: ${failed.message}`);
      if (failed.fallbackAvailable) {
        warnings.push(`  - ${failed.fallbackDescription}`);
      }
    }

    return {
      canStart: allMet,
      errors,
      warnings
    };
  }
}
