#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Use require for pdf-parse as it's a CommonJS module
const pdfParse = require('pdf-parse');

// Mitchell and CCC One specific extraction patterns
const MITCHELL_PATTERNS = {
  vin: /\b[A-HJ-NPR-Z0-9]{17}\b/,
  // Target "Loss vehicle: 2014 Hyundai Santa Fe Sport" pattern
  vehicleInfo: /Loss vehicle:\s*(\d{4})\s+([A-Za-z]+)\s+([A-Za-z\s]+?)\s*\|/i,
  // Target "125,759 miles" standalone line
  mileage: /(\d{1,3}(?:,\d{3})*)\s*miles/i,
  // Target "FL 32210" pattern after vehicle info
  location: /\n\s*([A-Z]{2}\s+\d{5})\s*$/m,
  // Target "Market Value = $10,062.32" pattern - simplified
  marketValue: /Market Value\s*=\s*\$([0-9,]+\.\d{2})/i,
};

// VIN to manufacturer mapping
const VIN_MANUFACTURER_MAP = {
  '1FT': 'Ford',
  '1GC': 'Chevrolet',
  '1GM': 'Chevrolet', 
  '1HD': 'Harley-Davidson',
  '2C3': 'Chrysler',
  '2C4': 'Chrysler',
  '2T1': 'Toyota',
  '3FA': 'Ford',
  '3VW': 'Volkswagen',
  '4T1': 'Toyota',
  '5YJ': 'Tesla',
  'JHM': 'Honda',
  'JN1': 'Nissan',
  'KMH': 'Hyundai',
  'WBA': 'BMW',
  'WBS': 'BMW',
  'WDD': 'Mercedes-Benz',
  'WVW': 'Volkswagen',
  'YV1': 'Volvo',
  '5XY': 'Hyundai'
};

// Model patterns for Mitchell reports
const MITCHELL_MODEL_PATTERNS = {
  // Match various Mitchell model formats
  modelLine1: /^([A-Za-z0-9\s\-]+?)(?:\s+(?:\d+\s+Door|XLT|Sport|Competition|Sedan|Crew Cab))/i,
  modelLine2: /^([A-Za-z0-9\s\-]+?)\s+(?:4\s+Door|Crew\s+Cab|Sedan|Coupe|Wagon|Hatchback)/i,
  // For BMW patterns like "3 | Competition 4 Door Sedan"
  bmwPattern: /(\d\s+(?:Series)?)\s*\|\s*([A-Za-z0-9\s]+?)(?:\s+\d+\s+Door|$)/i,
  // General model extraction
  generalModel: /^([A-Za-z0-9\s\-]+?)(?:\s+\d+\.\d+L|\s+\d+\s+Cyl|\s+AWD|\s+FWD|\s+RWD|$)/i
};

const CCC_PATTERNS = {
  vin: /\b[A-HJ-NPR-Z0-9]{17}\b/,
  // CCC reports have specific "Year YYYY" format
  year: /^Year\s+(\d{4})$/m,
  // CCC reports have specific "Make Brand" format  
  make: /^Make\s+([A-Za-z-]+)$/m,
  // CCC reports have specific "Model ModelName" format - be more specific
  model: /^Model\s+([A-Za-z0-9\-]+)(?:\s|$)/m,
  // CCC reports have "Odometer XX,XXX" format
  mileage: /^Odometer\s+(\d{1,3}(?:,\d{3})*)$/m,
  // CCC reports have "Location CITY, ST ZIPCODE" format
  location: /^Location\s+([A-Za-z\s,\-0-9]+)$/m,
  // CCC reports have "Total $ XX,XXX.XX" at the end of VALUATION SUMMARY
  settlementValue: /^Total\s+\$\s*([0-9,]+\.\d{2})$/m,
  // CCC reports have "Base Vehicle Value $ XX,XXX.XX"
  marketValue: /^Base Vehicle Value\s+\$\s*([0-9,]+\.\d{2})$/m,
};

function extractField(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] || match[0] : null;
}

