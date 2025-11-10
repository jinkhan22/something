const pdfParse = require('pdf-parse');
const fs = require('fs');

// Test the improved extraction logic
async function testImprovedExtraction() {
  console.log('🚀 Testing Improved Mitchell Model Extraction\n');
  
  // Test with the working Mitchell reports first
  const testFiles = [
    '14 santa fe eval.pdf',
    '25-439600069-ValuationReport.pdf', 
    'Valution Report.pdf'
  ];
  
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

  function parseMakeModel(vehicleText) {
    const cleanText = vehicleText.trim();
    console.log('  🔍 Parsing vehicle text:', JSON.stringify(cleanText));
    
    // Try to find manufacturer (longest first to handle multi-word manufacturers)
    for (const manufacturer of VEHICLE_MANUFACTURERS) {
      const manufacturerIndex = cleanText.toLowerCase().indexOf(manufacturer.toLowerCase());
      if (manufacturerIndex !== -1) {
        const make = manufacturer;
        
        // Extract everything after the manufacturer name 
        const afterMake = cleanText.substring(manufacturerIndex + manufacturer.length).trim();
        const model = afterMake; // Everything after the make is the model
        
        console.log('  ✅ Found manufacturer:', make);
        console.log('  🚗 Extracted model:', JSON.stringify(model));
        
        // Only return if we found a meaningful model
        if (model && model.length > 0) {
          return { make, model };
        }
      }
    }
    
    // Fallback: split by first space
    const words = cleanText.split(/\s+/);
    if (words.length >= 2) {
      const make = words[0];
      const model = words.slice(1).join(' ');
      console.log('  ⚠️  Fallback parsing - Make:', make, 'Model:', model);
      return { make, model };
    }
    
    console.log('  ❌ Failed to parse make/model');
    return { make: words[0] || '', model: '' };
  }
  
  for (const file of testFiles) {
    console.log(`\n📄 ===== TESTING: ${file} =====`);
    
    try {
      const buffer = fs.readFileSync(file);
      const data = await pdfParse(buffer);
      const text = data.text;
      
      // Test the improved pattern
      const improvedPattern = /Loss vehicle:\s*(\d{4})\s+(.+?)\s*\|/im;
      const match = text.match(improvedPattern);
      
      if (match) {
        const year = parseInt(match[1]);
        const makeModelText = match[2].trim();
        
        console.log('✅ Pattern matched!');
        console.log('  📅 Year:', year);
        console.log('  📝 Make+Model text:', JSON.stringify(makeModelText));
        
        const parsed = parseMakeModel(makeModelText);
        console.log('  🎯 FINAL RESULT:');
        console.log(`    Make: "${parsed.make}"`);
        console.log(`    Model: "${parsed.model}"`);
        
        // Validate the result
        if (parsed.make && parsed.model) {
          console.log('  ✅ SUCCESS: Both make and model extracted correctly!');
        } else {
          console.log('  ⚠️  WARNING: Missing make or model');
        }
      } else {
        console.log('❌ Pattern did not match');
      }
      
    } catch (error) {
      console.log(`❌ Error processing ${file}: ${error.message}`);
    }
  }
}

testImprovedExtraction().catch(console.error);