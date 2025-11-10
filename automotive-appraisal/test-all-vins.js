/**
 * Test VIN corrections for all three problematic files
 */
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

async function runOCR(pdfPath) {
  return new Promise((resolve, reject) => {
    const outputPath = `/tmp/test-vin-${Date.now()}.txt`;
    
    const child = spawn('npx', ['tsx', 'ocr-worker.ts', pdfPath, outputPath], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', async (code) => {
      if (code === 0) {
        const text = await fs.readFile(outputPath, 'utf-8');
        resolve(text);
      } else {
        reject(new Error(`OCR failed: ${stderr}`));
      }
    });
    
    child.on('error', reject);
  });
}

async function testVIN(filePath, fileName, expectedVIN) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${fileName}`);
  console.log('='.repeat(70));
  console.log(`Expected VIN: ${expectedVIN}`);
  
  try {
    const text = await runOCR(filePath);
    
    // Find VIN in text
    const vinMatch = text.match(/VIN\s+([A-HJ-NPR-Z0-9]{17})/i);
    const extractedVIN = vinMatch ? vinMatch[1] : null;
    
    console.log(`Extracted VIN: ${extractedVIN || 'NOT FOUND'}`);
    
    if (extractedVIN === expectedVIN) {
      console.log('✅ VIN MATCHES PERFECTLY!');
      return { success: true, vin: extractedVIN };
    } else if (extractedVIN) {
      console.log('❌ VIN MISMATCH!');
      // Show character differences
      for (let i = 0; i < expectedVIN.length; i++) {
        if (expectedVIN[i] !== extractedVIN[i]) {
          console.log(`   Position ${i}: expected '${expectedVIN[i]}', got '${extractedVIN[i]}'`);
        }
      }
      return { success: false, vin: extractedVIN, expected: expectedVIN };
    } else {
      console.log('❌ VIN NOT FOUND!');
      return { success: false, vin: null, expected: expectedVIN };
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('VIN EXTRACTION ACCURACY TEST');
  console.log('Testing OCR character confusion fixes');
  console.log('='.repeat(70));
  
  const tests = [
    {
      path: '../valuation_report_samples/udp_6d63933b-9e6a-4859-ad7f-aca4b4ed04d2.pdf',
      name: 'UDP Mercedes-Benz',
      expectedVIN: 'WDDJK6FA9FF035164'
      // Issues: 6→B, 9→IFF
    },
    {
      path: '../valuation_report_samples/State-Farm-Valuation-Report.pdf',
      name: 'State Farm Acura',
      expectedVIN: 'JH4CU2F88CC019777'
      // Issue: 4→A
    },
    {
      path: '../valuation_report_samples/Vehicle Assessment Valuation (3)_1955639487883.pdf',
      name: 'BMW X3',
      expectedVIN: 'WBAGV8C02MCF61721'
      // Issues: 8→V, extra B inserted
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const filePath = path.join(__dirname, test.path);
    const result = await testVIN(filePath, test.name, test.expectedVIN);
    results.push({ name: test.name, ...result });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  
  results.forEach((result, i) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${i + 1}. ${result.name}: ${status}`);
    if (!result.success && result.vin) {
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Got:      ${result.vin}`);
    }
  });
  
  const passCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log('\n' + '='.repeat(70));
  console.log(`Results: ${passCount}/${totalCount} VINs extracted correctly`);
  
  if (passCount === totalCount) {
    console.log('✅ ALL VINs PERFECT! OCR is working excellently!');
  } else {
    console.log('⚠️  Some VINs still have issues - may need more corrections');
  }
  console.log('='.repeat(70) + '\n');
}

runTests().catch(console.error);