function parseMileage(mileageStr) {
  if (!mileageStr) return 0;
  return parseInt(mileageStr.replace(/,/g, ''));
}

// Decode manufacturer from VIN
function getManufacturerFromVIN(vin) {
  if (!vin || vin.length < 3) return '';
  
  const vinPrefix = vin.substring(0, 3);
  return VIN_MANUFACTURER_MAP[vinPrefix] || '';
}

// Decode year from VIN (10th character)
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

// Extract model information from Mitchell report lines
function extractMitchellModel(lines, startIndex) {
  // Look for model information in the next few lines after vehicle info
  for (let i = startIndex; i < Math.min(startIndex + 5, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip empty lines or lines with just numbers/special chars
    if (!line || line.length < 3 || /^[\d\s\-_]+$/.test(line)) continue;
    
    // Skip "Mileage" line specifically
    if (line === 'Mileage') continue;
    
    // Try different model patterns
    let modelMatch;
    
    // BMW specific pattern: "3 Co petition" (garbled OCR)
    if (line.includes('Co petition') || line.includes('Competition')) {
      const bmwMatch = line.match(/(\d+)\s*(?:Co\s*petition|Competition)/i);
      if (bmwMatch) {
        return `${bmwMatch[1]} Series Competition`;
      }
    }
    
    // BMW specific pattern: "3 | Competition 4 Door Sedan"
    modelMatch = line.match(MITCHELL_MODEL_PATTERNS.bmwPattern);
    if (modelMatch) {
      return `${modelMatch[1].trim()} ${modelMatch[2].trim()}`.replace(/\s+/g, ' ').trim();
    }
    
    // General model patterns
    modelMatch = line.match(MITCHELL_MODEL_PATTERNS.modelLine1);
    if (modelMatch) {
      return modelMatch[1].trim();
    }
    
    modelMatch = line.match(MITCHELL_MODEL_PATTERNS.modelLine2);
    if (modelMatch) {
      return modelMatch[1].trim();
    }
    
    modelMatch = line.match(MITCHELL_MODEL_PATTERNS.generalModel);
    if (modelMatch) {
      return modelMatch[1].trim();
    }
  }
  
  return '';
}

// Enhanced model extraction that searches the entire text
function findModelInText(text, make) {
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // BMW patterns - look for "3 | Competition" or similar
    if (make === 'BMW' && (line.includes('|') && line.includes('Competition'))) {
      const bmwMatch = line.match(/(\d+)\s*\|\s*(Competition)/i);
      if (bmwMatch) {
        return `${bmwMatch[1]} Series ${bmwMatch[2]}`;
      }
    }
    
    // Ford truck patterns - prioritize cleaner text with pipe separators
    if (make === 'Ford') {
      // Look for cleaner format first: "ord Super Duty F-250 | XLT 4 Door"
      if (line.includes('Super Duty F-250') && line.includes('|')) {
        const fordMatch = line.match(/(Super Duty F-250)\s*\|\s*([A-Za-z]+)/i);
        if (fordMatch) {
          return `${fordMatch[1]} ${fordMatch[2]}`;
        }
      }
      
      // Fall back to other patterns
      if (line.includes('Super Duty F-250')) {
        const trimMatch = line.match(/(XLT|XL|Lariat|King Ranch|Platinum|Limited)/i);
        return trimMatch ? `Super Duty F-250 ${trimMatch[1]}` : 'Super Duty F-250';
      } else if (line.includes('Super Duty F-150')) {
        const trimMatch = line.match(/(XLT|XL|Lariat|King Ranch|Platinum|Limited)/i);
        return trimMatch ? `Super Duty F-150 ${trimMatch[1]}` : 'Super Duty F-150';
      } else if (line.includes('F-250')) {
        const trimMatch = line.match(/(XLT|XL|Lariat|King Ranch|Platinum|Limited)/i);
        return trimMatch ? `F-250 ${trimMatch[1]}` : 'F-250';
      } else if (line.includes('F-150')) {
        const trimMatch = line.match(/(XLT|XL|Lariat|King Ranch|Platinum|Limited)/i);
        return trimMatch ? `F-150 ${trimMatch[1]}` : 'F-150';
      }
    }
    
    // Santa Fe pattern
    if (make === 'Hyundai' && line.includes('Santa Fe')) {
      return line.includes('Sport') ? 'Santa Fe Sport' : 'Santa Fe';
    }
  }
  
  return '';
}

