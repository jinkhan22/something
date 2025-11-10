// Test the improved OCR variant handling

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
  'ubaru': 'Subaru',
  'acura': 'Acura',
  'honda': 'Honda',
  'tesla': 'Tesla'
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

// Test OCR variant cases
const testCases = [
  // Original problem case (should be skipped due to single letter start)
  't Corolla S Plus 4 Door Sedan 1.8L',
  
  // OCR variant cases
  'oyota Corolla | S Plus 4 Door Sedan',
  'ord F-150 | XLT Crew Cab',
  'mw 3 Series | Competition',
  
  // Good cases
  'Toyota Corolla | S Plus 4 Door Sedan',
  'Ford F-150 | XLT Crew Cab',
  'BMW 3 Series | Competition'
];

console.log('Testing OCR variant handling:');
console.log('=' .repeat(70));

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. "${testCase}"`);
  
  // Check for OCR artifacts
  const startsWithSingleLetter = /^[a-zA-Z]\s+/.test(testCase);
  if (startsWithSingleLetter) {
    console.log('   ❌ OCR artifact (single letter + space) - would be skipped');
  } else {
    const result = parseMakeModel(testCase);
    console.log(`   ✅ Make: "${result.make}", Model: "${result.model}"`);
  }
  console.log('');
});