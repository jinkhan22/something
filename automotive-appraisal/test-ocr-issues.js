/**
 * Test OCR issues:
 * 1. UDP file not opening
 * 2. VIN digit "4" being read as "A" in State Farm report
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

async function runOCR(pdfPath, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', 'ocr-worker.ts', pdfPath, outputPath], {
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
}

async function testFiles() {
  console.log('=== Testing OCR Issues ===\n');
  
  // Test 1: UDP file
  console.log('1. Testing UDP file...');
  const udpPath = path.join(__dirname, '../valuation_report_samples/udp_6d63933b-9e6a-4859-ad7f-aca4b4ed04d2.pdf');
  const udpOutput = '/tmp/test-udp-issues.txt';
  
  try {
    const udpResult = await runOCR(udpPath, udpOutput);
    if (udpResult.code === 0) {
      const text = await fs.readFile(udpOutput, 'utf-8');
      console.log('✅ UDP file extracted successfully');
      console.log(`   Text length: ${text.length} characters`);
      
      // Look for key data
      const vinMatch = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
      const vehicleMatch = text.match(/Loss Vehicle\s+(\d{4})\s+([A-Za-z\-]+(?:\s+[A-Za-z\-]+)?)\s+([\w\s\-]+)/i);
      
      if (vinMatch) console.log(`   VIN found: ${vinMatch[0]}`);
      if (vehicleMatch) console.log(`   Vehicle: ${vehicleMatch[1]} ${vehicleMatch[2]} ${vehicleMatch[3]}`);
    } else {
      console.log('❌ UDP file failed to extract');
      console.log(`   Error: ${udpResult.stderr}`);
    }
  } catch (error) {
    console.log('❌ UDP file error:', error.message);
  }
  
  console.log();
  
  // Test 2: State Farm VIN accuracy
  console.log('2. Testing State Farm VIN accuracy...');
  const stateFarmPath = path.join(__dirname, '../valuation_report_samples/State-Farm-Valuation-Report.pdf');
  const stateFarmOutput = '/tmp/test-statefarm-issues.txt';
  
  try {
    const sfResult = await runOCR(stateFarmPath, stateFarmOutput);
    if (sfResult.code === 0) {
      const text = await fs.readFile(stateFarmOutput, 'utf-8');
      console.log('✅ State Farm file extracted successfully');
      console.log(`   Text length: ${text.length} characters`);
      
      // Look for VIN
      const vinMatches = text.match(/VIN\s+([A-HJ-NPR-Z0-9]{17})/i);
      const expectedVIN = 'JH4CU2F88CC019777';
      const extractedVIN = vinMatches ? vinMatches[1] : null;
      
      console.log(`   Expected VIN: ${expectedVIN}`);
      console.log(`   Extracted VIN: ${extractedVIN || 'NOT FOUND'}`);
      
      if (extractedVIN) {
        if (extractedVIN === expectedVIN) {
          console.log('   ✅ VIN matches exactly!');
        } else {
          console.log('   ❌ VIN mismatch!');
          // Show character differences
          for (let i = 0; i < expectedVIN.length; i++) {
            if (expectedVIN[i] !== extractedVIN[i]) {
              console.log(`   Position ${i}: expected '${expectedVIN[i]}', got '${extractedVIN[i]}'`);
            }
          }
        }
      }
    } else {
      console.log('❌ State Farm file failed to extract');
      console.log(`   Error: ${sfResult.stderr}`);
    }
  } catch (error) {
    console.log('❌ State Farm file error:', error.message);
  }
  
  console.log('\n=== Test Complete ===');
}

testFiles().catch(console.error);
