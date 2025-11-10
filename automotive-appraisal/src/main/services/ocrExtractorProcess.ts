/**
 * OCR Extractor using Tesseract.js directly in the main process
 * Simplified version that works in packaged Electron apps
 */

import { createWorker, PSM } from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getTesseractAssetPaths, verifyTesseractAssets } from './tesseractAssets';
import { app } from 'electron';
import { GraphicsMagickService } from './graphicsMagickService';
import { GraphicsMagickSpawner } from './graphicsMagickSpawner';

export type OCRProgressCallback = (progress: number, message?: string) => void;

/**
 * Debug function to log module resolution information
 * Helps troubleshoot worker thread module loading issues in packaged apps
 */
function debugModuleResolution(): void {
  console.log('=== Module Resolution Debug ===');
  console.log('Resources path:', process.resourcesPath);
  console.log('NODE_PATH:', process.env.NODE_PATH || '(not set)');
  console.log('Module global paths:', require('module').globalPaths);
  
  try {
    const resolvedPath = require.resolve('regenerator-runtime/runtime');
    console.log('✅ regenerator-runtime resolved:', resolvedPath);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log('❌ Cannot resolve regenerator-runtime:', errorMessage);
  }
}

/**
 * Extract text from PDF using OCR
 */
export async function extractTextWithOCRProcess(
  pdfBuffer: Buffer,
  onProgress?: OCRProgressCallback
): Promise<string> {
  // Verify Tesseract assets exist
  try {
    await verifyTesseractAssets();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `OCR assets are missing or inaccessible. The application cannot process PDFs.\n\n` +
      `Details: ${errorMessage}\n\n` +
      `Please reinstall the application or contact support.`
    );
  }

  // Verify GraphicsMagick is available
  let gmPath: string;
  let gmLibPath: string;
  let gsBinDir: string = ''; // Directory containing Ghostscript binary
  
  try {
    await GraphicsMagickService.verifyGraphicsMagick();
    gmPath = GraphicsMagickService.getGraphicsMagickPath();
    gmLibPath = GraphicsMagickService.getLibraryPath();
    
    // Get Ghostscript path - this will be the full path to the gs binary
    const gsPath = GraphicsMagickService.getGhostscriptPath();
    // Extract the directory containing the gs binary
    gsBinDir = path.dirname(gsPath);
    
    // Ensure system fallback is disabled (use bundled)
    GraphicsMagickSpawner.disableSystemFallback();
    
    console.log('✅ Using bundled GraphicsMagick:', gmPath);
    console.log('✅ Using bundled Ghostscript:', gsPath);
  } catch (bundledError) {
    const bundledErrorMessage = bundledError instanceof Error ? bundledError.message : String(bundledError);
    console.warn('⚠️ Bundled GraphicsMagick verification failed:', bundledErrorMessage);
    
    // Try system GraphicsMagick as fallback
    try {
      console.log('🔄 Attempting fallback to system GraphicsMagick...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 FALLBACK MODE ACTIVATED');
      console.log('   Reason: Bundled GraphicsMagick is not available');
      console.log('   Action: Attempting to use system-installed GraphicsMagick');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Test if system GraphicsMagick is available using GraphicsMagickSpawner
      // First, enable system fallback mode
      GraphicsMagickSpawner.enableSystemFallback('gm');
      
      // Test system GraphicsMagick
      const systemGmWorks = await GraphicsMagickSpawner.test();
      
      if (!systemGmWorks) {
        throw new Error('System GraphicsMagick test failed');
      }
      
      gmPath = 'gm'; // Use system binary
      gmLibPath = ''; // Use system libraries
      gsBinDir = ''; // Use system Ghostscript
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SYSTEM FALLBACK SUCCESSFUL');
      console.log('   System GraphicsMagick is available and working');
      console.log('   All PDF processing will use system GraphicsMagick');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (systemError) {
      const systemErrorMessage = systemError instanceof Error ? systemError.message : String(systemError);
      
      // Disable fallback mode since it failed
      GraphicsMagickSpawner.disableSystemFallback();
      
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ FALLBACK FAILED');
      console.error('   Both bundled and system GraphicsMagick are unavailable');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Both bundled and system GraphicsMagick failed
      throw new Error(
        `PDF processing requires GraphicsMagick but it is not available.\n\n` +
        `Bundled GraphicsMagick: ${bundledErrorMessage}\n` +
        `System GraphicsMagick: ${systemErrorMessage}\n\n` +
        `Please try:\n` +
        `1. Reinstalling the application\n` +
        `2. Installing GraphicsMagick manually:\n` +
        `   • macOS: brew install graphicsmagick\n` +
        `   • Windows: Download from http://www.graphicsmagick.org/download.html\n` +
        `   • Linux: sudo apt-get install graphicsmagick\n\n` +
        `After installation, restart the application and try again.`
      );
    }
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-'));
  const inputPath = path.join(tempDir, 'input.pdf');
  
  // Store original PATH and environment to restore later
  const originalPath = process.env.PATH || '';
  const originalMagickConfigurePath = process.env.MAGICK_CONFIGURE_PATH;
  
  try {
    // If using bundled GraphicsMagick, create a runtime delegates file
    if (!GraphicsMagickSpawner.isUsingSystemFallback() && gsBinDir) {
      const gmBundlePath = path.dirname(path.dirname(gmPath)); // Go up from bin/ to bundle root
      const delegatesTemplatePath = path.join(gmBundlePath, 'config', 'delegates.mgk');
      
      if (await fs.access(delegatesTemplatePath).then(() => true).catch(() => false)) {
        // Read the template delegates file
        const delegatesTemplate = await fs.readFile(delegatesTemplatePath, 'utf-8');
        
        // Replace placeholder with actual Ghostscript path
        const gsPath = GraphicsMagickService.getGhostscriptPath();
        const delegatesContent = delegatesTemplate.replace(/@GS_BIN_PATH@/g, gsPath);
        
        // Write runtime delegates file to temp directory
        const runtimeConfigDir = path.join(tempDir, 'gm-config');
        await fs.mkdir(runtimeConfigDir, { recursive: true });
        const runtimeDelegatesPath = path.join(runtimeConfigDir, 'delegates.mgk');
        await fs.writeFile(runtimeDelegatesPath, delegatesContent);
        
        // Set MAGICK_CONFIGURE_PATH so GraphicsMagick uses our custom delegates
        process.env.MAGICK_CONFIGURE_PATH = runtimeConfigDir;
        console.log('✅ Created runtime delegates.mgk with Ghostscript path:', gsPath);
        console.log('   Config path:', runtimeConfigDir);
      } else {
        console.warn('⚠️  delegates.mgk template not found, will rely on PATH');
      }
    }
    
    // Write PDF to temp file
    await fs.writeFile(inputPath, pdfBuffer);
    
    if (onProgress) onProgress(5, 'Converting PDF to images...');
    
    // Test GraphicsMagick before processing
    console.log('🧪 Testing GraphicsMagick execution...');
    const gmTestResult = await GraphicsMagickSpawner.test();
    if (!gmTestResult) {
      console.warn('⚠️ GraphicsMagick test failed, attempting fallback to pdf2pic...');
    } else {
      console.log('✅ GraphicsMagick test passed');
    }
    
    // Prepare pdf2pic as fallback (only used if GraphicsMagickSpawner fails)
    const converterOptions: any = {
      density: 300,
      saveFilename: 'page',
      savePath: tempDir,
      format: 'png',
      width: 2480,
      height: 3508
    };
    
    const converter = fromPath(inputPath, converterOptions);
    
    // Configure pdf2pic fallback
    if (!GraphicsMagickSpawner.isUsingSystemFallback()) {
      const gmDir = path.dirname(gmPath) + '/';
      converter.setGMClass(gmDir);
    }
    
    if (onProgress) onProgress(10, 'Initializing OCR...');
    
    console.log('🔍 Starting OCR processing...');
    
    // Initialize Tesseract worker
    const assetPaths = getTesseractAssetPaths();
    
    // Set NODE_PATH so worker threads can find modules in Resources
    const oldNodePath = process.env.NODE_PATH;
    process.env.NODE_PATH = process.resourcesPath;
    
    // Force Node to update module search paths
    // @ts-ignore - Module._initPaths exists but not in types
    require('module').Module._initPaths();
    
    // Debug module resolution before creating worker
    debugModuleResolution();
    
    let worker;
    try {
      console.log('🔧 Creating Tesseract worker...');
      worker = await createWorker('eng', 1, {
        langPath: assetPaths.langPath,
        workerPath: assetPaths.workerPath,
        corePath: assetPaths.corePath,
        cachePath: app.getPath('temp'),
        logger: (m: { status: string; progress?: number }) => {
          if (m.status === 'recognizing text' && onProgress) {
            const baseProgress = 15;
            const progressRange = 75;
            const pageProgress = (m.progress || 0) * progressRange;
            onProgress(Math.min(90, baseProgress + pageProgress), m.status);
          }
        }
      });
      console.log('✅ Tesseract worker created successfully');
    } catch (error) {
      console.error('❌ Failed to create Tesseract worker:', error);
      
      // Provide detailed error information
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Check if it's a module resolution error
        if (error.message.includes('Cannot find module') || error.message.includes('regenerator-runtime')) {
          throw new Error(
            'OCR worker failed to initialize due to missing module dependencies. ' +
            'This typically indicates a packaging issue. Please reinstall the application.\n\n' +
            `Technical details: ${error.message}`
          );
        }
      }
      
      // Re-throw with user-friendly message
      throw new Error(
        'Failed to initialize OCR processing. Please try again or reinstall the application.\n\n' +
        `Technical details: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    
    // Restore NODE_PATH
    if (oldNodePath) {
      process.env.NODE_PATH = oldNodePath;
    } else {
      delete process.env.NODE_PATH;
    }
    
    // Set page segmentation mode for better accuracy
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });
    
    try {
      const allText: string[] = [];
      let pageNum = 1;
      let hasMorePages = true;
      const MAX_PAGES = 5; // Only process first 5 pages
      
      // Process pages until no more pages exist or max pages reached
      while (hasMorePages && pageNum <= MAX_PAGES) {
        try {
          console.log(`📄 Processing page ${pageNum}...`);
          if (onProgress) {
            onProgress(15 + (pageNum - 1) * 15, `Processing page ${pageNum} of ${MAX_PAGES}...`);
          }
          
          // Convert page to image using GraphicsMagickSpawner
          const imagePath = path.join(tempDir, `page-${pageNum}.png`);
          let conversionSuccess = false;
          let conversionError: Error | null = null;
          let fallbackErrorMessage = '';
          
          try {
            console.log(`🔄 Converting page ${pageNum} using GraphicsMagickSpawner...`);
            await GraphicsMagickSpawner.convertPdfPageToPng(
              inputPath,
              pageNum,
              imagePath,
              {
                density: 300,
                width: 2480,
                height: 3508
              }
            );
            conversionSuccess = true;
            console.log(`✅ Page ${pageNum} converted successfully using GraphicsMagickSpawner`);
          } catch (spawnerError) {
            conversionError = spawnerError instanceof Error ? spawnerError : new Error(String(spawnerError));
            const errorMessage = conversionError.message;
            
            // Detect EPIPE or library loading errors
            if (errorMessage.includes('EPIPE') || errorMessage.includes('broken pipe') || errorMessage.includes('ENOENT')) {
              console.error('❌ EPIPE/Process error detected - GraphicsMagick process failed to start or crashed');
              console.error('   This usually indicates a library loading problem or missing binary');
              console.error('   Error details:', errorMessage);
              
              // Log comprehensive diagnostic information
              const env = GraphicsMagickSpawner.getEnvironment();
              console.error('=== GraphicsMagick Diagnostic Information ===');
              console.error('Binary path:', gmPath);
              console.error('Library path:', gmLibPath);
              console.error('Ghostscript bin directory:', gsBinDir);
              console.error('Using system fallback:', GraphicsMagickSpawner.isUsingSystemFallback());
              console.error('');
              console.error('Environment Variables:');
              console.error('  DYLD_LIBRARY_PATH:', env.DYLD_LIBRARY_PATH || '(not set)');
              console.error('  DYLD_FALLBACK_LIBRARY_PATH:', env.DYLD_FALLBACK_LIBRARY_PATH || '(not set)');
              console.error('  PATH:', env.PATH || '(not set)');
              console.error('  MAGICK_CONFIGURE_PATH:', env.MAGICK_CONFIGURE_PATH || '(not set)');
              console.error('');
              console.error('Process Information:');
              console.error('  Platform:', process.platform);
              console.error('  Architecture:', process.arch);
              console.error('  Node version:', process.version);
              console.error('  App packaged:', app.isPackaged);
              console.error('============================================');
              
              // Try pdf2pic fallback
              console.log('🔄 Attempting fallback to pdf2pic...');
            } else {
              console.warn(`⚠️ GraphicsMagickSpawner failed for page ${pageNum}:`, errorMessage);
              console.log('🔄 Attempting fallback strategies...');
            }
            
            // Strategy 1: Try system GraphicsMagick if not already using it
            if (!GraphicsMagickSpawner.isUsingSystemFallback()) {
              try {
                console.log('🔄 Strategy 1: Trying system GraphicsMagick fallback...');
                GraphicsMagickSpawner.enableSystemFallback('gm');
                
                // Test if system GraphicsMagick works
                const systemGmWorks = await GraphicsMagickSpawner.test();
                
                if (systemGmWorks) {
                  console.log('✅ System GraphicsMagick is available, retrying conversion...');
                  
                  // Retry conversion with system GraphicsMagick
                  await GraphicsMagickSpawner.convertPdfPageToPng(
                    inputPath,
                    pageNum,
                    imagePath,
                    {
                      density: 300,
                      width: 2480,
                      height: 3508
                    }
                  );
                  conversionSuccess = true;
                  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                  console.log('✅ SYSTEM FALLBACK SUCCESSFUL');
                  console.log(`   Page ${pageNum} converted using system GraphicsMagick`);
                  console.log('   Future conversions will use system GraphicsMagick');
                  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                } else {
                  console.warn('⚠️ System GraphicsMagick test failed');
                  GraphicsMagickSpawner.disableSystemFallback();
                }
              } catch (systemFallbackError) {
                const systemFallbackErrorMessage = systemFallbackError instanceof Error ? systemFallbackError.message : String(systemFallbackError);
                console.warn('⚠️ System GraphicsMagick fallback failed:', systemFallbackErrorMessage);
                GraphicsMagickSpawner.disableSystemFallback();
              }
            }
            
            // Strategy 2: Fallback to pdf2pic if system fallback didn't work
            if (!conversionSuccess) {
              try {
                console.log('🔄 Strategy 2: Trying pdf2pic fallback...');
                const imageResult = await converter(pageNum, { responseType: 'image' });
                if (imageResult.path) {
                  // Move the pdf2pic output to our expected path
                  await fs.rename(imageResult.path, imagePath);
                  conversionSuccess = true;
                  console.log(`✅ Page ${pageNum} converted successfully using pdf2pic fallback`);
                }
              } catch (fallbackError) {
                fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                console.error(`❌ pdf2pic fallback also failed for page ${pageNum}:`, fallbackErrorMessage);
              }
            }
            
            // Check if any fallback strategy succeeded
            if (!conversionSuccess) {
                
                // If this is the first page, throw a detailed error
                if (pageNum === 1) {
                  // Check if it's an EPIPE error or process failure
                  if (errorMessage.includes('EPIPE') || errorMessage.includes('broken pipe') || errorMessage.includes('ENOENT')) {
                    // Get environment for detailed logging
                    const env = GraphicsMagickSpawner.getEnvironment();
                    
                    // Log full environment variables for debugging
                    console.error('=== Full Environment Variables (EPIPE Error) ===');
                    console.error('All environment variables:');
                    Object.keys(env).sort().forEach(key => {
                      if (key.includes('DYLD') || key.includes('PATH') || key.includes('MAGICK') || key.includes('LIB')) {
                        console.error(`  ${key}=${env[key]}`);
                      }
                    });
                    console.error('================================================');
                    
                    throw new Error(
                    '❌ PDF Processing Failed: GraphicsMagick Process Error (EPIPE)\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '🔍 WHAT HAPPENED:\n' +
                    'The GraphicsMagick process failed to start or crashed immediately.\n' +
                    'This is typically caused by dynamic library loading issues.\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '🔧 POSSIBLE CAUSES:\n' +
                    '1. Required .dylib files are missing from the application bundle\n' +
                    '2. Library paths (DYLD_LIBRARY_PATH) are not configured correctly\n' +
                    '3. The binary is not compatible with your system architecture\n' +
                    '4. macOS System Integrity Protection (SIP) is blocking library loading\n' +
                    '5. The GraphicsMagick binary or its dependencies are corrupted\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '✅ TROUBLESHOOTING STEPS:\n\n' +
                    '1. CHECK CONSOLE.APP FOR DETAILED ERRORS:\n' +
                    '   • Open Console.app (Applications > Utilities > Console)\n' +
                    '   • Search for "dyld" or "Automotive Appraisal"\n' +
                    '   • Look for messages like "Library not loaded" or "image not found"\n' +
                    '   • These messages will show exactly which library is missing\n\n' +
                    '2. REINSTALL THE APPLICATION:\n' +
                    '   • Completely remove the current installation\n' +
                    '   • Download a fresh copy\n' +
                    '   • Install and try again\n\n' +
                    '3. INSTALL SYSTEM GRAPHICSMAGICK (RECOMMENDED):\n' +
                    '   • macOS (Intel): brew install graphicsmagick\n' +
                    '   • macOS (Apple Silicon): brew install graphicsmagick\n' +
                    '   • Windows: Download from http://www.graphicsmagick.org/download.html\n' +
                    '   • Linux: sudo apt-get install graphicsmagick\n' +
                    '   • After installation, restart the application\n\n' +
                    '4. CHECK SYSTEM COMPATIBILITY:\n' +
                    '   • Ensure you\'re running a supported macOS version (10.13+)\n' +
                    '   • Verify your architecture matches the application build\n\n' +
                      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                      '📊 DIAGNOSTIC INFORMATION:\n\n' +
                      `System:\n` +
                      `  Platform: ${process.platform}\n` +
                      `  Architecture: ${process.arch}\n` +
                      `  Node version: ${process.version}\n` +
                      `  App packaged: ${app.isPackaged}\n\n` +
                      `GraphicsMagick Configuration:\n` +
                      `  Binary path: ${gmPath}\n` +
                      `  Library path: ${gmLibPath || '(using system libraries)'}\n` +
                      `  Ghostscript bin: ${gsBinDir || '(not set)'}\n` +
                      `  Using system fallback: ${GraphicsMagickSpawner.isUsingSystemFallback()}\n\n` +
                      `Environment Variables:\n` +
                      `  DYLD_LIBRARY_PATH: ${env.DYLD_LIBRARY_PATH || '(not set)'}\n` +
                      `  DYLD_FALLBACK_LIBRARY_PATH: ${env.DYLD_FALLBACK_LIBRARY_PATH || '(not set)'}\n` +
                      `  PATH: ${env.PATH?.split(':').slice(0, 3).join(':') || '(not set)'}...\n` +
                      `  MAGICK_CONFIGURE_PATH: ${env.MAGICK_CONFIGURE_PATH || '(not set)'}\n\n` +
                      `Error Details:\n` +
                      `  Primary error: ${errorMessage}\n` +
                      `  Fallback error: ${fallbackErrorMessage}\n\n` +
                      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                      '💡 TIP: The Console.app logs (step 1) will provide the most specific\n' +
                      '    information about which library is causing the problem.\n\n' +
                      '📧 If the issue persists after trying these steps, please contact\n' +
                      '    support with the diagnostic information above and any relevant\n' +
                      '    Console.app logs.'
                    );
                  }
                  
                  throw new Error(
                    `Failed to convert PDF page to image.\n\n` +
                    `GraphicsMagick path: ${gmPath}\n` +
                    `Using system fallback: ${GraphicsMagickSpawner.isUsingSystemFallback()}\n\n` +
                    `The PDF may be corrupted or in an unsupported format.\n\n` +
                    `Technical details:\n` +
                    `Primary error: ${errorMessage}\n` +
                    `Fallback error: ${fallbackErrorMessage}`
                  );
                }
                
                // For subsequent pages, assume we've reached the end
                throw new Error('Conversion failed for subsequent page');
              }
            }
            
            // Check if conversion was successful
            if (!conversionSuccess) {
            console.log('ℹ️ No more pages to process');
            hasMorePages = false;
            break;
          }
          
          // Verify the image file exists
          const imageExists = await fs.access(imagePath).then(() => true).catch(() => false);
          if (!imageExists) {
            console.log(`ℹ️ Image file not created for page ${pageNum}, assuming end of document`);
            hasMorePages = false;
            break;
          }
          
          // OCR the image
          console.log(`🔍 Extracting text from page ${pageNum}...`);
          const { data: { text } } = await worker.recognize(imagePath);
          allText.push(text);
          console.log(`✅ Page ${pageNum} processed successfully (${text.length} characters extracted)`);
          
          // Clean up image
          try {
            await fs.unlink(imagePath);
          } catch (error) {
            console.error(`Failed to cleanup image ${imagePath}:`, error);
          }
          
          pageNum++;
          
        } catch (error) {
          // Error during page processing
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`ℹ️ Stopped at page ${pageNum}: ${errorMessage}`);
          
          // If this is the first page and it failed, it's a real error
          if (pageNum === 1) {
            console.error('❌ Failed to process first page:', error);
            throw error; // Re-throw the error (it's already formatted above)
          }
          
          // Otherwise, we've reached the end of the document
          hasMorePages = false;
        }
      }
      
      if (pageNum > MAX_PAGES) {
        console.log(`ℹ️ Stopped processing after ${MAX_PAGES} pages (maximum limit)`);
      }
      
      const pagesProcessed = allText.length;
      console.log(`📊 Text extraction complete: ${pagesProcessed} page${pagesProcessed !== 1 ? 's' : ''} processed`);
      if (onProgress) onProgress(95, 'Finalizing...');
      
      if (allText.length === 0) {
        throw new Error('No text could be extracted from the PDF');
      }
      
      return allText.join('\n\n');
      
    } finally {
      console.log('🛑 Terminating Tesseract worker...');
      await worker.terminate();
      console.log('✅ Tesseract worker terminated successfully');
    }
    
  } finally {
    // Restore original PATH
    process.env.PATH = originalPath;
    
    // Restore original MAGICK_CONFIGURE_PATH
    if (originalMagickConfigurePath !== undefined) {
      process.env.MAGICK_CONFIGURE_PATH = originalMagickConfigurePath;
    } else {
      delete process.env.MAGICK_CONFIGURE_PATH;
    }
    
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup temp directory:', error);
    }
  }
}
