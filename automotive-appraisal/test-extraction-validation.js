/**
 * Test full data extraction from UDP and State Farm files
 */
const fs = require('fs').promises;
const path = require('path');

// Import the extraction logic (we'll simulate it)
async function extractWithOCRWorker(pdfPath) {
  const { spawn } = require('child_process');
  const tempOutput = `/tmp/extract-${Date.now()}.txt`;
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', 'ocr-worker.ts', pdfPath, tempOutput], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stderr = '';
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', async (code) => {
      if (code === 0) {
        const text = await fs.readFile(tempOutput, 'utf-8');
        resolve(text);
      } else {
        reject(new Error(`OCR failed: ${stderr}`));
      }
    });
    
    child.on('error', reject);
  });
}

// Simplified extraction patterns
const VIN_PATTERN = /\b[A-HJ-NPR-Z0-9]{17}\b/;
const VEHICLE_PATTERN = /Loss [Vv]ehicle:?\s*(\d{4})\s+([A-Za-z\-]+(?:\s+[A-Za-z\-]+)?)\s+([\w\s\-]+?)(?:\s*\||$)/i;
const VALUE_PATTERN = /(?:Base Vehicle Value|Market Value|Adjusted Vehicle Value)\s*\$\s*([\d,]+\.?\d*)/i;

async function testFile(filePath, fileName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${fileName}`);
  console.log('='.repeat(60));
  
  try {
    const text = await extractWithOCRWorker(filePath);
    console.log(`✅ Extracted ${text.length} characters`);
    
    // Extract VIN
    const vinMatch = text.match(VIN_PATTERN);
    const vin = vinMatch ? vinMatch[0] : null;
    
    // Extract vehicle info
    const vehicleMatch = text.match(VEHICLE_PATTERN);
    const year = vehicleMatch ? vehicleMatch[1] : null;
    const make = vehicleMatch ? vehicleMatch[2] : null;
    const model = vehicleMatch ? vehicleMatch[3]?.trim() : null;
    
    // Extract value
    const valueMatch = text.match(VALUE_PATTERN);
    const value = valueMatch ? valueMatch[1].replace(/,/g, '') : null;
    
    // Report type
    const reportType = text.includes('CCC ONE') || text.includes('CCC One') ? 'CCC ONE' : 'MITCHELL';
    
    console.log('\nExtracted Data:');
    console.log('─'.repeat(60));
    console.log(`Report Type:  ${reportType}`);
    console.log(`VIN:          ${vin || '❌ NOT FOUND'}`);
    console.log(`Year:         ${year || '❌ NOT FOUND'}`);
    console.log(`Make:         ${make || '❌ NOT FOUND'}`);
    console.log(`Model:        ${model || '❌ NOT FOUND'}`);
    console.log(`Value:        ${value ? '$' + value : '❌ NOT FOUND'}`);
    
    // Validation
    const hasVin = vin && vin.length === 17;
    const hasYear = year && parseInt(year) > 1990;
    const hasMake = !!make;
    
    let isValid = false;
    if (reportType === 'MITCHELL') {
      isValid = hasVin || (hasMake && hasYear);
    } else {
      isValid = hasVin || hasMake || hasYear;
    }
    
    console.log('\nValidation:');
    console.log('─'.repeat(60));
    console.log(`Has VIN (17 chars): ${hasVin ? '✅' : '❌'}`);
    console.log(`Has Make:           ${hasMake ? '✅' : '❌'}`);
    console.log(`Has Year (>1990):   ${hasYear ? '✅' : '❌'}`);
    console.log(`Overall Valid:      ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    
    return { valid: isValid, vin, year, make, model, value, reportType };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { valid: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('OCR EXTRACTION VALIDATION TEST');
  console.log('='.repeat(60));
  
  const files = [
    {
      path: '../valuation_report_samples/udp_6d63933b-9e6a-4859-ad7f-aca4b4ed04d2.pdf',
      name: 'UDP (Mercedes-Benz)'
    },
    {
      path: '../valuation_report_samples/State-Farm-Valuation-Report.pdf',
      name: 'State Farm (Acura)'
    }
  ];
  
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(__dirname, file.path);
    const result = await testFile(filePath, file.name);
    results.push({ name: file.name, ...result });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach((result, i) => {
    const status = result.valid ? '✅ PASS' : '❌ FAIL';
    console.log(`${i + 1}. ${result.name}: ${status}`);
    if (!result.valid && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const allPassed = results.every(r => r.valid);
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED!');
  } else {
    console.log('❌ SOME TESTS FAILED');
  }
  console.log('='.repeat(60) + '\n');
}

runTests().catch(console.error);
