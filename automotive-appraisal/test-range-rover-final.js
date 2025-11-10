// Final test specifically for the Range Rover case from the PDF

// Test the exact text pattern from the Valuation Report PDF
const exactText = "Loss vehicle: 2019 Land Rover Range Rover Sport | Dynamic 4 Door Utility 115\" WB | 5.0L 8 Cyl Gas Supercharged A 4WD";

// Extract just the vehicle info part (after "Loss vehicle:")
const vehicleInfoMatch = exactText.match(/Loss vehicle:\s*(\d{4})\s+(.+?)(?:\s+\||\s+AWD|\s+FWD|\s+RWD|$)/i);

if (vehicleInfoMatch) {
  const year = vehicleInfoMatch[1];
  const makeModelText = vehicleInfoMatch[2];
  
  console.log('Original text:', exactText);
  console.log('Year extracted:', year);
  console.log('Make/Model text:', makeModelText);
  
  // Test our parsing function
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
  
  const result = parseMakeModel(makeModelText);
  
  console.log('\n=== FINAL RESULT ===');
  console.log('Year:', year);
  console.log('Make:', result.make);
  console.log('Model:', result.model);
  
  console.log('\n=== VALIDATION ===');
  console.log('✅ Year should be "2019":', year === '2019' ? 'PASS' : 'FAIL');
  console.log('✅ Make should be "Land Rover":', result.make === 'Land Rover' ? 'PASS' : 'FAIL');
  console.log('✅ Model should be "Range Rover Sport":', result.model === 'Range Rover Sport' ? 'PASS' : 'FAIL');
} else {
  console.log('Failed to extract vehicle info from:', exactText);
}