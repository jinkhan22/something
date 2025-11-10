// Test the specific Toyota Corolla OCR issue

// Comprehensive vehicle manufacturers database
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

function parseMakeModel(vehicleText) {
  const cleanText = vehicleText.trim();
  
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
  
  // Fallback
  const words = cleanText.split(/\s+/);
  if (words.length >= 2) {
    const make = words[0];
    const model = words.slice(1).join(' ').replace(/\|.*$/, '').trim();
    return { make, model };
  }
  
  return { make: words[0] || '', model: '' };
}

// Test the problematic lines from the PDF
const testLines = [
  't Corolla S Plus 4 Door Sedan 1.8L',  // The bad line (line 28)
  'i l : oyota Corolla | S Plus 4 Door Sedan | 1.8L 4 Cyl Gas A FWD',  // Line 81 (better)
  'oyota Corolla | S Plus 4 Door Sedan | 1.8L 4 Cyl Gas A FWD'  // Line 120 (better)
];

console.log('Testing Toyota Corolla OCR issue:');
console.log('=' .repeat(60));

testLines.forEach((line, index) => {
  console.log(`${index + 1}. Testing: "${line}"`);
  
  // Test if line starts with single letter + space (OCR artifact detection)
  const startsWithSingleLetter = /^[a-zA-Z]\s+/.test(line);
  console.log(`   Starts with single letter + space: ${startsWithSingleLetter}`);
  
  if (startsWithSingleLetter) {
    console.log('   ❌ Would be skipped (OCR artifact)');
  } else {
    const result = parseMakeModel(line);
    console.log(`   ✅ Make: "${result.make}", Model: "${result.model}"`);
  }
  console.log('');
});

// Test Toyota OCR variations
console.log('Testing Toyota OCR variations:');
console.log('=' .repeat(60));

const toyotaVariations = ['oyota', 'toyota', 'Toyota'];
const testLine = 'oyota Corolla | S Plus 4 Door Sedan';

toyotaVariations.forEach(variant => {
  const hasVariant = testLine.toLowerCase().includes(variant.toLowerCase());
  console.log(`Line contains "${variant}": ${hasVariant}`);
});

console.log(`\\nTesting line: "${testLine}"`);
const result = parseMakeModel(testLine);
console.log(`Result: Make: "${result.make}", Model: "${result.model}"`);