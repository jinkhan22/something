const fs = require('fs');
const pdfParse = require('pdf-parse');

// Copy the exact patterns and functions from the TypeScript file
const MITCHELL_PATTERNS = {
  vin: /\b[A-HJ-NPR-Z0-9]{17}\b/,
  vehicleInfo: /Loss vehicle:\s*(\d{4})\s+([A-Za-z]+)\s+([A-Za-z\s]+?)\s*\|/i,
  mileage: /(\d{1,3}(?:,\d{3})*)\s*miles/i,
  location: /\n\s*([A-Z]{2}\s+\d{5})\s*$/m,
  marketValue: /Market Value\s*=\s*\$([0-9,]+\.\d{2})/i,
};

function extractField(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] || match[0] : null;
}

function parseMileage(mileageStr) {
  if (!mileageStr) return 0;
  return parseInt(mileageStr.replace(/,/g, ''));
}

// Custom settlement value extraction
function extractSettlementValue(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'Settlement Value =') {
      // Look for the dollar amount in the next few lines
      for (let j = i + 1; j < i + 5; j++) {
        if (lines[j] && lines[j].includes('$')) {
          const dollarMatch = lines[j].match(/\$([0-9,]+\.\d{2})/);
          if (dollarMatch) {
            return parseFloat(dollarMatch[1].replace(/,/g, ''));
          }
        }
      }
      break;
    }
  }
  return 0;
}

function extractMitchellData(text) {
  const vehicleMatch = text.match(MITCHELL_PATTERNS.vehicleInfo);
  
  let year = 0;
  let make = '';
  let model = '';
  
  if (vehicleMatch) {
    year = parseInt(vehicleMatch[1]) || 0;
    make = vehicleMatch[2] || '';
    model = vehicleMatch[3]?.trim() || '';
  }
  
  const settlementValue = extractSettlementValue(text);
  const marketValue = parseFloat(extractField(text, MITCHELL_PATTERNS.marketValue)?.replace(/,/g, '') || '0');
  
  return {
    vin: extractField(text, MITCHELL_PATTERNS.vin) || '',
    year,
    make,
    model,
    mileage: parseMileage(extractField(text, MITCHELL_PATTERNS.mileage)),
    location: extractField(text, MITCHELL_PATTERNS.location) || '',
    settlementValue,
    marketValue,
    reportType: 'MITCHELL',
  };
}

// Test the extraction
async function testExtraction() {
  try {
    const buffer = fs.readFileSync('../valuation_report_samples/14 santa fe eval.pdf');
    const data = await pdfParse(buffer);
    const text = data.text;
    
    console.log('=== MITCHELL EXTRACTION TEST ===');
    const result = extractMitchellData(text);
    
    console.log('Extracted Data:');
    console.log('├─ VIN:', result.vin);
    console.log('├─ Year:', result.year);
    console.log('├─ Make:', result.make);
    console.log('├─ Model:', result.model);
    console.log('├─ Mileage:', result.mileage);
    console.log('├─ Location:', result.location);
    console.log('├─ Settlement Value:', result.settlementValue ? `$${result.settlementValue.toFixed(2)}` : 'N/A');
    console.log('├─ Market Value:', result.marketValue ? `$${result.marketValue.toFixed(2)}` : 'N/A');
    console.log('└─ Report Type:', result.reportType);
    
    console.log('\n=== VALIDATION ===');
    console.log('Settlement Value correct?', result.settlementValue === 10741.06 ? '✅' : `❌ (got ${result.settlementValue}, expected 10741.06)`);
    console.log('Market Value correct?', result.marketValue === 10062.32 ? '✅' : `❌ (got ${result.marketValue}, expected 10062.32)`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testExtraction();