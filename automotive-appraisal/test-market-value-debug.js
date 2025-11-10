const fs = require('fs');
const path = require('path');

// Mock the extractVehicleData function's Market Value extraction logic
async function testMarketValueExtraction() {
  const samplePath = path.join(__dirname, '../valuation_report_samples/valuation -  BARSANO (1).pdf');
  
  // For testing, let's use the OCR text file
  const textPath = path.join(__dirname, '../text_from_valuation-BARSANO.txt');
  
  if (fs.existsSync(textPath)) {
    const text = fs.readFileSync(textPath, 'utf-8');
    const lines = text.split('\n');
    
    console.log('=== Testing Market Value Extraction ===\n');
    
    // Test patterns
    const patterns = [
      /Market\s+Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s+\$\s*([0-9,]+\.?\d*)/i,
      /Market\s*Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    ];
    
    console.log('Pattern matching:');
    for (let i = 0; i < patterns.length; i++) {
      const match = text.match(patterns[i]);
      if (match) {
        console.log(`Pattern ${i + 1} MATCHED:`, match[1]);
        break;
      } else {
        console.log(`Pattern ${i + 1}: No match`);
      }
    }
    
    console.log('\n--- Searching for Market Value in lines ---');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().includes('market') && line.toLowerCase().includes('value')) {
        console.log(`Line ${i}: "${line}"`);
        
        // Try to extract value from this line
        const inlineMatch = line.match(/Market\s*Value[:\s=]*\$\s*([0-9,]+\.?\d*)/i);
        if (inlineMatch) {
          console.log(`  ✅ Extracted: $${inlineMatch[1]}`);
        } else {
          console.log(`  ❌ Could not extract value from this line`);
        }
      }
    }
    
    console.log('\n--- Looking for Base Value too ---');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().includes('base') && line.toLowerCase().includes('value')) {
        console.log(`Line ${i}: "${line}"`);
      }
    }
    
  } else {
    console.log('Text file not found. Please ensure text_from_valuation-BARSANO.txt exists.');
  }
}

testMarketValueExtraction().catch(console.error);
