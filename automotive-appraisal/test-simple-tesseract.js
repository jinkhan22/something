#!/usr/bin/env node

/**
 * Simplified Tesseract test using default paths
 */

const { createWorker } = require('tesseract.js');
const { fromPath } = require('pdf2pic');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function simpleTest() {
  const testPdf = path.join(__dirname, '..', 'valuation_report_samples', '14 santa fe eval.pdf');
  
  console.log('=== Simple Tesseract Test ===\n');
  
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simple-test-'));
  
  try {
    // Convert PDF to image
    console.log('Converting PDF to image...');
    const converter = fromPath(testPdf, {
      density: 300,
      saveFilename: 'page',
      savePath: tempDir,
      format: 'png',
      width: 2400,
      height: 3000,
      preserveAspectRatio: true
    });
    
    const pageImage = await converter(1, { responseType: 'image' });
    console.log('✓ Image:', pageImage.path);
    
    // Initialize worker with DEFAULT settings (let tesseract.js handle paths)
    console.log('\nInitializing Tesseract worker with default settings...');
    const worker = await createWorker('eng', 1, {
      logger: (m) => console.log('[Tesseract]', m.status, m.progress ? `${(m.progress * 100).toFixed(0)}%` : ''),
    });
    
    console.log('✓ Worker initialized');
    
    // Run OCR
    console.log('\nRunning OCR...');
    const { data: { text } } = await worker.recognize(pageImage.path);
    
    console.log('\n✓ Success!');
    console.log('Text length:', text.length, 'characters');
    console.log('\nFirst 300 characters:');
    console.log(text.substring(0, 300));
    
    // Save output
    const outputPath = path.join(__dirname, 'simple-test-output.txt');
    fs.writeFileSync(outputPath, text, 'utf-8');
    console.log('\n✓ Saved to:', outputPath);
    
    await worker.terminate();
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

simpleTest();
