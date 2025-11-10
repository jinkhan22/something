#!/usr/bin/env node
/**
 * Test all CCC One reports in the samples directory
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Updated CCC patterns - IMPROVED v2
const CCC_PATTERNS = {
  vin: /\b[A-HJ-NPR-Z0-9]{17}\b/,
  year: /Year\s+(\d{4})/i,
  make: /^Make\s+([A-Za-z\-]+?)(?:\s+[})()]+|\s*$)/m,
  model: /^Model\s+([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9]+)?(?:\s+[A-Za-z0-9]+)?)(?:\s|$)/m,
  mileage: /^Odometer\s+(\d{1,3}(?:,\d{3})*)/m,
  location: /^Location\s+([A-Z][A-Z\s,\.\-0-9]+?)(?:\s+(?:are|clot|Vehicles)|\s*$)/m,
  settlementValue: /^Total\s+\$\s*([0-9,]+\s*\.\s*\d{2})/m,
  marketValue: /^Adjusted Vehicle Value\s+\$\s*([0-9,]+\.\d{2})/m,
};

function fixModelOCRErrors(model, make) {
  if (!model) return model;
  
  let fixed = model.trim();
  
  const corrections = {
    'Volvo': { 'XG60': 'XC60', 'XG90': 'XC90', 'XG40': 'XC40' },
    'BMW': { '8': '8 Series' },
    'Tesla': { 'Model': 'Model 3' },
  };
  
  if (corrections[make] && corrections[make][fixed]) {
    return corrections[make][fixed];
  }
  
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
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'ocr-worker.ts');
    const outputPath = `/tmp/ocr-${Date.now()}.txt`;
    
    const child = spawn('npx', ['tsx', workerPath, pdfPath, outputPath], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const { progress, message } = JSON.parse(line);
          process.stdout.write(`\r  ${progress}% - ${message}          `);
        } catch (e) {}
      }
    });
    
    child.on('close', (code) => {
      process.stdout.write('\n');
      if (code === 0 && stdout.includes('SUCCESS')) {
        try {
          const text = fs.readFileSync(outputPath, 'utf-8');
          fs.unlinkSync(outputPath);
          resolve(text);
        } catch (error) {
          reject(new Error(`Failed to read output: ${error.message}`));
        }
      } else {
        reject(new Error(`OCR failed with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

async function testReport(pdfPath) {
  console.log('\n' + '='.repeat(80));
  console.log(`Testing: ${path.basename(pdfPath)}`);
  console.log('='.repeat(80));
  
  try {
    console.log('\n🔍 Running OCR...');
    const text = await runOCR(pdfPath);
    
    // Check if this is a CCC One report
    if (!text.includes('CCC ONE') && !text.includes('CCC One') && !text.includes('CCOSONE')) {
      console.log('⚠️  This does not appear to be a CCC One report - skipping');
      return;
    }
    
    console.log('✓ OCR Complete');
    
    // Extract fields
    const vin = extractField(text, CCC_PATTERNS.vin);
    const year = extractField(text, CCC_PATTERNS.year);
    const make = extractField(text, CCC_PATTERNS.make);
    let model = extractField(text, CCC_PATTERNS.model);
    const mileage = extractField(text, CCC_PATTERNS.mileage);
    const location = (extractField(text, CCC_PATTERNS.location) || '').trim();
    const settlementValue = extractField(text, CCC_PATTERNS.settlementValue)?.replace(/[\s,]/g, '');
    const marketValue = extractField(text, CCC_PATTERNS.marketValue)?.replace(/[\s,]/g, '');
    
    // Fix OCR errors
    if (model && make) {
      const original = model;
      model = fixModelOCRErrors(model, make);
      if (original !== model) {
        console.log(`  Model corrected: "${original}" -> "${model}"`);
      }
    }
    
    console.log('\n📊 RESULTS:');
    console.log(`  VIN: ${vin || '❌'}`);
    console.log(`  Year: ${year || '❌'}`);
    console.log(`  Make: ${make || '❌'}`);
    console.log(`  Model: ${model || '❌'}`);
    console.log(`  Mileage: ${mileage || '❌'}`);
    console.log(`  Location: ${location || '❌'}`);
    console.log(`  Market Value: $${marketValue || '❌'}`);
    console.log(`  Settlement Value: $${settlementValue || '❌'}`);
    
    // Check for missing fields
    const missing = [];
    if (!vin) missing.push('VIN');
    if (!year) missing.push('Year');
    if (!make) missing.push('Make');
    if (!model) missing.push('Model');
    if (!mileage) missing.push('Mileage');
    if (!location) missing.push('Location');
    if (!marketValue) missing.push('Market Value');
    if (!settlementValue) missing.push('Settlement Value');
    
    if (missing.length > 0) {
      console.log(`\n⚠️  Missing fields: ${missing.join(', ')}`);
    } else {
      console.log('\n✅ All fields extracted successfully!');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

async function main() {
  console.log('\n=== Testing All CCC One Reports ===\n');
  
  const samplesDir = path.join(__dirname, '..', 'valuation_report_samples');
  const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.pdf'));
  
  console.log(`Found ${files.length} PDF files\n`);
  
  for (const file of files) {
    await testReport(path.join(samplesDir, file));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Testing Complete\n');
}

main().catch(console.error);
