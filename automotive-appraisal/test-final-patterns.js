const pdfParse = require('pdf-parse');
const fs = require('fs');

// Updated patterns to match our TypeScript code
const MITCHELL_PATTERNS = {
  // Multiple market value patterns for Mitchell reports
  marketValue: [
    /Market Value\s*=\s*\$([0-9,]+\.?\d*)/i,           // "Market Value = $X,XXX.XX"
    /arket Value\s*=\s*\$([0-9,]+\.?\d*)/i,            // OCR garbled "Market"
    /Base Value\s*=\s*\$([0-9,]+\.?\d*)/i,             // "Base Value = $X,XXX.XX"
    /ase Value\s*=\s*\$([0-9,]+\.?\d*)/i,              // OCR garbled "Base"
    /Market Value[:\s]*\$([0-9,]+\.?\d*)/i,            // "Market Value: $X,XXX.XX"
    /Base Value[:\s]*\$([0-9,]+\.?\d*)/i,              // "Base Value: $X,XXX.XX"
    /ase Value = \$([0-9,]+\.\d+)/i,                   // Exact OCR pattern "ase Value = $X,XXX.XX"
    /arket Value = \$([0-9,]+\.\d+)/i                  // Exact OCR pattern "arket Value = $X,XXX.XX"
  ],
  // Multiple settlement value patterns for Mitchell reports
  settlementValue: [
    /Settlement Value\s*=\s*\$([0-9,]+\.?\d*)/i,       // "Settlement Value = $X,XXX.XX"
    /ettle.*?ent Value\s*=\s*\$([0-9,]+\.?\d*)/i,      // OCR garbled "Settlement"
    /settle.*?value[:\s]*\$([0-9,]+\.?\d*)/i,          // Lowercase variations
    /Final Value[:\s]*\$([0-9,]+\.?\d*)/i,             // Alternative naming
    // Pattern for when "Settlement Value:" appears on one line and value on another
    /ettle\s*ent\s*Value:\s*[\r\n]\s*\$([0-9,]+\.?\d*)/i,
    /ttle\s*ent\s*Value\s*=\s*[\r\n]\s*[,\d]*[\r\n]\s*\$([0-9,]+\.?\d*)/i
  ]
};

function extractFieldMultiple(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

async function testFinalPatterns() {
  const buffer = fs.readFileSync('25-679137965_8-7-2025_Total Loss_Valuation.pdf');
  const data = await pdfParse(buffer);
  const text = data.text;
  const lines = text.split('\n');
  
  console.log('=== FINAL PATTERN TEST ===');
  
  // Test market value extraction
  const marketResult = extractFieldMultiple(text, MITCHELL_PATTERNS.marketValue);
  console.log('Market Value Result:', marketResult ? `$${marketResult}` : 'NOT FOUND');
  
  // Test settlement value extraction
  let settlementResult = extractFieldMultiple(text, MITCHELL_PATTERNS.settlementValue);
  console.log('Settlement Value Result (patterns):', settlementResult ? `$${settlementResult}` : 'NOT FOUND');
  
  // Test manual settlement extraction fallback
  if (!settlementResult) {
    console.log('\nTrying manual settlement extraction...');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^(Settlement Value|ettle\s*ent\s*Value):?\s*$/i)) {
        console.log(`Found settlement header at line ${i}: "${line}"`);
        // Look for the dollar amount in the next few lines
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          console.log(`  Checking line ${j}: "${nextLine}"`);
          if (nextLine.includes('$')) {
            const dollarMatch = nextLine.match(/\$([0-9,]+\.?\d*)/);
            if (dollarMatch) {
              settlementResult = dollarMatch[1];
              console.log(`  ✅ Found settlement value: $${settlementResult}`);
              break;
            }
          }
        }
        if (settlementResult) break;
      }
      // Also check for the specific pattern we found: "$52,352.67" on its own line
      if (line.match(/^\$([0-9,]+\.\d+)$/) && i > 5) {  // Only after some content
        const prevLines = lines.slice(Math.max(0, i-3), i);
        const hasSettlementContext = prevLines.some(prevLine => 
          prevLine.toLowerCase().includes('ettle') || prevLine.toLowerCase().includes('settlement')
        );
        if (hasSettlementContext) {
          console.log(`Found potential settlement value at line ${i}: "${line}"`);
          console.log('Previous context:', prevLines);
          const dollarMatch = line.match(/^\$([0-9,]+\.\d+)$/);
          if (dollarMatch) {
            settlementResult = dollarMatch[1];
            console.log(`  ✅ Found settlement value: $${settlementResult}`);
            break;
          }
        }
      }
    }
  }
  
  console.log('\\n=== FINAL RESULTS ===');
  console.log('Market Value:', marketResult ? `$${parseFloat(marketResult.replace(/,/g, '')).toFixed(2)}` : 'NOT FOUND');
  console.log('Settlement Value:', settlementResult ? `$${parseFloat(settlementResult.replace(/,/g, '')).toFixed(2)}` : 'NOT FOUND');
}

testFinalPatterns().catch(console.error);