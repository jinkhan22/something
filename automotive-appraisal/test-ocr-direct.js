#!/usr/bin/env node

/**
 * Test OCR extraction directly by running the ocr-worker.ts
 * This tests the OCR pipeline outside of Electron
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Test file path (modify this to test different PDFs)
const TEST_PDF = path.join(__dirname, '..', 'valuation_report_samples', '14 santa fe eval.pdf');
const OUTPUT_FILE = path.join(__dirname, 'test-ocr-output.txt');

// Tesseract asset paths
const TESSERACT_LANG_PATH = path.join(__dirname, 'node_modules', 'tesseract.js-core');
const TESSERACT_CORE_PATH = path.join(__dirname, 'node_modules', 'tesseract.js-core');
const TESSERACT_WORKER_PATH = path.join(__dirname, 'node_modules', 'tesseract.js', 'src', 'worker-script');

console.log('=== OCR DIRECT TEST ===\n');
console.log('Test PDF:', TEST_PDF);
console.log('Output File:', OUTPUT_FILE);
console.log('Lang Path:', TESSERACT_LANG_PATH);
console.log('Core Path:', TESSERACT_CORE_PATH);
console.log('Worker Path:', TESSERACT_WORKER_PATH);
console.log('\nChecking if eng.traineddata exists...');

// Check if eng.traineddata exists
const langDataPath = path.join(TESSERACT_LANG_PATH, 'eng.traineddata');
if (fs.existsSync(langDataPath)) {
  const stats = fs.statSync(langDataPath);
  console.log(`✓ eng.traineddata found (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
} else {
  console.error('✗ eng.traineddata NOT FOUND at:', langDataPath);
  console.error('\nPlease run: node scripts/setup-tesseract-assets.js');
  process.exit(1);
}

// Check if test PDF exists
if (!fs.existsSync(TEST_PDF)) {
  console.error('✗ Test PDF not found at:', TEST_PDF);
  console.error('\nPlease provide a valid PDF path.');
  process.exit(1);
}

console.log('\n=== Starting OCR Process ===\n');

// Run the OCR worker
const worker = spawn('npx', ['tsx', 'ocr-worker.ts', TEST_PDF, OUTPUT_FILE], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    TESSERACT_LANG_PATH,
    TESSERACT_CORE_PATH,
    TESSERACT_WORKER_PATH
  }
});

let lastProgress = 0;

// Capture stdout
worker.stdout.on('data', (data) => {
  const output = data.toString().trim();
  console.log('[STDOUT]', output);
});

// Capture stderr (progress updates)
worker.stderr.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const { progress, message } = JSON.parse(line);
      if (progress !== lastProgress) {
        console.log(`[${progress}%] ${message}`);
        lastProgress = progress;
      }
    } catch (e) {
      // Not JSON, just log it
      console.log('[STDERR]', line);
    }
  }
});

// Handle completion
worker.on('close', (code) => {
  console.log('\n=== OCR Process Complete ===');
  console.log('Exit Code:', code);
  
  if (code === 0) {
    console.log('\n✓ SUCCESS!\n');
    
    // Check if output file was created
    if (fs.existsSync(OUTPUT_FILE)) {
      const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
      const lines = content.split('\n').length;
      const chars = content.length;
      
      console.log('Output File:', OUTPUT_FILE);
      console.log('Lines:', lines);
      console.log('Characters:', chars);
      console.log('\n=== First 500 characters ===');
      console.log(content.substring(0, 500));
      console.log('\n...(truncated)...\n');
      
      console.log('\n✓ OCR extraction successful!');
      console.log('You can now view the full output at:', OUTPUT_FILE);
    } else {
      console.error('✗ Output file not created');
    }
  } else {
    console.error('\n✗ OCR process failed with exit code:', code);
  }
});

// Handle errors
worker.on('error', (error) => {
  console.error('\n✗ Failed to spawn OCR process:', error.message);
  process.exit(1);
});

