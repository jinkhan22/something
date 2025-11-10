const pdfParse = require('pdf-parse');
const fs = require('fs');

// Simplified test for BARSANO extraction - let's copy the core functions

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

// VIN year decoding
const VIN_YEAR_MAP = {
  'A': 1980, 'B': 1981, 'C': 1982, 'D': 1983, 'E': 1984, 'F': 1985, 'G': 1986, 'H': 1987, 'J': 1988, 'K': 1989,
  'L': 1990, 'M': 1991, 'N': 1992, 'P': 1993, 'R': 1994, 'S': 1995, 'T': 1996, 'V': 1997, 'W': 1998, 'X': 1999, 'Y': 2000,
  '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
  'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
  'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025
};

function getManufacturerFromVIN(vin) {
  if (!vin || vin.length < 3) return '';
  const wmi = vin.substring(0, 3);
  return VIN_MANUFACTURER_MAP[wmi] || '';
}

function getYearFromVIN(vin) {
  if (!vin || vin.length < 10) return 0;
  const yearChar = vin.charAt(9);
  return VIN_YEAR_MAP[yearChar] || 0;
}

// Generic model extraction using improved Mitchell patterns
function findModelInText(text, make) {
  const lines = text.split('\n');
  
  console.log('  🔍 Looking for model using generic patterns...');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip short lines and obvious non-model lines
    if (line.length < 10 || /^[\d\s,\-_().]+$/.test(line)) continue;
    
    // Look for lines that might contain vehicle info
    if (line.includes('|') && (line.includes('Competition') || line.includes('Door') || line.includes('Sedan'))) {
      console.log('  📋 Found potential model line:', JSON.stringify(line));
      
      // Generic pipe pattern: "Model | Trim Details"
      const pipeMatch = line.match(/([A-Za-z0-9\s\-]+?)\s*\|\s*([A-Za-z0-9\s]+?)(?:\s+\d+\s+Door|$)/i);
      if (pipeMatch) {
        const modelPart = pipeMatch[1].trim();
        const trimPart = pipeMatch[2].trim();
        
        console.log('  🎯 Pipe pattern matched - Model:', JSON.stringify(modelPart), 'Trim:', JSON.stringify(trimPart));
        
        // For lines like "3 | Competition", combine them
        if (modelPart && trimPart) {
          const fullModel = `${modelPart} ${trimPart}`.replace(/\s+/g, ' ').trim();
          console.log('  ✅ Combined model:', fullModel);
          return fullModel;
        } else if (modelPart) {
          console.log('  ✅ Model only:', modelPart);
          return modelPart;
        }
      }
      
      // Fallback: extract first meaningful part before pipe
      const beforePipe = line.split('|')[0].trim();
      if (beforePipe && beforePipe.length > 1 && !/^[ilo\s]+$/.test(beforePipe)) {
        console.log('  ⚠️  Fallback before pipe:', beforePipe);
        return beforePipe;
      }
    }
  }
  
  return '';
}

async function testBarsanoExtraction() {
  try {
    console.log('=== TESTING BARSANO PDF WITH IMPROVED GENERIC PARSER ===\n');
    
    const buffer = fs.readFileSync('../valuation_report_samples/valuation -  BARSANO (1).pdf');
    const data = await pdfParse(buffer);
    const text = data.text;
    
    // Extract VIN
    const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/;
    const vinMatch = text.match(vinPattern);
    const vin = vinMatch ? vinMatch[0] : '';
    
    console.log('VIN found:', vin);
    
    if (vin) {
      const make = getManufacturerFromVIN(vin);
      const year = getYearFromVIN(vin);
      
      console.log('Make from VIN:', make);
      console.log('Year from VIN:', year);
      
      // Try to find model using generic approach
      console.log('\n=== SEARCHING FOR MODEL WITH GENERIC APPROACH ===');
      const model = findModelInText(text, make);
      
      console.log('\n=== FINAL RESULT ===');
      console.log('VIN:', vin);
      console.log('Year:', year);
      console.log('Make:', make);
      console.log('Model:', model);
      
      if (model && model.length > 0) {
        console.log('✅ Model extraction successful!');
        console.log('📝 Expected BMW M3 Competition, got:', model);
      } else {
        console.log('❌ Model extraction failed');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBarsanoExtraction();