// Test the actual current TypeScript implementation
const fs = require('fs');

// Copy the exact logic from the TypeScript file
const pdfParse = require('pdf-parse');

// VIN decoding functions
function getYearFromVIN(vin) {
  if (!vin || vin.length < 10) return 0;
  
  const yearChar = vin.charAt(9);
  const yearMap = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
    'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
    'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026
  };
  
  return yearMap[yearChar] || 0;
}

function getManufacturerFromVIN(vin) {
  if (!vin || vin.length < 3) return '';
  
  const vinPrefix = vin.substring(0, 3);
  const VIN_MANUFACTURER_MAP = {
    '1FT': 'Ford',
    '1GC': 'Chevrolet',
    '1GM': 'Chevrolet', 
    '2T1': 'Toyota',
    '4T1': 'Toyota',
    'JHM': 'Honda',
    'JN1': 'Nissan',
    'KMH': 'Hyundai',
    'WBA': 'BMW',
    'WDD': 'Mercedes-Benz',
    'YV1': 'Volvo'
  };
  
  return VIN_MANUFACTURER_MAP[vinPrefix] || '';
}

function parseMakeModel(vehicleText) {
  const cleanText = vehicleText.trim();
  
  // Special handling for OCR corrupted "Ford" -> "ord"
  if (cleanText.toLowerCase().startsWith('ord ')) {
    const make = 'Ford';
    const model = cleanText.replace(/^ord\s*/i, '').trim();
    return { make, model };
  }
  
  const manufacturers = [
    'Land Rover', 'Range Rover', 'Aston Martin', 'Alfa Romeo', 'Rolls Royce',
    'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 
    'Dodge', 'Ferrari', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 
    'Jaguar', 'Jeep', 'Kia', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes', 
    'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Porsche', 'Subaru', 'Tesla', 
    'Toyota', 'Volkswagen', 'Volvo'
  ];
  
  for (const manufacturer of manufacturers) {
    const manufacturerIndex = cleanText.toLowerCase().indexOf(manufacturer.toLowerCase());
    if (manufacturerIndex !== -1) {
      const make = manufacturer;
      const afterMake = cleanText.substring(manufacturerIndex + manufacturer.length).trim();
      const model = afterMake;
      
      if (model && model.length > 0) {
        return { make, model };
      }
    }
  }
  
  // Fallback
  const words = cleanText.split(/\s+/);
  if (words.length >= 2) {
    const make = words[0];
    const model = words.slice(1).join(' ');
    return { make, model };
  }
  
  return { make: words[0] || '', model: '' };
}

async function testActualImplementation() {
  console.log('🧪 Testing Actual Implementation Logic');
  
  const testFile = '25-679137965_8-7-2025_Total Loss_Valuation.pdf';
  console.log('📄 Testing with:', testFile);
  
  const buffer = fs.readFileSync(testFile);
  const data = await pdfParse(buffer);
  const text = data.text;
  
  // Extract VIN
  const vin = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/)?.[0] || '';
  console.log('🆔 VIN found:', vin);
  
  let year = 0;
  let make = '';
  let model = '';
  
  // Step 1: Try standard pattern
  const standardMatch = text.match(/Loss vehicle:\s*(\d{4})\s+(.+?)\s*\|/im);
  if (standardMatch) {
    console.log('✅ Standard pattern matched');
    year = parseInt(standardMatch[1]);
    const parsed = parseMakeModel(standardMatch[2].trim());
    make = parsed.make;
    model = parsed.model;
  } else {
    console.log('❌ Standard pattern failed, trying VIN + OCR approach...');
    
    // Step 2: VIN-based extraction
    if (vin) {
      year = getYearFromVIN(vin);
      make = getManufacturerFromVIN(vin);
      console.log('📅 Year from VIN:', year);
      console.log('🏭 Make from VIN:', make);
    }
    
    // Step 3: Find model from OCR corruption
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const colonPattern = /:\s*(.+?)\s*\|/;
      const match = line.match(colonPattern);
      
      if (match && match[1] && match[1].length > 5) {
        const potentialVehicleText = match[1].trim();
        console.log('🔍 Found potential vehicle text:', JSON.stringify(potentialVehicleText));
        
        const parsed = parseMakeModel(potentialVehicleText);
        if (parsed.make && parsed.model) {
          make = make || parsed.make;
          model = parsed.model;
          console.log('✅ Parsed from OCR - Make:', make, 'Model:', model);
          break;
        }
      }
    }
  }
  
  console.log('\n🎯 FINAL RESULT:');
  console.log('📅 Year:', year);
  console.log('🏭 Make:', make);
  console.log('🚗 Model:', model);
  
  if (year === 2020 && make === 'Ford' && model.includes('Super Duty F-250')) {
    console.log('\n🎉 SUCCESS! Correctly extracted 2020 Ford Super Duty F-250');
  } else if (year > 0 && make && model) {
    console.log('\n✅ SUCCESS! Extracted vehicle information');
  } else {
    console.log('\n❌ Incomplete extraction');
  }
}

testActualImplementation().catch(console.error);