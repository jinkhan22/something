#!/usr/bin/env tsx
/**
 * Standalone OCR processor that runs in a separate Node process
 * This avoids Electron's worker thread issues
 */

import { createWorker } from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Post-process extracted text to fix common OCR errors
 */
function postProcessOCRText(text: string): string {
  // Fix common OCR errors in VINs
  // VINs are 17 characters: digits 0-9 and letters A-Z (excluding I, O, Q)
  // 
  // Common OCR mistakes:
  // - Digit "9" read as letter "I" or "IF" 
  // - Digit "4" read as letter "A"
  // - Digit "0" read as letter "O" (but O not allowed in VINs)
  // - Digit "1" read as letter "I" (but I not allowed in VINs)
  // - Letter "B" read as "8"
  // - Letter "S" read as "5"
  // - Letter "Z" read as "2"
  
  // Step 1: Fix VIN context errors BEFORE pattern matching
  // Look for "VIN" followed by characters that might be a malformed VIN
  text = text.replace(/VIN\s+([A-HJ-NPR-Z0-9BIOQV]{17,25})/gi, (match, vinCandidate) => {
    let corrected = vinCandidate;
    const original = vinCandidate;
    
    // Fix common OCR errors in sequence (order matters!)
    
    // Step 1: Fix multi-character OCR errors first
    corrected = corrected.replace(/IFF/g, '9FF');  // "9" read as "IFF"
    corrected = corrected.replace(/IF/g, '9');      // "9" read as "IF"
    
    // Step 2: Fix single-character errors that are NOT allowed in VINs
    corrected = corrected.replace(/I/g, '1');  // "1" read as "I" (I not allowed in VINs)
    corrected = corrected.replace(/O/g, '0');  // "0" read as "O" (O not allowed in VINs)
    corrected = corrected.replace(/Q/g, '0');  // "0" read as "Q" (Q not allowed in VINs)
    
    // Step 3: Context-aware corrections for ambiguous characters (B, V, etc.)
    // These COULD be valid, so we need to be smart about it
    
    // Common known WMI patterns (first 3 characters identify manufacturer)
    const wmiPatterns: Record<string, string> = {
      'WBA': 'BMW',    // W + B + A (not W + 6 + A)
      'WBS': 'BMW M',  // W + B + S 
      'WBY': 'BMW',    // W + B + Y
      'WDD': 'Mercedes',  // Already correct
      'WDB': 'Mercedes',  // W + D + B
      'JH4': 'Acura',     // Already correct (J + H + 4, not J + H + A)
      'JHM': 'Honda',     
      '1G1': 'Chevrolet', // 1 + G + 1
      '1G4': 'Buick',     // Already correct
      '2G1': 'Chevrolet',
      '5YJ': 'Tesla'
    };
    
    // If we have 18+ characters and starts with known pattern, remove extra character
    if (corrected.length >= 18) {
      // Check if positions 0-2 match a known WMI after removing char at position 5 or 6
      const potentialWMI1 = corrected.substring(0, 3);
      const potentialWMI2 = corrected.substring(0, 2) + corrected.substring(3, 4); // Skip char at pos 2
      const potentialWMI3 = corrected.charAt(0) + corrected.substring(2, 4); // Skip char at pos 1
      
      // Try removing character at position 5 or 6 (common OCR insertion points)
      const try1 = corrected.substring(0, 5) + corrected.substring(6); // Remove char 5
      const try2 = corrected.substring(0, 6) + corrected.substring(7); // Remove char 6
      
      if (try1.length === 17) corrected = try1;
      else if (try2.length === 17) corrected = try2;
    }
    
    // Fix "V" → "8" in specific contexts (common OCR error)
    // VIN position 6 (index 5) is often a digit in many manufacturers  
    if (corrected.length >= 6 && corrected[5] === 'V') {
      const firstThree = corrected.substring(0, 3);
      // For WBA (BMW), position 6 is typically a digit
      if (firstThree === 'WBA' || firstThree === 'WBS' || firstThree === 'WBY') {
        corrected = corrected.substring(0, 5) + '8' + corrected.substring(6);
      }
    }
    
    // Fix "6" → "B" at position 2 for known BMW VINs (WBA not W6A)
    if (corrected.length >= 3 && corrected[0] === 'W' && corrected[1] === '6') {
      corrected = 'WB' + corrected.substring(2);
    }
    
    // Fix "B" → "6" for other contexts (like WDDJK6... for Mercedes)
    // Only if NOT in first 3 positions (WMI)
    if (corrected.length > 3) {
      const wmi = corrected.substring(0, 3);
      const rest = corrected.substring(3);
      
      // For non-BMW manufacturers, B in positions 4+ might be "6"
      if (!wmi.startsWith('WB')) {
        const restCorrected = rest.replace(/B/g, '6');
        corrected = wmi + restCorrected;
      }
    }
    
    // Truncate to 17 characters if still too long
    if (corrected.length > 17) {
      corrected = corrected.substring(0, 17);
    }
    
    return `VIN ${corrected}`;
  });
  
  // Step 2: Find properly formatted VIN patterns (17 alphanumeric characters)
  // and apply position-based corrections
  const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
  
  text = text.replace(vinPattern, (vin) => {
    let correctedVIN = vin;
    
    // Position-based corrections for known manufacturer patterns
    // Position 2 is often a digit in many VINs
    if (correctedVIN[2] === 'A') {
      const firstTwo = correctedVIN.substring(0, 2);
      // Common patterns where position 2 should be a digit
      const knownPatternsWithDigit = ['JH', '1G', '2G', '3G', '4G', '5G', 'KM', 'WD'];
      
      if (knownPatternsWithDigit.includes(firstTwo)) {
        correctedVIN = correctedVIN.substring(0, 2) + '4' + correctedVIN.substring(3);
      }
    }
    
    return correctedVIN;
  });
  
  return text;
}

