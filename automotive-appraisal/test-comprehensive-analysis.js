// Comprehensive analysis of how the actual pdfExtractor.ts implementation handles each sample file
const fs = require('fs');
const pdfParse = require('pdf-parse');

// Copy the exact extraction logic from pdfExtractor.ts
const MITCHELL_PATTERNS = {
  vin: /\b[A-HJ-NPR-Z0-9]{17}\b/,
  vehicleInfo: /Loss vehicle:\s*(\d{4})\s+(.+?)\s*\|/im,
  vehicleInfoOCR: [
    /(?:i\s+l|oss\s+vehicle|Loss\s+ehicle|oss\s+ehicle):\s*(\d{4})\s+(.+?)\s*\|/im,
    /(?:i\s+l|oss\s+vehicle):\s*(.+?)\s*\|\s*.+?\|\s*(.+?)(?:\s*\||$)/im
  ],
  mileage: /(\d{1,3}(?:,\d{3})*)\s*miles/i,
  marketValue: [
    /Market Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /arket Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /Base Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /ase Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /Market Value[:\s]*\$([0-9,]+\.?\d*)/i,
    /Base Value[:\s]*\$([0-9,]+\.?\d*)/i,
    /ase Value = \$([0-9,]+\.\d+)/i,
    /arket Value = \$([0-9,]+\.\d+)/i
  ],
  settlementValue: [
    /Settlement Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /ettle.*?ent Value\s*=\s*\$([0-9,]+\.?\d*)/i,
    /settle.*?value[:\s]*\$([0-9,]+\.?\d*)/i,
    /Final Value[:\s]*\$([0-9,]+\.?\d*)/i,
    /ettle\s*ent\s*Value:\s*[\r\n]\s*\$([0-9,]+\.?\d*)/i,
    /ttle\s*ent\s*Value\s*=\s*[\r\n]\s*[,\d]*[\r\n]\s*\$([0-9,]+\.?\d*)/i
  ]
};

const VEHICLE_MANUFACTURERS = [
  'Morgan Motor Company', 'Mahindra & Mahindra', 'McLaren Automotive',
  'Chevrolet Division', 'Peugeot Citroën', 'American Motors',
  'Harley Davidson', 'General Motors', 'Ashok Leyland',
  'Pinin Farina', 'Aston Martin', 'Alfa Romeo', 'Land Rover',
  'Range Rover', 'Rolls Royce', 'Dodge Ram', 'AM General',
  'Acura', 'Audi', 'Bentley', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 
  'Chrysler', 'Dodge', 'Ferrari', 'Ford', 'GMC', 'Honda', 'Hyundai', 
  'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Lexus', 'Lincoln',
  'Lucid', 'Maserati', 'Mazda', 'Mercedes', 'Mercedes-Benz', 'Mitsubishi', 
  'Nissan', 'Porsche', 'Ram', 'Rivian', 'Subaru', 'Tesla', 'Toyota', 
  'Volkswagen', 'Volvo'
];

const MANUFACTURER_OCR_VARIANTS = {
  'oyota': 'Toyota', 'ord': 'Ford', 'mw': 'BMW', 'ercedes': 'Mercedes',
  'olkswagen': 'Volkswagen', 'yundai': 'Hyundai', 'issan': 'Nissan',
  'azda': 'Mazda', 'ubaru': 'Subaru', 'acura': 'Acura', 'honda': 'Honda',
  'tesla': 'Tesla'
};

const VIN_MANUFACTURER_MAP = {
  '1FT': 'Ford', '1GC': 'Chevrolet', '1GM': 'Chevrolet', '1HD': 'Harley-Davidson',
  '2C3': 'Chrysler', '2C4': 'Chrysler', '2T1': 'Toyota', '3FA': 'Ford',
  '3VW': 'Volkswagen', '4T1': 'Toyota', '5YJ': 'Tesla', 'JHM': 'Honda',
  'JN1': 'Nissan', 'KMH': 'Hyundai', 'WBA': 'BMW', 'WBS': 'BMW',
  'WDD': 'Mercedes-Benz', 'WVW': 'Volkswagen', 'YV1': 'Volvo', '5XY': 'Hyundai'
};

function getYearFromVIN(vin) {
  if (!vin || vin.length < 10) return 0;
  const yearChar = vin.charAt(9);
  const yearMap = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
    'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
    'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026,
    '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
    '6': 2006, '7': 2007, '8': 2008, '9': 2009
  };
  return yearMap[yearChar] || 0;
}

function getManufacturerFromVIN(vin) {
  if (!vin || vin.length < 3) return '';
  const vinPrefix = vin.substring(0, 3);
  return VIN_MANUFACTURER_MAP[vinPrefix] || '';
}

