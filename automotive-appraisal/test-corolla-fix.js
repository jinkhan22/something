// Test the fixed Toyota Corolla extraction

function extractMitchellModel(lines, startIndex) {
  for (let i = startIndex; i < Math.min(startIndex + 5, lines.length); i++) {
    const line = lines[i].trim();
    
    console.log(`Checking line ${i}: "${line}"`);
    
    // Skip empty lines or lines with just numbers/special chars
    if (!line || line.length < 3 || /^[\d\s\-_]+$/.test(line)) {
      console.log(`  → Skipped (empty/short/numbers)`);
      continue;
    }
    
    // Skip "Mileage" line specifically
    if (line === 'Mileage') {
      console.log(`  → Skipped (Mileage word)`);
      continue;
    }
    
    // Skip mileage lines (contains numbers followed by "miles")
    if (/\d+[,\d]*\s+miles/i.test(line)) {
      console.log(`  → Skipped (mileage line)`);
      continue;
    }
    
    // Handle OCR artifacts: lines starting with single letters
    let processedLine = line;
    if (/^[a-zA-Z]\s+/.test(line)) {
      // Remove the single letter prefix and continue processing
      processedLine = line.substring(2).trim();
      console.log(`  → OCR artifact detected, processed to: "${processedLine}"`);
      
      // If after removing the prefix, we don't have enough content, skip
      if (processedLine.length < 5) {
        console.log(`  → Skipped (too short after OCR cleanup)`);
        continue;
      }
      
      // Special handling for lines that start with a model name (common OCR artifact)
      // Look for common Toyota models that might appear first
      if (processedLine.toLowerCase().startsWith('corolla')) {
        // Extract just the model part, stopping at technical specs
        const modelMatch = processedLine.match(/^([a-zA-Z][a-zA-Z\s]*?)(?:\s+\d|\s+[A-Z]+\s+[A-Z]+|$)/);
        if (modelMatch) {
          console.log(`  → ✅ Found Corolla model: "${modelMatch[1].trim()}"`);
          return modelMatch[1].trim();
        }
      }
    }
    
    // Skip lines that are mostly numbers with some non-alphanumeric chars
    if (/^[\d\s,\-_().]+$/.test(processedLine)) {
      console.log(`  → Skipped (mostly numbers)`);
      continue;
    }
    
    console.log(`  → No valid model found in this line`);
  }
  
  return '';
}

// Test with the exact scenario
const testLines = [
  'JOA2182, Ohio, Exp, 03/2026 2T1BURHE2EC062336',  // Line 25 (VIN line)
  '111,893 miles',                                   // Line 26 (mileage)
  'Mileage',                                         // Line 27 (label)
  't Corolla S Plus 4 Door Sedan 1.8L',            // Line 28 (bad OCR)
  '4 Cyl Gas A FWD'                                 // Line 29
];

console.log('=== Testing Toyota Corolla Model Extraction (Fixed) ===');
console.log('VIN found on line 25, calling extractMitchellModel(lines, 26)...');
console.log('');

const result = extractMitchellModel(testLines, 1); // Start from index 1 (line 26)

console.log('');
console.log('=== FINAL RESULT ===');
console.log('Model extracted:', result ? `"${result}"` : 'NOT FOUND');