// Extract data from Mitchell reports
function extractMitchellData(text) {
  console.log('  🔍 Extracting Mitchell data...');
  
  const lines = text.split('\n');
  
  // Extract VIN first - it's usually reliable
  const vin = extractField(text, MITCHELL_PATTERNS.vin) || '';
  console.log('  VIN found:', vin);
  
  // Try multiple approaches to find vehicle info
  let year = 0;
  let make = '';
  let model = '';
  
  // Approach 1: Use the original pattern for "Loss vehicle:" format
  const vehicleMatch1 = text.match(MITCHELL_PATTERNS.vehicleInfo);
  if (vehicleMatch1) {
    year = parseInt(vehicleMatch1[1]) || 0;
    make = vehicleMatch1[2] || '';
    model = vehicleMatch1[3]?.trim() || '';
    console.log('  ✓ Vehicle info found:', vehicleMatch1[0]);
  } else {
    console.log('  ❌ Vehicle info pattern not matched');
    
    // Approach 2: Look for "Loss vehicle:" line manually and parse it
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('Loss vehicle:') && line.length > 20) {
        // Manual parsing for better reliability
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          const yearStr = parts[2];
          const makeStr = parts[3];
          
          if (/^\d{4}$/.test(yearStr) && /^[A-Za-z]+$/.test(makeStr)) {
            year = parseInt(yearStr);
            make = makeStr;
            
            // Extract model - everything after make until we hit special chars
            const modelParts = [];
            for (let j = 4; j < parts.length; j++) {
              if (parts[j].includes('|') || parts[j].includes('ö') || parts[j].includes('Door') || parts[j].includes('AWD') || parts[j].includes('FWD') || parts[j].includes('RWD')) {
                break;
              }
              modelParts.push(parts[j]);
            }
            model = modelParts.join(' ').trim();
            
            if (year && make && model) {
              console.log('  ✓ Vehicle info found via manual parsing:', line);
              break;
            }
          }
        }
      }
    }
  }
  
  // Approach 3: If no vehicle info found, try to extract from VIN and model lines
  if ((!year || !make || !model) && vin) {
    console.log('  🔧 Trying VIN-based extraction...');
    
    // Get manufacturer from VIN if make not found
    if (!make) {
      make = getManufacturerFromVIN(vin);
      if (make) console.log('  ✓ Make from VIN:', make);
    }
    
    // Get year from VIN if year not found
    if (!year) {
      year = getYearFromVIN(vin);
      if (year) console.log('  ✓ Year from VIN:', year);
    }
    
    // Look for model information in lines near VIN
    if (!model) {
      // For Ford, prioritize searching entire text for cleaner patterns
      if (make === 'Ford') {
        model = findModelInText(text, make);
        if (model) {
          console.log('  ✓ Model from text search:', model);
        }
      }
      
      // If still no model, or if not Ford, try VIN area
      if (!model) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Find VIN line
          if (line.includes(vin)) {
            // Look for model in surrounding lines
            model = extractMitchellModel(lines, i + 1);
            if (model) {
              console.log('  ✓ Model from lines near VIN:', model);
              break;
            }
          }
        }
      }
      
      // If still no model, search the entire text for model patterns
      if (!model) {
        model = findModelInText(text, make);
        if (model) {
          console.log('  ✓ Model from text search:', model);
        }
      }
    }
  }
  
  const mileageStr = extractField(text, MITCHELL_PATTERNS.mileage);
  if (mileageStr) {
    console.log('  ✓ Mileage found:', mileageStr);
  } else {
    console.log('  ❌ Mileage pattern not matched');
  }
  
  const location = extractField(text, MITCHELL_PATTERNS.location);
  if (location) {
    console.log('  ✓ Location found:', location);
  } else {
    console.log('  ❌ Location pattern not matched');
  }
  
  // Custom settlement value extraction for Mitchell reports
  let settlementValue = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'Settlement Value =') {
      // Look for the dollar amount in the next few lines
      for (let j = i + 1; j < i + 5; j++) {
        if (lines[j] && lines[j].includes('$')) {
          const dollarMatch = lines[j].match(/\$([0-9,]+\.\d{2})/);
          if (dollarMatch) {
            settlementValue = parseFloat(dollarMatch[1].replace(/,/g, ''));
            console.log('  ✓ Settlement value found: $' + dollarMatch[1]);
            break;
          }
        }
      }
      break;
    }
  }
  
  const marketValueStr = extractField(text, MITCHELL_PATTERNS.marketValue);
  let marketValue = 0;
  if (marketValueStr) {
    marketValue = parseFloat(marketValueStr.replace(/,/g, ''));
    console.log('  ✓ Market value found: $' + marketValueStr);
  } else {
    console.log('  ❌ Market value pattern not matched');
  }
  
  if (!settlementValue) {
    console.log('  ❌ Settlement value pattern not matched');
  }
  
  return {
    vin,
    year,
    make,
    model: model.replace(/^[^a-zA-Z0-9]*/, '').replace(/[^a-zA-Z0-9\s\-]/g, ' ').replace(/\s+/g, ' ').trim(),
    mileage: parseMileage(mileageStr),
    location: location || '',
    reportType: 'MITCHELL',
    extractionConfidence: 0,
    extractionErrors: [],
    settlementValue,
    marketValue
  };
}

