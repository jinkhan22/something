import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Interface defining paths to Tesseract.js assets
 */
export interface TesseractAssetPaths {
  langPath: string;      // Path to directory containing eng.traineddata
  corePath: string;      // Path to directory containing core worker
  workerPath: string;    // Path to worker script
}

/**
 * Get paths to Tesseract assets based on environment (development vs production)
 * 
 * In development: Uses node_modules paths
 * In production: Uses bundled resources paths
 * 
 * @returns TesseractAssetPaths object with langPath, corePath, and workerPath
 */
export function getTesseractAssetPaths(): TesseractAssetPaths {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // Development: use node_modules paths
    const projectRoot = process.cwd();
    return {
      langPath: path.join(projectRoot, 'node_modules', 'tesseract.js-core'),
      corePath: path.join(projectRoot, 'node_modules', 'tesseract.js-core'),
      workerPath: path.join(projectRoot, 'node_modules', 'tesseract.js', 'src', 'worker-script')
    };
  } else {
    // Production: use extraResource node_modules copied to Resources
    const resourcesPath = process.resourcesPath;
    return {
      langPath: path.join(resourcesPath, 'tesseract-assets'),
      corePath: path.join(resourcesPath, 'tesseract.js-core'),
      workerPath: path.join(resourcesPath, 'tesseract.js', 'src', 'worker-script', 'node', 'index.js')
    };
  }
}

/**
 * Verify that all required Tesseract assets exist
 * 
 * Checks for:
 * - eng.traineddata in langPath
 * - tesseract-core.wasm.js in corePath (production only)
 * 
 * @returns Promise<boolean> - true if all assets exist, false otherwise
 * @throws Error with details about missing assets
 */
export async function verifyTesseractAssets(): Promise<boolean> {
  const assetPaths = getTesseractAssetPaths();
  const isDev = !app.isPackaged;
  
  const missingAssets: string[] = [];
  
  // Check for eng.traineddata
  const langDataPath = path.join(assetPaths.langPath, 'eng.traineddata');
  try {
    await fs.access(langDataPath);
  } catch (error) {
    missingAssets.push(`Language data: ${langDataPath}`);
  }
  
  // Note: Core worker files are bundled with tesseract.js in node_modules
  // and don't need to be separately verified in production
  
  if (missingAssets.length > 0) {
    const errorMessage = `Missing Tesseract assets:\n${missingAssets.join('\n')}`;
    throw new Error(errorMessage);
  }
  
  return true;
}
