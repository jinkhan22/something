#!/usr/bin/env node

/**
 * Test Tesseract.js OCR on an image
 */

const { createWorker } = require('tesseract.js');
const { fromPath } = require('pdf2pic');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testTesseract() {
  const testPdf = path.join(__dirname, '..', 'valuation_report_samples', '14 santa fe eval.pdf');
  
  console.log('=== Testing Tesseract.js ===\n');
  console.log('PDF:', testPdf);
  
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tesseract-test-'));
  console.log('Temp dir:', tempDir);
  
  try {
    // Step 1: Convert PDF to image
    console.log('\n[1/3] Converting PDF to image...');
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
    console.log('✓ Image created:', pageImage.path);
    
    // Step 2: Initialize Tesseract worker
    console.log('\n[2/3] Initializing Tesseract worker...');
    
    const langPath = path.join(__dirname, 'node_modules', 'tesseract.js-core');
    const corePath = path.join(__dirname, 'node_modules', 'tesseract.js-core');
    const workerPath = path.join(__dirname, 'node_modules', 'tesseract.js', 'src', 'worker-script');
    
    console.log('Lang path:', langPath);
    console.log('Core path:', corePath);
    console.log('Worker path:', workerPath);
    
    // Check if eng.traineddata exists
    const langDataPath = path.join(langPath, 'eng.traineddata');
    if (!fs.existsSync(langDataPath)) {
      throw new Error('eng.traineddata not found at: ' + langDataPath);
    }
    console.log('✓ eng.traineddata found');
    
    const worker = await createWorker('eng', 1, {
      langPath: langPath,
      corePath: corePath,
      workerPath: workerPath,
      cachePath: tempDir,
      logger: (m) => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rProgress: ${(m.progress * 100).toFixed(0)}%`);
        } else {
          console.log(`[${m.status}]`, m.progress ? `${(m.progress * 100).toFixed(0)}%` : '');
        }
      },
    });
    
    console.log('✓ Tesseract worker initialized');
    
    // Step 3: Run OCR
    console.log('\n[3/3] Running OCR...');
    const { data: { text } } = await worker.recognize(pageImage.path);
    
    console.log('\n✓ OCR Complete!\n');
    console.log('Extracted text length:', text.length, 'characters');
    console.log('\n=== First 500 characters ===');
    console.log(text.substring(0, 500));
    console.log('\n...(truncated)...\n');
    
    // Save to file
    const outputPath = path.join(__dirname, 'test-tesseract-output.txt');
    fs.writeFileSync(outputPath, text, 'utf-8');
    console.log('✓ Full output saved to:', outputPath);
    
    // Cleanup
    await worker.terminate();
    console.log('\n✓ Test successful!');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Cleaned up temp dir');
  }
}

testTesseract();
