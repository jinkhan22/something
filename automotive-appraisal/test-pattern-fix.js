/**
 * Test the OCR output we got to verify our pattern fixes
 */

const fs = require('fs');
const path = require('path');

function testMarketValueExtraction() {
  const ocrOutputPath = path.join(__dirname, 'santa-fe-ocr-output.txt');
  
  if (!fs.existsSync(ocrOutputPath)) {
    console.log('OCR output file not found. Run test-direct-ocr.js first.');
    return;
  }
  
  const text = fs.readFileSync(ocrOutputPath, 'utf-8');
  const lines = text.split('\n');
  
  console.log('=== Testing Market Value Extraction with OCR Variations ===\n');
  
  // New patterns that handle "vale" instead of "value"
  const patterns = [
    /Market\s+Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    /Market\s+Val(?:ue|e)\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
    /Market\s+Val(?:ue|e)\s+\$\s*([0-9,]+\.?\d*)/i,
    /Market\s*Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
  ];
  
  console.log('Testing patterns on full text:');
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      console.log(`✅ Pattern ${i + 1} MATCHED: $${match[1]}`);
      break;
    } else {
      console.log(`  Pattern ${i + 1}: No match`);
    }
  }
  
  console.log('\n--- Line-by-line search ---');
  let foundCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line contains "market" and either "value" or "vale"
    if (line.toLowerCase().includes('market') && (line.toLowerCase().includes('value') || line.toLowerCase().includes('vale'))) {
      console.log(`\nLine ${i}: "${line}"`);
      
      // Try inline match with OCR variation support
      const inlineMatch = line.match(/Market\s*Val(?:ue|e)[:\s=]*\$\s*([0-9,]+\.?\d*)/i);
      if (inlineMatch) {
        console.log(`  ✅ EXTRACTED: $${inlineMatch[1]}`);
        foundCount++;
      }
    }
  }
  
  console.log(`\n=== Found ${foundCount} Market Value extraction(s) ===`);
  
  // Also check what Base Value we get
  console.log('\n--- Base Value Check ---');
  const baseMatch = text.match(/Base\s+Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i);
  if (baseMatch) {
    console.log(`Base Value: $${baseMatch[1]}`);
  }
  
  console.log('\n✅ Test complete!');
}

testMarketValueExtraction();
