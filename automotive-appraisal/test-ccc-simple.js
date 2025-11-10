#!/usr/bin/env node
/**
 * Simple test using pre-extracted OCR text
 */

const fs = require('fs');

// Updated CCC patterns
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

console.log('=== Testing CCC Extraction with Pre-OCR\'d Text ===\n');

const text = fs.readFileSync('/tmp/test-output.txt', 'utf-8');

console.log('📊 EXTRACTION RESULTS:\n');
const vin = extractField(text, CCC_PATTERNS.vin);
const year = extractField(text, CCC_PATTERNS.year);
const make = extractField(text, CCC_PATTERNS.make);
let model = extractField(text, CCC_PATTERNS.model);
const mileage = extractField(text, CCC_PATTERNS.mileage);
const location = (extractField(text, CCC_PATTERNS.location) || '').trim();
const settlementValue = extractField(text, CCC_PATTERNS.settlementValue);
const marketValue = extractField(text, CCC_PATTERNS.marketValue);

// Fix OCR errors
if (model && make) {
  const originalModel = model;
  model = fixModelOCRErrors(model, make);
  if (originalModel !== model) {
    console.log(`Model OCR correction: "${originalModel}" -> "${model}"`);
  }
}

console.log('VIN:', vin || '❌ NOT FOUND');
console.log('Year:', year || '❌ NOT FOUND');
console.log('Make:', make || '❌ NOT FOUND');
console.log('Model:', model || '❌ NOT FOUND');
console.log('Mileage:', mileage || '❌ NOT FOUND');
console.log('Location:', location || '❌ NOT FOUND');
console.log('Market Value:', marketValue || '❌ NOT FOUND');
console.log('Settlement Value:', settlementValue || '❌ NOT FOUND');

console.log('\n✅ EXPECTED VALUES:\n');
console.log('VIN: YV4902RK6F2702888');
console.log('Year: 2015');
console.log('Make: Volvo');
console.log('Model: XC60');
console.log('Mileage: 88,959');
console.log('Location: ALEDO, TX 76008-1527');
console.log('Market Value: 12,053.00');
console.log('Settlement Value: 12,197.81');

const errors = [];
if (vin !== 'YV4902RK6F2702888') errors.push(`VIN mismatch`);
if (year !== '2015') errors.push(`Year mismatch`);
if (make !== 'Volvo') errors.push(`Make mismatch`);
if (model !== 'XC60') errors.push(`Model mismatch`);
if (mileage !== '88,959') errors.push(`Mileage mismatch`);
if (location !== 'ALEDO, TX 76008-1527') errors.push(`Location mismatch`);
if (marketValue !== '12,053.00') errors.push(`Market Value mismatch`);
if (settlementValue !== '12,197.81') errors.push(`Settlement Value mismatch`);

if (errors.length > 0) {
  console.log('\n❌ VALIDATION FAILED:');
  errors.forEach(err => console.log(`  - ${err}`));
} else {
  console.log('\n✅ ALL VALUES MATCH PERFECTLY!');
}
