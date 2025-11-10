const pdfParse = require('pdf-parse');
const fs = require('fs');

function extractFieldMultiple(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

async function testExtraction() {
  const buffer = fs.readFileSync('25-679137965_8-7-2025_Total Loss_Valuation.pdf');
  const data = await pdfParse(buffer);
  const text = data.text;
  
  // Test market value patterns
  const marketPatterns = [
    /Market Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /arket Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /Base Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /ase Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /ase Value = \$([0-9,]+\.\d+)/i,
    /arket Value = \$([0-9,]+\.\d+)/i
  ];
  
  console.log('Testing market value extraction:');
  const marketResult = extractFieldMultiple(text, marketPatterns);
  console.log('Market result:', marketResult);
  
  // Test each pattern individually
  marketPatterns.forEach((pattern, i) => {
    const match = text.match(pattern);
    console.log(`Pattern ${i} (${pattern.source}): ${match ? match[1] : 'NO MATCH'}`);
  });
  
  // Test settlement patterns
  const settlementPatterns = [
    /Settlement Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /ettle.*?ent Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /settle.*?value[:\s]*\$([0-9,]+\.?\d*)/i,
    /Final Value[:\s]*\$([0-9,]+\.?\d*)/i,
    /ettle\s*ent\s*Value:\s*[\r\n]\s*\$([0-9,]+\.?\d*)/i,
    /ttle\s*ent\s*Value\s*=\s*[\r\n]\s*[,\d]*[\r\n]\s*\$([0-9,]+\.?\d*)/i
  ];
  
  console.log('\nTesting settlement value extraction:');
  const settlementResult = extractFieldMultiple(text, settlementPatterns);
  console.log('Settlement result:', settlementResult);
  
  // Test each pattern individually
  settlementPatterns.forEach((pattern, i) => {
    const match = text.match(pattern);
    console.log(`Pattern ${i} (${pattern.source}): ${match ? match[1] : 'NO MATCH'}`);
  });
}

testExtraction().catch(console.error);