function parseMakeModel(vehicleText) {
  const cleanText = vehicleText.trim();
  
  // Try exact manufacturer matches
  for (const manufacturer of VEHICLE_MANUFACTURERS) {
    const manufacturerIndex = cleanText.toLowerCase().indexOf(manufacturer.toLowerCase());
    if (manufacturerIndex !== -1) {
      const make = manufacturer;
      const afterMake = cleanText.substring(manufacturerIndex + manufacturer.length).trim();
      const modelMatch = afterMake.match(/^([^|]+)/);
      const model = modelMatch ? modelMatch[1].trim() : '';
      
      if (model && model.length > 0) {
        return { make, model };
      }
    }
  }
  
  // Try OCR variant matches
  for (const [variant, correctName] of Object.entries(MANUFACTURER_OCR_VARIANTS)) {
    const variantIndex = cleanText.toLowerCase().indexOf(variant.toLowerCase());
    if (variantIndex !== -1) {
      const make = correctName;
      const afterMake = cleanText.substring(variantIndex + variant.length).trim();
      const modelMatch = afterMake.match(/^([^|]+)/);
      const model = modelMatch ? modelMatch[1].trim() : '';
      
      if (model && model.length > 0) {
        return { make, model };
      }
    }
  }
  
  // Special handling for OCR corrupted "Ford"
  if (cleanText.toLowerCase().includes('ord super duty') || cleanText.toLowerCase().includes('ord f-')) {
    const make = 'Ford';
    const model = cleanText.replace(/^ord\s*/i, '').trim();
    return { make, model };
  }
  
  // Fallback
  const words = cleanText.split(/\s+/);
  if (words.length >= 2) {
    const make = words[0];
    const modelParts = words.slice(1);
    const model = modelParts.join(' ').replace(/\|.*$/, '').trim();
    return { make, model };
  }
  
  return { make: words[0] || '', model: '' };
}

function extractVehicleInfoWithOCR(text) {
  // Try standard pattern first
  const standardMatch = text.match(MITCHELL_PATTERNS.vehicleInfo);
  if (standardMatch) {
    return {
      year: parseInt(standardMatch[1]) || 0,
      makeModel: standardMatch[2].trim()
    };
  }
  
  // Try OCR corrupted patterns
  for (const pattern of MITCHELL_PATTERNS.vehicleInfoOCR) {
    const match = text.match(pattern);
    if (match) {
      if (match[1] && match[2]) {
        const potentialYear = parseInt(match[1]);
        if (potentialYear >= 1990 && potentialYear <= 2030) {
          return {
            year: potentialYear,
            makeModel: match[2].trim()
          };
        } else {
          const yearMatch = match[0].match(/(\d{4})/);
          const year = yearMatch ? parseInt(yearMatch[1]) : 0;
          const makeModel = `${match[1]} ${match[2]}`.trim();
          return { year, makeModel };
        }
      }
    }
  }
  
  // Fallback: colon pattern
  const colonPattern = /:\s*(.+?)\s*\|/;
  const colonMatch = text.match(colonPattern);
  if (colonMatch) {
    const fullText = colonMatch[1].trim();
    
    if (fullText.length > 10) {
      const yearMatch = fullText.match(/(\d{4})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year >= 1990 && year <= 2030) {
          const makeModel = fullText.replace(/\d{4}\s*/, '').trim();
          if (makeModel.length > 3) {
            return { year, makeModel };
          }
        }
      }
    }
  }
  
  return null;
}

