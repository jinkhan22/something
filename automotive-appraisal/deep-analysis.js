const pdfParse = require('pdf-parse');
const fs = require('fs');

async function analyzeWithProperSplitting() {
  console.log('🚀 ANALYZING MITCHELL REPORTS WITH PROPER TEXT SPLITTING\n');
  
  const filename = 'valuation -  BARSANO (1).pdf'; // Focus on the problematic one
  
  try {
    console.log(`==================== ${filename} ====================`);
    
    const buffer = fs.readFileSync(`../valuation_report_samples/${filename}`);
    const data = await pdfParse(buffer);
    let text = data.text;
    
    console.log('📄 Original text length:', text.length);
    console.log('📊 Lines with \\n split:', text.split('\\n').length);
    
    // Try different splitting strategies
    const strategies = [
      { name: 'Split by \\n', lines: text.split('\\n') },
      { name: 'Split by \\r\\n', lines: text.split('\\r\\n') },
      { name: 'Split by multiple spaces', lines: text.split(/\\s{3,}/) },
      { name: 'Split by common patterns', lines: text.split(/(?=[A-Z][a-z]+ [A-Z][a-z]+)|(?=\\d{4} [A-Z])|(?=Loss Vehicle)|(?=VIN:)/i) }
    ];
    
    strategies.forEach((strategy, i) => {
      console.log(`\\n${i+1}. ${strategy.name}: ${strategy.lines.length} parts`);
      
      // Look for VIN in this splitting
      const vins = [];
      const vehicleLines = [];
      const yearMakeModel = [];
      
      strategy.lines.forEach((line, lineNum) => {
        const cleanLine = line.trim();
        if (cleanLine.length < 5) return;
        
        // VIN search
        const vinMatch = cleanLine.match(/\\b[A-HJ-NPR-Z0-9]{17}\\b/);
        if (vinMatch) {
          vins.push({ vin: vinMatch[0], line: cleanLine.substring(0, 60), lineNum });
        }
        
        // Loss vehicle search
        if (cleanLine.toLowerCase().includes('loss') && 
            cleanLine.toLowerCase().includes('vehicle') && 
            cleanLine.includes(':')) {
          vehicleLines.push({ line: cleanLine.substring(0, 80), lineNum });
        }
        
        // Year + Make + Model patterns
        const yearMakeMatch = cleanLine.match(/(19|20)\\d{2}\\s+(BMW|Toyota|Honda|Ford|Hyundai|Volvo|Mercedes|Chevrolet|Nissan)\\s+([A-Za-z0-9\\s\\-]+)/i);
        if (yearMakeMatch) {
          yearMakeModel.push({ 
            year: yearMakeMatch[1], 
            make: yearMakeMatch[2], 
            model: yearMakeMatch[3], 
            line: cleanLine.substring(0, 60), 
            lineNum 
          });
        }
        
        // Pipe-separated vehicle info  
        if (cleanLine.includes('|') && 
            (cleanLine.includes('Competition') || cleanLine.includes('Door') || cleanLine.includes('Sedan'))) {
          vehicleLines.push({ line: cleanLine.substring(0, 80), lineNum, type: 'pipe' });
        }
      });
      
      if (vins.length > 0) {
        console.log('   🔍 VINs found:', vins.length);
        vins.forEach(v => console.log(`      ${v.vin} (line ${v.lineNum}): ${v.line}...`));
      }
      
      if (vehicleLines.length > 0) {
        console.log('   🚗 Vehicle lines:', vehicleLines.length);
        vehicleLines.slice(0, 3).forEach(v => {
          console.log(`      (line ${v.lineNum}) ${v.type || 'loss'}: ${v.line}...`);
        });
      }
      
      if (yearMakeModel.length > 0) {
        console.log('   📅 Year/Make/Model found:', yearMakeModel.length);
        yearMakeModel.forEach(ymm => {
          console.log(`      ${ymm.year} ${ymm.make} ${ymm.model} (line ${ymm.lineNum})`);
        });
      }
    });
    
    // Now test our extraction patterns on the original text
    console.log('\\n🧪 TESTING OUR EXTRACTION PATTERNS:');
    
    // VIN
    const vinPattern = /\\b[A-HJ-NPR-Z0-9]{17}\\b/;
    const vinMatch = text.match(vinPattern);
    console.log('VIN extraction:', vinMatch ? vinMatch[0] : 'Not found');
    
    if (vinMatch) {
      const vin = vinMatch[0];
      
      // VIN decoding
      const VIN_MANUFACTURER_MAP = {
        'WBA': 'BMW', 'WBS': 'BMW', '1FT': 'Ford', 'JHM': 'Honda',
        '4T1': 'Toyota', 'KMH': 'Hyundai', 'YV1': 'Volvo'
      };
      
      const VIN_YEAR_MAP = {
        'N': 2022, 'M': 2021, 'L': 2020, 'K': 2019, 'J': 2018, 'H': 2017,
        'G': 2016, 'F': 2015, 'E': 2014, 'D': 2013, 'C': 2012, 'B': 2011, 'A': 2010
      };
      
      const wmi = vin.substring(0, 3);
      const yearChar = vin.charAt(9);
      
      const make = VIN_MANUFACTURER_MAP[wmi] || 'Unknown';
      const year = VIN_YEAR_MAP[yearChar] || 'Unknown';
      
      console.log('Decoded make from VIN:', make);
      console.log('Decoded year from VIN:', year);
      
      // Model extraction using pipe patterns
      const pipePattern = /([A-Za-z0-9\\s\\-]*?)\\s*\\|\\s*([A-Za-z0-9\\s]+?)(?:\\s+\\d+\\s+Door|\\s+\\d+\\.\\d+L|$)/gi;
      let match;
      const models = [];
      
      while ((match = pipePattern.exec(text)) !== null) {
        const part1 = match[1].trim();
        const part2 = match[2].trim();
        
        if (part1.length > 0 && part2.length > 0 && 
            !part1.includes('©') && !part2.includes('©') &&
            (part2.includes('Competition') || part2.includes('Sport') || part2.includes('XLT'))) {
          models.push(`${part1} ${part2}`.replace(/\\s+/g, ' ').trim());
        }
      }
      
      console.log('Potential models found:', models);
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  
  console.log('\\n🎯 This analysis shows the actual structure of the PDF text and how to extract from it!');
}

analyzeWithProperSplitting().catch(console.error);