/**
 * Verify that Tesseract assets are available
 */
async function verifyAssets(langPath: string, corePath: string): Promise<void> {
  const missingAssets: string[] = [];
  
  // Check for eng.traineddata
  const langDataPath = path.join(langPath, 'eng.traineddata');
  try {
    await fs.access(langDataPath);
  } catch (error) {
    missingAssets.push(`Language data not found at: ${langDataPath}`);
  }
  
  // Check for core worker (in production builds)
  const coreWorkerPath = path.join(corePath, 'tesseract-core.wasm.js');
  try {
    await fs.access(coreWorkerPath);
  } catch (error) {
    // Core worker might be in node_modules in development, so this is not always an error
    // We'll let Tesseract.js handle this
  }
  
  if (missingAssets.length > 0) {
    throw new Error(`Missing Tesseract assets:\n${missingAssets.join('\n')}\n\nPlease ensure the application is properly installed with all required OCR assets.`);
  }
}

/**
 * Extract text from PDF using OCR
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  let tempDir: string | null = null;
  
  try {
    // Verify that eng.traineddata exists in node_modules
    // The postinstall script should have copied it there
    const langDataPath = path.join(process.cwd(), 'node_modules', 'tesseract.js-core', 'eng.traineddata');
    try {
      await fs.access(langDataPath);
    } catch (error) {
      throw new Error(`OCR language data not found at: ${langDataPath}\n\nPlease run: npm install`);
    }
    
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));
    
    // Write PDF to temp file
    const pdfPath = path.join(tempDir, 'input.pdf');
    await fs.writeFile(pdfPath, pdfBuffer);
    
    // Report progress
    process.stderr.write(JSON.stringify({ progress: 5, message: 'Converting PDF to images...' }) + '\n');
    
    // Convert PDF to images
    const converter = fromPath(pdfPath, {
      density: 300,
      saveFilename: 'page',
      savePath: tempDir,
      format: 'png',
      width: 2400,
      height: 3000,
      preserveAspectRatio: true
    });
    
    // Get page count (try converting first page to check)
    let pageCount = 1;
    try {
      const firstPage = await converter(1, { responseType: 'image' });
      // Try to estimate page count (we'll convert until we hit an error)
      pageCount = 5; // Assume max 5 pages
    } catch (error) {
      // If first page fails, PDF might be invalid
      throw new Error('Failed to convert PDF to images. The PDF file may be corrupted or invalid.');
    }
    
    process.stderr.write(JSON.stringify({ progress: 10, message: 'Initializing OCR engine...' }) + '\n');
    
    // Initialize Tesseract worker
    // Note: Using default paths instead of custom paths to avoid worker initialization issues
    // The eng.traineddata file should be in node_modules/tesseract.js-core/ (handled by postinstall script)
    let worker;
    let currentPage = 0;
    
    try {
      // Create worker without logger to avoid confusing progress messages
      // The worker initialization happens silently
      worker = await createWorker('eng', 1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize OCR engine: ${errorMessage}\n\nThis may indicate missing or corrupted OCR assets. Please reinstall the application.`);
    }
    
    // Configure Tesseract for better accuracy
    // Note: tessedit_ocr_engine_mode can only be set during initialization
    await worker.setParameters({
      tessedit_pageseg_mode: 3 as any,         // Fully automatic page segmentation
      preserve_interword_spaces: 1 as any,      // Keep spaces between words
    });
    
    process.stderr.write(JSON.stringify({ progress: 25, message: 'OCR engine ready' }) + '\n');
    
    const pageTexts: string[] = [];
    let successfulPages = 0;
    
    // Process each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        currentPage = pageNum;
        const progressPercent = 25 + (pageNum / pageCount) * 65; // 25-90% range for page processing
        process.stderr.write(JSON.stringify({ 
          progress: Math.round(progressPercent), 
          message: `Processing page ${pageNum}...` 
        }) + '\n');
        
        // Convert page to image
        const pageImage = await converter(pageNum, { responseType: 'image' });
        
        if (!pageImage.path) {
          throw new Error(`Failed to convert page ${pageNum}`);
        }
        
        // Run OCR on page
        const { data: { text } } = await worker.recognize(pageImage.path);
        
        if (text.trim()) {
          pageTexts.push(text);
          successfulPages++;
        }
        
      } catch (error) {
        // Page doesn't exist or conversion failed - we've reached the end
        break;
      }
    }
    
    process.stderr.write(JSON.stringify({ progress: 90, message: 'Finalizing...' }) + '\n');
    
    // Cleanup worker
    if (worker) {
      await worker.terminate();
    }
    
    if (pageTexts.length === 0) {
      throw new Error('No text extracted from PDF. The PDF may not contain any readable text or images.');
    }
    
    process.stderr.write(JSON.stringify({ progress: 100, message: 'Complete' }) + '\n');
    
    // Combine all page text
    const combinedText = pageTexts.join('\n\n--- PAGE BREAK ---\n\n');
    
    // Apply post-processing to fix common OCR errors
    return postProcessOCRText(combinedText);
    
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

async function processOCR() {
  try {
    // Read arguments from command line
    const inputPath = process.argv[2];
    const outputPath = process.argv[3];
    
    if (!inputPath || !outputPath) {
      console.error('Usage: tsx ocr-worker.ts <input.pdf> <output.txt>');
      process.exit(1);
    }
    
    // Read PDF buffer
    const buffer = await fs.readFile(inputPath);
    
    // Process with OCR
    const text = await extractTextFromPDF(buffer);
    
    // Write result to output file
    await fs.writeFile(outputPath, text, 'utf-8');
    
    // Success
    console.log('SUCCESS');
    process.exit(0);
    
  } catch (error) {
    console.error('ERROR:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

processOCR();
