const pdfParse = require('pdf-parse');
const fs = require('fs');

// Test the improved extraction with OCR corruption handling
async function testImprovedMitchellExtraction() {
  console.log('🚀 Testing Improved Mitchell Model Extraction with OCR Handling\n');
  
  // Test both working and problematic files
  const testFiles = [
    '14 santa fe eval.pdf',           // Working
    '25-439600069-ValuationReport.pdf', // Working
    'Valution Report.pdf',            // Working
    '25-679137965_8-7-2025_Total Loss_Valuation.pdf', // Problematic (OCR corrupted)
    'VR-1-VEHICLE EVALUAT gION_1 (2).pdf'  // Problematic
  ];
  
  // Patterns we'll test
  const PATTERNS = {
    standard: /Loss vehicle:\s*(\d{4})\s+(.+?)\s*\|/im,
    ocrCorrupted: [
      /(?:i\s+l|oss\s+vehicle|Loss\s+ehicle|oss\s+ehicle):\s*(\d{4})\s+(.+?)\s*\|/im,
      /(?:i\s+l|oss\s+vehicle):\s*(.+?)\s*\|\s*.+?\|\s*(.+?)(?:\s*\||$)/im
    ]
  };

  function extractVehicleInfoRobust(text) {
    // Try standard pattern first
    const standardMatch = text.match(PATTERNS.standard);
    if (standardMatch) {
      return {
        year: parseInt(standardMatch[1]) || 0,
        makeModel: standardMatch[2].trim(),
        method: 'standard'
      };
    }
    
    // Try OCR corrupted patterns
    for (let i = 0; i < PATTERNS.ocrCorrupted.length; i++) {
      const pattern = PATTERNS.ocrCorrupted[i];
      const match = text.match(pattern);
      if (match) {
        if (match[1] && match[2]) {
          // Check if first group is a year
          const potentialYear = parseInt(match[1]);
          if (potentialYear >= 1990 && potentialYear <= 2030) {
            return {
              year: potentialYear,
              makeModel: match[2].trim(),
              method: `ocr-pattern-${i + 1}`
            };
          } else {
            // First group is not a year, try to extract year from the text
            const yearMatch = match[0].match(/(\d{4})/);
            const year = yearMatch ? parseInt(yearMatch[1]) : 0;
            const makeModel = `${match[1]} ${match[2]}`.trim();
            return { 
              year, 
              makeModel,
              method: `ocr-pattern-${i + 1}-combined`
            };
          }
        }
      }
    }
    
    return null;
  }

  function parseMakeModelRobust(vehicleText) {
    const cleanText = vehicleText.trim();
    console.log('    🔍 Parsing:', JSON.stringify(cleanText));
    
    const manufacturers = [
      'Land Rover', 'Range Rover', 'Aston Martin', 'Alfa Romeo', 'Rolls Royce',
      'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 
      'Dodge', 'Ferrari', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 
      'Jaguar', 'Jeep', 'Kia', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes', 
      'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Porsche', 'Subaru', 'Tesla', 
      'Toyota', 'Volkswagen', 'Volvo'
    ];
    
    // Try to find manufacturer (longest first)
    for (const manufacturer of manufacturers) {
      const index = cleanText.toLowerCase().indexOf(manufacturer.toLowerCase());
      if (index !== -1) {
        const make = manufacturer;
        const afterMake = cleanText.substring(index + manufacturer.length).trim();
        const model = afterMake;
        
        console.log('    ✅ Found manufacturer:', make);
        console.log('    🚗 Model:', JSON.stringify(model));
        
        if (model && model.length > 0) {
          return { make, model };
        }
      }
    }
    
    // Special handling for OCR corrupted "Ford" -> "ord"
    if (cleanText.toLowerCase().includes('ord super duty') || cleanText.toLowerCase().includes('ord f-')) {
      const make = 'Ford';
      const model = cleanText.replace(/^ord\s*/i, '').trim();
      console.log('    🔧 OCR corrected Ford:', model);
      return { make, model };
    }
    
    // Fallback
    const words = cleanText.split(/\s+/);
    if (words.length >= 2) {
      const make = words[0];
      const model = words.slice(1).join(' ');
      console.log('    ⚠️  Fallback parsing - Make:', make, 'Model:', model);
      return { make, model };
    }
    
    console.log('    ❌ Failed to parse');
    return { make: words[0] || '', model: '' };
  }
  
  for (const file of testFiles) {
    console.log(`\n📄 ===== TESTING: ${file} =====`);
    
    if (!fs.existsSync(file)) {
      console.log('❌ File not found, skipping...');
      continue;
    }
    
    try {
      const buffer = fs.readFileSync(file);
      const data = await pdfParse(buffer);
      const text = data.text;
      
      console.log('📊 PDF Stats:');
      console.log('  Total text length:', text.length);
      console.log('  Total pages: All pages processed');
      
      // Test the robust extraction
      const vehicleInfo = extractVehicleInfoRobust(text);
      
      if (vehicleInfo) {
        console.log('✅ Vehicle info extracted!');
        console.log('  📅 Year:', vehicleInfo.year);
        console.log('  📝 Make+Model:', JSON.stringify(vehicleInfo.makeModel));
        console.log('  🔧 Method:', vehicleInfo.method);
        
        const parsed = parseMakeModelRobust(vehicleInfo.makeModel);
        console.log('  🎯 FINAL RESULT:');
        console.log(`    Make: "${parsed.make}"`);
        console.log(`    Model: "${parsed.model}"`);
        
        if (parsed.make && parsed.model) {
          console.log('  ✅ SUCCESS: Both make and model extracted!');
        } else {
          console.log('  ⚠️  WARNING: Missing make or model');
        }
      } else {
        console.log('❌ No vehicle info found');
        
        // Show any lines that contain potential vehicle info for debugging
        const lines = text.split('\n');
        const potentialLines = lines.filter(line => 
          /\b(19[89]\d|20[0-2]\d)\b/.test(line) && line.trim().length > 20
        ).slice(0, 3);
        
        if (potentialLines.length > 0) {
          console.log('🔍 Potential vehicle info lines found:');
          potentialLines.forEach(line => {
            console.log('  ', JSON.stringify(line.trim()));
          });
        }
      }
      
    } catch (error) {
      console.log(`❌ Error processing ${file}: ${error.message}`);
    }
  }
}

testImprovedMitchellExtraction().catch(console.error);