// Extract data from CCC One reports
function extractCCCData(text) {
  console.log('  🔍 Extracting CCC One data...');
  
  const vin = extractField(text, CCC_PATTERNS.vin) || '';
  const year = parseInt(extractField(text, CCC_PATTERNS.year) || '0');
  const make = extractField(text, CCC_PATTERNS.make) || '';
  const model = extractField(text, CCC_PATTERNS.model) || '';
  const mileage = parseMileage(extractField(text, CCC_PATTERNS.mileage));
  const location = extractField(text, CCC_PATTERNS.location) || '';
  const settlementValue = parseFloat(extractField(text, CCC_PATTERNS.settlementValue)?.replace(/,/g, '') || '0');
  const marketValue = parseFloat(extractField(text, CCC_PATTERNS.marketValue)?.replace(/,/g, '') || '0');
  
  console.log('  VIN found:', vin);
  console.log('  Year found:', year);
  console.log('  Make found:', make);
  console.log('  Model found:', model);
  console.log('  Mileage found:', extractField(text, CCC_PATTERNS.mileage));
  console.log('  Location found:', location);
  console.log('  Settlement value found:', settlementValue);
  console.log('  Market value found:', marketValue);
  
  return {
    vin,
    year,
    make,
    model,
    mileage,
    location,
    reportType: 'CCC_ONE',
    extractionConfidence: 0,
    extractionErrors: [],
    settlementValue,
    marketValue
  };
}

function calculateConfidence(data) {
  let score = 0;
  const weights = {
    vin: 30,
    year: 20,
    make: 20,
    model: 15,
    mileage: 10,
    location: 5
  };
  
  if (data.vin && data.vin.length === 17) score += weights.vin;
  if (data.year > 1990 && data.year <= 2025) score += weights.year;
  if (data.make) score += weights.make;
  if (data.model) score += weights.model;
  if (data.mileage > 0) score += weights.mileage;
  if (data.location) score += weights.location;
  
  return score;
}

async function extractVehicleData(buffer) {
  try {
    // Extract text from PDF
    const data = await pdfParse(buffer);
    const text = data.text;
    
    if (!text || text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains no readable text');
    }
    
    console.log('✓ PDF text extracted, length:', text.length);
    
    // Detect report type
    const reportType = text.includes('CCC ONE') || text.includes('CCC One') ? 'CCC_ONE' : 'MITCHELL';
    console.log('✓ Report type detected:', reportType);
    
    let extractedData;
    
    if (reportType === 'MITCHELL') {
      extractedData = extractMitchellData(text);
    } else {
      extractedData = extractCCCData(text);
    }
    
    extractedData.reportType = reportType;
    
    // Calculate confidence score
    extractedData.extractionConfidence = calculateConfidence(extractedData);
    
    return extractedData;
  } catch (error) {
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}

async function testPDF(pdfPath) {
  console.log('\n' + '='.repeat(80));
  console.log('Testing PDF:', path.basename(pdfPath));
  console.log('='.repeat(80));
  
  try {
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ File not found:', pdfPath);
      return;
    }
    
    const buffer = fs.readFileSync(pdfPath);
    console.log('✓ File loaded, size:', (buffer.length / 1024).toFixed(2) + ' KB');
    
    const result = await extractVehicleData(buffer);
    
    console.log('\n📊 EXTRACTION RESULTS:');
    console.log('├─ VIN:', result.vin || '❌ Not found');
    console.log('├─ Year:', result.year || '❌ Not found');
    console.log('├─ Make:', result.make || '❌ Not found');
    console.log('├─ Model:', result.model || '❌ Not found');
    console.log('├─ Mileage:', result.mileage || '❌ Not found');
    console.log('├─ Location:', result.location || '❌ Not found');
    console.log('├─ Market Value:', result.marketValue ? `$${result.marketValue.toFixed(2)}` : '❌ Not found');
    console.log('├─ Settlement Value:', result.settlementValue ? `$${result.settlementValue.toFixed(2)}` : '❌ Not found');
    console.log('├─ Report Type:', result.reportType);
    console.log('└─ Confidence:', result.extractionConfidence + '%');
    
    // Expected values for "14 santa fe eval.pdf"
    if (path.basename(pdfPath).includes('santa fe')) {
      console.log('\n🎯 EXPECTED vs ACTUAL for Santa Fe:');
      console.log('├─ Year: Expected 2014, Got', result.year, result.year === 2014 ? '✅' : '❌');
      console.log('├─ Make: Expected "Hyundai", Got', `"${result.make}"`, result.make === 'Hyundai' ? '✅' : '❌');
      console.log('├─ Model: Expected "Santa Fe Sport", Got', `"${result.model}"`, result.model === 'Santa Fe Sport' ? '✅' : '❌');
      console.log('├─ Mileage: Expected 125759, Got', result.mileage, result.mileage === 125759 ? '✅' : '❌');
      console.log('├─ Location: Expected "FL 32210", Got', `"${result.location}"`, result.location === 'FL 32210' ? '✅' : '❌');
      console.log('└─ Settlement: Expected $10741.06, Got', `$${result.settlementValue?.toFixed(2)}`, Math.abs(result.settlementValue - 10741.06) < 0.01 ? '✅' : '❌');
    }
    
    if (result.extractionErrors && result.extractionErrors.length > 0) {
      console.log('\n⚠️  EXTRACTION ERRORS:');
      result.extractionErrors.forEach(error => console.log('   •', error));
    }
    
  } catch (error) {
    console.error('❌ Error processing PDF:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node test-pdf-extraction.js <pdf-file> [pdf-file2] ...');
    console.log('');
    console.log('Example:');
    console.log('  node test-pdf-extraction.js "../valuation_report_samples/14 santa fe eval.pdf"');
    console.log('');
    console.log('Available sample PDFs:');
    
    const samplesDir = path.join(__dirname, '..', 'valuation_report_samples');
    if (fs.existsSync(samplesDir)) {
      const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.pdf'));
      files.forEach(file => {
        console.log('  •', file);
      });
    }
    return;
  }
  
  for (const pdfPath of args) {
    await testPDF(pdfPath);
  }
  
  console.log('\n✅ Testing complete!');
}

main().catch(console.error);