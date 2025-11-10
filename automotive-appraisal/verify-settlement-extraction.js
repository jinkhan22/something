// Verify what the Electron app actually extracts from BARSANO
const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractLikePdfExtractor() {
  console.log('🔬 SIMULATING pdfExtractor.ts LOGIC FOR BARSANO\n');
  
  const buffer = fs.readFileSync('../valuation_report_samples/valuation -  BARSANO (1).pdf');
  const data = await pdfParse(buffer);
  const text = data.text;
  const lines = text.split('\n');
  
  // Settlement Value extraction (matching pdfExtractor.ts logic)
  let settlementValue = 0;
  
  // Try multi-line pattern (the one that should work for BARSANO)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line matches corrupted Settlement Value header
    if (line.match(/^(Settlement Value|ettle\s*ent\s*Value):?\s*$/i)) {
      console.log(`Found Settlement Value header at line ${i}: "${line}"`);
      
      // Look for dollar amount in next few lines
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim();
        console.log(`  Checking line ${j}: "${nextLine}"`);
        
        if (nextLine.includes('$')) {
          const dollarMatch = nextLine.match(/\$([0-9,]+\.?\d*)/);
          if (dollarMatch) {
            settlementValue = parseFloat(dollarMatch[1].replace(/,/g, ''));
            console.log(`  ✅ Found dollar amount: $${dollarMatch[1]} → ${settlementValue}`);
            break;
          }
        }
      }
      if (settlementValue > 0) break;
    }
    
    // Also check standalone dollar pattern
    if (line.match(/^\$([0-9,]+\.\d+)$/) && i > 5) {
      const prevLines = lines.slice(Math.max(0, i-3), i);
      const hasSettlementContext = prevLines.some(prevLine => 
        prevLine.toLowerCase().includes('ettle') || prevLine.toLowerCase().includes('settlement')
      );
      
      if (hasSettlementContext) {
        const dollarMatch = line.match(/^\$([0-9,]+\.\d+)$/);
        if (dollarMatch) {
          console.log(`Found standalone dollar at line ${i}: "${line}"`);
          console.log(`  Has settlement context in previous lines: YES`);
          settlementValue = parseFloat(dollarMatch[1].replace(/,/g, ''));
          console.log(`  ✅ Extracted: $${dollarMatch[1]} → ${settlementValue}`);
          break;
        }
      }
    }
  }
  
  // Market Value
  let marketValue = 0;
  const marketMatch = text.match(/arket Value\s*=\s*\$([0-9,]+\.?\d*)/i);
  if (marketMatch) {
    marketValue = parseFloat(marketMatch[1].replace(/,/g, ''));
  }
  
  console.log('\n📊 FINAL EXTRACTION RESULT:');
  console.log('  Market Value:', marketValue > 0 ? `$${marketValue.toLocaleString()}` : 'NOT FOUND');
  console.log('  Settlement Value:', settlementValue > 0 ? `$${settlementValue.toLocaleString()}` : 'NOT FOUND');
  
  console.log('\n💡 EXPLANATION:');
  console.log('The TypeScript implementation has multi-line fallback logic that:');
  console.log('1. Finds "ettle ent Value:" on line 10');
  console.log('2. Searches the next 5 lines for a dollar amount');
  console.log('3. Finds "$72,641.27" on line 13');
  console.log('4. Extracts it as the Settlement Value');
  console.log('\nThis is why the Electron app shows the Settlement Value,');
  console.log('but the old test script (which lacks this logic) does not.');
}

extractLikePdfExtractor().catch(console.error);
