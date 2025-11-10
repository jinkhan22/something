#!/usr/bin/env node

/**
 * Setup script to copy Tesseract OCR assets to node_modules
 * This ensures the assets are available in development mode
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', 'eng.traineddata');
const targetDir = path.join(__dirname, '..', 'node_modules', 'tesseract.js-core');
const targetFile = path.join(targetDir, 'eng.traineddata');

console.log('[Setup] Copying Tesseract OCR assets...');

// Check if source file exists
if (!fs.existsSync(sourceFile)) {
  console.error('[Setup] ✗ Source file not found:', sourceFile);
  console.error('[Setup] Please ensure eng.traineddata is in the project root');
  process.exit(1);
}

// Check if target directory exists
if (!fs.existsSync(targetDir)) {
  console.error('[Setup] ✗ Target directory not found:', targetDir);
  console.error('[Setup] Please run npm install first to install tesseract.js-core');
  process.exit(1);
}

// Copy the file
try {
  fs.copyFileSync(sourceFile, targetFile);
  console.log('[Setup] ✓ Successfully copied eng.traineddata to node_modules/tesseract.js-core');
  
  // Verify the file was copied
  const stats = fs.statSync(targetFile);
  console.log(`[Setup] ✓ File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
} catch (error) {
  console.error('[Setup] ✗ Failed to copy file:', error.message);
  process.exit(1);
}

console.log('[Setup] ✓ Tesseract OCR assets setup complete');
