#!/usr/bin/env tsx
/**
 * Check VIN extraction context in Mitchell reports
 */

import { promises as fs } from 'fs';
import * as path from 'path';

// Simulating basic PDF text extraction (just for analysis)
// In real scenario, this would come from OCR

const sampleText = `Vehicle Information
Year Make Model Location
2019 Land Rover Range Rover Sport Dynamic 4
NJ 08094
Door Utility 115" WB 5.0L 8 Cyl
Gas Supercharged A 4WD
Ext Color VIN
License
Fuji White SALWR2RE0KA836519
Valuation Summary
Mileage
43,008 miles

Comparable vehicles:
2019 Land Rover Range Rover Sport
VIN: SALWR2RV0KA123456
Price: $25,000

2019 Land Rover Range Rover Sport  
VIN: SALWR2RW1KA789012
Price: $23,500`;

const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
const vins = sampleText.match(vinPattern);

console.log('════════════════════════════════════════════════════════════════');
console.log('VIN EXTRACTION ANALYSIS');
console.log('════════════════════════════════════════════════════════════════\n');

console.log('All VINs found:', vins);
console.log(`Total VINs: ${vins ? vins.length : 0}\n`);

if (vins && vins.length > 1) {
  console.log('⚠️  PROBLEM: Multiple VINs found!');
  console.log('   The first VIN is from the actual vehicle.');
  console.log('   Subsequent VINs are from comparable vehicles.\n');
}

console.log('Current extraction logic:');
console.log('  Pattern: /\\b[A-HJ-NPR-Z0-9]{17}\\b/');
console.log('  Result: Extracts FIRST match = ', vins ? vins[0] : 'none');
console.log('');

console.log('════════════════════════════════════════════════════════════════');
console.log('SOLUTION OPTIONS');
console.log('════════════════════════════════════════════════════════════════\n');

console.log('Option 1: Look for VIN near "Ext Color" or "License"');
console.log('  - More reliable context');
console.log('  - Actual vehicle VIN appears right after "Ext Color VIN"');
console.log('');

console.log('Option 2: Extract VIN from "Vehicle Information" section');
console.log('  - Only search in first ~30 lines of document');
console.log('  - Comparables appear much later in the document');
console.log('');

console.log('Option 3: Look for VIN before "Valuation Summary"');
console.log('  - Actual vehicle info comes before valuation');
console.log('  - Comparables come after');
console.log('');

console.log('RECOMMENDED: Option 1 (most reliable)');
console.log('Look for VIN that appears within 3 lines after "Ext Color" text\n');
