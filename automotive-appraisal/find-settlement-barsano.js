// Find Settlement Value in BARSANO PDF
const fs = require('fs');
const pdfParse = require('pdf-parse');

async function findSettlementValue() {
  console.log('🔍 SEARCHING FOR SETTLEMENT VALUE IN BARSANO\n');
  
  const buffer = fs.readFileSync('../valuation_report_samples/valuation -  BARSANO (1).pdf');
  const data = await pdfParse(buffer);
  const text = data.text;
  
  console.log('📊 PDF Stats:');
  console.log('  Total characters:', text.length);
  console.log('  Contains "Settlement":', text.includes('Settlement'));
  console.log('  Contains "settlement":', text.toLowerCase().includes('settlement'));
  console.log('  Contains "ettle":', text.toLowerCase().includes('ettle'));
  
  // Search for "Settlement" or "ettle" in various forms
  console.log('\n🔎 All lines containing "ettle" or "settlement":\n');
  
  const lines = text.split('\n');
  const settlementLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes('ettle')) {
      settlementLines.push({
        index: i,
        line: line.trim(),
        prev: i > 0 ? lines[i-1].trim() : '',
        next: i < lines.length - 1 ? lines[i+1].trim() : ''
      });
    }
  }
  
  console.log(`Found ${settlementLines.length} lines with "ettle":\n`);
  
  settlementLines.forEach((item, idx) => {
    console.log(`[${idx + 1}] Line ${item.index}:`);
    console.log(`    Line: "${item.line}"`);
    if (item.prev) console.log(`    Prev: "${item.prev}"`);
    if (item.next) console.log(`    Next: "${item.next}"`);
    console.log('');
  });
  
  // Look for dollar amounts near these lines
  console.log('\n💰 Looking for dollar amounts near "ettle" lines:\n');
  
  for (const item of settlementLines) {
    // Check surrounding lines for dollar amounts
    const startLine = Math.max(0, item.index - 3);
    const endLine = Math.min(lines.length - 1, item.index + 5);
    
    const dollarAmounts = [];
    for (let i = startLine; i <= endLine; i++) {
      const line = lines[i].trim();
      const dollarMatch = line.match(/\$([0-9,]+\.?\d{0,2})/g);
      if (dollarMatch) {
        dollarAmounts.push({
          lineNum: i,
          distance: i - item.index,
          line: line,
          amounts: dollarMatch
        });
      }
    }
    
    if (dollarAmounts.length > 0) {
      console.log(`Near line ${item.index} ("${item.line.substring(0, 50)}..."):`);
      dollarAmounts.forEach(d => {
        console.log(`  Line ${d.lineNum} (${d.distance > 0 ? '+' : ''}${d.distance}): ${d.amounts.join(', ')} - "${d.line.substring(0, 60)}"`);
      });
      console.log('');
    }
  }
  
  // Test the actual patterns from pdfExtractor.ts
  console.log('\n🧪 TESTING SETTLEMENT VALUE PATTERNS:\n');
  
  const patterns = [
    { name: 'Pattern 1', regex: /Settlement Value\s*=\s*\$([0-9,]+\.?\d*)/i },
    { name: 'Pattern 2', regex: /ettle.*?ent Value\s*=\s*\$([0-9,]+\.?\d*)/i },
    { name: 'Pattern 3', regex: /settle.*?value[:\s]*\$([0-9,]+\.?\d*)/i },
    { name: 'Pattern 4', regex: /Final Value[:\s]*\$([0-9,]+\.?\d*)/i },
    { name: 'Pattern 5', regex: /ettle\s*ent\s*Value:\s*[\r\n]\s*\$([0-9,]+\.?\d*)/i },
    { name: 'Pattern 6', regex: /ttle\s*ent\s*Value\s*=\s*[\r\n]\s*[,\d]*[\r\n]\s*\$([0-9,]+\.?\d*)/i }
  ];
  
  patterns.forEach(p => {
    const match = text.match(p.regex);
    if (match) {
      console.log(`✅ ${p.name}: MATCHED`);
      console.log(`   Value: $${match[1]}`);
      console.log(`   Context: "${text.substring(Math.max(0, match.index - 50), match.index + 100)}"`);
    } else {
      console.log(`❌ ${p.name}: No match`);
    }
  });
  
  // Look for the Market Value to compare
  console.log('\n\n💵 MARKET VALUE (for comparison):\n');
  const marketPatterns = [
    /Market Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /arket Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /Base Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /ase Value\s*=\s*\$([0-9,]+\.?\d*)/i
  ];
  
  for (const pattern of marketPatterns) {
    const match = text.match(pattern);
    if (match) {
      console.log(`✅ Found Market Value: $${match[1]}`);
      break;
    }
  }
}

findSettlementValue().catch(console.error);
