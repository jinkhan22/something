// Debug the Toyota Corolla parsing issue

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
].sort((a, b) => b.length - a.length);

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
  console.log(`\n=== parseMakeModel called with: "${cleanText}" ===`);
  
  // First try exact manufacturer matches
  for (const manufacturer of VEHICLE_MANUFACTURERS) {
    const manufacturerIndex = cleanText.toLowerCase().indexOf(manufacturer.toLowerCase());
    if (manufacturerIndex !== -1) {
      console.log(`Found manufacturer "${manufacturer}" at index ${manufacturerIndex}`);
      const make = manufacturer;
      const afterMake = cleanText.substring(manufacturerIndex + manufacturer.length).trim();
      console.log(`Text after make: "${afterMake}"`);
      const modelMatch = afterMake.match(/^([^|]+)/);
      const model = modelMatch ? modelMatch[1].trim() : '';
      console.log(`Model extracted: "${model}"`);
      
      if (model && model.length > 0) {
        return { make, model };
      }
    }
  }
  
  // Try OCR variant matches
  for (const [variant, correctName] of Object.entries(MANUFACTURER_OCR_VARIANTS)) {
    const variantIndex = cleanText.toLowerCase().indexOf(variant.toLowerCase());
    if (variantIndex !== -1) {
      console.log(`Found OCR variant "${variant}" -> "${correctName}" at index ${variantIndex}`);
      const make = correctName;
      const afterMake = cleanText.substring(variantIndex + variant.length).trim();
      console.log(`Text after OCR variant: "${afterMake}"`);
      const modelMatch = afterMake.match(/^([^|]+)/);
      const model = modelMatch ? modelMatch[1].trim() : '';
      console.log(`Model extracted from OCR: "${model}"`);
      
      if (model && model.length > 0) {
        return { make, model };
      }
    }
  }
  
  console.log('No manufacturer found, using fallback...');
  // Fallback
  const words = cleanText.split(/\s+/);
  console.log(`Words: [${words.map(w => `"${w}"`).join(', ')}]`);
  if (words.length >= 2) {
    const make = words[0];
    const model = words.slice(1).join(' ').replace(/\|.*$/, '').trim();
    console.log(`Fallback: make="${make}", model="${model}"`);
    return { make, model };
  }
  
  return { make: words[0] || '', model: '' };
}

// Test the problematic line
console.log('Testing the problematic line:');
const badLine = 't Corolla S Plus 4 Door Sedan 1.8L 4 Cyl Gas A FWD';
console.log(`Input: "${badLine}"`);

// Note: The actual extraction skips the "t " part, so let's test with that removed
const processedLine = badLine.substring(2); // Remove "t "
console.log(`After removing "t ": "${processedLine}"`);

const result = parseMakeModel(processedLine);
console.log(`\nFINAL RESULT: make="${result.make}", model="${result.model}"`);

// Test with the good line too
console.log('\n' + '='.repeat(60));
console.log('Testing the good line:');
const goodLine = 'oyota Corolla | S Plus 4 Door Sedan | 1.8L 4 Cyl Gas A FWD';
const goodResult = parseMakeModel(goodLine);
console.log(`\nFINAL RESULT: make="${goodResult.make}", model="${goodResult.model}"`);