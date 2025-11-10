// Focused analysis of BARSANO BMW M3 extraction issue
const fs = require('fs');
const pdfParse = require('pdf-parse');

async function analyzeBarsanoBMW() {
  console.log('🔧 ANALYZING BARSANO BMW M3 EXTRACTION ISSUE\n');
  
  const buffer = fs.readFileSync('../valuation_report_samples/valuation -  BARSANO (1).pdf');
  const data = await pdfParse(buffer);
  const text = data.text;
  
  console.log('📊 Text stats:');
  console.log('  Total length:', text.length, 'characters');
  console.log('  Contains "BMW":', text.includes('BMW') ? '✅ YES' : '❌ NO');
  console.log('  Contains "M3":', text.includes('M3') ? '✅ YES' : '❌ NO');
  console.log('  Contains "2022":', text.includes('2022') ? '✅ YES' : '❌ NO');
  
  // Extract VIN
  const vin = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/)?.[0];
  console.log('\n🆔 VIN:', vin);
  
  if (vin) {
    // Decode VIN
    const yearChar = vin.charAt(9);
    const yearMap = {
      'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
      'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
      'N': 2022, 'P': 2023
    };
    const year = yearMap[yearChar];
    
    const wmi = vin.substring(0, 3);
    const makeMap = { 'WBS': 'BMW', 'WBA': 'BMW' };
    const make = makeMap[wmi];
    
    console.log('  Decoded Year:', year, `(from character "${yearChar}")`);
    console.log('  Decoded Make:', make, `(from WMI "${wmi}")`);
  }
  
  // Look for the vehicle info line pattern
  console.log('\n🔎 Searching for vehicle info patterns:\n');
  
  // Pattern 1: Look for "i l :" (corrupted "Loss vehicle:")
  const ilMatches = [];
  const ilRegex = /i\s+l\s*:\s*([^©]{10,150})/g;
  let match;
  
  while ((match = ilRegex.exec(text)) !== null) {
    ilMatches.push({
      position: match.index,
      fullMatch: match[0],
      captured: match[1]
    });
  }
  
  console.log(`Found ${ilMatches.length} "i l :" patterns:`);
  ilMatches.forEach((m, i) => {
    console.log(`\n  [${i + 1}] Position ${m.position}:`);
    console.log(`      Full: "${m.fullMatch.substring(0, 80)}..."`);
    console.log(`      Captured: "${m.captured.trim()}"`);
    
    // Try to parse this
    if (m.captured.includes('|')) {
      const beforePipe = m.captured.split('|')[0].trim();
      console.log(`      Before pipe: "${beforePipe}"`);
      
      // Check if it's just a number (like "3") or something meaningful
      if (/^\d+$/.test(beforePipe)) {
        console.log(`      ⚠️  This is just a number: ${beforePipe} (likely M${beforePipe} model)`);
      }
    }
  });
  
  // Pattern 2: Look for "Competition" which should indicate trim level
  console.log('\n\n🔎 Searching for "Competition" patterns:\n');
  const competitionRegex = /([^\|]{0,30})\s*\|\s*Competition\s+([^\|]+)\|/gi;
  const compMatches = [];
  
  while ((match = competitionRegex.exec(text)) !== null) {
    compMatches.push({
      beforePipe: match[1].trim(),
      afterComp: match[2].trim()
    });
  }
  
  console.log(`Found ${compMatches.length} "Competition" patterns:`);
  compMatches.forEach((m, i) => {
    console.log(`\n  [${i + 1}]:`);
    console.log(`      Before pipe: "${m.beforePipe}"`);
    console.log(`      After Competition: "${m.afterComp}"`);
    
    // If before pipe is just a number, it's likely the model number
    if (/^\d+$/.test(m.beforePipe)) {
      console.log(`      💡 Model hint: This looks like M${m.beforePipe}`);
    }
  });
  
  // Strategy: For BMW, if we find "N | Competition", the "N" is likely the M-series model number
  console.log('\n\n💡 EXTRACTION STRATEGY:\n');
  console.log('For heavily corrupted BMW M-series vehicles:');
  console.log('1. VIN decodes to: Year=2022, Make=BMW');
  console.log('2. Pattern "i l : 3 | Competition..." detected');
  console.log('3. The "3" before the pipe is the model number');
  console.log('4. For BMW M-series: prepend "M" → Model = "M3"');
  
  console.log('\n🎯 PROPOSED FIX:');
  console.log('When we have:');
  console.log('  - VIN decodes to BMW');
  console.log('  - Pattern matches "i l : {number} | Competition"');
  console.log('  - The number is 1-9');
  console.log('Then:');
  console.log('  - Model = "M{number}"');
  
  // Let's verify this works
  console.log('\n\n🧪 TESTING PROPOSED LOGIC:\n');
  
  const testMatch = ilMatches.find(m => m.captured.includes('Competition'));
  if (testMatch) {
    const beforePipe = testMatch.captured.split('|')[0].trim();
    console.log('Found pattern:', JSON.stringify(testMatch.captured.substring(0, 60)));
    console.log('Text before pipe:', JSON.stringify(beforePipe));
    
    if (/^\d$/.test(beforePipe)) {
      const modelNumber = beforePipe;
      const proposedModel = `M${modelNumber}`;
      console.log(`✅ Extracted model number: ${modelNumber}`);
      console.log(`✅ Proposed model name: ${proposedModel}`);
      console.log('\n🎉 SUCCESS! We can extract "M3" from this file!');
    }
  }
}

analyzeBarsanoBMW().catch(console.error);
