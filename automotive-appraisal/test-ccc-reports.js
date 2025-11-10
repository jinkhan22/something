#!/usr/bin/env node
/**
 * Test CCC One report extraction
 * This uses the OCR worker to extract text and then tests the CCC patterns
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { tmpdir } = require('os');
const { mkdtemp, writeFile, readFile, rm } = require('fs').promises;

// Test CCC One patterns (from pdfExtractor.ts) - UPDATED
const CCC_PATTERNS = {
  vin: /\b[A-HJ-NPR-Z0-9]{17}\b/,
  year: /Year\s+(\d{4})/i,
  make: /^Make\s+([A-Za-z-]+)$/m,
  model: /^Model\s+([A-Za-z0-9\-]+)(?:\s|$)/m,
  mileage: /^Odometer\s+(\d{1,3}(?:,\d{3})*)/m,
  location: /^Location\s+([A-Z\s,\-0-9]+?)(?:\s+are|\s+$)/m,
  settlementValue: /^Total\s+\$\s*([0-9,]+\.\d{2})$/m,
  marketValue: /^Adjusted Vehicle Value\s+\$\s*([0-9,]+\.\d{2})/m,
};

function fixModelOCRErrors(model, make) {
  if (!model) return model;
  
  const corrections = {
    'Volvo': {
      'XG60': 'XC60',
      'XG90': 'XC90',
      'XG40': 'XC40',
    },
  };
  
  if (corrections[make] && corrections[make][model]) {
    return corrections[make][model];
  }
  
  // Generic: X followed by G -> XC
  let fixed = model;
  if (/^X[G]/.test(fixed)) {
    fixed = fixed.replace(/^X[G]/, 'XC');
  }
  
  return fixed;
}

function extractField(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] || match[0] : null;
}

async function runOCR(pdfPath) {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ocr-test-'));
  const inputPath = path.join(tempDir, 'input.pdf');
  const outputPath = path.join(tempDir, 'output.txt');
  
  try {
    // Copy PDF to temp location
    const buffer = fs.readFileSync(pdfPath);
    await writeFile(inputPath, buffer);
    
    // Run OCR worker
    const workerPath = path.join(__dirname, 'ocr-worker.ts');
    
    return await new Promise((resolve, reject) => {
      const child = spawn('npx', ['tsx', workerPath, inputPath, outputPath], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        // Parse and display progress
        const lines = stderr.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const { progress, message } = JSON.parse(line);
            process.stdout.write(`\r  OCR Progress: ${progress}% - ${message}                  `);
          } catch (e) {
            // Not JSON
          }
        }
      });
      
      child.on('close', async (code) => {
        process.stdout.write('\n'); // Clear progress line
        if (code === 0 && stdout.includes('SUCCESS')) {
          try {
            const text = await readFile(outputPath, 'utf-8');
            resolve(text);
          } catch (error) {
            reject(new Error(`Failed to read OCR output: ${error.message}`));
          }
        } else {
          reject(new Error(`OCR process failed with code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Failed to spawn OCR process: ${error.message}`));
      });
    });
    
  } finally {
    // Cleanup
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore
    }
  }
}

async function testCCCReport(pdfPath, expectedData) {
  console.log('\n' + '='.repeat(80));
  console.log(`Testing: ${path.basename(pdfPath)}`);
  console.log('='.repeat(80));
  
  try {
    // Run OCR
    console.log('\n🔍 Running OCR extraction...');
    const text = await runOCR(pdfPath);
    
    console.log(`\n✓ Extracted ${text.length} characters`);
    
    // Extract fields using CCC patterns
    console.log('\n📊 EXTRACTION RESULTS:');
    const vin = extractField(text, CCC_PATTERNS.vin);
    const year = extractField(text, CCC_PATTERNS.year);
    const make = extractField(text, CCC_PATTERNS.make);
    let model = extractField(text, CCC_PATTERNS.model);
    const mileage = extractField(text, CCC_PATTERNS.mileage);
    const location = (extractField(text, CCC_PATTERNS.location) || '').trim();
    const settlementValue = extractField(text, CCC_PATTERNS.settlementValue);
    const marketValue = extractField(text, CCC_PATTERNS.marketValue);
    
    // Fix OCR errors in model
    if (model && make) {
      model = fixModelOCRErrors(model, make);
    }
    
    console.log('VIN:', vin || '❌ NOT FOUND');
    console.log('Year:', year || '❌ NOT FOUND');
    console.log('Make:', make || '❌ NOT FOUND');
    console.log('Model:', model || '❌ NOT FOUND');
    console.log('Mileage:', mileage || '❌ NOT FOUND');
    console.log('Location:', location || '❌ NOT FOUND');
    console.log('Market Value (Base Vehicle Value):', marketValue || '❌ NOT FOUND');
    console.log('Settlement Value (Total):', settlementValue || '❌ NOT FOUND');
    
    // If expected data provided, validate
    if (expectedData) {
      console.log('\n✅ EXPECTED VALUES:');
      Object.entries(expectedData).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
      
      const errors = [];
      if (expectedData.vin && vin !== expectedData.vin) errors.push(`VIN mismatch: got "${vin}"`);
      if (expectedData.year && year !== expectedData.year) errors.push(`Year mismatch: got "${year}"`);
      if (expectedData.make && make !== expectedData.make) errors.push(`Make mismatch: got "${make}"`);
      if (expectedData.model && model !== expectedData.model) errors.push(`Model mismatch: got "${model}"`);
      if (expectedData.mileage && mileage !== expectedData.mileage) errors.push(`Mileage mismatch: got "${mileage}"`);
      if (expectedData.marketValue && marketValue !== expectedData.marketValue) errors.push(`Market Value mismatch: got "${marketValue}"`);
      if (expectedData.settlementValue && settlementValue !== expectedData.settlementValue) errors.push(`Settlement Value mismatch: got "${settlementValue}"`);
      
      if (errors.length > 0) {
        console.log('\n❌ VALIDATION FAILED:');
        errors.forEach(err => console.log(`  - ${err}`));
      } else {
        console.log('\n✅ ALL VALUES MATCH!');
      }
    }
    
    // Show sample of extracted text for debugging
    console.log('\n📄 TEXT SAMPLE (first 1500 chars):');
    console.log(text.substring(0, 1500));
    
    return { vin, year, make, model, mileage, location, settlementValue, marketValue };
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return null;
  }
}

async function main() {
  console.log('=== CCC One Report Extraction Test ===\n');
  
  const samplesDir = path.join(__dirname, '..', 'valuation_report_samples');
  
  // Test the Volvo XC60 report with known expected values
  const volvoPath = path.join(samplesDir, 'Allstate CCC Valuation XC60 Volvo 2015.pdf');
  
  if (fs.existsSync(volvoPath)) {
    await testCCCReport(volvoPath, {
      vin: 'YV4902RK6F2702888',
      year: '2015',
      make: 'Volvo',
      model: 'XC60',
      mileage: '88,959',
      marketValue: '12,053.00',
      settlementValue: '12,197.81'
    });
  } else {
    console.log('⚠️  Volvo test file not found');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test Complete\n');
}

main().catch(console.error);
