// Test the VIN + OCR corruption handling approach
console.log('🧪 Testing VIN + OCR Corruption Handling');

// Simulate the exact scenario from the problematic file
const testData = {
  vin: '1FT7W2BT2LEC89812',
  ocrLine: 'i l : ord Super Duty F-250 | XLT 4 Door Crew Cab 7 Foot Bed | 6.7L 8 Cyl Diesel Turbocharged A 4WD'
};

console.log('VIN:', testData.vin);
console.log('OCR Line:', JSON.stringify(testData.ocrLine));

// VIN year decoding
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

// VIN manufacturer decoding
function getManufacturerFromVIN(vin) {
  if (!vin || vin.length < 3) return '';
  
  const vinPrefix = vin.substring(0, 3);
  const map = {
    '1FT': 'Ford',
    '1GC': 'Chevrolet',
    '2T1': 'Toyota',
    '4T1': 'Toyota',
    'JHM': 'Honda',
    'WBA': 'BMW',
    'WDD': 'Mercedes-Benz',
    'YV1': 'Volvo'
  };
  
  return map[vinPrefix] || '';
}

// Parse make/model with OCR corruption handling
function parseMakeModelWithOCR(vehicleText) {
  const cleanText = vehicleText.trim();
  console.log('  🔍 Parsing:', JSON.stringify(cleanText));
  
  // Special handling for OCR corrupted "Ford" -> "ord"
  if (cleanText.toLowerCase().startsWith('ord ')) {
    const make = 'Ford';
    const model = cleanText.replace(/^ord\s*/i, '').trim();
    console.log('  🔧 OCR corrected Ford - Model:', JSON.stringify(model));
    return { make, model };
  }
  
  // Standard manufacturer detection
  const manufacturers = [
    'Land Rover', 'Range Rover', 'Ford', 'Toyota', 'Honda', 'BMW',
    'Mercedes', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Hyundai', 'Volvo'
  ];
  
  for (const manufacturer of manufacturers) {
    const index = cleanText.toLowerCase().indexOf(manufacturer.toLowerCase());
    if (index !== -1) {
      const make = manufacturer;
      const afterMake = cleanText.substring(index + manufacturer.length).trim();
      console.log('  ✅ Found manufacturer:', make, 'Model:', JSON.stringify(afterMake));
      return { make, model: afterMake };
    }
  }
  
  // Fallback
  const words = cleanText.split(/\s+/);
  const make = words[0];
  const model = words.slice(1).join(' ');
  console.log('  ⚠️  Fallback - Make:', make, 'Model:', model);
  return { make, model };
}

console.log('\n🔧 Step 1: Extract year and make from VIN...');
const vinYear = getYearFromVIN(testData.vin);
const vinMake = getManufacturerFromVIN(testData.vin);
console.log('  📅 Year from VIN:', vinYear);
console.log('  🏭 Make from VIN:', vinMake);

console.log('\n🔧 Step 2: Extract model from OCR line...');
const colonPattern = /:\s*(.+?)\s*\|/;
const match = testData.ocrLine.match(colonPattern);

if (match) {
  const vehicleText = match[1].trim();
  console.log('  📝 Extracted vehicle text:', JSON.stringify(vehicleText));
  
  const parsed = parseMakeModelWithOCR(vehicleText);
  
  console.log('\n🎯 Step 3: Combine results...');
  const finalMake = vinMake || parsed.make;  // Prefer VIN make
  const finalModel = parsed.model;
  const finalYear = vinYear;
  
  console.log('  📅 Final Year:', finalYear);
  console.log('  🏭 Final Make:', finalMake);
  console.log('  🚗 Final Model:', finalModel);
  
  if (finalYear === 2020 && finalMake === 'Ford' && finalModel.includes('Super Duty F-250')) {
    console.log('\n🎉 SUCCESS! Correctly extracted: 2020 Ford Super Duty F-250');
    console.log('✅ This approach successfully handles OCR corruption with VIN fallback!');
  }
} else {
  console.log('❌ Could not extract vehicle text from OCR line');
}