// Test the exact Toyota Corolla extraction flow

const VEHICLE_MANUFACTURERS = [
  'Morgan Motor Company', 'Mahindra & Mahindra', 'McLaren Automotive',
  'Chevrolet Division', 'Peugeot Citroën', 'American Motors', 'Harley Davidson',
  'General Motors', 'Ashok Leyland', 'Pinin Farina', 'Aston Martin',
  'Alfa Romeo', 'Land Rover', 'Range Rover', 'Rolls Royce', 'Dodge Ram',
  'AM General', 'Acura', 'Audi', 'Bentley', 'BMW', 'Buick', 'Cadillac',
  'Chevrolet', 'Chrysler', 'Dodge', 'Ferrari', 'Ford', 'GMC', 'Honda',
  'Hyundai', 'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Lexus',
  'Lincoln', 'Lucid', 'Maserati', 'Mazda', 'Mercedes', 'Mercedes-Benz',
  'Mitsubishi', 'Nissan', 'Porsche', 'Ram', 'Rivian', 'Subaru', 'Tesla',
  'Toyota', 'Volkswagen', 'Volvo'
];

const MANUFACTURER_OCR_VARIANTS = {
  'oyota': 'Toyota',
  'ord': 'Ford',
  'mw': 'BMW',
  'ercedes': 'Mercedes',
  'olkswagen': 'Volkswagen',
  'yundai': 'Hyundai',
  'issan': 'Nissan',
  'azda': 'Mazda',
  'ubaru': 'Subaru'
};

function parseMakeModel(vehicleText) {
  const cleanText = vehicleText.trim();
  
  // First try exact manufacturer matches
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
  
  // Fallback
  const words = cleanText.split(/\s+/);
  if (words.length >= 2) {
    const make = words[0];
    const model = words.slice(1).join(' ').replace(/\|.*$/, '').trim();
    return { make, model };
  }
  
  return { make: words[0] || '', model: '' };
}

function extractMitchellModel(lines, startIndex) {
  for (let i = startIndex; i < Math.min(startIndex + 5, lines.length); i++) {
    const line = lines[i].trim();
    
    console.log(`  Checking line ${i}: "${line}"`);
    
    // Skip empty lines or lines with just numbers/special chars
    if (!line || line.length < 3 || /^[\d\s\-_]+$/.test(line)) {
      console.log(`    → Skipped (empty/short/numbers)`);
      continue;
    }
    
    // Skip "Mileage" line specifically
    if (line === 'Mileage') {
      console.log(`    → Skipped (Mileage word)`);
      continue;
    }
    
    // Skip mileage lines (contains numbers followed by "miles")
    if (/\d+[,\d]*\s+miles/i.test(line)) {
      console.log(`    → Skipped (mileage line)`);
      continue;
    }
    
    // Skip lines that start with single letters followed by space (OCR artifacts)
    if (/^[a-zA-Z]\s+/.test(line)) {
      console.log(`    → Skipped (single letter OCR artifact)`);
      continue;
    }
    
    // Skip lines that are mostly numbers with some non-alphanumeric chars
    if (/^[\d\s,\-_().]+$/.test(line)) {
      console.log(`    → Skipped (mostly numbers)`);
      continue;
    }
    
    console.log(`    → Processing line...`);
    
    // Try to use our comprehensive manufacturer parsing
    const parsed = parseMakeModel(line);
    if (parsed.model && parsed.model.length > 2) {
      console.log(`    → ✅ Found model: "${parsed.model}"`);
      return parsed.model;
    } else {
      console.log(`    → No valid model found`);
    }
  }
  
  return '';
}

// Simulate the exact lines from the Toyota Corolla PDF
const linesFromPDF = [
  // ... (lines 0-24)
  'JOA2182, Ohio, Exp, 03/2026 2T1BURHE2EC062336',  // Line 25 (VIN line)
  '111,893 miles',                                   // Line 26 (mileage)
  'Mileage',                                         // Line 27 (label)
  't Corolla S Plus 4 Door Sedan 1.8L',            // Line 28 (bad OCR)
  '4 Cyl Gas A FWD',                                // Line 29
  'Title History',                                   // Line 30
  // ... more lines ...
  'oyota Corolla | S Plus 4 Door Sedan | 1.8L 4 Cyl Gas A FWD'  // Line 81 (good)
];

console.log('=== Testing Toyota Corolla Model Extraction ===');
console.log('VIN found on line 25, calling extractMitchellModel(lines, 26)...');
console.log('');

// This simulates what happens in the actual extraction
const result = extractMitchellModel(linesFromPDF, 26);

console.log('');
console.log('=== FINAL RESULT ===');
console.log('Model extracted:', result ? `"${result}"` : 'NOT FOUND');

// Test the good line separately
console.log('');
console.log('=== Testing the good OCR line separately ===');
const goodLine = 'oyota Corolla | S Plus 4 Door Sedan | 1.8L 4 Cyl Gas A FWD';
const goodResult = parseMakeModel(goodLine);
console.log(`Line: "${goodLine}"`);
console.log(`Result: Make="${goodResult.make}", Model="${goodResult.model}"`);