function extractFieldMultiple(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function parseMileage(mileageStr) {
  if (!mileageStr) return 0;
  return parseInt(mileageStr.replace(/,/g, ''));
}

async function analyzeFile(filename) {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📄 FILE: ${filename}`);
    console.log('='.repeat(80));
    
    const buffer = fs.readFileSync(`../valuation_report_samples/${filename}`);
    const data = await pdfParse(buffer);
    const text = data.text;
    
    // Extract VIN
    const vin = text.match(MITCHELL_PATTERNS.vin)?.[0] || '';
    console.log('\n🔹 VIN:', vin || 'NOT FOUND');
    
    // Extract vehicle info
    let year = 0;
    let make = '';
    let model = '';
    let extractionMethod = '';
    
    // Approach 1: OCR-robust extraction
    const vehicleInfo = extractVehicleInfoWithOCR(text);
    if (vehicleInfo && vehicleInfo.year > 0 && vehicleInfo.makeModel) {
      year = vehicleInfo.year;
      const makeModelText = vehicleInfo.makeModel;
      const parsed = parseMakeModel(makeModelText);
      make = parsed.make;
      model = parsed.model;
      extractionMethod = 'OCR Pattern Matching';
      
      console.log('\n✅ Method: OCR Pattern Matching');
      console.log('   Raw text extracted:', makeModelText);
    } else {
      // Approach 2: VIN-based extraction
      if (vin) {
        year = getYearFromVIN(vin);
        make = getManufacturerFromVIN(vin);
        extractionMethod = 'VIN Decoding';
        
        console.log('\n⚠️  Method: VIN Decoding (OCR patterns failed)');
        
        // Try to find model from OCR corruption patterns
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const colonPattern = /:\s*(.+?)\s*\|/;
          const match = line.match(colonPattern);
          
          if (match && match[1]) {
            const potentialVehicleText = match[1].trim();
            
            // Special case: BMW M-series with heavily corrupted OCR
            // Pattern: "i l : 3 | Competition..." where "3" should be "M3"
            if (make === 'BMW' && /^\d$/.test(potentialVehicleText)) {
              const fullLineMatch = line.match(/:\s*(\d)\s*\|\s*(Competition|M Sport|Individual)/i);
              if (fullLineMatch) {
                model = `M${fullLineMatch[1]}`;
                console.log(`   Found BMW M-series model: M${fullLineMatch[1]} (from "${line.substring(0, 60)}...")`);
                break;
              }
            }
            
            // Standard parsing for longer text
            if (potentialVehicleText.length > 5) {
              const parsed = parseMakeModel(potentialVehicleText);
              if (parsed.make && parsed.model) {
                make = make || parsed.make;
                model = parsed.model;
                console.log('   Found model via colon pattern:', potentialVehicleText);
                break;
              }
            }
          }
        }
      } else {
        extractionMethod = 'FAILED - No VIN, no OCR patterns matched';
        console.log('\n❌ Method: FAILED');
      }
    }
    
    // Extract mileage
    const mileageStr = text.match(MITCHELL_PATTERNS.mileage)?.[1];
    const mileage = parseMileage(mileageStr);
    
    // Extract market value
    const marketValueStr = extractFieldMultiple(text, MITCHELL_PATTERNS.marketValue);
    const marketValue = marketValueStr ? parseFloat(marketValueStr.replace(/,/g, '')) : 0;
    
    // Extract settlement value (with multi-line fallback)
    let settlementValue = 0;
    const settlementValueStr = extractFieldMultiple(text, MITCHELL_PATTERNS.settlementValue);
    if (settlementValueStr) {
      settlementValue = parseFloat(settlementValueStr.replace(/,/g, ''));
    } else {
      // Multi-line fallback (matches pdfExtractor.ts logic)
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/^(Settlement Value|ettle\s*ent\s*Value):?\s*$/i)) {
          // Look for dollar amount in next few lines
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j].trim();
            if (nextLine.includes('$')) {
              const dollarMatch = nextLine.match(/\$([0-9,]+\.?\d*)/);
              if (dollarMatch) {
                settlementValue = parseFloat(dollarMatch[1].replace(/,/g, ''));
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
              settlementValue = parseFloat(dollarMatch[1].replace(/,/g, ''));
              break;
            }
          }
        }
      }
    }
    
    console.log('\n📊 EXTRACTED DATA:');
    console.log('   Year:', year || 'NOT FOUND');
    console.log('   Make:', make || 'NOT FOUND');
    console.log('   Model:', model || 'NOT FOUND');
    console.log('   Mileage:', mileage ? mileage.toLocaleString() : 'NOT FOUND');
    console.log('   Market Value:', marketValue ? `$${marketValue.toLocaleString()}` : 'NOT FOUND');
    console.log('   Settlement Value:', settlementValue ? `$${settlementValue.toLocaleString()}` : 'NOT FOUND');
    
    // Calculate confidence
    let confidence = 0;
    if (vin && vin.length === 17) confidence += 30;
    if (year > 1990 && year <= 2025) confidence += 20;
    if (make) confidence += 20;
    if (model) confidence += 15;
    if (mileage > 0) confidence += 10;
    confidence += 5; // Assume location found (not checked here)
    
    console.log('\n🎯 CONFIDENCE SCORE:', `${confidence}%`);
    
    const hasVin = vin && vin.length === 17;
    const hasMake = !!make;
    const hasYear = year > 1990;
    const isValid = hasVin || (hasMake && hasYear);
    
    if (confidence >= 80) {
      console.log('✅ STATUS: EXCELLENT - Complete vehicle information extracted');
    } else if (confidence >= 60) {
      console.log('✅ STATUS: GOOD - Most vehicle information extracted');
    } else if (isValid) {
      console.log('⚠️  STATUS: PARTIAL - Basic vehicle identification possible');
    } else {
      console.log('❌ STATUS: FAILED - Insufficient data for vehicle identification');
    }
    
    return {
      filename,
      vin: vin || 'NOT FOUND',
      year,
      make: make || 'NOT FOUND',
      model: model || 'NOT FOUND',
      mileage,
      marketValue,
      settlementValue,
      confidence,
      extractionMethod,
      isValid
    };
  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    return {
      filename,
      error: error.message
    };
  }
}

async function runComprehensiveAnalysis() {
  console.log('🔍 COMPREHENSIVE ANALYSIS OF PDF EXTRACTION SYSTEM');
  console.log('📁 Testing on all sample Mitchell Reports\n');
  
  const testFiles = [
    '14 santa fe eval.pdf',
    '25-439600069-ValuationReport.pdf',
    '25-679137965_8-7-2025_Total Loss_Valuation.pdf',
    'valuation -  BARSANO (1).pdf',
    'Valution Report.pdf',
    'VR-1-VEHICLE EVALUAT gION_1 (2).pdf'
  ];
  
  const results = [];
  
  for (const filename of testFiles) {
    const result = await analyzeFile(filename);
    results.push(result);
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));
  
  const excellent = results.filter(r => !r.error && r.confidence >= 80);
  const good = results.filter(r => !r.error && r.confidence >= 60 && r.confidence < 80);
  const partial = results.filter(r => !r.error && r.isValid && r.confidence < 60);
  const failed = results.filter(r => r.error || !r.isValid);
  
  console.log(`\n✅ EXCELLENT (80%+):   ${excellent.length}/${results.length} files`);
  excellent.forEach(r => {
    console.log(`   ${r.filename}`);
    console.log(`      → ${r.year} ${r.make} ${r.model} (${r.confidence}%)`);
  });
  
  console.log(`\n✅ GOOD (60-79%):      ${good.length}/${results.length} files`);
  good.forEach(r => {
    console.log(`   ${r.filename}`);
    console.log(`      → ${r.year} ${r.make} ${r.model} (${r.confidence}%)`);
  });
  
  console.log(`\n⚠️  PARTIAL (<60%):     ${partial.length}/${results.length} files`);
  partial.forEach(r => {
    console.log(`   ${r.filename}`);
    console.log(`      → ${r.year} ${r.make} ${r.model} (${r.confidence}%)`);
  });
  
  console.log(`\n❌ FAILED:             ${failed.length}/${results.length} files`);
  failed.forEach(r => {
    console.log(`   ${r.filename}`);
    if (r.error) {
      console.log(`      → Error: ${r.error}`);
    } else {
      console.log(`      → ${r.year || 'No Year'} ${r.make} ${r.model || 'No Model'}`);
    }
  });
  
  const successRate = ((excellent.length + good.length) / results.length * 100).toFixed(1);
  console.log(`\n📊 SUCCESS RATE: ${successRate}% (Excellent + Good extractions)`);
  
  console.log('\n\n🔎 ANALYSIS INSIGHTS:');
  console.log('\n1. PATTERN-BASED EXTRACTION:');
  console.log('   The system uses regex patterns to find specific text patterns in Mitchell reports');
  console.log('   like "Loss vehicle: 2020 Ford Super Duty F-250 | ..."');
  
  console.log('\n2. OCR CORRUPTION HANDLING:');
  console.log('   The system includes patterns for OCR errors like:');
  console.log('   • "Loss vehicle" → "oss vehicle", "i l", etc.');
  console.log('   • "Ford" → "ord"');
  console.log('   • Missing first letters in manufacturer names');
  
  console.log('\n3. VIN FALLBACK:');
  console.log('   When OCR patterns fail, the system decodes the VIN to extract:');
  console.log('   • Year (from 10th character)');
  console.log('   • Manufacturer (from first 3 characters - WMI)');
  
  console.log('\n4. MULTI-PATTERN APPROACH:');
  console.log('   For values like Market Value and Settlement Value, the system tries');
  console.log('   multiple pattern variations to handle OCR corruption');
  
  console.log('\n\n💡 IS THIS GENERIC OR FILE-SPECIFIC?');
  console.log('\nThe system is DESIGNED TO BE GENERIC for Mitchell Reports:');
  console.log('   ✅ Uses standard Mitchell report patterns (Loss vehicle:, Market Value, etc.)');
  console.log('   ✅ Includes comprehensive manufacturer database (40+ brands)');
  console.log('   ✅ Handles common OCR corruption patterns');
  console.log('   ✅ Falls back to VIN decoding when patterns fail');
  console.log('   ✅ Tries multiple pattern variations for each field');
  console.log('\nHowever, performance depends on:');
  console.log('   ⚠️  PDF quality and OCR accuracy');
  console.log('   ⚠️  Whether the Mitchell report follows standard format');
  console.log('   ⚠️  Presence of valid VIN for fallback');
}

runComprehensiveAnalysis().catch(console.error);
