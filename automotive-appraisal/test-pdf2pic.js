#!/usr/bin/env node

/**
 * Test if pdf2pic can convert PDF to images
 */

const { fromPath } = require('pdf2pic');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testPdf2Pic() {
  const testPdf = path.join(__dirname, '..', 'valuation_report_samples', '14 santa fe eval.pdf');
  
  console.log('Testing pdf2pic...');
  console.log('PDF:', testPdf);
  
  if (!fs.existsSync(testPdf)) {
    console.error('Test PDF not found!');
    return;
  }
  
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf2pic-test-'));
  console.log('Temp dir:', tempDir);
  
  try {
    const converter = fromPath(testPdf, {
      density: 300,
      saveFilename: 'page',
      savePath: tempDir,
      format: 'png',
      width: 2400,
      height: 3000,
      preserveAspectRatio: true
    });
    
    console.log('Converting page 1...');
    const result = await converter(1, { responseType: 'image' });
    
    console.log('Success!');
    console.log('Image path:', result.path);
    console.log('Image name:', result.name);
    
    if (fs.existsSync(result.path)) {
      const stats = fs.statSync(result.path);
      console.log('File size:', (stats.size / 1024).toFixed(2), 'KB');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Cleaned up temp dir');
  }
}

testPdf2Pic();
