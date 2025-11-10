#!/usr/bin/env tsx
/**
 * Test VIN extraction when comparable VINs appear BEFORE actual vehicle VIN
 */

// Test case where comparables appear early (worst case scenario)
const testText = `Market Survey Report
Prepared for: Test Insurance
Report Date: 10/14/2025

Comparable Vehicles Summary:
VIN: SALWR2RV0KA123456 - Price: $25,000
VIN: SALWR2RW1KA789012 - Price: $23,500

Vehicle Information
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
43,008 miles`;

function extractVINWithContext(text: string): string {
  const lines = text.split('\n');
  let vin = '';
  const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/;
  
  // Strategy 1: Look for VIN near "Ext Color" (most reliable)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/ext\s+color|exterior\s+color/i)) {
      // Check next 5 lines for VIN
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        const vinMatch = lines[j].match(vinPattern);
        if (vinMatch) {
          vin = vinMatch[0];
          break;
        }
      }
      if (vin) break;
    }
  }
  
  // Strategy 2: If not found, look in "Vehicle Information" section (first 30 lines)
  if (!vin) {
    for (let i = 0; i < Math.min(30, lines.length); i++) {
      const vinMatch = lines[i].match(vinPattern);
      if (vinMatch) {
        vin = vinMatch[0];
        break;
      }
    }
  }
  
  // Strategy 3: Last resort - use first VIN found anywhere
  if (!vin) {
    const vinMatch = text.match(vinPattern);
    if (vinMatch) {
      vin = vinMatch[0];
    }
  }
  
  return vin;
}

function extractVINSimple(text: string): string {
  const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/;
  const match = text.match(vinPattern);
  return match ? match[0] : '';
}

console.log('════════════════════════════════════════════════════════════════');
console.log('VIN EXTRACTION TEST - Comparables Appear FIRST');
console.log('════════════════════════════════════════════════════════════════\n');

const actualVIN = 'SALWR2RE0KA836519';  // The correct VIN from actual vehicle
const comparableVIN1 = 'SALWR2RV0KA123456';  // First comparable (appears first!)
const simpleResult = extractVINSimple(testText);
const contextResult = extractVINWithContext(testText);

console.log(`✅ Actual Vehicle VIN:  ${actualVIN}`);
console.log(`❌ Comparable VIN #1:    ${comparableVIN1}`);
console.log(`❌ Comparable VIN #2:    SALWR2RW1KA789012\n`);

console.log('OLD METHOD (simple pattern match):');
console.log(`  Extracted: ${simpleResult}`);
if (simpleResult === actualVIN) {
  console.log(`  ✅ CORRECT - Got actual vehicle VIN`);
} else if (simpleResult === comparableVIN1) {
  console.log(`  ❌ WRONG - Got comparable vehicle VIN (first one in text)`);
} else {
  console.log(`  ❌ WRONG - Got unexpected VIN`);
}
console.log('');

console.log('NEW METHOD (context-aware with "Ext Color"):');
console.log(`  Extracted: ${contextResult}`);
if (contextResult === actualVIN) {
  console.log(`  ✅ CORRECT - Got actual vehicle VIN`);
} else if (contextResult === comparableVIN1) {
  console.log(`  ❌ WRONG - Got comparable vehicle VIN`);
} else {
  console.log(`  ❌ WRONG - Got unexpected VIN`);
}
console.log('');

console.log('════════════════════════════════════════════════════════════════');

if (contextResult === actualVIN && simpleResult !== actualVIN) {
  console.log('✅ SUCCESS: New method fixes the issue!');
  console.log('   Old method would have extracted wrong VIN.');
  console.log('   New method correctly extracts actual vehicle VIN.');
} else if (contextResult === actualVIN && simpleResult === actualVIN) {
  console.log('✅ SUCCESS: New method works correctly!');
  console.log('   (In this case, both methods work, but new is more reliable)');
} else {
  console.log('❌ FAILED: New method needs adjustment');
}
