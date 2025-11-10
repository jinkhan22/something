#!/usr/bin/env tsx
/**
 * Test VIN extraction with multiple VINs in document
 */

// Test case simulating Mitchell report with multiple VINs
const testText = `Market Survey Report
Prepared for: Test Insurance

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
43,008 miles

--- PAGE BREAK ---

Comparable Vehicles:

Vehicle 1:
2019 Land Rover Range Rover Sport
VIN: SALWR2RV0KA123456
Price: $25,000
Mileage: 40,000 miles

Vehicle 2:
2019 Land Rover Range Rover Sport  
VIN: SALWR2RW1KA789012
Price: $23,500
Mileage: 45,000 miles`;

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
console.log('VIN EXTRACTION TEST');
console.log('════════════════════════════════════════════════════════════════\n');

const actualVIN = 'SALWR2RE0KA836519';  // The correct VIN from actual vehicle
const simpleResult = extractVINSimple(testText);
const contextResult = extractVINWithContext(testText);

console.log(`Actual Vehicle VIN: ${actualVIN}\n`);

console.log('OLD METHOD (simple pattern match):');
console.log(`  Extracted: ${simpleResult}`);
console.log(`  ${simpleResult === actualVIN ? '✅ CORRECT' : '❌ WRONG'}\n`);

console.log('NEW METHOD (context-aware):');
console.log(`  Extracted: ${contextResult}`);
console.log(`  ${contextResult === actualVIN ? '✅ CORRECT' : '❌ WRONG'}\n`);

console.log('════════════════════════════════════════════════════════════════');

if (contextResult === actualVIN) {
  console.log('✅ SUCCESS: New method correctly extracts actual vehicle VIN!');
} else {
  console.log('❌ FAILED: New method still extracts wrong VIN');
}
