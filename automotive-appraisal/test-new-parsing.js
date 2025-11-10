// Test the new comprehensive manufacturer database approach

// Comprehensive vehicle manufacturers database (sorted by length - longest first)
const VEHICLE_MANUFACTURERS = [
  // Multi-word manufacturers (longest first to avoid partial matches)
  'Morgan Motor Company',
  'Mahindra & Mahindra', 
  'McLaren Automotive',
  'Chevrolet Division',
  'Peugeot Citroën',
  'American Motors',
  'Harley Davidson',
  'General Motors',
  'Ashok Leyland',
  'Pinin Farina',
  'Aston Martin',
  'Alfa Romeo',
  'Land Rover',
  'Range Rover',
  'Rolls Royce',
  'Dodge Ram',
  'AM General',
  
  // Single-word manufacturers (alphabetical)
  'Acura', 'Audi', 'Bentley', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 
  'Chrysler', 'Dodge', 'Ferrari', 'Ford', 'GMC', 'Honda', 'Hyundai', 
  'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Lexus', 'Lincoln',
  'Lucid', 'Maserati', 'Mazda', 'Mercedes', 'Mercedes-Benz', 'Mitsubishi', 
  'Nissan', 'Porsche', 'Ram', 'Rivian', 'Subaru', 'Tesla', 'Toyota', 
  'Volkswagen', 'Volvo'
];

// Parse make and model using comprehensive manufacturer database
function parseMakeModel(vehicleText) {
  // Clean the input text
  const cleanText = vehicleText.trim();
  
  // Try to find a manufacturer in the text
  for (const manufacturer of VEHICLE_MANUFACTURERS) {
    const manufacturerIndex = cleanText.toLowerCase().indexOf(manufacturer.toLowerCase());
    if (manufacturerIndex !== -1) {
      const make = manufacturer;
      
      // Extract everything after the manufacturer name until the first "|"
      const afterMake = cleanText.substring(manufacturerIndex + manufacturer.length).trim();
      const modelMatch = afterMake.match(/^([^|]+)/);
      const model = modelMatch ? modelMatch[1].trim() : '';
      
      // Only return if we found a meaningful model
      if (model && model.length > 0) {
        return { make, model };
      }
    }
  }
  
  // Fallback: if no manufacturer found, use first word as make
  const words = cleanText.split(/\s+/);
  if (words.length >= 2) {
    const make = words[0];
    const modelParts = words.slice(1);
    const model = modelParts.join(' ').replace(/\|.*$/, '').trim();
    return { make, model };
  }
  
  return { make: words[0] || '', model: '' };
}

// Test cases
const testCases = [
  // The problematic case
  '2019 Land Rover Range Rover Sport | Dynamic 4 Door',
  
  // Other multi-word manufacturers
  'Aston Martin DB11 | V8 Coupe',
  'Alfa Romeo Giulia | Quadrifoglio',
  'Morgan Motor Company Plus Four',
  
  // Standard cases
  'Ford F-150 | XLT Crew Cab',
  'Toyota Camry | LE Sedan',
  'BMW 3 Series | Competition',
  
  // Edge cases
  'Range Rover Sport | HSE Dynamic',
  'Hyundai Santa Fe Sport | AWD'
];

console.log('Testing new comprehensive manufacturer database approach:');
console.log('='.repeat(80));

testCases.forEach((testCase, index) => {
  const result = parseMakeModel(testCase);
  console.log(`${index + 1}. "${testCase}"`);
  console.log(`   → Make: "${result.make}", Model: "${result.model}"`);
  console.log('');
});