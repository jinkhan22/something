const pdfParse = require('pdf-parse');
const fs = require('fs');

async function investigateFailingFile() {
  console.log('🔍 Investigating the failing file: 25-679137965_8-7-2025_Total Loss_Valuation.pdf');
  
  const buffer = fs.readFileSync('25-679137965_8-7-2025_Total Loss_Valuation.pdf');
  const data = await pdfParse(buffer);
  const text = data.text;
  const lines = text.split('\n');
  
  console.log('\n📋 Looking for all Loss Vehicle lines...');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.toLowerCase().includes('loss vehicle')) {
      console.log(`Line ${i + 1}: ${JSON.stringify(line)}`);
    }
  }
  
  console.log('\n🎯 Testing current regex pattern...');
  const currentPattern = /Loss vehicle:\s*(\d{4})\s+([A-Za-z]+)\s+([A-Za-z0-9\s\.\-\(\)]+?)(?:\s+(?:ö|\|)|AWD|FWD|RWD|$)/im;
  const match = text.match(currentPattern);
  if (match) {
    console.log('✅ Current pattern matched:');
    console.log('  Full match:', JSON.stringify(match[0]));
    console.log('  Year:', match[1]);
    console.log('  Make:', match[2]);
    console.log('  Model:', match[3]);
  } else {
    console.log('❌ Current pattern failed to match');
    
    // Let's test various simplified patterns
    console.log('\n🧪 Testing simpler patterns...');
    
    const patterns = [
      /Loss vehicle:\s*(\d{4})\s+([A-Za-z]+)\s+([^|]+?)\s*\|/im,
      /Loss vehicle:\s*(\d{4})\s+(.+?)\s*\|/im,
      /Loss vehicle:\s*(.+)/im
    ];
    
    patterns.forEach((pattern, index) => {
      const testMatch = text.match(pattern);
      if (testMatch) {
        console.log(`✅ Pattern ${index + 1} matched:`, JSON.stringify(testMatch[0]));
        if (testMatch[1]) console.log('  Group 1:', JSON.stringify(testMatch[1]));
        if (testMatch[2]) console.log('  Group 2:', JSON.stringify(testMatch[2]));
        if (testMatch[3]) console.log('  Group 3:', JSON.stringify(testMatch[3]));
      } else {
        console.log(`❌ Pattern ${index + 1} failed`);
      }
    });
  }
}

investigateFailingFile().catch(console.error);