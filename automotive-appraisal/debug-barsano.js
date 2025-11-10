// Debug the BARSANO file to see what's happening with text extraction
const fs = require('fs');
const pdfParse = require('pdf-parse');

async function debugBarsano() {
  console.log('🔍 DEBUGGING BARSANO FILE\n');
  
  const buffer = fs.readFileSync('../valuation_report_samples/valuation -  BARSANO (1).pdf');
  const data = await pdfParse(buffer);
  const text = data.text;
  
  console.log('📄 FULL TEXT LENGTH:', text.length, 'characters\n');
  
  // Look for "Loss vehicle" in various forms
  console.log('🔎 SEARCHING FOR "Loss vehicle" PATTERNS:\n');
  
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line contains "loss" and "vehicle" (case insensitive)
    if (line.toLowerCase().includes('loss') && line.toLowerCase().includes('vehicle')) {
      console.log(`Line ${i}:`, JSON.stringify(line));
      console.log(`  Length: ${line.length}`);
      console.log(`  Trimmed:`, JSON.stringify(line.trim()));
      
      // Show next 3 lines for context
      console.log('  Next lines:');
      for (let j = 1; j <= 3; j++) {
        if (i + j < lines.length) {
          console.log(`    [${i+j}]:`, JSON.stringify(lines[i + j]));
        }
      }
      console.log('');
    }
  }
  
  console.log('\n🔎 SEARCHING FOR "2022 BMW M3":\n');
  if (text.includes('2022 BMW M3')) {
    console.log('✅ Found "2022 BMW M3" in text');
    
    // Find the exact location
    const index = text.indexOf('2022 BMW M3');
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + 100);
    console.log('Context:');
    console.log(JSON.stringify(text.substring(start, end)));
  } else {
    console.log('❌ "2022 BMW M3" not found as complete string');
    
    // Try individual parts
    console.log('\nLooking for individual parts:');
    console.log('  "2022":', text.includes('2022') ? '✅ Found' : '❌ Not found');
    console.log('  "BMW":', text.includes('BMW') ? '✅ Found' : '❌ Not found');
    console.log('  "M3":', text.includes('M3') ? '✅ Found' : '❌ Not found');
  }
  
  console.log('\n🔎 SEARCHING FOR VIN PATTERN:\n');
  const vinMatch = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
  if (vinMatch) {
    console.log('✅ VIN found:', vinMatch[0]);
    
    // Find lines around VIN
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(vinMatch[0])) {
        console.log(`\nVIN found at line ${i}:`);
        console.log(`  Current:`, JSON.stringify(lines[i]));
        for (let j = 1; j <= 5; j++) {
          if (i + j < lines.length) {
            console.log(`  [+${j}]:`, JSON.stringify(lines[i + j]));
          }
        }
        break;
      }
    }
  } else {
    console.log('❌ No VIN found');
  }
  
  console.log('\n🔎 LOOKING FOR PATTERNS WITH PIPE (|):\n');
  let pipeCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('|') && line.length > 20) {
      pipeCount++;
      if (pipeCount <= 10) { // Show first 10
        console.log(`Line ${i}:`, JSON.stringify(line));
      }
    }
  }
  console.log(`\nTotal lines with pipe: ${pipeCount}`);
  
  console.log('\n🔎 TESTING REGEX PATTERNS:\n');
  
  // Pattern 1: Standard
  const pattern1 = /Loss vehicle:\s*(\d{4})\s+(.+?)\s*\|/im;
  const match1 = text.match(pattern1);
  console.log('Pattern 1 (Standard):', pattern1);
  console.log('  Match:', match1 ? `✅ Year: ${match1[1]}, Vehicle: ${match1[2]}` : '❌ No match');
  
  // Pattern 2: OCR variant
  const pattern2 = /(?:i\s+l|oss\s+vehicle|Loss\s+ehicle|oss\s+ehicle):\s*(\d{4})\s+(.+?)\s*\|/im;
  const match2 = text.match(pattern2);
  console.log('\nPattern 2 (OCR variant):', pattern2);
  console.log('  Match:', match2 ? `✅ Year: ${match2[1]}, Vehicle: ${match2[2]}` : '❌ No match');
  
  // Pattern 3: Colon pattern (fallback)
  const pattern3 = /:\s*(.+?)\s*\|/;
  const match3 = text.match(pattern3);
  console.log('\nPattern 3 (Colon fallback):', pattern3);
  console.log('  Match:', match3 ? `✅ Text: "${match3[1]}"` : '❌ No match');
  
  console.log('\n🔎 SEARCHING FOR "M3" SPECIFICALLY:\n');
  const m3Regex = /\bM3\b/g;
  const m3Matches = text.match(m3Regex);
  if (m3Matches) {
    console.log(`✅ Found "M3" ${m3Matches.length} times`);
    
    // Find contexts
    let count = 0;
    for (let i = 0; i < lines.length && count < 5; i++) {
      if (lines[i].includes('M3')) {
        count++;
        console.log(`\nOccurrence ${count} at line ${i}:`);
        console.log(`  Line:`, JSON.stringify(lines[i]));
      }
    }
  } else {
    console.log('❌ "M3" not found');
  }
}

debugBarsano().catch(console.error);
