/**
 * Test UDP file extraction using the actual app's extraction function
 */
const fs = require('fs').promises;
const path = require('path');

// Simulate the app's extraction process
async function testUDPExtraction() {
  console.log('=== Testing UDP File Extraction (App Simulation) ===\n');
  
  const udpPath = path.join(__dirname, '../valuation_report_samples/udp_6d63933b-9e6a-4859-ad7f-aca4b4ed04d2.pdf');
  
  try {
    // Check if file exists
    const stats = await fs.stat(udpPath);
    console.log('✅ File exists');
    console.log(`   Size: ${stats.size} bytes`);
    console.log(`   Path: ${udpPath}`);
    
    // Read the buffer
    const buffer = await fs.readFile(udpPath);
    console.log(`✅ File read successfully: ${buffer.length} bytes`);
    
    // Test if it's a valid PDF
    const header = buffer.slice(0, 5).toString('utf-8');
    console.log(`   PDF header: "${header}"`);
    
    if (header === '%PDF-') {
      console.log('✅ Valid PDF file');
    } else {
      console.log('❌ Invalid PDF file - header mismatch');
    }
    
    // Try to extract with OCR worker
    console.log('\n=== Testing OCR Extraction ===');
    const { spawn } = require('child_process');
    
    const tempInput = '/tmp/test-udp-app-input.pdf';
    const tempOutput = '/tmp/test-udp-app-output.txt';
    
    await fs.writeFile(tempInput, buffer);
    
    const result = await new Promise((resolve, reject) => {
      const child = spawn('npx', ['tsx', 'ocr-worker.ts', tempInput, tempOutput], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
    
    if (result.code === 0) {
      console.log('✅ OCR extraction successful');
      const text = await fs.readFile(tempOutput, 'utf-8');
      console.log(`   Extracted ${text.length} characters`);
      
      // Check for key data
      const hasVIN = /\b[A-HJ-NPR-Z0-9]{17}\b/.test(text);
      const hasVehicle = /Loss Vehicle|2015 Mercedes-Benz/i.test(text);
      const hasValue = /\$\s*[\d,]+/i.test(text);
      
      console.log(`   Has VIN: ${hasVIN ? '✅' : '❌'}`);
      console.log(`   Has Vehicle: ${hasVehicle ? '✅' : '❌'}`);
      console.log(`   Has Value: ${hasValue ? '✅' : '❌'}`);
      
      if (hasVIN && hasVehicle && hasValue) {
        console.log('\n✅ UDP file is fully functional!');
      } else {
        console.log('\n⚠️  UDP file extracted but missing some data');
      }
    } else {
      console.log('❌ OCR extraction failed');
      console.log(`   Error: ${result.stderr}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

testUDPExtraction();
